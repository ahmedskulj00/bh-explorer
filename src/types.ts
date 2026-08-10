/** Geometry shared by the map modules. All values are in the flat SVG space
 *  the boundary paths were authored in — there is no projection step. */

/** An axis-aligned box: [x0, y0, x1, y1]. */
export type Box = readonly [number, number, number, number];

/** An SVG viewBox: [x, y, width, height]. */
export type ViewBox = readonly [number, number, number, number];

export type Point = readonly [number, number];

export interface Size {
  width: number;
  height: number;
}
