import { Link, useLocation } from 'react-router-dom';
import { CalendarDays, LayoutGrid, Settings } from 'lucide-react';
import { Logo } from './Brand.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import AccountMenu from './AccountMenu.jsx';

const TABS = [
  { label: 'Tasks', to: '/dashboard', icon: LayoutGrid },
  { label: 'Calendar', to: '/calendar', icon: CalendarDays },
  { label: 'Settings', to: '/settings', icon: Settings },
];

export default function AppHeader({ user }) {
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-5">
        <Logo />
        <nav className="hidden items-center gap-1 rounded-full border border-border bg-surface-2/70 p-1 md:flex">
          {TABS.map((tab) => {
            const active = pathname === tab.to;
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm transition-all ${
                  active ? 'bg-surface text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <AccountMenu user={user} />
        </div>
      </div>
      <nav className="flex items-center gap-1 border-t border-border px-3 py-2 md:hidden">
        {TABS.map((tab) => {
          const active = pathname === tab.to;
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-1.5 text-sm ${
                active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
