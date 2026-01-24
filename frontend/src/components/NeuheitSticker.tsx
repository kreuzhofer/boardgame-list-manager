/**
 * NeuheitSticker component
 * Displays a red star with YY text for games released in current or previous year
 * Requirements: 5.1, 5.2, 5.3, 8.2
 */

import { HelpBubble } from './HelpBubble';

interface NeuheitStickerProps {
  yearPublished: number | null;
}

/**
 * Determines if a year qualifies as "Neuheit" (new release)
 * A game is considered new if published in current year or previous year
 */
export function isNeuheit(yearPublished: number | null): boolean {
  if (yearPublished === null) {
    return false;
  }
  const currentYear = new Date().getFullYear();
  return yearPublished === currentYear || yearPublished === currentYear - 1;
}

export function NeuheitSticker({ yearPublished }: NeuheitStickerProps) {
  if (!isNeuheit(yearPublished)) {
    return null;
  }

  // Format year as YY (e.g., 2025 -> 25)
  const shortYear = String(yearPublished).slice(-2);

  return (
    <div className="relative inline-flex items-center justify-center w-8 h-8">
      <img src="/star.svg" alt="" className="w-8 h-8" />
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white -mt-0.5">
        {shortYear}
      </span>
      <HelpBubble 
        text={`Neuheit '${shortYear}`} 
        position="top-right" 
        showIndicator={false} 
      />
    </div>
  );
}

export default NeuheitSticker;
