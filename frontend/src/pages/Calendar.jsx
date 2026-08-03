import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import ThemeToggle from '../components/ThemeToggle.jsx';
import AccountMenu from '../components/AccountMenu.jsx';
import { getRangeForView, groupEventsByDay, groupEventsByHour, addDays } from '../lib/calendarViews.js';

const VIEWS = [
  { value: 'hour', label: 'Hourly' },
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
];

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatRangeLabel(view, anchor) {
  if (view === 'hour' || view === 'day') {
    return anchor.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }
  if (view === 'week') {
    const { start, end } = getRangeForView('week', anchor);
    const last = addDays(end, -1);
    return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${last.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }
  return anchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function EventPill({ event }) {
  return (
    <a
      href={event.htmlLink}
      target="_blank"
      rel="noreferrer"
      className="block text-xs px-2 py-1 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 truncate hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition"
      title={event.summary}
    >
      {!event.allDay && (
        <span className="opacity-70 mr-1">
          {new Date(event.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </span>
      )}
      {event.summary}
    </a>
  );
}

function HourView({ events }) {
  const { hours, allDay } = useMemo(() => groupEventsByHour(events), [events]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
      {allDay.length > 0 && (
        <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 space-y-1">
          {allDay.map((e) => (
            <EventPill key={e.id} event={e} />
          ))}
        </div>
      )}
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {hours.map((eventsInHour, hour) => (
          <div key={hour} className="flex gap-3 px-3 py-1.5">
            <span className="text-xs text-slate-400 dark:text-slate-500 w-14 flex-shrink-0 pt-0.5">
              {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
            </span>
            <div className="flex-1 space-y-1 min-w-0">
              {eventsInHour.map((e) => (
                <EventPill key={e.id} event={e} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DayView({ events }) {
  const sorted = useMemo(() => [...events].sort((a, b) => new Date(a.start) - new Date(b.start)), [events]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
      {sorted.length === 0 ? (
        <p className="text-center text-slate-400 dark:text-slate-500 py-8">No events today.</p>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {sorted.map((e) => (
            <div key={e.id} className="flex items-center gap-3 px-3 py-2">
              <span className="text-xs text-slate-400 dark:text-slate-500 w-20 flex-shrink-0">
                {e.allDay ? 'All day' : new Date(e.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </span>
              <a href={e.htmlLink} target="_blank" rel="noreferrer" className="text-sm text-slate-800 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 truncate">
                {e.summary}
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WeekView({ events, anchor }) {
  const { start } = getRangeForView('week', anchor);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(start, i)), [start]);
  const grouped = useMemo(() => groupEventsByDay(events), [events]);
  const todayKey = new Date().toDateString();

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((day) => {
        const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
        const dayEvents = grouped.get(key) || [];
        const isToday = day.toDateString() === todayKey;
        return (
          <div key={key} className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-2 min-h-[140px]">
            <p className={`text-xs font-semibold mb-1.5 ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
              {WEEKDAY_LABELS[day.getDay()]} {day.getDate()}
            </p>
            <div className="space-y-1">
              {dayEvents.map((e) => (
                <EventPill key={e.id} event={e} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthView({ events, anchor }) {
  const { start: monthStart } = getRangeForView('month', anchor);
  const gridStart = addDays(monthStart, -monthStart.getDay());
  const days = useMemo(() => Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)), [gridStart]);
  const grouped = useMemo(() => groupEventsByDay(events), [events]);
  const todayKey = new Date().toDateString();

  return (
    <div>
      <div className="grid grid-cols-7 gap-2 mb-1.5">
        {WEEKDAY_LABELS.map((label) => (
          <p key={label} className="text-xs font-semibold text-slate-400 dark:text-slate-500 text-center">
            {label}
          </p>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
          const dayEvents = grouped.get(key) || [];
          const inMonth = day.getMonth() === anchor.getMonth();
          const isToday = day.toDateString() === todayKey;
          const shown = dayEvents.slice(0, 3);
          const extra = dayEvents.length - shown.length;
          return (
            <div
              key={key}
              className={`rounded-lg border p-1.5 min-h-[90px] ${
                inMonth ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800' : 'bg-slate-50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800/50'
              }`}
            >
              <p className={`text-xs mb-1 ${isToday ? 'font-bold text-indigo-600 dark:text-indigo-400' : inMonth ? 'text-slate-600 dark:text-slate-300' : 'text-slate-300 dark:text-slate-600'}`}>
                {day.getDate()}
              </p>
              <div className="space-y-0.5">
                {shown.map((e) => (
                  <EventPill key={e.id} event={e} />
                ))}
                {extra > 0 && <p className="text-xs text-slate-400 dark:text-slate-500 px-2">+{extra} more</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('week');
  const [anchor, setAnchor] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.me().then(({ user }) => setUser(user)).catch(() => {});
  }, []);

  useEffect(() => {
    const { start, end } = getRangeForView(view, anchor);
    setLoading(true);
    setError(null);
    api
      .getCalendarEvents(start.toISOString(), end.toISOString())
      .then(({ events }) => setEvents(events))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [view, anchor]);

  function step(direction) {
    if (view === 'hour' || view === 'day') setAnchor((d) => addDays(d, direction));
    else if (view === 'week') setAnchor((d) => addDays(d, direction * 7));
    else setAnchor((d) => new Date(d.getFullYear(), d.getMonth() + direction, 1));
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-6 py-2.5 flex items-center justify-between">
          <Link to="/dashboard" className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
            CatchMail
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition">
              Back to dashboard
            </Link>
            <ThemeToggle />
            <AccountMenu user={user} />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-5">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => step(-1)}
              aria-label="Previous"
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              ‹
            </button>
            <button
              onClick={() => setAnchor(new Date())}
              className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Today
            </button>
            <button
              onClick={() => step(1)}
              aria-label="Next"
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              ›
            </button>
            <h1 className="text-sm font-semibold text-slate-900 dark:text-white ml-1">{formatRangeLabel(view, anchor)}</h1>
          </div>

          <div className="flex items-center gap-1 text-sm">
            {VIEWS.map((v) => (
              <button
                key={v.value}
                onClick={() => setView(v.value)}
                className={`px-3 py-1.5 rounded-full transition ${
                  view === v.value
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-3 text-sm bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 px-3 py-2 rounded-lg">
            Couldn't load your calendar: {error}
          </div>
        )}

        {loading ? (
          <div className="text-center text-slate-400 dark:text-slate-500 py-14">Loading…</div>
        ) : (
          <>
            {view === 'hour' && <HourView events={events} />}
            {view === 'day' && <DayView events={events} />}
            {view === 'week' && <WeekView events={events} anchor={anchor} />}
            {view === 'month' && <MonthView events={events} anchor={anchor} />}
          </>
        )}
      </main>
    </div>
  );
}
