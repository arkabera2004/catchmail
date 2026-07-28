import { Link } from 'react-router-dom';
import MarketingHeader from '../components/MarketingHeader.jsx';
import MarketingFooter from '../components/MarketingFooter.jsx';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <MarketingHeader />

      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-3">404</p>
        <h1 className="text-3xl font-extrabold tracking-tight mb-4">Page not found</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8">The page you're looking for doesn't exist or has moved.</p>
        <Link
          to="/"
          className="inline-flex items-center bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-2.5 rounded-lg font-semibold hover:bg-slate-800 dark:hover:bg-slate-200 transition"
        >
          Back to home
        </Link>
      </main>

      <MarketingFooter />
    </div>
  );
}
