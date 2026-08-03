export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function startOfWeek(date) {
  const d = startOfDay(date);
  return addDays(d, -d.getDay()); // Sunday-start
}

export function startOfMonth(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Computes the [start, end) range to fetch/display for a given view mode,
 * anchored on `date`. "hour" and "day" both cover a single calendar day —
 * hour shows it as an hour-by-hour grid, day as a flat agenda list. */
export function getRangeForView(view, date) {
  if (view === 'hour' || view === 'day') {
    const start = startOfDay(date);
    return { start, end: addDays(start, 1) };
  }
  if (view === 'week') {
    const start = startOfWeek(date);
    return { start, end: addDays(start, 7) };
  }
  // month
  const start = startOfMonth(date);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  return { start, end };
}

function dayKey(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Groups events by their start day (yyyy-mm-dd), for week/month views. */
export function groupEventsByDay(events) {
  const map = new Map();
  for (const e of events) {
    const key = dayKey(e.start);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(e);
  }
  return map;
}

/** Splits a single day's events into 24 hour buckets (index = hour of day)
 * plus a separate all-day list, for the hourly view. */
export function groupEventsByHour(events) {
  const hours = Array.from({ length: 24 }, () => []);
  const allDay = [];
  for (const e of events) {
    if (e.allDay) {
      allDay.push(e);
      continue;
    }
    const hour = new Date(e.start).getHours();
    hours[hour].push(e);
  }
  return { hours, allDay };
}
