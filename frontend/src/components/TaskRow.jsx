import { Check, Star, ThumbsUp, ThumbsDown, Trash2, CornerUpRight } from 'lucide-react';

const CONFIDENCE_STYLES = {
  high: 'bg-signal-soft text-signal-foreground',
  medium: 'bg-amber-soft text-amber',
  low: 'bg-muted text-muted-foreground',
};

function isSnoozed(task) {
  return task.snoozed_until && new Date(task.snoozed_until).getTime() > Date.now();
}

function snoozeOffsetDate(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

/** Builds a mailto: link pre-filled to delegate a task — subject/body only,
 * since composing a true Gmail "Forward" (with the original message quoted)
 * would need the Gmail compose OAuth scope, which this app doesn't request. */
export function buildForwardMailto(task) {
  const subject = `Fwd: ${task.source_email_subject || task.task_text}`;
  const bodyLines = [
    `Can you take care of this: ${task.task_text}`,
    '',
    task.source_email_link ? `Original email: ${task.source_email_link}` : null,
  ].filter(Boolean);
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join('\n'))}`;
}

export default function TaskRow({ task, onToggleDone, onDeadlineChange, onDelete, onFeedback, onSnooze }) {
  const deadlineValue = task.deadline ? task.deadline.slice(0, 10) : '';

  return (
    <li className="group relative flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2/60">
      <button
        onClick={() => onToggleDone(task)}
        aria-label={task.status === 'done' ? 'Mark as open' : 'Mark as done'}
        className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-all ${
          task.status === 'done'
            ? 'border-signal bg-signal text-primary-foreground'
            : 'border-border hover:border-signal hover:bg-signal-soft'
        }`}
      >
        {task.status === 'done' && <Check className="h-3.5 w-3.5" />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={`text-[15px] leading-snug tracking-[-0.005em] ${task.status === 'done' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
            {task.task_text}
          </p>
          {task.is_vip && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-soft px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber">
              <Star className="h-3 w-3 fill-current" /> VIP
            </span>
          )}
          <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${CONFIDENCE_STYLES[task.confidence] || CONFIDENCE_STYLES.low}`}>
            {task.confidence || 'low'}
          </span>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <a href={task.source_email_link} target="_blank" rel="noreferrer" className="text-xs text-signal hover:underline">
            View source email
          </a>
          {task.calendar_event_id && <span className="text-xs text-muted-foreground">On calendar</span>}
          <a href={buildForwardMailto(task)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-signal">
            <CornerUpRight className="h-3 w-3" /> Forward
          </a>

          <input
            type="date"
            value={deadlineValue}
            onChange={(e) => onDeadlineChange(task, e.target.value)}
            className="text-xs border border-border rounded-full px-2 py-1 bg-surface-2/70 text-foreground focus:outline-none focus:ring-2 focus:ring-ring [color-scheme:light] dark:[color-scheme:dark]"
          />

          {onSnooze &&
            (isSnoozed(task) ? (
              <button
                onClick={() => onSnooze(task, null)}
                className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground hover:text-foreground whitespace-nowrap"
              >
                Snoozed till {new Date(task.snoozed_until).toLocaleDateString()} · Unsnooze
              </button>
            ) : (
              <select
                value=""
                onChange={(e) => {
                  const days = Number(e.target.value);
                  if (days) onSnooze(task, snoozeOffsetDate(days));
                }}
                className="text-xs border border-border rounded-full px-2 py-1 bg-surface-2/70 text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Snooze…</option>
                <option value="1">Tomorrow</option>
                <option value="3">3 days</option>
                <option value="7">1 week</option>
              </select>
            ))}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        {onFeedback && (
          <>
            <IconAction
              label="Good catch"
              active={task.feedback === 'up'}
              onClick={() => onFeedback(task, task.feedback === 'up' ? null : 'up')}
              icon={<ThumbsUp className="h-3.5 w-3.5" />}
            />
            <IconAction
              label="Not a task"
              active={task.feedback === 'down'}
              onClick={() => onFeedback(task, task.feedback === 'down' ? null : 'down')}
              icon={<ThumbsDown className="h-3.5 w-3.5" />}
            />
          </>
        )}
        <IconAction label="Delete" destructive onClick={() => onDelete(task)} icon={<Trash2 className="h-3.5 w-3.5" />} />
      </div>
    </li>
  );
}

function IconAction({ icon, label, onClick, active, destructive }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground ${
        active ? 'bg-signal-soft text-signal-foreground' : ''
      } ${destructive ? 'hover:bg-destructive/10 hover:text-destructive' : ''}`}
    >
      {icon}
    </button>
  );
}
