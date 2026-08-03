import { CalendarClock, Clock } from 'lucide-react';

function timeUntil(deadline) {
  const diffMs = new Date(deadline).getTime() - Date.now();
  if (diffMs <= 0) return 'now';
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours}h`;
  return `in ${Math.round(hours / 24)}d`;
}

export default function MeetingsRail({ meetings }) {
  const sorted = [...meetings].sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

  return (
    <div className="surface-card sticky top-24 p-4">
      <div className="flex items-center justify-between">
        <p className="text-eyebrow text-muted-foreground">Upcoming meetings</p>
        <CalendarClock className="h-4 w-4 text-muted-foreground" />
      </div>
      {sorted.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No meetings scheduled.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {sorted.map((m) => {
            const mins = (new Date(m.deadline).getTime() - Date.now()) / 60000;
            const imminent = mins < 120;
            return (
              <li
                key={m.id}
                className={`rounded-xl border border-border bg-surface-2/60 p-3 transition-colors hover:border-signal/40 ${
                  imminent ? 'border-signal/40 bg-signal-soft/40' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13px] font-medium leading-snug">{m.task_text}</p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] ${
                      imminent ? 'bg-signal text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {timeUntil(m.deadline)}
                  </span>
                </div>
                <p className="mt-1.5 flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {new Date(m.deadline).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
