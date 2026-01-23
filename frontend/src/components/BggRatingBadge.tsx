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
 * Colors based on BGG's rating breakdown chart:
 * 1-4: Red shades
 * 5-6: Blue shades
 * 7: Light blue
 * 8-10: Green shades
 */
function getRatingColor(rating: number): string {
  const roundedRating = Math.floor(rating);
  
  switch (roundedRating) {
    case 1:
    case 2:
    case 3:
    case 4:
      return '#d32f2f'; // Red
    case 5:
      return '#3f51b5'; // Dark blue
    case 6:
      return '#3f51b5'; // Dark blue
    case 7:
      return '#2196f3'; // Light blue
    case 8:
      return '#4caf50'; // Green
    case 9:
      return '#2e7d32'; // Dark green
    case 10:
      return '#1b5e20'; // Darker green
    default:
      return '#9e9e9e'; // Gray for invalid ratings
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
