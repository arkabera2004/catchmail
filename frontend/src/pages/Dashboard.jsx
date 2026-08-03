import { useEffect, useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import { CalendarPlus, Search, ListChecks, Clock, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api.js';
import TaskRow from '../components/TaskRow.jsx';
import MeetingsRail from '../components/MeetingsRail.jsx';
import NextUpCard from '../components/NextUpCard.jsx';
import AppHeader from '../components/AppHeader.jsx';
import { Eyebrow } from '../components/Brand.jsx';

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

  async function giveFeedback(task, feedback) {
    const updated = await api.updateTask(task.id, { feedback });
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updated.task : t)));
  }

  async function snoozeTask(task, snoozedUntil) {
    const updated = await api.updateTask(task.id, { snoozed_until: snoozedUntil });
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updated.task : t)));
  }

  async function handleSyncCalendar() {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const result = await api.syncCalendar();
      const addedMessage =
        result.created === 0
          ? 'Everything is already on your calendar.'
          : `Added ${result.created} event${result.created === 1 ? '' : 's'} to Google Calendar.`;
      const conflictMessage =
        result.conflicts?.length > 0
          ? ` ⚠️ ${result.conflicts.length} scheduling conflict${result.conflicts.length === 1 ? '' : 's'}: ${result.conflicts
              .map((c) => `"${c.task_text}" overlaps ${c.conflictsWith.join(', ')}`)
              .join('; ')}`
          : '';
      setSyncMessage(addedMessage + conflictMessage);
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

  const isSnoozed = (t) => t.snoozed_until && new Date(t.snoozed_until).getTime() > Date.now();

  const statusFiltered = useMemo(
    () =>
      tasks.filter((t) => {
        if (filter !== 'all' && t.status !== filter) return false;
        if (filter === 'open' && isSnoozed(t)) return false;
        return true;
      }),
    [tasks, filter]
  );

  const meetings = useMemo(
    () => tasks.filter((t) => t.type === 'meeting' && t.status === 'open' && !isSnoozed(t)),
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
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <p>You need to connect Gmail first.</p>
        <a href="/" className="text-signal underline">
          Go to landing page
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />

      <main className="mx-auto w-full max-w-6xl px-5 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Eyebrow>{user?.plan} plan</Eyebrow>
            <h1 className="font-display mt-2 text-3xl md:text-4xl">Your tasks</h1>
          </div>
          <button
            onClick={handleSyncCalendar}
            disabled={syncing || openCount === 0}
            className="inline-flex items-center gap-2 h-11 rounded-full bg-signal text-primary-foreground text-sm font-medium px-5 hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CalendarPlus className="w-4 h-4" />
            {syncing ? 'Adding to Calendar…' : 'Add all to Google Calendar'}
          </button>
        </div>

        {/* Stat tiles */}
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {[
            { k: 'Open tasks', v: openCount, icon: ListChecks, accent: 'signal' },
            { k: 'Due in 7 days', v: dueSoonCount, icon: Clock, accent: 'amber' },
            { k: 'Completed', v: doneCount, icon: CheckCircle2, accent: 'muted' },
          ].map((s) => (
            <div key={s.k} className="surface-card hover-lift relative overflow-hidden p-5">
              <span
                className={`absolute inset-x-0 top-0 h-[3px] ${
                  s.accent === 'signal' ? 'bg-signal' : s.accent === 'amber' ? 'bg-amber' : 'bg-border'
                }`}
              />
              <div className="flex items-center justify-between">
                <p className="text-eyebrow text-muted-foreground">{s.k}</p>
                <s.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="font-display mt-3 text-4xl leading-none">{s.v}</p>
            </div>
          ))}
        </div>

        {mobileLayout === 'tabs' && (
          <div className="md:hidden flex gap-2 mt-6">
            <button
              onClick={() => setMobileTab('meetings')}
              className={`flex-1 px-3 py-2 rounded-full text-sm font-medium transition ${
                mobileTab === 'meetings' ? 'bg-surface text-foreground shadow-soft' : 'bg-surface-2/70 text-muted-foreground'
              }`}
            >
              Meetings{meetings.length > 0 ? ` (${meetings.length})` : ''}
            </button>
            <button
              onClick={() => setMobileTab('tasks')}
              className={`flex-1 px-3 py-2 rounded-full text-sm font-medium transition ${
                mobileTab === 'tasks' ? 'bg-surface text-foreground shadow-soft' : 'bg-surface-2/70 text-muted-foreground'
              }`}
            >
              Tasks
            </button>
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside
            className={`order-2 lg:order-1 ${
              mobileLayout === 'tabs' ? (mobileTab === 'meetings' ? 'block' : 'hidden lg:block') : 'block'
            }`}
          >
            {mobileLayout === 'next_up' ? (
              <>
                <div className="lg:hidden">
                  <NextUpCard meetings={meetings} />
                </div>
                <div className="hidden lg:block">
                  <MeetingsRail meetings={meetings} />
                </div>
              </>
            ) : (
              <MeetingsRail meetings={meetings} />
            )}
          </aside>

          <section
            className={`order-1 lg:order-2 ${
              mobileLayout === 'tabs' && mobileTab === 'meetings' ? 'hidden lg:block' : 'block'
            }`}
          >
            <div className="surface-card overflow-hidden">
              <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
                <div className="relative min-w-[200px] flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search tasks, people, subjects…"
                    className="w-full h-10 rounded-full border border-border bg-surface-2/70 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="flex items-center gap-1 rounded-full border border-border bg-surface-2/70 p-1">
                  {['open', 'done', 'all'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-3.5 py-1.5 rounded-full text-[13px] capitalize transition-all ${
                        filter === f ? 'bg-surface text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                {!trimmedSearch && (
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="h-10 text-sm border border-border rounded-full pl-3 pr-8 bg-surface-2/70 text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        Sort: {opt.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {syncMessage && (
                <div className="text-sm bg-signal-soft text-signal-foreground px-4 py-2.5 animate-fade-in">{syncMessage}</div>
              )}

              {trimmedSearch ? (
                searchGroups.length === 0 ? (
                  <p className="p-14 text-center text-muted-foreground">No tasks match "{trimmedSearch}".</p>
                ) : (
                  <div className="divide-y divide-border">
                    {searchGroups.map((group) => (
                      <div key={group.key}>
                        <div className="px-4 py-3 bg-surface-2/50">
                          <p className="text-sm font-semibold text-foreground">{group.subject}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            {group.sender && <span>{group.sender}</span>}
                            {group.link && (
                              <a href={group.link} target="_blank" rel="noreferrer" className="text-signal hover:underline">
                                View email
                              </a>
                            )}
                            <span className="ml-auto font-medium">
                              {group.tasks.length} task{group.tasks.length === 1 ? '' : 's'}
                            </span>
                          </div>
                        </div>
                        <ul className="divide-y divide-border">
                          {group.tasks.map((task) => (
                            <TaskRow
                              key={task.id}
                              task={task}
                              onToggleDone={toggleDone}
                              onDeadlineChange={changeDeadline}
                              onDelete={deleteTask}
                              onFeedback={giveFeedback}
                              onSnooze={snoozeTask}
                            />
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <ul className="divide-y divide-border">
                  {sortedFlatTasks.length === 0 ? (
                    <li className="p-14 text-center">
                      <p className="font-display text-2xl">Nothing here.</p>
                      <p className="mt-1 text-sm text-muted-foreground">That's either very good news or a very quiet inbox.</p>
                    </li>
                  ) : (
                    sortedFlatTasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onToggleDone={toggleDone}
                        onDeadlineChange={changeDeadline}
                        onFeedback={giveFeedback}
                        onSnooze={snoozeTask}
                        onDelete={deleteTask}
                      />
                    ))
                  )}
                </ul>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
