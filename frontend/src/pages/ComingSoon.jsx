import { Link } from 'react-router-dom';
import MarketingHeader from '../components/MarketingHeader.jsx';
import MarketingFooter from '../components/MarketingFooter.jsx';

function ClockIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ComingSoon() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <MarketingHeader />

      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6">
          <ClockIcon className="w-7 h-7" />
        </div>
        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-3">Pro billing</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">Coming soon</h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8 leading-relaxed">
          We're putting the finishing touches on CatchMail Pro. Every free-tier
          feature works today — unlimited tasks and priority sync are on the way.
          Want to know the moment it's live?
        </p>
        <div className="flex items-center gap-3 flex-wrap justify-center">
          <Link
            to="/contact"
            className="inline-flex items-center bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-2.5 rounded-lg font-semibold hover:bg-slate-800 dark:hover:bg-slate-200 transition"
          >
            Get notified
          </Link>
          <Link
            to="/pricing"
            className="inline-flex items-center border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-5 py-2.5 rounded-lg font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Back to pricing
          </Link>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
