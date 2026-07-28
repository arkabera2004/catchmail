import { Link } from 'react-router-dom';
import MarketingHeader from '../components/MarketingHeader.jsx';
import MarketingFooter from '../components/MarketingFooter.jsx';
import { api } from '../lib/api.js';

function CheckIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    cadence: 'forever',
    description: 'Try CatchMail on your own inbox, no card required.',
    features: [
      '1 connected Gmail inbox',
      'Up to 30 extracted tasks / month',
      '7-day inbox backfill on connect',
      'Sync every 15 minutes',
      'Google Calendar sync',
      'Daily digest email',
    ],
    cta: 'Get started free',
    href: api.connectGmailUrl,
    highlight: false,
  },
  {
    name: 'Pro',
    price: '₹499',
    cadence: '/ month',
    description: 'For inboxes that never stop moving.',
    features: [
      'Everything in Free',
      'Unlimited extracted tasks',
      'Priority sync',
      'Fuzzy search across your task history',
      'Priority email support',
    ],
    cta: 'Upgrade to Pro',
    href: '/settings',
    highlight: true,
  },
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <MarketingHeader />

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-16">
        <div className="text-center mb-14">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">Simple, honest pricing</h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            Start free. Upgrade only when your inbox outgrows the free tier.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-8 border transition hover:-translate-y-1 ${
                plan.highlight
                  ? 'border-slate-900 dark:border-slate-700 bg-slate-900 text-white shadow-xl hover:shadow-2xl'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-md dark:hover:shadow-none hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <h2 className={`text-lg font-semibold mb-1 ${plan.highlight ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                {plan.name}
              </h2>
              <p className={`text-sm mb-6 ${plan.highlight ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                {plan.description}
              </p>
              <div className="flex items-baseline gap-1.5 mb-6">
                <span className="text-4xl font-extrabold">{plan.price}</span>
                <span className={plan.highlight ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}>{plan.cadence}</span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <CheckIcon className={`w-5 h-5 flex-shrink-0 ${plan.highlight ? 'text-emerald-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
                    <span className={plan.highlight ? 'text-slate-200' : 'text-slate-600 dark:text-slate-300'}>{f}</span>
                  </li>
                ))}
              </ul>

              {plan.href.startsWith('/') ? (
                <Link
                  to={plan.href}
                  className={`block text-center w-full font-semibold py-3 rounded-xl transition ${
                    plan.highlight
                      ? 'bg-white text-slate-900 hover:bg-slate-100'
                      : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200'
                  }`}
                >
                  {plan.cta}
                </Link>
              ) : (
                <a
                  href={plan.href}
                  className={`block text-center w-full font-semibold py-3 rounded-xl transition ${
                    plan.highlight
                      ? 'bg-white text-slate-900 hover:bg-slate-100'
                      : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200'
                  }`}
                >
                  {plan.cta}
                </a>
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-slate-400 dark:text-slate-500 mt-12">
          Prices shown in test mode. Have a question about billing?{' '}
          <Link to="/contact" className="text-indigo-500 dark:text-indigo-400 hover:underline">
            Get in touch
          </Link>
          .
        </p>
      </main>

      <MarketingFooter />
    </div>
  );
}
