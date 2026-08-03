import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { Logo } from './Brand.jsx';
import ThemeToggle from './ThemeToggle.jsx';

const NAV_LINKS = [
  { to: '/pricing', label: 'Pricing' },
  { to: '/faq', label: 'FAQ' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

export default function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-full px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <a
            href={api.connectGmailUrl}
            className="inline-flex items-center gap-2 bg-signal text-primary-foreground text-sm font-semibold px-4 py-2 rounded-full hover:opacity-90 transition shadow-soft"
          >
            Get started
          </a>
        </div>
      </div>
    </header>
  );
}
