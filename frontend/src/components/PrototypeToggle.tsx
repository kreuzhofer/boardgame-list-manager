/**
 * PrototypeToggle component
 * A toggle switch for prototype status on non-BGG games
 * Requirements: 022-prototype-toggle 2.3, 3.2
 */

import { useState } from 'react';

interface PrototypeToggleProps {
  gameId: string;
  isPrototype: boolean;
  onToggle: (gameId: string, isPrototype: boolean) => Promise<void>;
  disabled?: boolean;
  /** Compact mode for mobile actions menu */
  compact?: boolean;
}

export function PrototypeToggle({
  gameId,
  isPrototype,
  onToggle,
  disabled = false,
  compact = false,
}: PrototypeToggleProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    if (disabled || isLoading) return;
    
    setIsLoading(true);
    try {
      await onToggle(gameId, !isPrototype);
    } finally {
      setIsLoading(false);
    }
  };

  if (compact) {
    // Compact mode for mobile actions menu
    return (
      <button
        onClick={handleToggle}
        disabled={disabled || isLoading}
        className={`flex items-center justify-between w-full px-4 py-3 text-left ${
          disabled || isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
        }`}
        aria-label={isPrototype ? 'Prototyp-Status deaktivieren' : 'Als Prototyp markieren'}
      >
        <span className="text-sm text-gray-700">Prototyp</span>
        <div className="relative">
          <div
            className={`w-10 h-6 rounded-full transition-colors ${
              isPrototype ? 'bg-purple-500' : 'bg-gray-300'
            } ${isLoading ? 'animate-pulse' : ''}`}
          >
            <div
              className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                isPrototype ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </div>
        </div>
      </button>
    );
  }

  // Desktop mode - inline toggle with label
  return (
    <button
      onClick={handleToggle}
      disabled={disabled || isLoading}
      className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
        isPrototype
          ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      } ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={isPrototype ? 'Prototyp-Status deaktivieren' : 'Als Prototyp markieren'}
      aria-label={isPrototype ? 'Prototyp-Status deaktivieren' : 'Als Prototyp markieren'}
    >
      <span className={isLoading ? 'animate-pulse' : ''}>Prototyp</span>
      <div
        className={`w-8 h-4 rounded-full transition-colors ${
          isPrototype ? 'bg-purple-500' : 'bg-gray-300'
        }`}
      >
        <div
          className={`w-3 h-3 mt-0.5 bg-white rounded-full shadow transition-transform ${
            isPrototype ? 'translate-x-4.5 ml-0.5' : 'translate-x-0.5'
          }`}
          style={{ transform: isPrototype ? 'translateX(1rem)' : 'translateX(0.125rem)' }}
        />
      </div>
    </button>
  );
}

export default PrototypeToggle;
