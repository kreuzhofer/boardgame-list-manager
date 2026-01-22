/**
 * Main layout wrapper component
 * Provides consistent structure with header and main content area
 */

import { ReactNode } from 'react';
import { Header } from './Header';

interface LayoutProps {
  children: ReactNode;
  userName?: string;
  onNameChange?: () => void;
}

export function Layout({ children, userName, onNameChange }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header userName={userName} onNameChange={onNameChange} />
      <main className="flex-1 container mx-auto px-4 py-6">
        {children}
      </main>
      <footer className="bg-gray-200 text-gray-600 text-center py-4 text-sm">
        <p>© {new Date().getFullYear()} Brettspiel-Event Koordination</p>
      </footer>
    </div>
  );
}

export default Layout;
