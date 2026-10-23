// Minimal iCalendar (RFC 5545) reader/writer for all-day availability calendars (Airbnb style).
import { addDays, eachNight, isISODate } from '../utils/dates.js';

function unfold(text) {
  return text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '').split('\n');
}

function toISO(value) {
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(value || '');
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** Returns [{ start, end, summary, uid }] with end exclusive (all-day semantics). */
export function parseIcs(text) {
  const events = [];
  let ev = null;
  for (const line of unfold(text)) {
    if (line === 'BEGIN:VEVENT') ev = {};
    else if (line === 'END:VEVENT') {
      if (ev?.start) {
        const end = ev.end && ev.end > ev.start ? ev.end : addDays(ev.start, 1);
        events.push({ start: ev.start, end, summary: ev.summary || '', uid: ev.uid || '' });
      }
      ev = null;
    } else if (ev) {
      const idx = line.indexOf(':');
      if (idx < 0) continue;
      const name = line.slice(0, idx).split(';')[0].toUpperCase();
      const value = line.slice(idx + 1).trim();
      if (name === 'DTSTART') ev.start = toISO(value);
      else if (name === 'DTEND') ev.end = toISO(value);
      else if (name === 'SUMMARY') ev.summary = value.replace(/\\([,;\\])/g, '$1').replace(/\\n/gi, ' ');
      else if (name === 'UID') ev.uid = value;
    }
  }
  return events.filter((e) => isISODate(e.start) && isISODate(e.end));
}

/** Every blocked night covered by the events (check-out day excluded). */
export const nightsFromEvents = (events) => [...new Set(events.flatMap((e) => eachNight(e.start, e.end)))].sort();

/** Groups sorted nights into contiguous [start, endExclusive) ranges. */
export function toRanges(nights) {
  const sorted = [...new Set(nights)].sort();
  const ranges = [];
  for (const d of sorted) {
    const last = ranges[ranges.length - 1];
    if (last && last.end === d) last.end = addDays(d, 1);
    else ranges.push({ start: d, end: addDays(d, 1) });
  }
  return ranges;
}

const icsDate = (d) => d.replace(/-/g, '');
const escText = (s) => String(s).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
const fold = (line) => (line.length <= 74 ? line : line.match(/.{1,73}/g).join('\r\n '));

export function buildIcs({ name, ranges, summary = 'Not available' }) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Cliff Camps Barot//Booking Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escText(name)}`
  ];
  for (const r of ranges) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${icsDate(r.start)}-${icsDate(r.end)}@cliffcamps-barot`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(r.start)}`,
      `DTEND;VALUE=DATE:${icsDate(r.end)}`,
      `SUMMARY:${escText(summary)}`,
      'TRANSP:OPAQUE',
      'END:VEVENT'
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
