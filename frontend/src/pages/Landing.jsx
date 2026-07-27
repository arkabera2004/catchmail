import { api } from '../lib/api.js';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col">
      <header className="max-w-5xl mx-auto w-full px-6 py-6 flex items-center justify-between">
        <span className="text-xl font-bold text-slate-900">CatchMail</span>
        <a href="/settings" className="text-sm text-slate-500 hover:text-slate-800">
          Settings
        </a>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 text-center flex flex-col items-center justify-center gap-8">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 leading-tight">
          Never miss a task hidden in an email again.
        </h1>
        <p className="text-lg text-slate-600 max-w-xl">
          CatchMail scans your Gmail inbox, finds the requests, deadlines, and
          follow-ups buried in the noise, and turns them into a clean to-do list —
          with a daily digest so nothing slips through.
        </p>
        <a
          href={api.connectGmailUrl}
          className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-slate-800 transition"
        >
          Connect Gmail
        </a>
        <p className="text-xs text-slate-400">
          Read-only access. We never send email on your behalf or read anything
          beyond what's needed to find tasks.
        </p>
      </main>

      <footer className="text-center text-xs text-slate-400 py-6">
        &copy; {new Date().getFullYear()} CatchMail
      </footer>
    </div>
  );
}
