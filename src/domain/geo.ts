import type { Box, Point, Size, ViewBox } from "../types.ts";

/**
 * Pure geometry for the map. A "box" is [x0, y0, x1, y1]; a "viewBox" is
 * [x, y, width, height].
 */

/** Bounds of the whole country in the flat space the paths are authored in.
 *  Emitted by scripts/build-municipalities.mjs — update both together. */
export const COUNTRY_BOX: Box = [21, 130, 798, 880.9];

export interface Bounded {
  bbox: Box;
}

export function unionBox(list: readonly Bounded[]): Box {
  if (!list.length) return COUNTRY_BOX;
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const m of list) {
    if (m.bbox[0] < x0) x0 = m.bbox[0];
    if (m.bbox[1] < y0) y0 = m.bbox[1];
    if (m.bbox[2] > x1) x1 = m.bbox[2];
    if (m.bbox[3] > y1) y1 = m.bbox[3];
  }
  return [x0, y0, x1, y1];
}

export function padBox([x0, y0, x1, y1]: Box, factor: number): Box {
  const px = (x1 - x0) * factor;
  const py = (y1 - y0) * factor;
  return [x0 - px, y0 - py, x1 + px, y1 + py];
}

export function toViewBox([x0, y0, x1, y1]: Box): ViewBox {
  return [x0, y0, Math.max(4, x1 - x0), Math.max(4, y1 - y0)];
}

/** Bounds of everything currently in play, with a little breathing room. */
export function scopeBounds(municipalities: readonly Bounded[]): Box {
  return padBox(unionBox(municipalities), 0.05);
}

/**
 * Widen a box to match the container's aspect ratio. With the viewBox and the
 * viewport in the same proportion, `preserveAspectRatio="xMidYMid meet"` stops
 * letterboxing, so one screen pixel maps to a constant number of map units in
 * both axes — which is what makes dragging and cursor-anchored zoom behave.
 */
export function fitViewBox(bounds: Box, aspect: number): ViewBox {
  const [x0, y0, x1, y1] = bounds;
  let w = x1 - x0;
  let h = y1 - y0;
  const safe = Number.isFinite(aspect) && aspect > 0 ? aspect : w / h;

  if (w / h < safe) w = h * safe;
  else h = w / safe;

  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  return [cx - w / 2, cy - h / 2, w, h];
}

/** A close-up on one shape that still keeps some context around it. */
export function focusViewBox(target: Bounded, bounds: Box, aspect: number): ViewBox {
  const near = padBox(target.bbox, 0.5);
  const floor = Math.max(bounds[2] - bounds[0], bounds[3] - bounds[1]) * 0.14;
  const [, , w, h] = fitViewBox(near, aspect);
  if (Math.max(w, h) >= floor) return fitViewBox(near, aspect);

  const cx = (target.bbox[0] + target.bbox[2]) / 2;
  const cy = (target.bbox[1] + target.bbox[3]) / 2;
  const half = floor / 2;
  return fitViewBox([cx - half, cy - half, cx + half, cy + half], aspect);
}

export interface Limits {
  minWidth: number;
  maxWidth: number;
  bounds: Box;
}

/**
 * Keep a view inside sane limits: never smaller than `minWidth`, never wider
 * than `maxWidth`, and always centred somewhere over the map rather than off
 * in empty space.
 */
export function clampViewBox([x, y, w, h]: ViewBox, { minWidth, maxWidth, bounds }: Limits): ViewBox {
  const aspect = w / h;
  const width = Math.min(maxWidth, Math.max(minWidth, w));
  const height = width / aspect;

  // hold the centre steady while the size is corrected
  let cx = x + w / 2;
  let cy = y + h / 2;

  const [bx0, by0, bx1, by1] = bounds;
  cx = Math.min(bx1, Math.max(bx0, cx));
  cy = Math.min(by1, Math.max(by0, cy));

  return [cx - width / 2, cy - height / 2, width, height];
}

/**
 * Map point to pixel inside an <svg preserveAspectRatio="xMidYMid meet">.
 * Used to hang HTML annotations off the SVG at a constant screen size.
 */
export function projectPoint([px, py]: Point, viewBox: ViewBox, { width, height }: Size): Point | null {
  if (!width || !height) return null;
  const k = Math.min(width / viewBox[2], height / viewBox[3]);
  return [
    (width - viewBox[2] * k) / 2 + (px - viewBox[0]) * k,
    (height - viewBox[3] * k) / 2 + (py - viewBox[1]) * k,
  ];
}
