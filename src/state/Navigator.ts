/**
 * Navigator - a cursor over a bounded list with viewport tracking
 *
 * Used for both:
 * - List navigation (process selection) - wraps around
 * - Scroll navigation (content viewing) - clamps to bounds
 */

export type NavigatorOptions = {
  getLength: () => number;
  wrap: boolean;
  onMove?: () => void;
};

export type Navigator = {
  readonly position: number;
  readonly viewportOffset: number;

  up(step?: number): void;
  down(step?: number): void;
  pageUp(pageSize: number, viewportSize?: number): void;
  pageDown(pageSize: number, viewportSize?: number): void;
  toStart(): void;
  toEnd(): void;
  ensureVisible(viewportSize: number): void;
  clampViewport(viewportSize: number): boolean; // Returns true if viewport changed
  setPosition(position: number): void;
  reset(): void;
};

export function createNavigator(options: NavigatorOptions): Navigator {
  const { getLength, wrap, onMove } = options;

  let position = 0;
  let viewportOffset = 0;

  const clamp = (value: number, min: number, max: number): number => {
    return Math.max(min, Math.min(max, value));
  };

  const normalizePosition = (pos: number): number => {
    const length = getLength();
    if (length === 0) return 0;

    if (wrap) {
      // Wrap around for list navigation
      return ((pos % length) + length) % length;
    }
    // Clamp for scroll navigation
    return clamp(pos, 0, Math.max(0, length - 1));
  };

  const ensureVisible = (viewportSize: number): void => {
    if (viewportSize <= 0) return;

    if (position < viewportOffset) {
      // Position is above viewport - scroll up
      viewportOffset = position;
    } else if (position >= viewportOffset + viewportSize) {
      // Position is below viewport - scroll down
      viewportOffset = position - viewportSize + 1;
    }
  };

  return {
    get position() {
      return position;
    },

    get viewportOffset() {
      return viewportOffset;
    },

    up(step = 1): void {
      const length = getLength();
      if (length === 0) return;

      position = normalizePosition(position - step);
      onMove?.();
    },

    down(step = 1): void {
      const length = getLength();
      if (length === 0) return;

      position = normalizePosition(position + step);
      onMove?.();
    },

    pageUp(pageSize: number, viewportSize?: number): void {
      const length = getLength();
      if (length === 0) return;

      // For page navigation, don't wrap - stop at bounds
      position = clamp(position - pageSize, 0, Math.max(0, length - 1));
      if (viewportSize) {
        ensureVisible(viewportSize);
      }
      onMove?.();
    },

    pageDown(pageSize: number, viewportSize?: number): void {
      const length = getLength();
      if (length === 0) return;

      // For page navigation, don't wrap - stop at bounds
      position = clamp(position + pageSize, 0, Math.max(0, length - 1));
      if (viewportSize) {
        ensureVisible(viewportSize);
      }
      onMove?.();
    },

    toStart(): void {
      position = 0;
      viewportOffset = 0;
      onMove?.();
    },

    toEnd(): void {
      const length = getLength();
      if (length === 0) return;

      position = length - 1;
      onMove?.();
    },

    ensureVisible,

    clampViewport(viewportSize: number): boolean {
      const length = getLength();
      const oldOffset = viewportOffset;

      if (length === 0 || viewportSize <= 0) {
        viewportOffset = 0;
        return viewportOffset !== oldOffset;
      }

      // If all items fit in viewport, start from 0
      if (length <= viewportSize) {
        viewportOffset = 0;
        return viewportOffset !== oldOffset;
      }

      // Ensure no empty space at bottom: viewportOffset + viewportSize <= length
      const maxOffset = length - viewportSize;
      if (viewportOffset > maxOffset) {
        viewportOffset = maxOffset;
      }

      // Also ensure position is still visible in the (potentially moved) viewport
      ensureVisible(viewportSize);

      return viewportOffset !== oldOffset;
    },

    setPosition(newPosition: number): void {
      position = normalizePosition(newPosition);
    },

    reset(): void {
      position = 0;
      viewportOffset = 0;
    },
  };
}
