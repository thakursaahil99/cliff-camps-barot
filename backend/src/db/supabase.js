import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';
import { conflict, HttpError } from '../utils/http.js';

export function createSupabaseStore() {
  const sb = createClient(config.supabase.url, config.supabase.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const bucket = config.supabase.proofsBucket;

  const run = async (query) => {
    const { data, error } = await query;
    if (error) {
      if (error.code === '23505') throw conflict('This record already exists (duplicate transaction / reference)');
      if (error.code === 'PGRST116') return null; // .single() found no row
      throw new HttpError(500, `Database error: ${error.message}`);
    }
    return data;
  };

  return {
    kind: 'supabase',

    /** Used by /api/health (and the keep-alive cron) - one tiny real query keeps the free project active. */
    async ping() {
      const rows = await run(sb.from('tents').select('id').limit(1));
      return { ok: true, tents: rows.length };
    },

    // ---- tents
    async listTents({ includeInactive = false } = {}) {
      let q = sb.from('tents').select('*').order('sort_order').order('price_per_night');
      if (!includeInactive) q = q.eq('active', true);
      return run(q);
    },
    getTent: (id) => run(sb.from('tents').select('*').eq('id', id).maybeSingle()),
    findTentByName: (name) => run(sb.from('tents').select('*').eq('name', name).maybeSingle()),
    createTent: (data) => run(sb.from('tents').insert(data).select().single()),
    updateTent: (id, patch) => run(sb.from('tents').update(patch).eq('id', id).select().maybeSingle()),

    // ---- availability
    async getStayData(from, to, tentId = null) {
      let bq = sb.from('bookings').select('id, tent_id, check_in, check_out, status, payment_status, created_at')
        .in('status', ['pending', 'confirmed']).lt('check_in', to).gt('check_out', from);
      let dq = sb.from('blocked_dates').select('*').gte('date', from).lt('date', to);
      if (tentId) {
        bq = bq.eq('tent_id', tentId);
        dq = dq.or(`tent_id.is.null,tent_id.eq.${tentId}`);
      }
      const [bookings, blocks] = await Promise.all([run(bq), run(dq)]);
      return { bookings, blocks };
    },

    // ---- bookings
    async createBooking(row) {
      const { data, error } = await sb.rpc('create_booking', { p: row, p_hold_hours: config.booking.holdHours });
      if (error) {
        if (error.message?.includes('DATES_UNAVAILABLE')) throw conflict('Sorry, those dates were just booked. Please choose different dates.');
        if (error.message?.includes('TENT_UNAVAILABLE')) throw conflict('This tent is not available for booking');
        if (error.code === '23505') throw conflict('Please try again');
        throw new HttpError(500, `Database error: ${error.message}`);
      }
      return data;
    },
    getBooking: (id) => run(sb.from('bookings').select('*').eq('id', id).maybeSingle()),
    async listBookings({ status, payment_status, q, from, to, limit = 200 } = {}) {
      let query = sb.from('bookings').select('*, tent:tents(id, name)').order('created_at', { ascending: false }).limit(limit);
      if (status) query = query.eq('status', status);
      if (payment_status) query = query.eq('payment_status', payment_status);
      if (from) query = query.gt('check_out', from);
      if (to) query = query.lt('check_in', to);
      if (q) {
        const s = q.replace(/[%,()]/g, ' ').trim();
        query = query.or(`guest_name.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%,code.ilike.%${s}%`);
      }
      return run(query);
    },
    updateBooking: (id, patch) => run(sb.from('bookings').update(patch).eq('id', id).select().maybeSingle()),

    // ---- payments
    createPayment: (data) => run(sb.from('payments').insert(data).select().single()),
    getPayment: (id) => run(sb.from('payments').select('*').eq('id', id).maybeSingle()),
    updatePayment: (id, patch) => run(sb.from('payments').update(patch).eq('id', id).select().maybeSingle()),
    /** Compare-and-set: only updates if the payment is still in one of `fromStatuses` (atomic in Postgres). */
    transitionPayment: (id, fromStatuses, patch) =>
      run(sb.from('payments').update(patch).eq('id', id).in('status', fromStatuses).select().maybeSingle()),
    findPaymentByOrderId: (orderId) => run(sb.from('payments').select('*').eq('provider_order_id', orderId).maybeSingle()),
    async findPaymentByTxnId(txnId) {
      const rows = await run(sb.from('payments').select('*').ilike('txn_id', txnId).limit(1));
      return rows[0] || null;
    },
    async listPayments({ status, booking_id, limit = 200 } = {}) {
      let q = sb.from('payments')
        .select('*, booking:bookings(id, code, guest_name, phone, total_price, check_in, check_out, status)')
        .order('created_at', { ascending: false }).limit(limit);
      if (status) q = q.eq('status', status);
      if (booking_id) q = q.eq('booking_id', booking_id);
      return run(q);
    },
    async saveProof(paymentId, buffer, mime) {
      const path = `${new Date().toISOString().slice(0, 7)}/${paymentId}.${mime.split('/')[1]}`;
      const { error } = await sb.storage.from(bucket).upload(path, buffer, { contentType: mime, upsert: true });
      if (error) throw new HttpError(500, `Could not store screenshot: ${error.message}`);
      return path;
    },
    async getProofUrl(path) {
      const { data, error } = await sb.storage.from(bucket).createSignedUrl(path, 600);
      if (error) throw new HttpError(500, error.message);
      return data.signedUrl;
    },

    // ---- blocked dates
    async listBlocks({ from, to } = {}) {
      let q = sb.from('blocked_dates').select('*').order('date');
      if (from) q = q.gte('date', from);
      if (to) q = q.lt('date', to);
      return run(q);
    },
    addBlocks: (rows) => run(sb.from('blocked_dates').insert(rows).select()),
    async deleteBlock(id) {
      const rows = await run(sb.from('blocked_dates').delete().eq('id', id).select('id'));
      return rows.length > 0;
    },
    async replaceBlocksBySource(source, rows) {
      await run(sb.from('blocked_dates').delete().eq('source', source));
      if (!rows.length) return 0;
      const inserted = await run(sb.from('blocked_dates').insert(rows.map((r) => ({ ...r, source }))).select('id'));
      return inserted.length;
    },

    // ---- admins
    getAdminByEmail: (email) => run(sb.from('admins').select('*').eq('email', email.toLowerCase()).maybeSingle()),
    async upsertAdmin(email, password_hash) {
      await run(sb.from('admins').upsert({ email: email.toLowerCase(), password_hash }, { onConflict: 'email' }));
    }
  };
}
