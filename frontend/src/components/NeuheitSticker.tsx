/**
 * NeuheitSticker component
 * Displays "Neuheit {year}" badge for games released in current or previous year
 * Requirements: 5.1, 5.2, 5.3, 8.2
 */

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

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-500 text-white shadow-sm">
      Neuheit {yearPublished}
    </span>
  );
}

export default NeuheitSticker;
