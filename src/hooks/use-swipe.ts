import { useRef, useCallback, type RefObject } from "react";

interface UseSwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  enabled?: boolean;
}

export function useSwipe<T extends HTMLElement = HTMLDivElement>({
  onSwipeLeft,
  onSwipeRight,
  threshold = 80,
  enabled = true,
}: UseSwipeOptions): { ref: RefObject<T | null> } {
  const ref = useRef<T | null>(null);
  const startX = useRef(0);
  const startY = useRef(0);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return;
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
    },
    [enabled]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return;
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const deltaX = endX - startX.current;
      const deltaY = endY - startY.current;

      // Only trigger if horizontal movement dominates vertical
      if (Math.abs(deltaX) < threshold || Math.abs(deltaY) > Math.abs(deltaX)) {
        return;
      }

      if (deltaX > 0) {
        onSwipeRight?.();
      } else {
        onSwipeLeft?.();
      }
    },
    [enabled, threshold, onSwipeLeft, onSwipeRight]
  );

  const callbackRef = useCallback(
    (node: T | null) => {
      // Cleanup previous
      if (ref.current) {
        ref.current.removeEventListener("touchstart", handleTouchStart);
        ref.current.removeEventListener("touchend", handleTouchEnd);
      }
      ref.current = node;
      // Attach to new
      if (node) {
        node.addEventListener("touchstart", handleTouchStart, { passive: true });
        node.addEventListener("touchend", handleTouchEnd, { passive: true });
      }
    },
    [handleTouchStart, handleTouchEnd]
  );

  return { ref: callbackRef as unknown as RefObject<T | null> };
}
