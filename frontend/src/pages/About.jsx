import MarketingHeader from '../components/MarketingHeader.jsx';
import MarketingFooter from '../components/MarketingFooter.jsx';

export default function About() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors">
      <MarketingHeader />

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-16">
        <div className="w-12 h-12 rounded-xl bg-signal-soft flex items-center justify-center text-signal mb-6">
          <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
            <path
              d="M12 21c-4.5-3-8-6.5-8-10.5A5.5 5.5 0 0112 6a5.5 5.5 0 018 4.5c0 4-3.5 7.5-8 10.5z"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight mb-6">About CatchMail</h1>

        <div className="space-y-5 text-muted-foreground leading-relaxed">
          <p>
            Most task managers assume you'll type your tasks in yourself. In practice, the
            majority of what you actually need to do shows up as a throwaway line in an
            email — "can you send this by Friday?", "let's sync on the deck before Thursday" —
            and it's gone the moment you archive the thread.
          </p>
          <p>
            CatchMail reads your inbox so you don't have to re-read it. It finds the asks,
            deadlines, and follow-ups buried in ordinary email and turns them into a list you
            can actually act on — with one click to push everything into Google Calendar.
          </p>
          <p>
            It's built on Gmail's read-only API (we never send mail on your behalf), Gemini
            for extraction, and Google Calendar for scheduling. Your data stays yours — see
            the <a href="/privacy" className="text-signal hover:underline">privacy policy</a> for
            specifics, and disconnect or delete everything at any time from Settings.
          </p>
          <p className="pt-2">
            CatchMail is built and maintained by <strong className="text-foreground dark:text-white">Arka Bera</strong>.
            If something breaks or you have an idea for what's next, I'd genuinely like to hear
            it — see the <a href="/contact" className="text-signal hover:underline">contact page</a>.
          </p>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
