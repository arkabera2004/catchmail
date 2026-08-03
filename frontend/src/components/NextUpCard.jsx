import { useState } from 'react';
import MeetingsRail from './MeetingsRail.jsx';

function timeUntil(deadline) {
  const diffMs = new Date(deadline).getTime() - Date.now();
  if (diffMs <= 0) return 'now';
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours}h`;
  return `in ${Math.round(hours / 24)}d`;
}

export default function NextUpCard({ meetings }) {
  const [expanded, setExpanded] = useState(false);
  const sorted = [...meetings].sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

  if (sorted.length === 0) return null;
  const [next, ...rest] = sorted;

  return (
    <div>
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full text-left bg-indigo-600 hover:bg-indigo-700 transition text-white rounded-lg px-3 py-2"
      >
        <p className="text-xs uppercase tracking-wide opacity-80">Next up</p>
        <p className="text-sm font-medium">
          {next.task_text} · {timeUntil(next.deadline)}
        </p>
      </button>
      {expanded && rest.length > 0 && (
        <div className="mt-2">
          <MeetingsRail meetings={rest} />
        </div>
      )}
    </div>
  );
}
