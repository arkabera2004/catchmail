import { useEffect, useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import { api } from '../lib/api.js';
import TaskRow from '../components/TaskRow.jsx';
import MeetingsRail from '../components/MeetingsRail.jsx';
import NextUpCard from '../components/NextUpCard.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';
import AccountMenu from '../components/AccountMenu.jsx';

function CalendarIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M4 10h16M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.75" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function ListIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M8 6h13M8 12h13M8 18h13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="3.5" cy="6" r="1.5" fill="currentColor" />
      <circle cx="3.5" cy="12" r="1.5" fill="currentColor" />
      <circle cx="3.5" cy="18" r="1.5" fill="currentColor" />
    </svg>
  );
}

function ClockIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckCircleIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8 12.5l2.5 2.5L16 9.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const CONFIDENCE_RANK = { high: 0, medium: 1, low: 2 };

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'deadline_asc', label: 'Deadline (soonest)' },
  { value: 'deadline_desc', label: 'Deadline (latest)' },
  { value: 'confidence', label: 'Confidence' },
  { value: 'az', label: 'A → Z' },
];

function sortTasks(tasks, sortBy) {
  const sorted = [...tasks];
  switch (sortBy) {
    case 'oldest':
      return sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    case 'deadline_asc':
      return sorted.sort((a, b) => {
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline) - new Date(b.deadline);
      });
    case 'deadline_desc':
      return sorted.sort((a, b) => {
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(b.deadline) - new Date(a.deadline);
      });
    case 'confidence':
      return sorted.sort(
        (a, b) => (CONFIDENCE_RANK[a.confidence] ?? 3) - (CONFIDENCE_RANK[b.confidence] ?? 3)
      );
    case 'az':
      return sorted.sort((a, b) => a.task_text.localeCompare(b.task_text));
    case 'newest':
    default:
      return sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
}

/** Groups fuzzy search results by source email so related tasks from the
 * same thread surface together, in relevance order. */
