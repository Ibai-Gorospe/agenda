import { useRef, useCallback } from "react";

export function useSwipeNav({ onSwipeLeft, onSwipeRight, threshold = 60 }) {
  const startRef = useRef(null);

  const onTouchStart = useCallback((e) => {
    startRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const onTouchEnd = useCallback((e) => {
    if (!startRef.current) return;
    const dx = e.changedTouches[0].clientX - startRef.current.x;
    const dy = e.changedTouches[0].clientY - startRef.current.y;
    startRef.current = null;
    // Only trigger if horizontal movement is dominant
    if (Math.abs(dx) < threshold || Math.abs(dy) > Math.abs(dx) * 0.7) return;
    if (dx < -threshold) onSwipeLeft();
    else if (dx > threshold) onSwipeRight();
  }, [onSwipeLeft, onSwipeRight, threshold]);

  return { onTouchStart, onTouchEnd };
}
