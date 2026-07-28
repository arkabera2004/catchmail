import MarketingHeader from '../components/MarketingHeader.jsx';
import MarketingFooter from '../components/MarketingFooter.jsx';

const SUPPORT_EMAIL = 'arkabera2004@gmail.com';

function MailIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M3 7l9 6 9-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Contact() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <MarketingHeader />

      <main className="flex-1 max-w-xl mx-auto w-full px-6 py-16 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">Get in touch</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-10 leading-relaxed">
          Bug reports, billing questions, feature ideas, or anything else — email goes
          straight to me, and I read every one.
        </p>

        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="inline-flex items-center gap-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3.5 rounded-xl font-semibold hover:bg-slate-800 dark:hover:bg-slate-200 transition"
        >
          <MailIcon className="w-5 h-5" />
          {SUPPORT_EMAIL}
        </a>

        <p className="text-sm text-slate-400 mt-8">
          If you're reporting an issue, it helps to include what you were doing, what you
          expected, and what happened instead.
        </p>
      </main>

      <MarketingFooter />
    </div>
  );
}
