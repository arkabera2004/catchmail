import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';

const NAV_LINKS = [
  { to: '/pricing', label: 'Pricing' },
  { to: '/faq', label: 'FAQ' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

export default function MarketingHeader() {
  return (
    <header className="max-w-6xl mx-auto w-full px-6 py-6 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white">
            <path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
            <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="text-lg font-bold tracking-tight text-slate-900">CatchMail</span>
      </Link>

      <nav className="hidden sm:flex items-center gap-8 text-sm font-medium text-slate-600">
        {NAV_LINKS.map((link) => (
          <Link key={link.to} to={link.to} className="hover:text-slate-900 transition">
            {link.label}
          </Link>
        ))}
      </nav>

      <a
        href={api.connectGmailUrl}
        className="inline-flex items-center gap-2 bg-slate-900 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-slate-800 transition"
      >
        Get started
      </a>
    </header>
  );
}
