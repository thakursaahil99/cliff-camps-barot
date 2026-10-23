// Development-only data store: a JSON file in backend/.data, same interface as the Supabase store.
// Lets you run and test the whole booking flow locally without any accounts.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { unavailableNights } from '../services/availability.js';
import { conflict } from '../utils/http.js';

const DATA_DIR = process.env.MEMORY_DB_DIR || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.data');
const FILE = path.join(DATA_DIR, 'dev-db.json');
const PROOFS = path.join(DATA_DIR, 'proofs');

const empty = () => ({ tents: [], bookings: [], blocked_dates: [], payments: [], admins: [] });

function load() {
  try {
    return { ...empty(), ...JSON.parse(fs.readFileSync(FILE, 'utf8')) };
  } catch {
    return empty();
  }
}

export function createMemoryStore() {
  const db = load();
  const save = () => {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
  };
  const now = () => new Date().toISOString();
  const clone = (x) => (x ? structuredClone(x) : null);
  const patchRow = (table, id, patch) => {
    const row = db[table].find((r) => r.id === id);
    if (!row) return null;
    Object.assign(row, patch, 'updated_at' in row ? { updated_at: now() } : {});
    save();
    return clone(row);
  };
  const overlaps = (b, from, to) => b.check_in < to && b.check_out > from;

  return {
    kind: 'memory',

    async ping() {
      return { ok: true, tents: db.tents.length };
    },

    // ---- tents
    async listTents({ includeInactive = false } = {}) {
      return clone(db.tents.filter((t) => includeInactive || t.active).sort((a, b) => a.sort_order - b.sort_order || a.price_per_night - b.price_per_night));
    },
    async getTent(id) {
      return clone(db.tents.find((t) => t.id === id));
    },
    async findTentByName(name) {
      return clone(db.tents.find((t) => t.name === name));
    },
    async createTent(data) {
      const row = { id: crypto.randomUUID(), units: 1, active: true, images: [], amenities: [], sort_order: 0, created_at: now(), updated_at: now(), ...data };
      db.tents.push(row);
      save();
      return clone(row);
    },
    async updateTent(id, patch) {
      return patchRow('tents', id, patch);
    },

    // ---- availability
    async getStayData(from, to, tentId = null) {
      return {
        bookings: clone(db.bookings.filter((b) => ['pending', 'confirmed'].includes(b.status) && overlaps(b, from, to) && (!tentId || b.tent_id === tentId))),
        blocks: clone(db.blocked_dates.filter((d) => d.date >= from && d.date < to && (!tentId || !d.tent_id || d.tent_id === tentId)))
      };
    },

    // ---- bookings
    /** Atomic: the check and the insert run in one synchronous step, so two requests can't both win. */
    async createBooking(row) {
      const tent = db.tents.find((t) => t.id === row.tent_id && t.active);
      if (!tent) throw conflict('This tent is not available for booking');
      const bookings = db.bookings.filter((b) => ['pending', 'confirmed'].includes(b.status) && overlaps(b, row.check_in, row.check_out));
      const blocks = db.blocked_dates.filter((d) => d.date >= row.check_in && d.date < row.check_out);
      if (unavailableNights(tent, row.check_in, row.check_out, bookings, blocks).length) {
        throw conflict('Sorry, those dates were just booked. Please choose different dates.');
      }
      const booking = { id: crypto.randomUUID(), status: 'pending', payment_status: 'unpaid', amount_paid: 0, admin_notes: null, created_at: now(), updated_at: now(), ...row };
      db.bookings.push(booking);
      save();
      return clone(booking);
    },
    async getBooking(id) {
      return clone(db.bookings.find((b) => b.id === id));
    },
    async listBookings({ status, payment_status, q, from, to, limit = 200 } = {}) {
      const needle = q?.toLowerCase();
      return clone(
        db.bookings
          .filter((b) => (!status || b.status === status) && (!payment_status || b.payment_status === payment_status))
          .filter((b) => (!from || b.check_out > from) && (!to || b.check_in < to))
          .filter((b) => !needle || [b.guest_name, b.email, b.phone, b.code].some((v) => v?.toLowerCase().includes(needle)))
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .slice(0, limit)
          .map((b) => ({ ...b, tent: pick(db.tents.find((t) => t.id === b.tent_id)) }))
      );
    },
    async updateBooking(id, patch) {
      return patchRow('bookings', id, patch);
    },

    // ---- payments
    async createPayment(data) {
      const row = { id: crypto.randomUUID(), status: 'created', txn_id: null, provider_order_id: null, provider_payment_id: null, proof_path: null, notes: null, created_at: now(), updated_at: now(), ...data };
      db.payments.push(row);
      save();
      return clone(row);
    },
    async getPayment(id) {
      return clone(db.payments.find((p) => p.id === id));
    },
    async updatePayment(id, patch) {
      return patchRow('payments', id, patch);
    },
    /** Compare-and-set: only updates if the payment is still in one of `fromStatuses`. */
    async transitionPayment(id, fromStatuses, patch) {
      const row = db.payments.find((p) => p.id === id);
      if (!row || !fromStatuses.includes(row.status)) return null;
      return patchRow('payments', id, patch);
    },
    async findPaymentByOrderId(orderId) {
      return clone(db.payments.find((p) => p.provider_order_id === orderId));
    },
    async findPaymentByTxnId(txnId) {
      return clone(db.payments.find((p) => p.txn_id && p.txn_id.toLowerCase() === txnId.toLowerCase()));
    },
    async listPayments({ status, booking_id, limit = 200 } = {}) {
      return clone(
        db.payments
          .filter((p) => (!status || p.status === status) && (!booking_id || p.booking_id === booking_id))
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .slice(0, limit)
          .map((p) => {
            const b = db.bookings.find((x) => x.id === p.booking_id);
            return { ...p, booking: b ? { id: b.id, code: b.code, guest_name: b.guest_name, phone: b.phone, total_price: b.total_price, check_in: b.check_in, check_out: b.check_out, status: b.status } : null };
          })
      );
    },
    async saveProof(paymentId, buffer, mime) {
      fs.mkdirSync(PROOFS, { recursive: true });
      const name = `${paymentId}.${mime.split('/')[1]}`;
      fs.writeFileSync(path.join(PROOFS, name), buffer);
      return name;
    },
    async getProofUrl(proofPath) {
      const buf = fs.readFileSync(path.join(PROOFS, path.basename(proofPath)));
      return `data:image/${path.extname(proofPath).slice(1)};base64,${buf.toString('base64')}`;
    },

    // ---- blocked dates
    async listBlocks({ from, to } = {}) {
      return clone(db.blocked_dates.filter((d) => (!from || d.date >= from) && (!to || d.date < to)).sort((a, b) => a.date.localeCompare(b.date)));
    },
    async addBlocks(rows) {
      const created = rows.map((r) => ({ id: crypto.randomUUID(), tent_id: null, units: null, reason: null, source: 'manual', created_at: now(), ...r }));
      db.blocked_dates.push(...created);
      save();
      return clone(created);
    },
    async deleteBlock(id) {
      const before = db.blocked_dates.length;
      db.blocked_dates = db.blocked_dates.filter((d) => d.id !== id);
      save();
      return before !== db.blocked_dates.length;
    },
    async replaceBlocksBySource(source, rows) {
      db.blocked_dates = db.blocked_dates.filter((d) => d.source !== source);
      const created = rows.map((r) => ({ id: crypto.randomUUID(), tent_id: null, units: null, reason: null, created_at: now(), ...r, source }));
      db.blocked_dates.push(...created);
      save();
      return created.length;
    },

    // ---- admins
    async getAdminByEmail(email) {
      return clone(db.admins.find((a) => a.email === email.toLowerCase()));
    },
    async upsertAdmin(email, password_hash) {
      const existing = db.admins.find((a) => a.email === email.toLowerCase());
      if (existing) existing.password_hash = password_hash;
      else db.admins.push({ id: crypto.randomUUID(), email: email.toLowerCase(), password_hash, created_at: now() });
      save();
    }
  };
}

const pick = (t) => (t ? { id: t.id, name: t.name } : null);
