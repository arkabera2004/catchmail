import { useState } from 'react';
import { Link } from 'react-router-dom';
import MarketingHeader from '../components/MarketingHeader.jsx';
import MarketingFooter from '../components/MarketingFooter.jsx';

const FAQS = [
  {
    q: 'Can CatchMail send email or delete anything in my inbox?',
    a: "No. We request Gmail's read-only scope, which physically cannot send, modify, or delete mail. The only write access we have is to your Google Calendar, and only to create events you explicitly trigger with the \"Add to Google Calendar\" button.",
  },
  {
    q: 'What exactly gets stored?',
    a: 'For each task: the task text, deadline, confidence level, a link back to the source email, and the email subject/sender (for search). We do not store full email bodies after extraction — the body is sent to Gemini for analysis and then discarded.',
  },
  {
    q: 'How accurate is the task extraction?',
    a: "It's good, not perfect — it's an AI model reading natural language. Each task shows a confidence level (high/medium/low) so you can judge how much to trust it. Always double-check anything time-sensitive.",
  },
  {
    q: 'What happens if I disconnect Gmail?',
    a: "Your stored refresh token is deleted immediately and access is revoked on Google's side too. Your existing tasks stay until you delete them — disconnecting just stops new scanning.",
  },
  {
    q: 'Can I delete my data entirely?',
    a: 'Yes — Settings has a "Delete all data" option that permanently removes your account and every task, immediately and irreversibly.',
  },
  {
    q: 'What counts toward the 30 tasks/month free tier limit?',
    a: 'Only tasks CatchMail successfully extracts count — emails that get filtered out (newsletters, no-reply senders, calendar invites) or that Gemini decides contain no task never touch the limit.',
  },
  {
    q: 'Can I cancel Pro at any time?',
    a: 'Yes, from Settings. Cancellation takes effect at the end of your current billing period — no partial refunds, no lock-in beyond that.',
  },
];

function FaqItem({ item, open, onToggle }) {
  return (
    <div className="border-b border-border py-5">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between text-left gap-4"
      >
        <span className="font-semibold text-foreground dark:text-white">{item.q}</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform ${open ? 'rotate-45' : ''}`}
        >
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      </button>
      {open && <p className="text-sm text-muted-foreground leading-relaxed mt-3 pr-8">{item.a}</p>}
    </div>
  );
}

export default function Faq() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors">
      <MarketingHeader />

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-16">
        <h1 className="text-4xl font-extrabold tracking-tight mb-3">Frequently asked questions</h1>
        <p className="text-muted-foreground mb-10">
          Everything people usually ask before connecting an inbox. Missing something?{' '}
          <Link to="/contact" className="text-signal hover:underline">
            Ask directly
          </Link>
          .
        </p>

        <div>
          {FAQS.map((item, i) => (
            <FaqItem
              key={item.q}
              item={item}
              open={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
            />
          ))}
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