function groupBySourceEmail(matchedTasks) {
  const groups = [];
  const groupIndex = new Map();
  for (const task of matchedTasks) {
    const key = task.source_email_id || task.id;
    if (!groupIndex.has(key)) {
      groupIndex.set(key, groups.length);
      groups.push({
        key,
        subject: task.source_email_subject || '(no subject)',
        sender: task.source_email_sender || '',
        link: task.source_email_link,
        tasks: [],
      });
    }
    groups[groupIndex.get(key)].tasks.push(task);
  }
  return groups;
}

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('open');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);
  const [sortBy, setSortBy] = useState('newest');
  const [search, setSearch] = useState('');
  const [mobileTab, setMobileTab] = useState('meetings');

  useEffect(() => {
    async function load() {
      try {
        const [{ user }, { tasks }] = await Promise.all([api.me(), api.getTasks()]);
        setUser(user);
        setTasks(tasks);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function toggleDone(task) {
    const status = task.status === 'done' ? 'open' : 'done';
    const updated = await api.updateTask(task.id, { status });
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updated.task : t)));
  }

  async function changeDeadline(task, value) {
    const deadline = value ? new Date(value).toISOString() : null;
    const updated = await api.updateTask(task.id, { deadline });
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updated.task : t)));
  }

  async function deleteTask(task) {
    await api.deleteTask(task.id);
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
  }

  async function handleSyncCalendar() {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const result = await api.syncCalendar();
      setSyncMessage(
        result.created === 0
          ? 'Everything is already on your calendar.'
          : `Added ${result.created} event${result.created === 1 ? '' : 's'} to Google Calendar.`
      );
      const { tasks: refreshed } = await api.getTasks();
      setTasks(refreshed);
    } catch (err) {
      setSyncMessage(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  }

  const openCount = useMemo(() => tasks.filter((t) => t.status === 'open').length, [tasks]);
  const doneCount = useMemo(() => tasks.filter((t) => t.status === 'done').length, [tasks]);
  const dueSoonCount = useMemo(() => {
    const in7Days = Date.now() + 7 * 24 * 60 * 60 * 1000;
    return tasks.filter((t) => t.status === 'open' && t.deadline && new Date(t.deadline).getTime() <= in7Days).length;
  }, [tasks]);

  const statusFiltered = useMemo(
    () => tasks.filter((t) => (filter === 'all' ? true : t.status === filter)),
    [tasks, filter]
  );

  const meetings = useMemo(
    () => tasks.filter((t) => t.type === 'meeting' && t.status === 'open'),
    [tasks]
  );
  const mobileLayout = user?.dashboard_mobile_layout || 'stacked';
  const taskOnlyFiltered = useMemo(
    () => statusFiltered.filter((t) => t.type !== 'meeting'),
    [statusFiltered]
  );

  const fuse = useMemo(
    () =>
      new Fuse(taskOnlyFiltered, {
        keys: [
          { name: 'task_text', weight: 2 },
          { name: 'source_email_subject', weight: 1.5 },
          { name: 'source_email_sender', weight: 1 },
        ],
        threshold: 0.4, // tolerates typos like "wayam" -> "Vakyam"
        ignoreLocation: true,
      }),
    [statusFiltered]
  );

  const trimmedSearch = search.trim();
  const searchGroups = useMemo(() => {
    if (!trimmedSearch) return null;
    const matches = fuse.search(trimmedSearch).map((r) => r.item);
    return groupBySourceEmail(matches);
  }, [fuse, trimmedSearch]);

  const sortedFlatTasks = useMemo(() => sortTasks(taskOnlyFiltered, sortBy), [taskOnlyFiltered, sortBy]);

  if (loading) {
    return <div className="min-h-screen dark:bg-slate-950 flex items-center justify-center text-slate-500 dark:text-slate-400">Loading…</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen dark:bg-slate-950 flex flex-col items-center justify-center gap-4 text-slate-600 dark:text-slate-400">
        <p>You need to connect Gmail first.</p>
        <a href="/" className="text-indigo-600 dark:text-indigo-400 underline">
          Go to landing page
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">CatchMail</span>
          <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
            <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-medium capitalize hidden sm:inline">{user?.plan} plan</span>
            <ThemeToggle />
            <AccountMenu user={user} />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 flex-shrink-0">
              <ListIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white leading-none">{openCount}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Open tasks</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0">
              <ClockIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 leading-none">{dueSoonCount}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Due in 7 days</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
              <CheckCircleIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 leading-none">{doneCount}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Completed</p>
            </div>
          </div>
        </div>

        {mobileLayout === 'tabs' && (
          <div className="md:hidden flex gap-2 mb-3">
            <button
              onClick={() => setMobileTab('meetings')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                mobileTab === 'meetings'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              Meetings{meetings.length > 0 ? ` (${meetings.length})` : ''}
            </button>
            <button
              onClick={() => setMobileTab('tasks')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                mobileTab === 'tasks'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              Tasks
            </button>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-6">
        <div
          className={`md:block md:w-64 md:flex-shrink-0 ${
            mobileLayout === 'tabs' ? (mobileTab === 'meetings' ? 'block' : 'hidden') : 'block'
          }`}
        >
          {mobileLayout === 'next_up' ? (
            <>
              <div className="md:hidden">
                <NextUpCard meetings={meetings} />
              </div>
              <div className="hidden md:block">
                <MeetingsRail meetings={meetings} />
              </div>
            </>
          ) : (
            <MeetingsRail meetings={meetings} />
          )}
        </div>
        <div
          className={`flex-1 min-w-0 ${
            mobileLayout === 'tabs' && mobileTab === 'meetings' ? 'hidden md:block' : 'block'
          }`}
        >

        <div className="relative mb-4">
          <SearchIcon className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks, e.g. a project or sender name — finds related tasks even with typos"
            className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>

        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm flex-wrap">
            {['open', 'done', 'all'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full capitalize transition ${
                  filter === f
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                {f}
              </button>
            ))}

            {!trimmedSearch && (
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="ml-1 text-sm border border-slate-200 dark:border-slate-700 rounded-full pl-3 pr-8 py-1.5 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    Sort: {opt.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          <button
            onClick={handleSyncCalendar}
            disabled={syncing || openCount === 0}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CalendarIcon className="w-4 h-4" />
            {syncing ? 'Adding to Calendar…' : 'Add all to Google Calendar'}
          </button>
        </div>

        {syncMessage && (
          <div className="mb-4 text-sm bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 px-4 py-2.5 rounded-lg animate-fade-in">
            {syncMessage}
          </div>
        )}

        {trimmedSearch ? (
          searchGroups.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-14 text-center text-slate-400 dark:text-slate-500">
              No tasks match "{trimmedSearch}".
            </div>
          ) : (
            <div className="space-y-4">
              {searchGroups.map((group) => (
                <div key={group.key} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{group.subject}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {group.sender && <span>{group.sender}</span>}
                      {group.link && (
                        <a href={group.link} target="_blank" rel="noreferrer" className="text-indigo-500 dark:text-indigo-400 hover:underline">
                          View email
                        </a>
                      )}
                      <span className="ml-auto font-medium">
                        {group.tasks.length} task{group.tasks.length === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>
                  {group.tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onToggleDone={toggleDone}
                      onDeadlineChange={changeDeadline}
                      onDelete={deleteTask}
                    />
                  ))}
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {sortedFlatTasks.length === 0 ? (
              <p className="text-center text-slate-400 dark:text-slate-500 py-14">No tasks here yet.</p>
            ) : (
              sortedFlatTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggleDone={toggleDone}
                  onDeadlineChange={changeDeadline}
                  onDelete={deleteTask}
                />
              ))
            )}
          </div>
        )}
        </div>
        </div>
      </main>
    </div>
  );
}
