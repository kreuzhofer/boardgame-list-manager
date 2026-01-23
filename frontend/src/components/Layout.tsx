/**
 * Main layout wrapper component
 * Provides consistent structure with header and main content area
 * Includes MobileBottomTabs for mobile navigation
 */

import { ReactNode } from 'react';
import { Header } from './Header';
import { MobileBottomTabs } from './MobileBottomTabs';
import type { User } from '../types';

interface LayoutProps {
  children: ReactNode;
  user?: User;
  onUserUpdated?: (user: User) => void;
  onLogout?: () => void;
}

export function Layout({ children, user, onUserUpdated, onLogout }: LayoutProps) {
  // Default handlers for when props are not provided
  const handleUserUpdated = onUserUpdated || (() => {});
  const handleLogout = onLogout || (() => {});

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header user={user} onUserUpdated={onUserUpdated} onLogout={onLogout} />
      {/* Add bottom padding on mobile to prevent content overlap with bottom tabs */}
      <main className="flex-1 container mx-auto px-4 py-6 pb-20 md:pb-6">
        {children}
      </main>
      <footer className="bg-gray-200 text-gray-600 text-center py-4 text-sm mb-16 md:mb-0">
        <p>© {new Date().getFullYear()} Daniel Kreuzhofer</p>
      </footer>
      {/* Mobile Bottom Tabs - only visible on mobile */}
      <MobileBottomTabs
        user={user ?? null}
        onUserUpdated={handleUserUpdated}
        onLogout={handleLogout}
      />
    </div>
  );
}

export default Layout;
