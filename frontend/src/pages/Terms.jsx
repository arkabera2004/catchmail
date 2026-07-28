import MarketingHeader from '../components/MarketingHeader.jsx';
import MarketingFooter from '../components/MarketingFooter.jsx';

export default function Terms() {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      <MarketingHeader />

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-16">
        <h1 className="text-4xl font-extrabold tracking-tight mb-2">Terms of Service</h1>
        <p className="text-sm text-slate-400 mb-10">Last updated: July 2026</p>

        <div className="space-y-8 text-slate-600 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">1. Using CatchMail</h2>
            <p>
              By connecting your Gmail account you agree to these terms. CatchMail scans
              your inbox to surface tasks and lets you push them to Google Calendar. You're
              responsible for keeping your Google account secure — anyone with access to it
              can access your CatchMail data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">2. Plans and billing</h2>
            <p>
              The Free plan includes one connected inbox and up to 30 extracted tasks per
              month. The Pro plan removes that cap and is billed on a recurring basis via
              Razorpay. You can cancel at any time from Settings; cancellation takes effect
              at the end of the current billing period. Payments are currently processed in
              Razorpay test mode.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">3. Acceptable use</h2>
            <p>
              Don't use CatchMail to connect an inbox you don't have authorization to access,
              attempt to disrupt the service, or reverse-engineer the extraction pipeline to
              extract data at scale for purposes unrelated to your own task management.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">4. No warranty</h2>
            <p>
              Task extraction is powered by an AI model and won't be perfect — it can miss
              tasks or misread a deadline. Review extracted tasks before relying on them for
              anything time-sensitive. CatchMail is provided "as is" without warranties of
              any kind.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">5. Limitation of liability</h2>
            <p>
              To the maximum extent permitted by law, CatchMail and its operator aren't
              liable for indirect, incidental, or consequential damages arising from your
              use of the service, including missed deadlines resulting from extraction
              errors.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">6. Termination</h2>
            <p>
              You can stop using CatchMail and delete your data at any time from Settings.
              We may suspend accounts that violate these terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">7. Contact</h2>
            <p>
              Questions about these terms? Email{' '}
              <a href="mailto:arkabera2004@gmail.com" className="text-indigo-500 hover:underline">
                arkabera2004@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
