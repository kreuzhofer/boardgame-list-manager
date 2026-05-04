import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface AccountLayoutProps {
  children: ReactNode;
}

type NavItem = {
  path: string;
  label: string;
  adminOnly?: boolean;
  /** Hidden for `player` accounts who haven't created an event yet. */
  organizerOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { path: '/events', label: 'Meine Events', organizerOnly: true },
  { path: '/meine-treffs', label: 'Meine Treffs' },
  { path: '/admin', label: 'Admin', adminOnly: true },
  { path: '/profile', label: 'Profil' },
];

export function AccountLayout({ children }: AccountLayoutProps) {
  const { account, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname.startsWith(path);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* Light organizer chrome — paper-hi with rule border-bottom, plum-deep wordmark */}
      <header className="bg-paper-hi border-b border-rule fixed top-0 left-0 right-0 z-50">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            {/* Brand: favicon + wordmark + Organisator tag */}
            <Link
              to="/"
              className="flex items-center gap-2 sm:gap-3 hover:opacity-90 transition-opacity flex-shrink-0"
              aria-label="Brettspieltreff – Startseite"
            >
              <img
                src="/favicon.svg"
                alt=""
                aria-hidden="true"
                className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0"
              />
              <span className="font-display text-lg sm:text-xl text-plum-deep truncate">
                Brettspieltreff
              </span>
              <span className="hidden sm:inline-flex wg-tag-ocean">Organisator</span>
            </Link>

            {/* Nav + logout */}
            <nav className="flex items-center gap-0.5 sm:gap-1">
              {NAV_ITEMS.filter((item) => {
                if (item.adminOnly && account?.role !== 'admin') return false;
                if (item.organizerOnly && account?.role !== 'admin' && account?.role !== 'account_owner') return false;
                return true;
              }).map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`text-sm font-bold px-2 sm:px-3 py-1.5 rounded-md transition-colors ${
                    isActive(item.path)
                      ? 'bg-plum-50 text-plum-deep'
                      : 'text-ink-soft hover:text-ink hover:bg-paper-lo'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="text-ink-soft hover:text-ink text-sm font-bold px-2 sm:px-3 py-1.5 rounded-md hover:bg-paper-lo transition-colors"
              >
                Abmelden
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 pt-20 sm:pt-24 pb-6">
        {children}
      </main>

      <footer className="bg-paper-lo text-ink-soft py-4 text-sm">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            &copy; {new Date().getFullYear()}{' '}
            <a
              href="https://danielkreuzhofer.de"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-dotted underline-offset-4 hover:text-ink"
            >
              Daniel Kreuzhofer
            </a>
          </p>
          <nav className="flex items-center gap-4">
            <Link to="/impressum" className="hover:text-ink transition-colors">Impressum</Link>
            <Link to="/datenschutz" className="hover:text-ink transition-colors">Datenschutz</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

export default AccountLayout;
