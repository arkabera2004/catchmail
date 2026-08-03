import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, Check, Mail, Pause, Play, Plus, Smartphone, Sparkles, Unplug, X } from 'lucide-react';
import { api } from '../lib/api.js';
import AppHeader from '../components/AppHeader.jsx';
import { Avatar } from '../components/AccountMenu.jsx';
import { Eyebrow } from '../components/Brand.jsx';
import { subscribeToPush, unsubscribeFromPush } from '../lib/push.js';

function Section({ title, description, children, tone = 'default' }) {
  return (
    <section className={`grid gap-6 border-t border-border py-8 md:grid-cols-[240px_1fr] ${tone === 'danger' ? 'border-destructive/30' : ''}`}>
      <div>
        <h2 className={`text-[17px] font-semibold tracking-[-0.01em] ${tone === 'danger' ? 'text-destructive' : ''}`}>{title}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Row({ children, className = '' }) {
  return <div className={`surface-card flex flex-wrap items-center gap-4 p-5 ${className}`}>{children}</div>;
}

export default function Settings() {
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState('');
  const [pushEnabled, setPushEnabled] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [vipInput, setVipInput] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => navigate('/'));

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(async (reg) => {
        const sub = await reg?.pushManager.getSubscription();
        setPushEnabled(!!sub);
      });
    }
  }, [navigate]);

  async function handleTogglePush() {
    try {
      if (pushEnabled) {
        await unsubscribeFromPush();
        setPushEnabled(false);
        setMessage('Push notifications disabled.');
      } else {
        await subscribeToPush(import.meta.env.VITE_VAPID_PUBLIC_KEY);
        setPushEnabled(true);
        setMessage('Push notifications enabled.');
      }
    } catch (err) {
      setMessage(`Push notifications failed: ${err.message}`);
    }
  }

  async function handleMobileLayoutChange(value) {
    const { user: updated } = await api.updatePreferences({ dashboard_mobile_layout: value });
    setUser(updated);
  }

  async function handleReminderLeadChange(value) {
    const { user: updated } = await api.updatePreferences({ reminder_lead_minutes: Number(value) });
    setUser(updated);
  }

  async function handleSendCode() {
    try {
      await api.sendPhoneCode(phoneInput);
      setCodeSent(true);
      setMessage('Verification code sent.');
    } catch (err) {
      setMessage(`Failed to send code: ${err.message}`);
    }
  }

  async function handleVerifyCode() {
    try {
      await api.verifyPhoneCode(phoneInput, codeInput);
      setUser((u) => ({ ...u, phone_number: phoneInput, phone_verified: true }));
      setCodeSent(false);
      setCodeInput('');
      setMessage('Phone number verified — SMS reminders are on.');
    } catch (err) {
      setMessage(`Verification failed: ${err.message}`);
    }
  }

  async function handleAddVip() {
    const entry = vipInput.trim().toLowerCase();
    if (!entry) return;
    const next = [...new Set([...(user.vip_senders || []), entry])];
    const { user: updated } = await api.updatePreferences({ vip_senders: next });
    setUser(updated);
    setVipInput('');
  }

  async function handleRemoveVip(entry) {
    const next = (user.vip_senders || []).filter((s) => s !== entry);
    const { user: updated } = await api.updatePreferences({ vip_senders: next });
    setUser(updated);
  }

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

  if (!user) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />

      <main className="mx-auto w-full max-w-3xl px-5 py-8">
        <header className="pb-6">
          <Eyebrow>Account</Eyebrow>
          <h1 className="font-display mt-2 text-3xl md:text-4xl">Settings</h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Control what CatchMail reads, who counts as important, and how loudly we remind you.
          </p>
        </header>

        {message && (
          <div className="mb-2 bg-signal-soft text-signal-foreground text-sm px-4 py-2.5 rounded-lg animate-fade-in">{message}</div>
        )}

        <Section title="Account" description="Your profile and current plan.">
          <Row>
            <Avatar user={user} size={52} />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold">{user.name}</p>
              <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-signal-soft px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-signal-foreground">
              <Sparkles className="h-3 w-3" /> {user.plan}
            </span>
          </Row>
          {user.plan === 'free' && (
            <div className="surface-card flex flex-wrap items-center gap-4 bg-signal-soft/40 p-5">
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold">Upgrade to Pro</p>
                <p className="mt-1 text-sm text-muted-foreground">Remove the monthly task cap and unlock SMS reminders.</p>
              </div>
              <Link to="/coming-soon" className="inline-flex items-center gap-1.5 rounded-full bg-signal text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition">
                Upgrade <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </Section>

        <Section title="Gmail sync" description="CatchMail has read-only access. Pause any time; disconnect removes the token instantly.">
          <Row>
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-surface-2">
              <Mail className="h-5 w-5 text-signal" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold">{user.email}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                <span className={`h-1.5 w-1.5 rounded-full ${user.paused ? 'bg-amber' : 'bg-signal'}`} />
                {user.paused ? 'Scanning is currently paused.' : 'Scanning runs every 15 minutes.'}
              </p>
            </div>
            <button onClick={handlePauseToggle} className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm hover:bg-accent transition">
              {user.paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              {user.paused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={handleDisconnect}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition"
            >
              <Unplug className="h-4 w-4" /> Disconnect
            </button>
          </Row>
        </Section>

        <Section title="VIP senders" description="Tasks from these addresses get a priority badge and an immediate push notification.">
          <Row className="flex-col items-stretch gap-4">
            <div className="flex flex-wrap gap-2">
              {(user.vip_senders || []).map((entry) => (
                <span key={entry} className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 py-1 pl-3 pr-1.5 font-mono text-[12px]">
                  {entry}
                  <button
                    aria-label={`Remove ${entry}`}
                    onClick={() => handleRemoveVip(entry)}
                    className="grid h-5 w-5 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={vipInput}
                onChange={(e) => setVipInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddVip()}
                placeholder="boss@company.com"
                className="flex-1 h-10 rounded-full border border-border bg-surface-2/70 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button onClick={handleAddVip} className="inline-flex items-center gap-1.5 h-10 shrink-0 rounded-full bg-signal text-primary-foreground px-4 text-sm font-medium hover:opacity-90 transition">
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
          </Row>
        </Section>

        <Section title="Notifications" description="How and when we nudge you about what's due.">
          <Row>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold">Push notifications</p>
              <p className="mt-0.5 text-sm text-muted-foreground">Get a browser notification before a meeting starts.</p>
            </div>
            <button onClick={handleTogglePush} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-accent transition">
              {pushEnabled ? 'Disable' : 'Enable'}
            </button>
          </Row>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="surface-card space-y-2 p-5">
              <label className="text-sm font-medium">Reminder lead time</label>
              <select
                value={user.reminder_lead_minutes}
                onChange={(e) => handleReminderLeadChange(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-2/70 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value={10}>10 minutes before</option>
                <option value={30}>30 minutes before</option>
                <option value={60}>60 minutes before</option>
              </select>
            </div>
            <div className="surface-card space-y-2 p-5">
              <label className="text-sm font-medium">Mobile dashboard layout</label>
              <select
                value={user.dashboard_mobile_layout}
                onChange={(e) => handleMobileLayoutChange(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-2/70 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="stacked">Stacked (meetings on top)</option>
                <option value="tabs">Tabs</option>
                <option value="next_up">Next-up card</option>
              </select>
            </div>
          </div>

          <div className="surface-card p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface-2">
                <Smartphone className="h-4.5 w-4.5 text-signal" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold">SMS reminders</p>
                <p className="text-sm text-muted-foreground">
                  {user.plan !== 'paid' ? (
                    <>
                      A{' '}
                      <Link to="/coming-soon" className="text-signal hover:underline">
                        Pro
                      </Link>{' '}
                      feature.
                    </>
                  ) : user.phone_verified ? (
                    `Verified: ${user.phone_number}`
                  ) : (
                    'Verify a number for urgent VIP tasks.'
                  )}
                </p>
              </div>
              {user.plan === 'paid' && user.phone_verified && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-signal-soft px-3 py-1 font-mono text-[11px] uppercase text-signal-foreground">
                  <Check className="h-3 w-3" /> Verified
                </span>
              )}
            </div>

            {user.plan === 'paid' && !user.phone_verified && !codeSent && (
              <div className="mt-4 flex gap-2">
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="+15551234567"
                  className="flex-1 h-10 rounded-full border border-border bg-surface-2/70 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button onClick={handleSendCode} className="h-10 shrink-0 rounded-full border border-border px-4 text-sm hover:bg-accent transition">
                  Send code
                </button>
              </div>
            )}

            {user.plan === 'paid' && !user.phone_verified && codeSent && (
              <div className="animate-scale-in mt-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Enter the code sent to <span className="font-mono text-foreground">{phoneInput}</span>
                </p>
                <input
                  type="text"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  placeholder="6-digit code"
                  className="w-full max-w-xs h-10 rounded-full border border-border bg-surface-2/70 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="flex gap-2">
                  <button onClick={handleVerifyCode} className="h-10 rounded-full bg-signal text-primary-foreground px-4 text-sm font-medium hover:opacity-90 transition">
                    Verify
                  </button>
                  <button onClick={() => setCodeSent(false)} className="h-10 rounded-full px-4 text-sm text-muted-foreground hover:text-foreground transition">
                    Change number
                  </button>
                </div>
              </div>
            )}
          </div>
        </Section>

        <Section tone="danger" title="Danger zone" description="Permanent, immediate, and not recoverable by support.">
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-5">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold">Delete all data</p>
              <p className="mt-0.5 text-sm text-muted-foreground">Permanently delete your account and all extracted tasks.</p>
            </div>
            <button onClick={handleDeleteAll} className="rounded-full bg-destructive text-destructive-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition">
              Delete everything
            </button>
          </div>
        </Section>

        <p className="text-center text-sm text-muted-foreground pt-6">
          Having an issue?{' '}
          <a href="mailto:arkabera2004@gmail.com" className="text-signal hover:underline">
            arkabera2004@gmail.com
          </a>
        </p>
      </main>
    </div>
  );
}
