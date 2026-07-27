import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import TaskRow from '../components/TaskRow.jsx';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('open');

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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading…</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-slate-600">
        <p>You need to connect Gmail first.</p>
        <a href="/" className="text-blue-500 underline">
          Go to landing page
        </a>
      </div>
    );
  }

  const visibleTasks = tasks.filter((t) => (filter === 'all' ? true : t.status === filter));

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-lg font-bold text-slate-900">CatchMail</span>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span>{user?.email}</span>
            <span className="px-2 py-1 rounded-full bg-slate-100 text-xs font-medium capitalize">{user?.plan} plan</span>
            <Link to="/settings" className="hover:text-slate-800">
              Settings
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-slate-900">Your tasks</h1>
          <div className="flex gap-2 text-sm">
            {['open', 'done', 'all'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full capitalize ${
                  filter === f ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200">
          {visibleTasks.length === 0 ? (
            <p className="text-center text-slate-400 py-12">No tasks here yet.</p>
          ) : (
            visibleTasks.map((task) => (
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
      </main>
    </div>
  );
}
