import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

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

  async function handleUpgrade() {
    try {
      await loadRazorpayScript();
      const { subscriptionId, keyId } = await api.checkout();
      const rzp = new window.Razorpay({
        key: keyId,
        subscription_id: subscriptionId,
        name: 'CatchMail',
        description: 'CatchMail Pro — unlimited task extraction',
        handler: () => setMessage('Payment successful — your plan will update once Razorpay confirms the subscription.'),
        theme: { color: '#0f172a' },
      });
      rzp.open();
    } catch (err) {
      setMessage(`Upgrade failed: ${err.message}`);
    }
  }

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="text-lg font-bold text-slate-900 tracking-tight">
            CatchMail
          </Link>
          <Link to="/dashboard" className="text-sm text-slate-500 hover:text-slate-900 transition">
            Back to dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-5">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>

        {message && (
          <div className="bg-indigo-50 text-indigo-700 text-sm px-4 py-2.5 rounded-lg animate-fade-in">{message}</div>
        )}

        <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <h2 className="font-semibold text-slate-900">Account</h2>
          <p className="text-sm text-slate-500">{user.email}</p>
          <p className="text-sm text-slate-500 capitalize">Plan: {user.plan}</p>
          {user.plan === 'free' && (
            <button onClick={handleUpgrade} className="bg-slate-900 text-white text-sm px-4 py-2 rounded-lg font-medium hover:bg-slate-800 transition">
              Upgrade to Pro
            </button>
          )}
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <h2 className="font-semibold text-slate-900">Gmail sync</h2>
          <p className="text-sm text-slate-500">
            {user.paused ? 'Scanning is currently paused.' : 'Scanning runs every 15 minutes.'}
          </p>
          <div className="flex gap-3">
            <button onClick={handlePauseToggle} className="border border-slate-300 text-sm px-4 py-2 rounded-lg hover:bg-slate-50 transition">
              {user.paused ? 'Resume scanning' : 'Pause scanning'}
            </button>
            <button onClick={handleDisconnect} className="border border-slate-300 text-sm px-4 py-2 rounded-lg hover:bg-slate-50 transition">
              Disconnect Gmail
            </button>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-red-200 p-5 space-y-3">
          <h2 className="font-semibold text-red-700">Danger zone</h2>
          <p className="text-sm text-slate-500">Permanently delete your account and all extracted tasks.</p>
          <button onClick={handleDeleteAll} className="bg-red-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-red-700 transition">
            Delete all data
          </button>
        </section>
      </main>
    </div>
  );
}
