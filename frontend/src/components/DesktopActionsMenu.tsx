/**
 * DesktopActionsMenu component
 * A dropdown menu for additional actions on desktop game rows
 * Requirements: 023-custom-thumbnail-upload 5.1, 5.2, 5.3, 5.4
 */

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PrototypeToggle } from './PrototypeToggle';
import { ClickNotification } from './ClickNotification';
import type { Game } from '../types';

interface DesktopActionsMenuProps {
  game: Game;
  currentUserId: string;
  onTogglePrototype?: (gameId: string, isPrototype: boolean) => Promise<void>;
  onUploadThumbnail?: (gameId: string) => void;
  onDeleteGame?: (gameId: string) => void;
  canDelete?: boolean;
}

export function DesktopActionsMenu({
  game,
  currentUserId,
  onTogglePrototype,
  onUploadThumbnail,
  onDeleteGame,
  canDelete = false,
}: DesktopActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Check if user is owner and game has no BGG ID
  const isOwner = game.owner?.id === currentUserId;
  const hasNoBggId = game.bggId === null;
  const canShowPrototype = !!onTogglePrototype && isOwner && hasNoBggId;
  const canShowUpload = !!onUploadThumbnail && isOwner && hasNoBggId;
  const canShowDelete = !!onDeleteGame && isOwner;
  const canShowMenu = canShowPrototype || canShowUpload || canShowDelete;

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen || !canShowMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, canShowMenu]);

  // Close menu on escape key
  useEffect(() => {
    if (!isOpen || !canShowMenu) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, canShowMenu]);

  // Don't render if user can't access menu
  if (!canShowMenu) {
    return null;
  }

  const handleTogglePrototype = async (gameId: string, isPrototype: boolean) => {
    if (!onTogglePrototype) return;
    await onTogglePrototype(gameId, isPrototype);
    setIsOpen(false);
  };

  const handleUploadThumbnail = () => {
    if (!onUploadThumbnail) return;
    onUploadThumbnail(game.id);
    setIsOpen(false);
  };

  const handleDeleteGame = () => {
    if (!onDeleteGame || !canDelete) return;
    onDeleteGame(game.id);
    setIsOpen(false);
  };

  // Calculate menu position
  const getMenuPosition = () => {
    if (!buttonRef.current) return { top: 0, left: 0 };
    const rect = buttonRef.current.getBoundingClientRect();
    return {
      top: rect.bottom + 4,
      left: Math.max(8, rect.right - 200), // Align right edge with button, min 8px from left
    };
  };

  const menuPosition = getMenuPosition();

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
        aria-label="Weitere Aktionen"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <svg
          className="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[200px]"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
            }}
            role="menu"
            aria-orientation="vertical"
          >
            {canShowUpload && (
              <button
                onClick={handleUploadThumbnail}
                className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                role="menuitem"
              >
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Bild hochladen
              </button>
            )}

            {canShowPrototype && (
              <>
                {canShowUpload && <div className="border-t border-gray-200 my-1" />}
                <PrototypeToggle
                  gameId={game.id}
                  isPrototype={game.isPrototype}
                  onToggle={handleTogglePrototype}
                  compact={true}
                />
              </>
            )}

            {canShowDelete && (
              <>
                {(canShowUpload || canShowPrototype) && (
                  <div className="border-t border-gray-200 my-1" />
                )}
                <ClickNotification
                  message="Andere Spieler oder Mitbringer sind eingetragen"
                  enabled={!canDelete}
                  duration={3000}
                >
                  <button
                    onClick={handleDeleteGame}
                    disabled={!canDelete}
                    className={`w-full px-4 py-2 text-left flex items-center gap-2 ${
                      canDelete
                        ? 'text-red-700 hover:bg-red-50'
                        : 'text-gray-400 cursor-not-allowed'
                    }`}
                    role="menuitem"
                  >
                    <img src="/trash.svg" alt="" className="w-5 h-5" />
                    Spiel löschen
                  </button>
                </ClickNotification>
              </>
            )}
          </div>,
          document.body
        )}
    </>
  );
}

export default DesktopActionsMenu;
