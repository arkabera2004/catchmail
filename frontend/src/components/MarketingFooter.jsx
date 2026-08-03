import { Link } from 'react-router-dom';
import { Logo } from './Brand.jsx';

const SUPPORT_EMAIL = 'arkabera2004@gmail.com';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { to: '/pricing', label: 'Pricing' },
      { to: '/', label: 'Features' },
      { to: '/faq', label: 'FAQ' },
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
    <footer className="border-t border-border bg-surface-2/60">
      <div className="mx-auto w-full max-w-6xl px-5 py-14 grid gap-10 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Never miss a task hidden in an email again.
          </p>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="text-eyebrow text-muted-foreground">{col.title}</p>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border">
        <div className="mx-auto w-full max-w-6xl px-5 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} CatchMail. Made by Arka Bera.</p>
          <p>
            Questions or issues?{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-signal hover:underline">
              {SUPPORT_EMAIL}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
