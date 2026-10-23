// End-to-end API test: real Express app + isolated JSON store, Razorpay HTTP API stubbed.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cliffcamps-test-'));
Object.assign(process.env, {
  NODE_ENV: 'test',
  USE_MEMORY_DB: 'true',
  MEMORY_DB_DIR: dir,
  JWT_SECRET: 'test-secret-test-secret-test-secret-123',
  SITE_URL: 'http://localhost:5173',
  ADMIN_EMAIL: 'admin@example.com',
  ADMIN_PASSWORD: 'correct-horse-battery',
  UPI_ID: 'cliffcamps@upi',
  RAZORPAY_KEY_ID: 'rzp_test_dummy',
  RAZORPAY_KEY_SECRET: 'rzp_secret',
  RAZORPAY_WEBHOOK_SECRET: 'whsec',
  PAYMENTS_LIVE: 'false',
  ADVANCE_PERCENT: '30',
  AIRBNB_ICAL_URL: ''
});

// Stub only Razorpay's order API; everything else goes to the real network stack (our local server)
const realFetch = globalThis.fetch;
let orderSeq = 0;
globalThis.fetch = async (url, opts) => {
  if (String(url).startsWith('https://api.razorpay.com/v1/orders')) {
    const body = JSON.parse(opts.body);
    return new Response(JSON.stringify({ id: `order_test${++orderSeq}`, amount: body.amount, currency: 'INR' }), { status: 200 });
  }
  return realFetch(url, opts);
};

const { createApp } = await import('../src/app.js');
const { todayIST, addDays } = await import('../src/utils/dates.js');
await import('../scripts/seed.js');

let server, base, adminToken, tents;
const D = (n) => addDays(todayIST(), n);

async function api(method, url, body, headers = {}) {
  const res = await realFetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body)
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json, headers: res.headers };
}
const admin = (method, url, body) => api(method, url, body, { Authorization: `Bearer ${adminToken}` });
const guest = (over = {}) => ({
  tent_id: tents.find((t) => t.name === 'Riverside Swiss Tent').id,
  check_in: D(10), check_out: D(12), guests: 2,
  guest_name: 'Test Guest', phone: '9876543210', email: 'guest@example.com', notes: 'Veg meals please', payment_method: 'upi',
  ...over
});
const outbox = () => (fs.existsSync(path.join(dir, 'outbox')) ? fs.readdirSync(path.join(dir, 'outbox')) : []);

