import MarketingHeader from '../components/MarketingHeader.jsx';
import MarketingFooter from '../components/MarketingFooter.jsx';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      <MarketingHeader />

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-16">
        <h1 className="text-4xl font-extrabold tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-sm text-slate-400 mb-10">Last updated: July 2026</p>

        <div className="space-y-8 text-slate-600 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">What we access</h2>
            <p>
              When you connect Gmail, CatchMail requests read-only access to your inbox
              (<code className="text-sm bg-slate-100 px-1 py-0.5 rounded">gmail.readonly</code>)
              and permission to create events on your Google Calendar
              (<code className="text-sm bg-slate-100 px-1 py-0.5 rounded">calendar.events</code>),
              plus your name and email address for sign-in. We never send email on your
              behalf, never modify or delete anything in your inbox, and only create calendar
              events you've explicitly asked for via the "Add to Google Calendar" button.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">What we store</h2>
            <p>
              Your Gmail refresh token is encrypted (AES-256-GCM) before being stored. For
              each task we extract from an email, we store the task text, deadline,
              confidence level, and a link back to the source email — not the full email
              body. Email subject lines and sender addresses are stored to power search.
              We do not store full email bodies after extraction.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Third parties we use</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-slate-900">Google</strong> — Gmail and Calendar
                access, and sign-in.
              </li>
              <li>
                <strong className="text-slate-900">Google Gemini</strong> — email
                subject/sender/body text is sent to Gemini's API to extract tasks. Emails
                that look like newsletters, notifications, or calendar invites are filtered
                out before this happens.
              </li>
              <li>
                <strong className="text-slate-900">Supabase</strong> — database hosting for
                your account and task data.
              </li>
              <li>
                <strong className="text-slate-900">Resend</strong> — sends the optional daily
                digest email.
              </li>
              <li>
                <strong className="text-slate-900">Razorpay</strong> — processes subscription
                payments if you upgrade to Pro. We don't store your card details.
              </li>
            </ul>
            <p className="mt-2">We do not sell your data to anyone.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Your controls</h2>
            <p>
              From Settings you can pause scanning at any time, disconnect Gmail (which
              revokes our access and deletes your stored refresh token), or permanently
              delete your account and all associated tasks. Deletion is immediate and
              cannot be undone.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Cookies</h2>
            <p>
              We use a single session cookie to keep you signed in. We don't use advertising
              or tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Changes to this policy</h2>
            <p>
              If this policy changes materially, we'll update the date at the top of this
              page. Continued use of CatchMail after a change means you accept the updated
              policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Contact</h2>
            <p>
              Questions about this policy? Email{' '}
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
