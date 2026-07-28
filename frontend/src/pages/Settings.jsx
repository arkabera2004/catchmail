import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import ThemeToggle from '../components/ThemeToggle.jsx';
import AccountMenu from '../components/AccountMenu.jsx';

export default function Settings() {
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => navigate('/'));
  }, [navigate]);

  async function handlePauseToggle() {
    if (user.paused) {
      await api.resume();
      setUser((u) => ({ ...u, paused: false }));
      setMessage('Scanning resumed.');
    } else {
      await api.pause();
      setUser((u) => ({ ...u, paused: true }));
      setMessage('Scanning paused.');
    }
  }

  async function handleDisconnect() {
    if (!confirm('Disconnect Gmail? Sync will stop until you reconnect.')) return;
    await api.disconnect();
    setMessage('Gmail disconnected.');
  }

  async function handleDeleteAll() {
    if (!confirm('This permanently deletes your account and all extracted tasks. Continue?')) return;
    await api.deleteAllData();
    navigate('/');
  }

  function handleUpgrade() {
    setMessage("Pro billing is coming soon — we're finishing it up. We'll let you know the moment it's ready.");
  }

  if (!user) {
    return (
      <div className="min-h-screen dark:bg-slate-950 flex items-center justify-center text-slate-500 dark:text-slate-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            CatchMail
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition">
              Back to dashboard
            </Link>
            <ThemeToggle />
            <AccountMenu user={user} />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-5">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Settings</h1>

        {message && (
          <div className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-sm px-4 py-2.5 rounded-lg animate-fade-in">{message}</div>
        )}

        <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
          <h2 className="font-semibold text-slate-900 dark:text-white">Account</h2>
          <div className="flex items-center gap-3">
            {user.picture ? (
              <img src={user.picture} alt={user.name || user.email} className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-semibold text-lg">
                {(user.name || user.email).charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              {user.name && <p className="text-sm font-medium text-slate-900 dark:text-white">{user.name}</p>}
              <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 capitalize">{user.plan} plan</p>
            </div>
          </div>
          {user.plan === 'free' && (
            <button onClick={handleUpgrade} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm px-4 py-2 rounded-lg font-medium hover:bg-slate-800 dark:hover:bg-slate-200 transition">
              Upgrade to Pro
            </button>
          )}
        </section>

        <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
          <h2 className="font-semibold text-slate-900 dark:text-white">Gmail sync</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {user.paused ? 'Scanning is currently paused.' : 'Scanning runs every 15 minutes.'}
          </p>
          <div className="flex gap-3">
            <button onClick={handlePauseToggle} className="border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm px-4 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition">
              {user.paused ? 'Resume scanning' : 'Pause scanning'}
            </button>
            <button onClick={handleDisconnect} className="border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm px-4 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition">
              Disconnect Gmail
            </button>
          </div>
        </section>

        <section className="bg-white dark:bg-slate-900 rounded-xl border border-red-200 dark:border-red-900/50 p-5 space-y-3">
          <h2 className="font-semibold text-red-700 dark:text-red-400">Danger zone</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Permanently delete your account and all extracted tasks.</p>
          <button onClick={handleDeleteAll} className="bg-red-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-red-700 transition">
            Delete all data
          </button>
        </section>

        <p className="text-center text-sm text-slate-400 dark:text-slate-500 pt-2">
          Having an issue?{' '}
          <a href="mailto:arkabera2004@gmail.com" className="text-indigo-500 dark:text-indigo-400 hover:underline">
            arkabera2004@gmail.com
          </a>
        </p>
      </main>
    </div>
  );
}
