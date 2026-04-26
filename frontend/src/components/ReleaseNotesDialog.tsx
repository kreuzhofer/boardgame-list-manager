/**
 * ReleaseNotesDialog - Modal dialog to show release notes per user per release hash
 */

import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

interface ReleaseNotesDialogProps {
  isOpen: boolean;
  content: string;
  onDismiss: () => void;
}

function renderMarkdown(content: string): ReactNode[] {
  const lines = content.split(/\r?\n/);
  const elements: ReactNode[] = [];
  let listItems: string[] = [];
  let paragraph: string[] = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    const items = listItems;
    listItems = [];
    elements.push(
      <ul className="list-disc pl-5 mt-2 space-y-1" key={`list-${elements.length}`}>
        {items.map((item, index) => (
          <li className="text-sm text-ink-soft" key={`item-${elements.length}-${index}`}>
            {item}
          </li>
        ))}
      </ul>
    );
  };

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const text = paragraph.join(' ');
    paragraph = [];
    elements.push(
      <p className="text-sm text-ink-soft mt-2" key={`p-${elements.length}`}>
        {text}
      </p>
    );
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }

    if (trimmed.startsWith('## ')) {
      flushParagraph();
      flushList();
      elements.push(
        <h2 className="text-base font-semibold text-ink mt-4 first:mt-0" key={`h2-${elements.length}`}>
          {trimmed.slice(3)}
        </h2>
      );
      return;
    }

    if (trimmed.startsWith('# ')) {
      flushParagraph();
      flushList();
      elements.push(
        <h1 className="text-lg font-semibold text-ink mt-4 first:mt-0" key={`h1-${elements.length}`}>
          {trimmed.slice(2)}
        </h1>
      );
      return;
    }

    if (trimmed.startsWith('- ')) {
      flushParagraph();
      listItems.push(trimmed.slice(2));
      return;
    }

    paragraph.push(trimmed);
  });

  flushParagraph();
  flushList();

  return elements;
}

export function ReleaseNotesDialog({ isOpen, content, onDismiss }: ReleaseNotesDialogProps) {
  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onDismiss();
    }
  };

  const dialogContent = (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="release-notes-title"
    >
      <div className="bg-paper-hi rounded-lg shadow-floating max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-rule flex items-center justify-between flex-shrink-0">
          <h2 id="release-notes-title" className="text-xl font-semibold text-ink">
            Neuigkeiten
          </h2>
          <button
            onClick={onDismiss}
            className="text-ink-mute hover:text-ink-soft transition-colors p-1 rounded-lg hover:bg-paper-lo"
            aria-label="Schliessen"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 overflow-y-auto flex-1">
          {renderMarkdown(content)}
        </div>

        <div className="px-6 py-4 border-t border-rule flex justify-end flex-shrink-0">
          <button
            onClick={onDismiss}
            className="px-4 py-2 text-white bg-plum rounded-lg hover:bg-plum-deep transition-colors"
          >
            Gelesen
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
}

export default ReleaseNotesDialog;
