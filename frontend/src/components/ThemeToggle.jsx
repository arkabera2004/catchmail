import { useTheme } from '../lib/useTheme.js';

function SunIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M20 14.5A8.5 8.5 0 019.5 4 8.5 8.5 0 1020 14.5z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      className={`inline-flex items-center justify-center w-9 h-9 rounded-full border border-border bg-surface text-muted-foreground hover:text-foreground hover:bg-accent transition-colors ${className}`}
    >
      {theme === 'dark' ? <SunIcon className="w-4.5 h-4.5" /> : <MoonIcon className="w-4.5 h-4.5" />}
    </button>
  );
}
