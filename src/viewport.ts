import type { ViewportState } from "./types";

export const ZOOM_MIN = 0.35;
export const ZOOM_MAX = 2.25;
export const ZOOM_DEFAULT = 1;

export function clampZoom(scale: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, scale));
}

export function withDefaultScale(
  v: Partial<ViewportState> & Pick<ViewportState, "panX" | "panY">,
): ViewportState {
  return {
    panX: v.panX,
    panY: v.panY,
    scale: clampZoom(v.scale ?? ZOOM_DEFAULT),
  };
}

/** Keep the world point under a screen position fixed while changing scale. */
export function zoomAtScreenPoint(
  viewport: ViewportState,
  nextScale: number,
  screenX: number,
  screenY: number,
  originLeft: number,
  originTop: number,
): ViewportState {
  const scale = clampZoom(nextScale);
  const ratio = scale / viewport.scale;
  const localX = screenX - originLeft;
  const localY = screenY - originTop;
  return {
    scale,
    panX: localX - (localX - viewport.panX) * ratio,
    panY: localY - (localY - viewport.panY) * ratio,
  };
}

export function zoomByFactor(
  viewport: ViewportState,
  factor: number,
  screenX: number,
  screenY: number,
  originLeft: number,
  originTop: number,
): ViewportState {
  return zoomAtScreenPoint(
    viewport,
    viewport.scale * factor,
    screenX,
    screenY,
    originLeft,
    originTop,
  );
}
