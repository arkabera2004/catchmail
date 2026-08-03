import { Link } from 'react-router-dom';

export function Logo({ className = '' }) {
  return (
    <Link to="/" className={`group flex items-center gap-2.5 ${className}`}>
      <span className="relative grid h-8 w-8 place-items-center rounded-[10px] bg-signal-gradient shadow-soft">
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7.5 12 13l9-5.5" />
          <path d="M3 7.5v9A1.5 1.5 0 0 0 4.5 18h15a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 19.5 6h-15A1.5 1.5 0 0 0 3 7.5Z" />
        </svg>
      </span>
      <span className="text-[17px] font-semibold tracking-[-0.02em] text-foreground">CatchMail</span>
    </Link>
  );
}

export function Eyebrow({ children }) {
  return (
    <span className="text-eyebrow inline-flex items-center gap-2 text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-signal" />
      {children}
    </span>
  );
}
