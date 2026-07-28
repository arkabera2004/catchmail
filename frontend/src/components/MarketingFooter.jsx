import { Link } from 'react-router-dom';

const SUPPORT_EMAIL = 'arkabera2004@gmail.com';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { to: '/pricing', label: 'Pricing' },
      { to: '/', label: 'Features' },
    ],
  },
  {
    title: 'Company',
    links: [
      { to: '/about', label: 'About' },
      { to: '/contact', label: 'Contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { to: '/privacy', label: 'Privacy Policy' },
      { to: '/terms', label: 'Terms of Service' },
    ],
  },
];

export default function MarketingFooter() {
  return (
    <footer className="border-t border-slate-100 bg-slate-50/60">
      <div className="max-w-6xl mx-auto w-full px-6 py-12 grid sm:grid-cols-2 md:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-white">
                <path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
                <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="font-bold text-slate-900">CatchMail</span>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed">
            Never miss a task hidden in an email again.
          </p>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">{col.title}</p>
            <ul className="space-y-2">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="text-sm text-slate-600 hover:text-slate-900 transition">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-100">
        <div className="max-w-6xl mx-auto w-full px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <p>&copy; {new Date().getFullYear()} CatchMail. Made by Arka Bera.</p>
          <p>
            Questions or issues?{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-indigo-500 hover:underline">
              {SUPPORT_EMAIL}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
