import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.USE_MEMORY_DB = 'true';
const { addDays, eachNight, isISODate, nightsBetween } = await import('../src/utils/dates.js');
const { unavailableNights, holdsInventory } = await import('../src/services/availability.js');
const { parseIcs, nightsFromEvents, toRanges, buildIcs } = await import('../src/services/ical.js');
const { quote } = await import('../src/services/pricing.js');
const { bookingToken, verifyBookingToken } = await import('../src/utils/tokens.js');

test('date helpers', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(nightsBetween('2026-03-28', '2026-04-02'), 5);
  assert.deepEqual(eachNight('2026-01-30', '2026-02-02'), ['2026-01-30', '2026-01-31', '2026-02-01']);
  assert.equal(isISODate('2026-02-30'), false);
  assert.equal(isISODate('2026-02-28'), true);
});

test('pending bookings hold dates only for the hold window unless a payment is in progress', () => {
  const now = Date.now();
  assert.equal(holdsInventory({ status: 'pending', payment_status: 'unpaid', created_at: new Date(now - 3600e3).toISOString() }, now), true);
  assert.equal(holdsInventory({ status: 'pending', payment_status: 'unpaid', created_at: new Date(now - 48 * 3600e3).toISOString() }, now), false);
  assert.equal(holdsInventory({ status: 'pending', payment_status: 'proof_submitted', created_at: new Date(now - 48 * 3600e3).toISOString() }, now), true);
  assert.equal(holdsInventory({ status: 'cancelled', created_at: new Date(now).toISOString() }, now), false);
});

test('availability counts units, partial blocks and full closures', () => {
  const tent = { id: 't1', units: 2 };
  const created_at = new Date().toISOString();
  const bookings = [
    { id: 'a', tent_id: 't1', check_in: '2026-05-01', check_out: '2026-05-03', status: 'confirmed', created_at },
    { id: 'b', tent_id: 't1', check_in: '2026-05-02', check_out: '2026-05-04', status: 'pending', payment_status: 'unpaid', created_at },
    { id: 'c', tent_id: 'other', check_in: '2026-05-01', check_out: '2026-05-09', status: 'confirmed', created_at }
  ];
  const blocks = [
    { tent_id: 't1', date: '2026-05-05', units: 1, source: 'airbnb' },
    { tent_id: 't1', date: '2026-05-06', units: 1, source: 'airbnb' },
    { tent_id: 't1', date: '2026-05-06', units: 1, source: 'manual' },
    { tent_id: null, date: '2026-05-07', units: null, source: 'manual' }
  ];
  assert.deepEqual(unavailableNights(tent, '2026-05-01', '2026-05-09', bookings, blocks), ['2026-05-02', '2026-05-06', '2026-05-07']);
  // Excluding a booking frees its nights; ignoring Airbnb blocks is used for the export feed
  assert.deepEqual(unavailableNights(tent, '2026-05-01', '2026-05-09', bookings, blocks, { excludeBookingId: 'b', ignoreSource: 'airbnb' }), ['2026-05-07']);
});

test('iCal parse (Airbnb format, folded lines) and build round-trip', () => {
  const airbnb = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Airbnb Inc//Hosting Calendar 0.8.8//EN',
    'BEGIN:VEVENT', 'DTEND;VALUE=DATE:20260612', 'DTSTART;VALUE=DATE:20260610', 'UID:abc@airbnb.com',
    'DESCRIPTION:Reservation URL: https://www.airbnb.com/hosting/reservations/details/HM\r\n 123', 'SUMMARY:Reserved', 'END:VEVENT',
    'BEGIN:VEVENT', 'DTEND;VALUE=DATE:20260616', 'DTSTART;VALUE=DATE:20260615', 'UID:def@airbnb.com', 'SUMMARY:Airbnb (Not available)', 'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
  const events = parseIcs(airbnb);
  assert.equal(events.length, 2);
  assert.deepEqual(nightsFromEvents(events), ['2026-06-10', '2026-06-11', '2026-06-15']);
  const ranges = toRanges(['2026-06-11', '2026-06-10', '2026-06-15']);
  assert.deepEqual(ranges, [{ start: '2026-06-10', end: '2026-06-12' }, { start: '2026-06-15', end: '2026-06-16' }]);
  const ics = buildIcs({ name: 'Test, calendar', ranges });
  assert.match(ics, /DTSTART;VALUE=DATE:20260610\r\nDTEND;VALUE=DATE:20260612/);
  assert.match(ics, /X-WR-CALNAME:Test\\, calendar/);
  assert.deepEqual(nightsFromEvents(parseIcs(ics)), ['2026-06-10', '2026-06-11', '2026-06-15']);
});

test('quote: nights x rate, advance rounded up', () => {
  const q = quote({ price_per_night: 2499 }, '2026-05-01', '2026-05-04');
  assert.equal(q.nights, 3);
  assert.equal(q.subtotal, 7497);
  assert.equal(q.total_price, 7497);
  assert.equal(q.advance_amount, Math.ceil(7497 * 0.3));
});

test('guest booking tokens verify only for their booking', () => {
  const t = bookingToken('11111111-1111-4111-8111-111111111111');
  assert.equal(verifyBookingToken('11111111-1111-4111-8111-111111111111', t), true);
  assert.equal(verifyBookingToken('22222222-2222-4222-8222-222222222222', t), false);
  assert.equal(verifyBookingToken('11111111-1111-4111-8111-111111111111', 'x'), false);
});
