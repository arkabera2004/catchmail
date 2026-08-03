import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Settings, UserRoundCog } from 'lucide-react';
import { api } from '../lib/api.js';

export function Avatar({ user, size = 32 }) {
  const [imgFailed, setImgFailed] = useState(false);
  const initial = (user?.name || user?.email || '?').charAt(0).toUpperCase();

  if (user?.picture && !imgFailed) {
    return (
      <img
        src={user.picture}
        alt={user.name || user.email}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        style={{ width: size, height: size }}
        className="rounded-full object-cover flex-shrink-0"
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className="rounded-full bg-signal-gradient text-primary-foreground flex items-center justify-center font-semibold flex-shrink-0"
    >
      {initial}
    </div>
  );
}

export default function AccountMenu({ user }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleLogout() {
    await api.logout();
    navigate('/');
  }

  async function handleSwitchAccount() {
    await api.logout();
    window.location.href = api.connectGmailUrl;
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-accent transition-colors outline-none ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Avatar user={user} />
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 surface-card py-1.5 z-20 animate-scale-in">
          <div className="px-3.5 py-2.5 border-b border-border flex items-center gap-3">
            <Avatar user={user} size={38} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-foreground">{user?.name || 'Your account'}</span>
              <span className="block truncate text-xs text-muted-foreground">{user?.email}</span>
            </span>
          </div>

          <Link
            to="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 mx-1.5 my-0.5 px-2.5 py-2 rounded-lg text-sm text-foreground hover:bg-accent transition-colors"
          >
            <Settings className="w-4 h-4 text-muted-foreground" />
            Settings
          </Link>

          <button
            onClick={handleSwitchAccount}
            className="w-full flex items-center gap-2.5 mx-1.5 my-0.5 px-2.5 py-2 rounded-lg text-sm text-foreground hover:bg-accent transition-colors text-left"
          >
            <UserRoundCog className="w-4 h-4 text-muted-foreground" />
            Switch account
          </button>

          <div className="border-t border-border mt-1 pt-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 mx-1.5 my-0.5 px-2.5 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors text-left"
            >
              <LogOut className="w-4 h-4" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
