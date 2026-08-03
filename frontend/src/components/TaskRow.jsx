const CONFIDENCE_STYLES = {
  high: 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-400',
  low: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
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
    <div className="flex items-center gap-3 py-2 px-3 border-b border-slate-100 dark:border-slate-800 last:border-b-0 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
      <input
        type="checkbox"
        checked={task.status === 'done'}
        onChange={() => onToggleDone(task)}
        className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-800 text-indigo-600 focus:ring-indigo-500"
      />

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}>
          {task.is_vip && <span title="VIP sender" className="mr-1">⭐</span>}
          {task.task_text}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <a
            href={task.source_email_link}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-indigo-500 dark:text-indigo-400 hover:underline"
          >
            View source email
          </a>
          {task.calendar_event_id && (
            <span className="text-xs text-slate-400 dark:text-slate-500">&middot; on calendar</span>
          )}
          <a
            href={buildForwardMailto(task)}
            className="text-xs text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400"
          >
            &middot; Forward
          </a>
        </div>
      </div>

      <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${CONFIDENCE_STYLES[task.confidence] || CONFIDENCE_STYLES.low}`}>
        {task.confidence || 'low'}
      </span>

      {onFeedback && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onFeedback(task, task.feedback === 'up' ? null : 'up')}
            aria-label="Extraction was correct"
            className={`text-sm transition ${task.feedback === 'up' ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600 hover:text-emerald-500'}`}
          >
            👍
          </button>
          <button
            onClick={() => onFeedback(task, task.feedback === 'down' ? null : 'down')}
            aria-label="Extraction was wrong"
            className={`text-sm transition ${task.feedback === 'down' ? 'text-red-500' : 'text-slate-300 dark:text-slate-600 hover:text-red-500'}`}
          >
            👎
          </button>
        </div>
      )}

      <input
        type="date"
        value={deadlineValue}
        onChange={(e) => onDeadlineChange(task, e.target.value)}
        className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:light] dark:[color-scheme:dark]"
      />

      {onSnooze &&
        (isSnoozed(task) ? (
          <button
            onClick={() => onSnooze(task, null)}
            className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 whitespace-nowrap"
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
            className="text-xs border border-slate-200 dark:border-slate-700 rounded-full px-2 py-1 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Snooze…</option>
            <option value="1">Tomorrow</option>
            <option value="3">3 days</option>
            <option value="7">1 week</option>
          </select>
        ))}

      <button
        onClick={() => onDelete(task)}
        className="text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 text-sm transition"
        aria-label="Delete task"
      >
        Delete
      </button>
    </div>
  );
}
