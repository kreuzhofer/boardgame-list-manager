/**
 * Main layout wrapper component
 * Provides consistent structure with header and main content area
 */

import { ReactNode } from 'react';
import { Header } from './Header';
import type { User } from '../types';

interface LayoutProps {
  children: ReactNode;
  user?: User;
  onUserUpdated?: (user: User) => void;
  onLogout?: () => void;
}

export function Layout({ children, user, onUserUpdated, onLogout }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header user={user} onUserUpdated={onUserUpdated} onLogout={onLogout} />
      <main className="flex-1 container mx-auto px-4 py-6">
        {children}
      </main>
      <footer className="bg-gray-200 text-gray-600 text-center py-4 text-sm">
        <p>© {new Date().getFullYear()} Daniel Kreuzhofer</p>
      </footer>
    </div>
  );
}

export default Layout;
