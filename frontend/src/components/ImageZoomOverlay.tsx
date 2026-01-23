/**
 * ImageZoomOverlay - Positioned zoom popup near the thumbnail
 * 
 * Features:
 * - Appears near the thumbnail without fullscreen overlay
 * - Automatically positions to stay within viewport
 * - Shows square200 image for better quality
 */

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface ImageZoomOverlayProps {
  /** BGG ID for loading square200 image */
  bggId: number;
  /** Alt text */
  alt: string;
  /** Callback when overlay should close */
  onClose: () => void;
  /** Position reference - bounding rect of the thumbnail */
  anchorRect?: DOMRect;
}

function getBggImageUrl(bggId: number): string {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  return `${apiUrl}/api/bgg/image/${bggId}/square200`;
}

const ZOOM_SIZE = 200; // square200 is 200x200
const PADDING = 8; // padding from viewport edges

export function ImageZoomOverlay({
  bggId,
  alt,
  anchorRect,
}: ImageZoomOverlayProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageUrl = getBggImageUrl(bggId);

  // Calculate position to keep zoom within viewport
  useEffect(() => {
    if (!anchorRect) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Default: position to the right of the thumbnail
    let left = anchorRect.right + PADDING;
    let top = anchorRect.top;

    // If it would go off the right edge, position to the left
    if (left + ZOOM_SIZE + PADDING > viewportWidth) {
      left = anchorRect.left - ZOOM_SIZE - PADDING;
    }

    // If it would still go off the left edge, center it horizontally
    if (left < PADDING) {
      left = Math.max(PADDING, (viewportWidth - ZOOM_SIZE) / 2);
    }

    // Vertical positioning: try to align with thumbnail top
    // If it would go off the bottom, move it up
    if (top + ZOOM_SIZE + PADDING > viewportHeight) {
      top = viewportHeight - ZOOM_SIZE - PADDING;
    }

    // If it would go off the top, move it down
    if (top < PADDING) {
      top = PADDING;
    }

    setPosition({ top, left });
  }, [anchorRect]);

  if (!anchorRect) return null;

  const overlay = (
    <div
      ref={containerRef}
      className="fixed z-50 pointer-events-none"
      style={{
        top: position.top,
        left: position.left,
        width: ZOOM_SIZE,
        height: ZOOM_SIZE,
      }}
      data-testid="zoom-overlay"
    >
      {/* Loading shimmer */}
      {!imageLoaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse rounded-lg shadow-xl" />
      )}

      {/* Zoomed image */}
      <img
        src={imageUrl}
        alt={alt}
        width={ZOOM_SIZE}
        height={ZOOM_SIZE}
        className={`
          w-full h-full object-cover rounded-lg shadow-xl border-2 border-white
          transition-opacity duration-150
          ${imageLoaded ? 'opacity-100' : 'opacity-0'}
        `}
        onLoad={() => setImageLoaded(true)}
        draggable={false}
      />
    </div>
  );

  return createPortal(overlay, document.body);
}

export default ImageZoomOverlay;
