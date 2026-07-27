const CONFIDENCE_STYLES = {
  high: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-slate-100 text-slate-600',
};

export default function TaskRow({ task, onToggleDone, onDeadlineChange, onDelete }) {
  const deadlineValue = task.deadline ? task.deadline.slice(0, 10) : '';

  return (
    <div className="flex items-center gap-4 py-3 px-4 border-b border-slate-100 last:border-b-0">
      <input
        type="checkbox"
        checked={task.status === 'done'}
        onChange={() => onToggleDone(task)}
        className="h-5 w-5 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
      />

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
          {task.task_text}
        </p>
        <a
          href={task.source_email_link}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-blue-500 hover:underline"
        >
          View source email
        </a>
      </div>

      <span className={`text-xs px-2 py-1 rounded-full font-medium ${CONFIDENCE_STYLES[task.confidence] || CONFIDENCE_STYLES.low}`}>
        {task.confidence || 'low'}
      </span>

      <input
        type="date"
        value={deadlineValue}
        onChange={(e) => onDeadlineChange(task, e.target.value)}
        className="text-sm border border-slate-200 rounded px-2 py-1"
      />

      <button
        onClick={() => onDelete(task)}
        className="text-slate-400 hover:text-red-500 text-sm"
        aria-label="Delete task"
      >
        Delete
      </button>
    </div>
  );
}
