import MarketingHeader from '../components/MarketingHeader.jsx';
import MarketingFooter from '../components/MarketingFooter.jsx';

export default function About() {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      <MarketingHeader />

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-16">
        <h1 className="text-4xl font-extrabold tracking-tight mb-6">About CatchMail</h1>

        <div className="space-y-5 text-slate-600 leading-relaxed">
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
            the <a href="/privacy" className="text-indigo-500 hover:underline">privacy policy</a> for
            specifics, and disconnect or delete everything at any time from Settings.
          </p>
          <p className="pt-2">
            CatchMail is built and maintained by <strong className="text-slate-900">Arka Bera</strong>.
            If something breaks or you have an idea for what's next, I'd genuinely like to hear
            it — see the <a href="/contact" className="text-indigo-500 hover:underline">contact page</a>.
          </p>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
