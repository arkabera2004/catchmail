import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../lib/api.js';
import AppHeader from '../components/AppHeader.jsx';
import { Eyebrow } from '../components/Brand.jsx';
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

function EventPill({ event, compact }) {
  return (
    <a
      href={event.htmlLink}
      target="_blank"
      rel="noreferrer"
      className={`block rounded-lg border border-signal/30 bg-signal-soft px-2 py-1.5 text-signal-foreground truncate transition-transform hover:-translate-y-0.5 ${
        compact ? 'text-[11px]' : 'text-xs'
      }`}
      title={event.summary}
    >
      {!event.allDay && (
        <span className="opacity-70 mr-1 font-mono">
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
    <div className="max-h-[640px] overflow-y-auto">
      {allDay.length > 0 && (
        <div className="px-3 py-2 border-b border-border space-y-1">
          {allDay.map((e) => (
            <EventPill key={e.id} event={e} />
          ))}
        </div>
      )}
      {hours.map((eventsInHour, hour) => (
        <div key={hour} className="grid grid-cols-[72px_1fr] border-b border-border">
          <div className="border-r border-border px-3 py-3 text-right font-mono text-[11px] text-muted-foreground">
            {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
          </div>
          <div className="min-h-14 space-y-1.5 p-2">
            {eventsInHour.map((e) => (
              <EventPill key={e.id} event={e} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DayView({ events }) {
  const sorted = useMemo(() => [...events].sort((a, b) => new Date(a.start) - new Date(b.start)), [events]);

  return (
    <div className="p-5">
      {sorted.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">Nothing scheduled. Enjoy it.</p>
      ) : (
        <ol className="space-y-2">
          {sorted.map((e) => (
            <li key={e.id} className="flex items-start gap-4 rounded-xl border border-border bg-surface-2/50 p-4 transition-colors hover:border-signal/40">
              <p className="w-20 shrink-0 text-right font-mono text-sm text-muted-foreground">
                {e.allDay ? 'All day' : new Date(e.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </p>
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-signal" />
              <a href={e.htmlLink} target="_blank" rel="noreferrer" className="min-w-0 flex-1 text-[15px] font-medium hover:text-signal truncate">
                {e.summary}
              </a>
            </li>
          ))}
        </ol>
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
    <div className="grid grid-cols-7 divide-x divide-border overflow-x-auto">
      {days.map((day) => {
        const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
        const dayEvents = grouped.get(key) || [];
        const isToday = day.toDateString() === todayKey;
        return (
          <div key={key} className={`min-w-[132px] ${isToday ? 'bg-signal-soft/20' : ''}`}>
            <div className="border-b border-border px-3 py-3 text-center">
              <p className="text-eyebrow text-muted-foreground">{WEEKDAY_LABELS[day.getDay()]}</p>
              <p className={`font-display mx-auto mt-1 grid h-9 w-9 place-items-center rounded-full text-2xl leading-none ${isToday ? 'bg-signal text-primary-foreground' : ''}`}>
                {day.getDate()}
              </p>
            </div>
            <div className="min-h-[420px] space-y-1.5 p-2">
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
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAY_LABELS.map((label) => (
          <p key={label} className="text-eyebrow px-3 py-2.5 text-muted-foreground">
            {label}
          </p>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
          const dayEvents = grouped.get(key) || [];
          const inMonth = day.getMonth() === anchor.getMonth();
          const isToday = day.toDateString() === todayKey;
          const shown = dayEvents.slice(0, 2);
          const extra = dayEvents.length - shown.length;
          return (
            <div
              key={key}
              className={`min-h-[110px] border-b border-r border-border p-2 ${
                !inMonth ? 'bg-surface-2/40 text-muted-foreground/60' : ''
              } ${isToday ? 'bg-signal-soft/25' : ''}`}
            >
              <p className={`mb-1.5 grid h-7 w-7 place-items-center rounded-full font-mono text-[12px] ${isToday ? 'bg-signal text-primary-foreground' : ''}`}>
                {day.getDate()}
              </p>
              <div className="space-y-1">
                {shown.map((e) => (
                  <EventPill key={e.id} event={e} compact />
                ))}
                {extra > 0 && <p className="px-1 font-mono text-[10px] text-muted-foreground">+{extra} more</p>}
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
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />

      <main className="mx-auto w-full max-w-6xl px-5 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Eyebrow>From your inbox</Eyebrow>
            <h1 className="font-display mt-2 text-3xl md:text-4xl">Calendar</h1>
          </div>
        </div>

        <div className="surface-card mt-8 overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
            <div className="flex items-center gap-1">
              <button
                onClick={() => step(-1)}
                aria-label="Previous"
                className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => step(1)}
                aria-label="Next"
                className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button onClick={() => setAnchor(new Date())} className="ml-1 h-9 rounded-full border border-border px-4 text-sm hover:bg-accent transition">
                Today
              </button>
            </div>
            <p className="font-display text-xl leading-none">{formatRangeLabel(view, anchor)}</p>
            <div className="ml-auto flex items-center gap-1 rounded-full border border-border bg-surface-2/70 p-1">
              {VIEWS.map((v) => (
                <button
                  key={v.value}
                  onClick={() => setView(v.value)}
                  className={`rounded-full px-3.5 py-1.5 text-[13px] transition-all ${
                    view === v.value ? 'bg-surface text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="text-sm bg-destructive/10 text-destructive px-4 py-2.5">Couldn't load your calendar: {error}</div>
          )}

          {loading ? (
            <div className="text-center text-muted-foreground py-16">Loading…</div>
          ) : (
            <div className="animate-fade-in" key={view}>
              {view === 'hour' && <HourView events={events} />}
              {view === 'day' && <DayView events={events} />}
              {view === 'week' && <WeekView events={events} anchor={anchor} />}
              {view === 'month' && <MonthView events={events} anchor={anchor} />}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
