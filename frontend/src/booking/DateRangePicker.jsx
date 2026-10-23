import { useMemo } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { addDaysISO, fromISO, toISO } from '../lib/format.js';
import { useMediaQuery } from '../lib/hooks.js';

/**
 * Check-in / check-out picker.
 * - `unavailable` holds booked nights (Set of 'YYYY-MM-DD'); they are greyed out and can't be a check-in.
 * - After choosing a check-in, check-out can be any day up to and including the next booked night
 *   (you leave that morning, the next guest arrives that afternoon).
 */
export default function DateRangePicker({ value, onChange, unavailable, today, maxDate, maxNights = 30, loading }) {
  const twoMonths = useMediaQuery('(min-width: 768px)');
  const { from, to } = value;
  const selecting = Boolean(from && !to);

  // Furthest allowed check-out once a check-in is picked
  const limit = useMemo(() => {
    if (!selecting) return null;
    let d = from;
    for (let n = 1; n <= maxNights; n++) {
      d = addDaysISO(from, n);
      if (unavailable.has(d) || d >= maxDate) return d;
    }
    return d;
  }, [selecting, from, unavailable, maxNights, maxDate]);

  const isDisabled = (date) => {
    const iso = toISO(date);
    if (iso < today || iso > maxDate) return true;
    if (selecting && iso > from) return iso > limit;
    if (selecting && iso === from) return false;
    return unavailable.has(iso);
  };

  const isBooked = (date) => {
    const iso = toISO(date);
    if (selecting && iso > from && iso <= limit) return false;
    return iso >= today && unavailable.has(iso);
  };

  const handleClick = (day) => {
    if (!day) return;
    const iso = toISO(day);
    if (!from || to || iso <= from) {
      if (unavailable.has(iso)) return;
      onChange({ from: iso, to: null });
    } else if (iso <= limit) {
      onChange({ from, to: iso });
    } else {
      onChange({ from: iso, to: null });
    }
  };

  return (
    <div className={`relative flex justify-center transition-opacity ${loading ? 'opacity-50' : ''}`} aria-busy={loading}>
      <DayPicker
        mode="range"
        selected={{ from: from ? fromISO(from) : undefined, to: to ? fromISO(to) : undefined }}
        onSelect={(_range, triggerDate) => handleClick(triggerDate)}
        disabled={isDisabled}
        modifiers={{ booked: isBooked }}
        modifiersClassNames={{ booked: 'cc-booked' }}
        numberOfMonths={twoMonths ? 2 : 1}
        startMonth={fromISO(today)}
        endMonth={fromISO(maxDate)}
        defaultMonth={from ? fromISO(from) : fromISO(today)}
        weekStartsOn={1}
        showOutsideDays={false}
        fixedWeeks
        aria-label="Choose check-in and check-out dates"
      />
    </div>
  );
}
