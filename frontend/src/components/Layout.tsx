/**
 * Main layout wrapper component
 * Provides consistent structure with header and main content area
 * Includes MobileBottomTabs for mobile navigation
 * Includes PullToRefresh for PWA standalone mode
 */

import { ReactNode, useCallback } from 'react';
import { Header } from './Header';
import { MobileBottomTabs } from './MobileBottomTabs';
import { PullToRefresh } from './PullToRefresh';
import type { Participant } from '../types';

interface LayoutProps {
  children: ReactNode;
  participant?: Participant;
  onParticipantUpdated?: (participant: Participant) => void;
  onParticipantSwitch?: () => void;
}

export function Layout({ children, participant, onParticipantUpdated, onParticipantSwitch }: LayoutProps) {
  // Default handlers for when props are not provided
  const handleParticipantUpdated = onParticipantUpdated || (() => {});
  const handleParticipantSwitch = onParticipantSwitch || (() => {});

  // Handle pull-to-refresh - reload the page
  const handleRefresh = useCallback(async () => {
    window.location.reload();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header
        participant={participant}
        onParticipantUpdated={onParticipantUpdated}
        onParticipantSwitch={onParticipantSwitch}
      />
      {/* Add top padding to account for fixed header, bottom padding for mobile tabs */}
      <PullToRefresh onRefresh={handleRefresh}>
        <main className="flex-1 container mx-auto px-4 py-6 pt-20 sm:pt-24 pb-20 md:pb-6">
          {children}
        </main>
        <footer className="no-print bg-gray-200 text-gray-600 text-center py-4 text-sm mb-16 md:mb-0">
          <p>
            © {new Date().getFullYear()}{' '}
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
      </PullToRefresh>
      {/* Mobile Bottom Tabs - only visible on mobile */}
      <MobileBottomTabs
        participant={participant ?? null}
        onParticipantUpdated={handleParticipantUpdated}
        onParticipantSwitch={handleParticipantSwitch}
      />
    </div>
  );
}

export default Layout;
