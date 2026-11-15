export type HorizontalSwipeDirection = "left" | "right";

export interface SwipeOptions {
  /** Minimum horizontal travel in pixels required to qualify as a swipe. */
  minDistancePx?: number;
  /** Shorter travel distance allowed when gesture is a quick flick. */
  flickMinDistancePx?: number;
  /** Maximum duration in ms for a quick flick gesture. */
  flickMaxDurationMs?: number;
  /** Maximum ratio of vertical to horizontal travel so vertical scrolling is never hijacked. */
  maxVerticalRatio?: number;
}

export interface VerticalSwipeDownOptions {
  minDistancePx?: number;
  flickMinDistancePx?: number;
  flickMaxDurationMs?: number;
  maxHorizontalRatio?: number;
}

/**
 * Determines whether a touch gesture qualifies as an intentional horizontal swipe
 * without interfering with vertical page scrolling.
 */
export function detectHorizontalSwipe(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  elapsedMs: number,
  options: SwipeOptions = {}
): HorizontalSwipeDirection | null {
  if (
    !Number.isFinite(startX) ||
    !Number.isFinite(startY) ||
    !Number.isFinite(endX) ||
    !Number.isFinite(endY)
  ) {
    return null;
  }

  const minDistancePx = options.minDistancePx ?? 42;
  const flickMinDistancePx = options.flickMinDistancePx ?? 24;
  const flickMaxDurationMs = options.flickMaxDurationMs ?? 240;
  const maxVerticalRatio = options.maxVerticalRatio ?? 0.85;

  const dx = endX - startX;
  const dy = endY - startY;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (absDx === 0) return null;
  if (absDy > absDx * maxVerticalRatio) return null;

  const isQuickFlick =
    Number.isFinite(elapsedMs) &&
    elapsedMs > 0 &&
    elapsedMs <= flickMaxDurationMs &&
    absDx >= flickMinDistancePx;

  if (absDx < minDistancePx && !isQuickFlick) {
    return null;
  }

  return dx < 0 ? "left" : "right";
}

/**
 * Determines whether a touch gesture on a bottom-sheet header or pull handle
 * qualifies as a downward swipe to dismiss.
 */
export function detectVerticalSwipeDown(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  elapsedMs: number,
  options: VerticalSwipeDownOptions = {}
): boolean {
  if (
    !Number.isFinite(startX) ||
    !Number.isFinite(startY) ||
    !Number.isFinite(endX) ||
    !Number.isFinite(endY)
  ) {
    return false;
  }

  const minDistancePx = options.minDistancePx ?? 56;
  const flickMinDistancePx = options.flickMinDistancePx ?? 32;
  const flickMaxDurationMs = options.flickMaxDurationMs ?? 260;
  const maxHorizontalRatio = options.maxHorizontalRatio ?? 0.75;

  const dx = endX - startX;
  const dy = endY - startY;
  if (dy <= 0) return false;

  const absDx = Math.abs(dx);
  if (absDx > dy * maxHorizontalRatio) return false;

  const isQuickFlick =
    Number.isFinite(elapsedMs) &&
    elapsedMs > 0 &&
    elapsedMs <= flickMaxDurationMs &&
    dy >= flickMinDistancePx;

  return dy >= minDistancePx || isQuickFlick;
}

/**
 * Wraps an index cleanly across a circular carousel of length `total`.
 */
export function computeNextWrappedIndex(
  currentIndex: number,
  delta: number,
  total: number
): number {
  if (!Number.isFinite(total) || total <= 0) return 0;
  const normalizedCurrent = ((Math.trunc(currentIndex) % total) + total) % total;
  return (((normalizedCurrent + Math.trunc(delta)) % total) + total) % total;
}

/**
 * Computes responsive grid/pagination parameters based on viewport width.
 */
export function getResponsivePaginationConfig(viewportWidth: number): {
  simple: boolean;
  showSizeChanger: boolean;
  maxButtons: number;
} {
  if (!Number.isFinite(viewportWidth) || viewportWidth < 640) {
    return { simple: true, showSizeChanger: false, maxButtons: 3 };
  }
  if (viewportWidth < 1024) {
    return { simple: false, showSizeChanger: false, maxButtons: 5 };
  }
  return { simple: false, showSizeChanger: true, maxButtons: 7 };
}
