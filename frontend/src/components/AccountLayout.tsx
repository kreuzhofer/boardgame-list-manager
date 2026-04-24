import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface AccountLayoutProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  { path: '/events', label: 'Meine Events' },
  { path: '/admin', label: 'Admin', adminOnly: true },
  { path: '/profile', label: 'Profil' },
];

export function AccountLayout({ children }: AccountLayoutProps) {
  const { account, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-blue-600 text-white shadow-lg fixed top-0 left-0 right-0 z-50">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="hover:opacity-90 transition-opacity flex-shrink-0">
              <h1 className="text-lg sm:text-2xl font-bold">Verwaltung</h1>
            </Link>

            <nav className="flex items-center gap-1 sm:gap-4">
              {NAV_ITEMS.filter(item => !item.adminOnly || account?.role === 'admin').map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`text-sm px-2 sm:px-3 py-1 rounded transition-colors ${
                    isActive(item.path)
                      ? 'bg-white/20 text-white font-medium'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <button
                onClick={logout}
                className="text-white/80 hover:text-white text-sm px-2 sm:px-3 py-1 rounded hover:bg-white/10 transition-colors"
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

      <footer className="bg-gray-200 text-gray-600 text-center py-4 text-sm">
        <p>
          &copy; {new Date().getFullYear()}{' '}
          <a
            href="https://danielkreuzhofer.de"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-dotted underline-offset-4 hover:text-gray-900"
          >
            Daniel Kreuzhofer
          </a>
        </p>
      </footer>
    </div>
  );
}

export default AccountLayout;
