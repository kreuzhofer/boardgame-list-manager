/**
 * MobileBottomTabs - Mobile navigation bottom tab bar
 * Fixed at bottom of viewport on mobile screens (<768px)
 * Hidden on desktop screens (≥768px)
 * All UI text in German (Requirement 8.1)
 * 
 * Requirements: 3.1, 3.2, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 6.1, 8.1
 */

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ParticipantOptionsDialog } from './ParticipantOptionsDialog';
import type { Participant } from '../types';

interface MobileBottomTabsProps {
  participant: Participant | null;
  onParticipantUpdated: (participant: Participant) => void;
  onParticipantSwitch: () => void;
}

// SVG Icon Components
function DiceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" 
      />
    </svg>
  );
}

function PrinterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2}
        d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" 
      />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
      />
    </svg>
  );
}

function ParticipantIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
      />
    </svg>
  );
}

// Tab configuration
interface TabConfig {
  id: string;
  path: string | null;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: 'navigate' | 'dialog';
}

const TABS: TabConfig[] = [
  { id: 'games', path: '/', label: 'Spieleliste', icon: DiceIcon, action: 'navigate' },
  { id: 'print', path: '/print', label: 'Druckansicht', icon: PrinterIcon, action: 'navigate' },
  { id: 'stats', path: '/statistics', label: 'Statistiken', icon: ChartIcon, action: 'navigate' },
  { id: 'profile', path: null, label: 'Profil', icon: ParticipantIcon, action: 'dialog' },
];

export function MobileBottomTabs({ participant, onParticipantUpdated, onParticipantSwitch }: MobileBottomTabsProps) {
  const location = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleProfileClick = () => {
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
  };

  const handleParticipantUpdated = (updatedParticipant: Participant) => {
    onParticipantUpdated(updatedParticipant);
    setIsDialogOpen(false);
  };

  const handleParticipantSwitch = () => {
    setIsDialogOpen(false);
    onParticipantSwitch();
  };

  return (
    <>
      {/* Bottom Tab Bar - visible only on mobile (<768px) */}
      <nav 
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50"
        aria-label="Mobile Navigation"
      >
        <div className="flex justify-around items-center h-16">
          {TABS.map((tab) => {
            const isActive = tab.path !== null && location.pathname === tab.path;
            const Icon = tab.icon;

            if (tab.action === 'dialog') {
              return (
                <button
                  key={tab.id}
                  onClick={handleProfileClick}
                  className={`flex flex-col items-center justify-center flex-1 h-full min-w-0 px-1 transition-colors ${
                    isDialogOpen
                      ? 'text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  aria-label={tab.label}
                  data-testid={`tab-${tab.id}`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-xs mt-1 truncate">{tab.label}</span>
                </button>
              );
            }

            return (
              <Link
                key={tab.id}
                to={tab.path!}
                className={`flex flex-col items-center justify-center flex-1 h-full min-w-0 px-1 transition-colors ${
                  isActive
                    ? 'text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
                data-testid={`tab-${tab.id}`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs mt-1 truncate">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Participant Options Dialog */}
      <ParticipantOptionsDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        participant={participant}
        onParticipantUpdated={handleParticipantUpdated}
        onParticipantSwitch={handleParticipantSwitch}
      />
    </>
  );
}

export default MobileBottomTabs;