before(async () => {
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => {
  server.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

test('health, config, tents', async () => {
  const h = await api('GET', '/health');
  assert.equal(h.status, 200);
  assert.equal(h.body.status, 'ok');
  const c = await api('GET', '/config');
  assert.equal(c.body.payments.upi.enabled, true);
  assert.equal(c.body.payments.razorpay.enabled, true);
  assert.equal(c.body.payments.razorpay.keyId, 'rzp_test_dummy');
  assert.equal(JSON.stringify(c.body).includes('rzp_secret'), false, 'secrets must never reach the browser');
  const t = await api('GET', '/tents');
  tents = t.body.tents;
  assert.equal(tents.length, 1);
});

test('validation and CORS', async () => {
  const bad = await api('POST', '/bookings', guest({ email: 'nope', check_out: D(9) }));
  assert.equal(bad.status, 400);
  assert.ok(bad.body.fields.email);
  const past = await api('POST', '/bookings', guest({ check_in: D(-2), check_out: D(1) }));
  assert.equal(past.status, 400);
  const tooMany = await api('POST', '/bookings', guest({ guests: 5 }));
  assert.equal(tooMany.status, 400);
  const bot = await api('POST', '/bookings', guest({ website: 'spam.example' }));
  assert.equal(bot.status, 400);
  const cors = await api('GET', '/tents', undefined, { Origin: 'https://evil.example' });
  assert.equal(cors.status, 403);
  const ok = await api('GET', '/tents', undefined, { Origin: 'http://localhost:5173' });
  assert.equal(ok.headers.get('access-control-allow-origin'), 'http://localhost:5173');
});

let booking, token;
test('create booking -> pending, emails, guest page, WhatsApp link', async () => {
  const before = outbox().length;
  const r = await api('POST', '/bookings', guest());
  assert.equal(r.status, 201, JSON.stringify(r.body));
  booking = r.body.booking;
  token = r.body.token;
  assert.equal(booking.status, 'pending');
  assert.equal(booking.nights, 2);
  assert.equal(booking.total_price, 5000);
  assert.equal(booking.advance_amount, 1500);
  assert.match(booking.code, /^CC-[A-Z2-9]{6}$/);
  assert.match(r.body.whatsappUrl, /^https:\/\/wa\.me\/918219850117\?text=/);
  assert.equal(outbox().length, before + 2, 'guest confirmation + admin alert');

  const page = await api('GET', `/bookings/${booking.id}?t=${token}`);
  assert.equal(page.status, 200);
  assert.equal(page.body.upi.advance.amount, 1500);
  assert.equal(page.body.upi.advance.uri, `upi://pay?pa=cliffcamps%40upi&pn=Cliff%20Camps&am=1500.00&cu=INR&tn=${booking.code}`);
  const wrong = await api('GET', `/bookings/${booking.id}?t=${'x'.repeat(32)}`);
  assert.equal(wrong.status, 404);
});

test('double booking is prevented, including under concurrent requests', async () => {
  // Riverside has 4 units and already 1 booking on these nights -> 3 more fit, the 5th is refused
  for (let i = 0; i < 3; i++) assert.equal((await api('POST', '/bookings', guest({ email: `g${i}@example.com` }))).status, 201);
  const full = await api('POST', '/bookings', guest({ email: 'late@example.com' }));
  assert.equal(full.status, 409);

  const avail = await api('GET', `/availability?tent_id=${booking.tent.id}&from=${D(0)}&to=${D(30)}`);
  assert.deepEqual(avail.body.unavailable, [D(10), D(11)]);
  // Check-out day of a full stay is bookable as a check-in
  assert.equal((await api('POST', '/bookings', guest({ check_in: D(12), check_out: D(13), email: 'next@example.com' }))).status, 201);

  // 4 units, fire 6 requests at once -> exactly 4 succeed
  const results = await Promise.all(
    Array.from({ length: 6 }, (_, i) => api('POST', '/bookings', guest({ guests: 3, check_in: D(40), check_out: D(43), email: `c${i}@example.com` })))
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 201, 201, 201, 409, 409]);
  // A 4th guest is more than the tent sleeps
  assert.equal((await api('POST', '/bookings', guest({ guests: 4, check_in: D(50), check_out: D(51), email: 'big@example.com' }))).status, 400);
});

test('admin auth', async () => {
  assert.equal((await api('GET', '/admin/bookings')).status, 401);
  assert.equal((await api('POST', '/admin/login', { email: 'admin@example.com', password: 'wrong' })).status, 401);
  const r = await api('POST', '/admin/login', { email: 'admin@example.com', password: 'correct-horse-battery' });
  assert.equal(r.status, 200);
  adminToken = r.body.token;
  assert.equal((await admin('GET', '/admin/me')).body.admin.email, 'admin@example.com');
});

test('UPI: guest submits txn + screenshot -> admin verifies -> booking confirmed + receipt', async () => {
  const png = 'data:image/png;base64,' + Buffer.from('89504e470d0a1a0a', 'hex').toString('base64');
  const r = await api('POST', `/bookings/${booking.id}/payments/upi`, { t: token, txn_id: '412345678901', screenshot: png });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.booking.payment_status, 'proof_submitted');
  assert.equal(r.body.booking.payments[0].amount, 1500);

  // Same transaction ID can't be reused, and a second proof waits for the first
  const dup = await api('POST', `/bookings/${booking.id}/payments/upi`, { t: token, txn_id: '412345678901' });
  assert.equal(dup.status, 409);

  const pending = await admin('GET', '/admin/payments?status=submitted');
  const p = pending.body.payments.find((x) => x.booking_id === booking.id);
  assert.ok(p);
  assert.equal(p.booking.code, booking.code);
  const proof = await admin('GET', `/admin/payments/${p.id}/proof`);
  assert.match(proof.body.url, /^data:image\/png;base64,/);

  const before = outbox().length;
  const v = await admin('PATCH', `/admin/payments/${p.id}`, { action: 'verify' });
  assert.equal(v.status, 200);
  assert.equal(v.body.booking.status, 'confirmed');
  assert.equal(v.body.booking.payment_status, 'advance_paid');
  assert.equal(Number(v.body.booking.amount_paid), 1500);
  assert.ok(outbox().slice(before).some((f) => f.includes('confirmed')), 'receipt email sent');

  // Balance paid at the property
  const paid = await admin('PATCH', `/admin/bookings/${booking.id}`, { action: 'mark_paid' });
  assert.equal(paid.body.booking.payment_status, 'paid');
  assert.equal(Number(paid.body.booking.amount_paid), 5000);
  const page = await api('GET', `/bookings/${booking.id}?t=${token}`);
  assert.equal(page.body.booking.balance_due, 0);
  assert.equal((await api('POST', `/bookings/${booking.id}/payments/upi`, { t: token, txn_id: '999999999999' })).status, 409);
});

test('Razorpay: order -> bad signature refused -> valid signature captures; webhook is idempotent', async () => {
  const r = await api('POST', '/bookings', guest({ check_in: D(60), check_out: D(61), payment_method: 'razorpay', email: 'rzp@example.com' }));
  const b = r.body.booking;
  const t = r.body.token;
  const o = await api('POST', `/bookings/${b.id}/payments/order`, { t, type: 'advance' });
  assert.equal(o.status, 201, JSON.stringify(o.body));
  assert.equal(o.body.order.amount, 75000, '30% of ₹2500 in paise');
  const orderId = o.body.order.orderId;

  const forged = await api('POST', `/bookings/${b.id}/payments/razorpay/verify`, { t, razorpay_order_id: orderId, razorpay_payment_id: 'pay_X1', razorpay_signature: 'f'.repeat(64) });
  assert.equal(forged.status, 400);

  const sig = crypto.createHmac('sha256', 'rzp_secret').update(`${orderId}|pay_X1`).digest('hex');
  const ok = await api('POST', `/bookings/${b.id}/payments/razorpay/verify`, { t, razorpay_order_id: orderId, razorpay_payment_id: 'pay_X1', razorpay_signature: sig });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  assert.equal(ok.body.booking.status, 'confirmed');
  assert.equal(ok.body.booking.amount_paid, 750);

  // payment.captured webhook for the same order: signature checked, no double counting
  const event = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_X1', order_id: orderId, amount: 75000, status: 'captured' } } } });
  const badHook = await api('POST', '/webhooks/razorpay', event, { 'X-Razorpay-Signature': 'nope' });
  assert.equal(badHook.status, 400);
  const hookSig = crypto.createHmac('sha256', 'whsec').update(event).digest('hex');
  const hook = await api('POST', '/webhooks/razorpay', event, { 'X-Razorpay-Signature': hookSig });
  assert.equal(hook.status, 200);
  const page = await api('GET', `/bookings/${b.id}?t=${t}`);
  assert.equal(page.body.booking.amount_paid, 750);

  // Webhook alone (guest closed the tab before the callback) also confirms
  const r2 = await api('POST', '/bookings', guest({ check_in: D(70), check_out: D(71), email: 'rzp2@example.com' }));
  const o2 = await api('POST', `/bookings/${r2.body.booking.id}/payments/order`, { t: r2.body.token, type: 'full' });
  const ev2 = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_Y2', order_id: o2.body.order.orderId, amount: o2.body.order.amount } } } });
  await api('POST', '/webhooks/razorpay', ev2, { 'X-Razorpay-Signature': crypto.createHmac('sha256', 'whsec').update(ev2).digest('hex') });
  const page2 = await api('GET', `/bookings/${r2.body.booking.id}?t=${r2.body.token}`);
  assert.equal(page2.body.booking.status, 'confirmed');
  assert.equal(page2.body.booking.payment_status, 'paid');
});

test('admin: block dates, tent prices, cancel frees dates, iCal feed', async () => {
  const tentId = tents[0].id;
  const blk = await admin('POST', '/admin/blocked-dates', { tent_id: null, from: D(80), to: D(81), reason: 'Private event' });
  assert.equal(blk.status, 201);
  assert.equal(blk.body.blocked.length, 2);
  const avail = await api('GET', `/availability?tent_id=${tentId}&from=${D(79)}&to=${D(83)}`);
  assert.deepEqual(avail.body.unavailable, [D(80), D(81)]);
  assert.equal((await api('POST', '/bookings', guest({ check_in: D(81), check_out: D(82) }))).status, 409);
  assert.equal((await admin('DELETE', `/admin/blocked-dates/${blk.body.blocked[0].id}`)).status, 204);

  const price = await admin('PATCH', `/admin/tents/${tentId}`, { price_per_night: 2800 });
  assert.equal(Number(price.body.tent.price_per_night), 2800);
  const q = await api('POST', '/bookings', guest({ check_in: D(90), check_out: D(91), email: 'price@example.com' }));
  assert.equal(q.body.booking.total_price, 2800);

  const list = await admin('GET', `/admin/bookings?status=pending&q=price@`);
  assert.equal(list.body.bookings.length, 1);
  const cancel = await admin('PATCH', `/admin/bookings/${q.body.booking.id}`, { action: 'cancel' });
  assert.equal(cancel.body.booking.status, 'cancelled');

  const ics = await api('GET', '/calendar.ics');
  assert.equal(ics.status, 200);
  assert.match(ics.headers.get('content-type'), /text\/calendar/);
  assert.match(ics.body, new RegExp(`DTSTART;VALUE=DATE:${D(10).replace(/-/g, '')}`));
  assert.doesNotMatch(ics.body, new RegExp(`DTSTART;VALUE=DATE:${D(90).replace(/-/g, '')}`), 'cancelled booking not exported');
});

test('Netlify function wrapper serves the same API', async () => {
  const { handler } = await import('../netlify/functions/api.js');
  const res = await handler({ path: '/.netlify/functions/api/tents', httpMethod: 'GET', headers: {}, queryStringParameters: {}, body: null, isBase64Encoded: false }, {});
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.body).tents.length, 1);
  const event = JSON.stringify({ event: 'payment.authorized', payload: { payment: { entity: {} } } });
  const hook = await handler({ path: '/api/webhooks/razorpay', httpMethod: 'POST', headers: { 'content-type': 'application/json', 'x-razorpay-signature': crypto.createHmac('sha256', 'whsec').update(event).digest('hex') }, body: event, isBase64Encoded: false }, {});
  assert.equal(hook.statusCode, 200, hook.body);
});
