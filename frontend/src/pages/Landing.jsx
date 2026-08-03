import { Link } from 'react-router-dom';
import { Eye, Lock, Trash2, Sparkles, ListChecks, CalendarPlus, Search, ShieldCheck, ArrowRight } from 'lucide-react';
import { api } from '../lib/api.js';
import { Eyebrow } from '../components/Brand.jsx';
import MarketingHeader from '../components/MarketingHeader.jsx';
import MarketingFooter from '../components/MarketingFooter.jsx';

const TRUST = [
  { icon: Eye, label: 'Read-only Gmail access' },
  { icon: Lock, label: 'AES-256 encrypted tokens' },
  { icon: Trash2, label: 'Delete all data anytime' },
];

const PREVIEW_TASKS = [
  { text: 'Send the Q3 report to finance', confidence: 'high', done: false },
  { text: 'Review the draft deck before Friday', confidence: 'high', done: false },
  { text: 'Schedule a call with the design team', confidence: 'medium', done: true },
];

function ProductPreview() {
  return (
    <div className="surface-card overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-surface-2/60">
        <span className="w-2.5 h-2.5 rounded-full bg-destructive/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-signal/70" />
        <span className="ml-3 text-xs text-muted-foreground font-mono">app.catchmail.com/dashboard</span>
      </div>
      <div className="p-6 sm:p-8">
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { n: 12, label: 'Open tasks' },
            { n: 3, label: 'Due in 7 days', accent: true },
            { n: 24, label: 'Completed' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border p-3 text-left">
              <p className={`font-display text-2xl ${s.accent ? 'text-amber' : 'text-foreground'}`}>{s.n}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border divide-y divide-border text-left">
          {PREVIEW_TASKS.map((t) => (
            <div key={t.text} className="flex items-center gap-3 px-4 py-3">
              <span
                className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center flex-shrink-0 ${
                  t.done ? 'bg-signal border-signal' : 'border-border'
                }`}
              >
                {t.done && (
                  <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3 text-primary-foreground">
                    <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className={`text-sm flex-1 ${t.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{t.text}</span>
              <span
                className={`text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded-full ${
                  t.confidence === 'high' ? 'bg-signal-soft text-signal-foreground' : 'bg-amber-soft text-amber'
                }`}
              >
                {t.confidence}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const STEPS = [
  {
    n: '01',
    title: 'Connect Gmail',
    body: 'One click, read-only. We scan the last 7 days to start, then poll every 15 minutes.',
  },
  {
    n: '02',
    title: 'Gemini extracts tasks',
    body: 'Newsletters and notifications get filtered out first. Everything else gets read for asks, deadlines, and follow-ups.',
  },
  {
    n: '03',
    title: 'Act on it',
    body: 'Review on your dashboard, mark things done, or push every open task into Google Calendar in one click.',
  },
];

const FEATURES = [
  {
    icon: Sparkles,
    title: 'Finds hidden tasks',
    body: "Gemini reads every email and picks out requests, deadlines, and follow-ups — even ones you'd scroll right past.",
  },
  {
    icon: ListChecks,
    title: 'One clean list',
    body: 'Every task lands on a single dashboard with a deadline, confidence level, and a link straight back to the source email.',
  },
  {
    icon: CalendarPlus,
    title: 'Straight to Calendar',
    body: 'One click sends every open task into Google Calendar with its deadline, so your day already knows what to expect.',
  },
  {
    icon: Search,
    title: 'Search that groups',
    body: 'Search a project or sender and see every task about it, even across different threads — typo-tolerant, always grouped.',
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]" />
        <div
          className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full opacity-25 blur-[120px]"
          style={{ background: 'var(--gradient-signal)' }}
        />
        <div className="relative mx-auto w-full max-w-6xl px-5 pb-12 pt-16 md:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="animate-fade-in">
              <Eyebrow>AI inbox triage for busy professionals</Eyebrow>
            </div>
            <h1 className="font-display animate-fade-up mt-6 text-[2.5rem] leading-[1.05] tracking-[-0.02em] md:text-6xl">
              Never miss a task
              <br className="hidden sm:block" /> hidden in an{' '}
              <em className="relative not-italic italic">
                email
                <svg className="absolute -bottom-2 left-0 h-3 w-full text-signal" viewBox="0 0 200 12" preserveAspectRatio="none" fill="none">
                  <path d="M2 9C50 3 150 3 198 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </em>{' '}
              again
            </h1>
            <p className="mx-auto mt-7 max-w-xl text-[17px] leading-relaxed text-muted-foreground">
              CatchMail scans your Gmail inbox, finds the requests, deadlines, and follow-ups buried in the
              noise, and turns them into a clean to-do list — with one click to push it all into Google
              Calendar.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href={api.connectGmailUrl}
                className="group inline-flex items-center gap-2.5 bg-signal text-primary-foreground px-7 py-3.5 rounded-full font-semibold hover:opacity-90 transition shadow-lift"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5">
                  <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.7 4.2-5.5 4.2-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.9 1.5l2.6-2.5C16.9 3.5 14.7 2.5 12 2.5 6.9 2.5 2.8 6.6 2.8 11.7S6.9 20.9 12 20.9c6.9 0 8.7-4.8 8.7-7.3 0-.5 0-.9-.1-1.3H12z" />
                </svg>
                Connect Gmail
              </a>
              <Link
                to="/pricing"
                className="inline-flex items-center gap-1 px-6 py-3.5 rounded-full font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition"
              >
                See pricing <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <ul className="mt-9 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
              {TRUST.map((t) => (
                <li key={t.label} className="inline-flex items-center gap-2 text-[13px] text-muted-foreground">
                  <t.icon className="h-3.5 w-3.5 text-signal" />
                  {t.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="mx-auto mt-14 max-w-4xl">
            <ProductPreview />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto w-full max-w-6xl px-5 py-16">
        <div className="max-w-2xl">
          <Eyebrow>What it does</Eyebrow>
          <h2 className="font-display mt-5 text-3xl md:text-4xl">Your inbox already told you what to do.</h2>
          <p className="mt-4 text-[17px] text-muted-foreground">
            CatchMail just makes it legible — four things it does relentlessly well.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <article key={f.title} className="surface-card hover-lift group relative overflow-hidden p-5">
              <span className="absolute right-5 top-5 font-mono text-[11px] text-muted-foreground/50">0{i + 1}</span>
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-signal-soft text-signal-foreground transition-transform duration-300 group-hover:scale-105">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-[17px] font-semibold tracking-[-0.01em]">{f.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-border bg-surface-2/40">
        <div className="mx-auto w-full max-w-6xl px-5 py-16">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <Eyebrow>How it works</Eyebrow>
              <h2 className="font-display mt-5 text-3xl md:text-4xl">Three minutes to set up. Then never again.</h2>
              <p className="mt-4 text-muted-foreground">No rules to write, no folders to maintain, no new inbox to learn.</p>
              <a
                href={api.connectGmailUrl}
                className="mt-8 inline-flex items-center gap-1.5 h-11 rounded-full border border-border px-6 text-sm font-semibold hover:bg-accent transition"
              >
                Connect Gmail <ArrowRight className="ml-1 h-4 w-4" />
              </a>
            </div>
            <ol className="space-y-3">
              {STEPS.map((s) => (
                <li key={s.n} className="surface-card flex gap-5 p-5">
                  <span className="font-display text-3xl leading-none text-signal">{s.n}</span>
                  <div>
                    <h3 className="text-[17px] font-semibold tracking-[-0.01em]">{s.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="mx-auto w-full max-w-6xl px-5 py-16">
        <div
          className="relative overflow-hidden rounded-3xl border border-border px-8 py-16 text-center shadow-lift md:px-16"
          style={{ backgroundColor: 'var(--ink)' }}
        >
          <div
            className="pointer-events-none absolute -top-24 left-1/2 h-[420px] w-[760px] -translate-x-1/2 rounded-full opacity-50 blur-[120px]"
            style={{ background: 'var(--gradient-signal)' }}
          />
          <div className="bg-grid pointer-events-none absolute inset-0 opacity-40" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-white/70">
              <ShieldCheck className="h-3.5 w-3.5" /> Read-only. Revocable. Yours.
            </span>
            <h2 className="font-display mx-auto mt-6 max-w-2xl text-4xl text-white md:text-6xl">
              Ready to stop re-reading your inbox?
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-lg text-white/70">
              Free to start. Upgrade only if your inbox needs more than 30 tasks a month.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href={api.connectGmailUrl}
                className="inline-flex items-center gap-2.5 bg-white text-ink px-7 py-3.5 rounded-full font-semibold hover:bg-white/90 transition shadow-lg"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5">
                  <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.7 4.2-5.5 4.2-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.9 1.5l2.6-2.5C16.9 3.5 14.7 2.5 12 2.5 6.9 2.5 2.8 6.6 2.8 11.7S6.9 20.9 12 20.9c6.9 0 8.7-4.8 8.7-7.3 0-.5 0-.9-.1-1.3H12z" />
                </svg>
                Connect Gmail
              </a>
              <Link
                to="/pricing"
                className="inline-flex items-center border border-white/20 text-white px-7 py-3.5 rounded-full font-semibold hover:bg-white/10 transition"
              >
                See pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
