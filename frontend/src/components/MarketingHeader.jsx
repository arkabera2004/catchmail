import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import ThemeToggle from './ThemeToggle.jsx';

const NAV_LINKS = [
  { to: '/pricing', label: 'Pricing' },
  { to: '/faq', label: 'FAQ' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

export default function MarketingHeader() {
  return (
    <header className="max-w-6xl mx-auto w-full px-6 py-4 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-white flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white dark:text-slate-900">
            <path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
            <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">CatchMail</span>
      </Link>

      <nav className="hidden sm:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
        {NAV_LINKS.map((link) => (
          <Link key={link.to} to={link.to} className="hover:text-slate-900 dark:hover:text-white transition">
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <a
          href={api.connectGmailUrl}
          className="inline-flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-200 transition"
        >
          Get started
        </a>
      </div>
    </header>
  );
}
