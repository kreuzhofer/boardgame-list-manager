/**
 * BggRatingBadge component
 * Displays BGG rating in a colored hexagon standing on its tip
 * Colors match BGG's rating breakdown colors
 */

interface BggRatingBadgeProps {
  rating: number;
}

/**
 * Get the background color for a BGG rating
 * Uses design system token hex values:
 * 1-4: blush (bad)
 * 5-7: ocean/plum (mid)
 * 8-10: sage (good)
 */
export function getRatingColor(rating: number): string {
  const roundedRating = Math.floor(rating);

  switch (roundedRating) {
    case 1:
    case 2:
    case 3:
    case 4:
      return '#9c4537'; // blush-deep
    case 5:
    case 6:
      return '#3f6f8f'; // ocean
    case 7:
      return '#6b3a5c'; // plum
    case 8:
      return '#7a9476'; // sage
    case 9:
    case 10:
      return '#5b7458'; // sage-deep
    default:
      return '#8c7d92'; // ink-mute
  }
}

export function BggRatingBadge({ rating }: BggRatingBadgeProps) {
  const color = getRatingColor(rating);
  const displayRating = rating.toFixed(1);
  
  return (
    <div 
      className="relative inline-flex items-center justify-center"
      style={{ width: '24px', height: '28px' }}
      title={`BGG Bewertung: ${displayRating}`}
    >
      {/* Hexagon SVG rotated 30 degrees to stand on tip */}
      <svg
        viewBox="0 0 24 28"
        className="absolute inset-0"
        style={{ transform: 'rotate(0deg)' }}
      >
        <polygon
          points="12,0 24,7 24,21 12,28 0,21 0,7"
          fill={color}
        />
      </svg>
      {/* Rating text */}
      <span 
        className="relative text-white font-bold z-10"
        style={{ fontSize: '9px', lineHeight: 1 }}
      >
        {displayRating}
      </span>
    </div>
  );
}

export default BggRatingBadge;
