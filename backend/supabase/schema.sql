-- Cliff Camps, Barot - database schema (Supabase / PostgreSQL)
-- Run once in Supabase Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to re-run: every statement is idempotent.

-- gen_random_uuid() is built into PostgreSQL 13+ (Supabase runs 15+), no extension needed.

-- ---------------------------------------------------------------- helpers
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------- tents
-- One row per tent TYPE. `units` = how many identical tents of this type the camp has.
create table if not exists public.tents (
  id              uuid primary key default gen_random_uuid(),
  name            text not null unique,
  description     text,
  capacity        int  not null check (capacity between 1 and 20),
  price_per_night numeric(10,2) not null check (price_per_night >= 0),
  units           int  not null default 1 check (units between 1 and 100),
  images          text[] not null default '{}',
  amenities       text[] not null default '{}',
  sort_order      int  not null default 0,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------- bookings
create table if not exists public.bookings (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,
  tent_id         uuid not null references public.tents(id),
  guest_name      text not null,
  phone           text not null,
  email           text not null,
  guests          int  not null check (guests between 1 and 20),
  check_in        date not null,
  check_out       date not null,
  nights          int  not null,
  subtotal        numeric(10,2) not null,
  tax_amount      numeric(10,2) not null default 0,
  total_price     numeric(10,2) not null,
  advance_amount  numeric(10,2) not null,
  amount_paid     numeric(10,2) not null default 0,
  status          text not null default 'pending' check (status in ('pending','confirmed','cancelled')),
  payment_status  text not null default 'unpaid' check (payment_status in ('unpaid','proof_submitted','advance_paid','paid','refunded')),
  payment_method  text check (payment_method in ('upi','razorpay')),
  notes           text,
  admin_notes     text,
  source          text not null default 'website',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint bookings_dates_chk check (check_out > check_in)
);
create index if not exists bookings_tent_dates_idx on public.bookings (tent_id, check_in, check_out) where status <> 'cancelled';
create index if not exists bookings_created_idx on public.bookings (created_at desc);

-- ---------------------------------------------------------------- blocked dates
-- tent_id null = whole camp. units null = tent type fully closed; units n = n tents taken (Airbnb sync uses 1).
create table if not exists public.blocked_dates (
  id          uuid primary key default gen_random_uuid(),
  tent_id     uuid references public.tents(id) on delete cascade,
  date        date not null,
  units       int check (units is null or units > 0),
  reason      text,
  source      text not null default 'manual' check (source in ('manual','airbnb')),
  created_at  timestamptz not null default now()
);
create index if not exists blocked_dates_date_idx on public.blocked_dates (date);

-- ---------------------------------------------------------------- payments
create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  booking_id          uuid not null references public.bookings(id) on delete cascade,
  method              text not null check (method in ('upi','razorpay','property')),
  amount              numeric(10,2) not null check (amount > 0),
  status              text not null default 'created' check (status in ('created','submitted','verified','captured','failed','rejected','refunded')),
  txn_id              text,
  provider_order_id   text,
  provider_payment_id text,
  proof_path          text,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists payments_booking_idx on public.payments (booking_id);
create index if not exists payments_status_idx on public.payments (status);
create unique index if not exists payments_order_uidx on public.payments (provider_order_id) where provider_order_id is not null;
-- A UPI transaction reference can only be claimed once (unless an admin rejected it)
create unique index if not exists payments_upi_txn_uidx on public.payments (lower(txn_id)) where method = 'upi' and txn_id is not null and status <> 'rejected';

-- ---------------------------------------------------------------- admins
create table if not exists public.admins (
  id             uuid primary key default gen_random_uuid(),
  email          text not null unique,
  password_hash  text not null,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------- triggers
drop trigger if exists tents_updated_at on public.tents;
create trigger tents_updated_at before update on public.tents for each row execute function public.set_updated_at();
drop trigger if exists bookings_updated_at on public.bookings;
create trigger bookings_updated_at before update on public.bookings for each row execute function public.set_updated_at();
drop trigger if exists payments_updated_at on public.payments;
create trigger payments_updated_at before update on public.payments for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- atomic booking creation
-- Locks the tent row, checks every night of the stay against bookings + blocked dates, then inserts.
-- Two simultaneous requests for the last free tent are serialised by the row lock, so only one succeeds.
create or replace function public.create_booking(p jsonb, p_hold_hours int default 24)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  t      public.tents;
  b      public.bookings;
  night  date;
  used   int;
  taken  int;
  closed boolean;
begin
  select * into t from public.tents where id = (p->>'tent_id')::uuid and active for update;
  if not found then
    raise exception 'TENT_UNAVAILABLE';
  end if;

  for night in
    select generate_series((p->>'check_in')::date, (p->>'check_out')::date - 1, interval '1 day')::date
  loop
    select count(*) into used
      from public.bookings bk
     where bk.tent_id = t.id
       and bk.check_in <= night and bk.check_out > night
       and (bk.status = 'confirmed'
            or (bk.status = 'pending'
                and (bk.payment_status <> 'unpaid' or bk.created_at > now() - make_interval(hours => p_hold_hours))));

    select coalesce(sum(bd.units), 0), coalesce(bool_or(bd.units is null), false) into taken, closed
      from public.blocked_dates bd
     where bd.date = night and (bd.tent_id is null or bd.tent_id = t.id);

    if closed or used + taken >= t.units then
      raise exception 'DATES_UNAVAILABLE';
    end if;
  end loop;

  insert into public.bookings (code, tent_id, guest_name, phone, email, guests, check_in, check_out, nights,
                               subtotal, tax_amount, total_price, advance_amount, payment_method, notes, source)
  values (p->>'code', t.id, p->>'guest_name', p->>'phone', p->>'email', (p->>'guests')::int,
          (p->>'check_in')::date, (p->>'check_out')::date, (p->>'nights')::int,
          (p->>'subtotal')::numeric, (p->>'tax_amount')::numeric, (p->>'total_price')::numeric,
          (p->>'advance_amount')::numeric, p->>'payment_method', p->>'notes', coalesce(p->>'source', 'website'))
  returning * into b;

  return b;
end $$;

-- ---------------------------------------------------------------- Row Level Security
-- RLS on with NO policies: the public anon key can neither read nor write anything.
-- Only the backend, using the service_role key (which bypasses RLS), can access the data.
alter table public.tents         enable row level security;
alter table public.bookings      enable row level security;
alter table public.blocked_dates enable row level security;
alter table public.payments      enable row level security;
alter table public.admins        enable row level security;

revoke all on public.tents, public.bookings, public.blocked_dates, public.payments, public.admins from anon, authenticated;
revoke execute on function public.create_booking(jsonb, int) from public, anon, authenticated;
grant execute on function public.create_booking(jsonb, int) to service_role;

-- ---------------------------------------------------------------- storage for UPI payment screenshots (private)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', false, 2097152, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;
