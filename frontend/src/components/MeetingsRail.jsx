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
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
        Upcoming meetings
      </h2>
      {sorted.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">No meetings scheduled.</p>
      ) : (
        <ul className="space-y-1.5">
          {sorted.map((m) => (
            <li key={m.id} className="bg-indigo-50 dark:bg-indigo-500/10 rounded-md px-2.5 py-1.5">
              <p className="text-sm font-medium text-indigo-900 dark:text-indigo-200">{m.task_text}</p>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">
                {new Date(m.deadline).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })} ·{' '}
                {timeUntil(m.deadline)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
