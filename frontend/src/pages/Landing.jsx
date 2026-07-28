import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import MarketingHeader from '../components/MarketingHeader.jsx';
import MarketingFooter from '../components/MarketingFooter.jsx';

const FEATURES = [
  {
    title: 'Finds hidden tasks',
    body: "Gemini reads every email and picks out requests, deadlines, and follow-ups — even ones you'd scroll right past.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
        <path d="M9 12.75l1.5 1.5 3-4.5M12 3a9 9 0 100 18 9 9 0 000-18z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'One clean list',
    body: 'Every task lands on a single dashboard with a deadline, confidence level, and a link straight back to the source email.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
        <path d="M4 6h16M4 12h16M4 18h10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'Straight to Calendar',
    body: 'One click sends every open task into Google Calendar with its deadline, so your day already knows what to expect.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
        <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.75" />
        <path d="M4 10h16M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'Search that groups',
    body: 'Search "Wayam" and see every task from every email about it, even across different threads — typo-tolerant, always grouped.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.75" />
        <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      <div
        className="absolute inset-x-0 top-0 h-[520px] -z-10"
        style={{
          background:
            'radial-gradient(60% 60% at 50% 0%, rgba(99,102,241,0.12) 0%, rgba(255,255,255,0) 70%)',
        }}
      />

      <MarketingHeader />

      <main className="max-w-3xl mx-auto w-full px-6 pt-16 pb-24 text-center flex flex-col items-center gap-8 animate-fade-in">
        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
          Powered by Gemini
        </span>
        <h1 className="text-4xl sm:text-6xl font-extrabold leading-[1.05] tracking-tight">
          Never miss a task
          <br />
          hidden in an email again.
        </h1>
        <p className="text-lg text-slate-600 max-w-xl leading-relaxed">
          CatchMail scans your Gmail inbox, finds the requests, deadlines, and
          follow-ups buried in the noise, and turns them into a clean to-do
          list — with one click to push it all into Google Calendar.
        </p>
        <a
          href={api.connectGmailUrl}
          className="group inline-flex items-center gap-2.5 bg-slate-900 text-white px-7 py-3.5 rounded-xl font-semibold hover:bg-slate-800 transition shadow-lg shadow-slate-900/10"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5">
            <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.7 4.2-5.5 4.2-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.9 1.5l2.6-2.5C16.9 3.5 14.7 2.5 12 2.5 6.9 2.5 2.8 6.6 2.8 11.7S6.9 20.9 12 20.9c6.9 0 8.7-4.8 8.7-7.3 0-.5 0-.9-.1-1.3H12z" />
          </svg>
          Connect Gmail
        </a>
        <p className="text-xs text-slate-400">
          Read-only access. We never send email on your behalf. Free forever for light use —
          see <Link to="/pricing" className="text-indigo-500 hover:underline">pricing</Link>.
        </p>
      </main>

      <section className="max-w-5xl mx-auto w-full px-6 pb-24 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-6 text-left">
            <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 mb-4">
              {f.icon}
            </div>
            <h3 className="font-semibold text-slate-900 mb-1.5">{f.title}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{f.body}</p>
          </div>
        ))}
      </section>

      <section className="max-w-4xl mx-auto w-full px-6 pb-24">
        <div className="rounded-3xl bg-slate-900 text-white px-8 py-14 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight mb-3">Ready to stop re-reading your inbox?</h2>
          <p className="text-slate-300 mb-8 max-w-lg mx-auto">
            Free to start. Upgrade only if your inbox needs more than 30 tasks a month.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <a
              href={api.connectGmailUrl}
              className="inline-flex items-center bg-white text-slate-900 px-6 py-3 rounded-xl font-semibold hover:bg-slate-100 transition"
            >
              Connect Gmail
            </a>
            <Link
              to="/pricing"
              className="inline-flex items-center border border-slate-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-slate-800 transition"
            >
              See pricing
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
