import { COUNTRY_BOX, COUNTRY_LONLAT } from "./geo.ts";
import type { Point, Size, ViewBox } from "../types.ts";

/**
 * Ties the flat SVG space the boundaries are authored in to Web Mercator, so
 * raster map tiles can be laid underneath them.
 *
 * This registers exactly rather than approximately, and the reason is worth
 * knowing: `scripts/build-municipalities.mjs` projects with spherical Mercator
 * and then applies *one* linear scale to every shape. Tile services use the
 * same projection (EPSG:3857). Two spaces that differ only by a translation
 * and a single uniform scale need no resampling and no per-shape correction —
 * recover that one transform and the imagery sits under the boundaries to the
 * pixel. Anything else here would have meant reprojecting 142 paths.
 */

/** Every provider serves 256-pixel tiles. */
const TILE_PX = 256;

/** Below this the world is a handful of tiles and there is nothing to see. */
export const MIN_ZOOM = 2;

/** Stand-in for a stage that has not been measured yet, as in `MapStage`. */
const FALLBACK_WIDTH = 900;

/** Mercator y for a latitude, in degrees — the build script's own `project`. */
export function mercatorY(lat: number): number {
  return (Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * 180) / Math.PI;
}

/** Inverse of `mercatorY`. */
export function latitudeOf(y: number): number {
  return (Math.atan(Math.exp((y * Math.PI) / 180)) * 360) / Math.PI - 90;
}

/* The country box and the degrees it was made from describe one rectangle, and
   that correspondence is the whole transform. Only exact values are used: the
   x edges are the build script's ORIGIN and WIDTH, and the top edge its
   ORIGIN. The bottom edge is rounded when emitted, so it is derived, never
   read — half an SVG unit of rounding there would be a visible drift. */
const [BOX_X0, BOX_Y0, BOX_X1] = COUNTRY_BOX;
const [WEST, , EAST, NORTH] = COUNTRY_LONLAT;

/** SVG units per degree of longitude. */
const SCALE = (BOX_X1 - BOX_X0) / (EAST - WEST);

/** The whole Mercator world, in SVG units. */
export const WORLD = 360 * SCALE;

/** Where the world's top-left corner falls in SVG space. */
const WORLD_ORIGIN: Point = [
  BOX_X0 + (-180 - WEST) * SCALE,
  BOX_Y0 + (mercatorY(NORTH) - 180) * SCALE,
];

/** A point in the flat SVG space → longitude and latitude. */
export function toLonLat([x, y]: Point): Point {
  return [
    ((x - WORLD_ORIGIN[0]) / WORLD) * 360 - 180,
    latitudeOf(180 - ((y - WORLD_ORIGIN[1]) / WORLD) * 360),
  ];
}

/** Longitude and latitude → the flat SVG space. */
export function toMapPoint([lon, lat]: Point): Point {
  return [
    WORLD_ORIGIN[0] + ((lon + 180) / 360) * WORLD,
    WORLD_ORIGIN[1] + ((180 - mercatorY(lat)) / 360) * WORLD,
  ];
}

/** One tile: which one to ask for, and where it belongs on the board. */
export interface Tile {
  z: number;
  x: number;
  y: number;
  /** Position and side in map space — the same units as a `ViewBox`. */
  sx: number;
  sy: number;
  size: number;
  key: string;
}

export interface TileOptions {
  /** Deepest level the provider serves. */
  maxZoom?: number;
  /** Rings of extra tiles kept beyond the view, so a small pan loads nothing. */
  margin?: number;
  /** Levels to drop below the ideal — used for the low-resolution underlay. */
  coarsen?: number;
}

/** Enough for a 4K stage with a margin; past it, resolution is traded for count. */
const MAX_TILES = 96;

/** Screen pixels per map unit, matching `preserveAspectRatio="xMidYMid meet"`. */
function pixelsPerUnit([, , w, h]: ViewBox, { width, height }: Size): number {
  if (!width || !height) return FALLBACK_WIDTH / w;
  return Math.min(width / w, height / h);
}

/** The zoom level whose tiles come closest to 1:1 with the screen. */
export function zoomFor(view: ViewBox, size: Size, maxZoom: number): number {
  const ideal = Math.log2((WORLD * pixelsPerUnit(view, size)) / TILE_PX);
  if (!Number.isFinite(ideal)) return MIN_ZOOM;
  return Math.max(MIN_ZOOM, Math.min(maxZoom, Math.round(ideal)));
}

function gridAt([x, y, w, h]: ViewBox, z: number, margin: number): Tile[] {
  const span = WORLD / 2 ** z;
  const last = 2 ** z - 1;
  const index = (v: number, origin: number) => Math.floor((v - origin) / span);
  const from = (v: number, origin: number) => Math.max(0, index(v, origin) - margin);
  const to = (v: number, origin: number) => Math.min(last, index(v, origin) + margin);

  const tiles: Tile[] = [];
  for (let ty = from(y, WORLD_ORIGIN[1]); ty <= to(y + h, WORLD_ORIGIN[1]); ty++) {
    for (let tx = from(x, WORLD_ORIGIN[0]); tx <= to(x + w, WORLD_ORIGIN[0]); tx++) {
      tiles.push({
        z,
        x: tx,
        y: ty,
        sx: WORLD_ORIGIN[0] + tx * span,
        sy: WORLD_ORIGIN[1] + ty * span,
        size: span,
        key: `${z}/${tx}/${ty}`,
      });
    }
  }
  return tiles;
}

/**
 * The tiles covering a view. They are positioned in map space, so panning does
 * not move them — only the set changes, and only when the view crosses a tile
 * edge. That is what lets `MapStage` memoise the layer across a drag.
 */
export function tilesFor(view: ViewBox, size: Size, options: TileOptions = {}): Tile[] {
  const { maxZoom = 19, margin = 1, coarsen = 0 } = options;
  if (!(view[2] > 0) || !(view[3] > 0)) return [];

  let z = Math.max(MIN_ZOOM, zoomFor(view, size, maxZoom) - coarsen);
  let ring = margin;

  for (;;) {
    const tiles = gridAt(view, z, ring);
    if (tiles.length <= MAX_TILES) return tiles;
    // Give up the pre-fetch margin first; only then trade resolution for count,
    // which degrades to a blurrier map rather than to holes in it.
    if (ring > 0) ring = 0;
    else if (z > MIN_ZOOM) z -= 1;
    else return tiles.slice(0, MAX_TILES);
  }
}

/** Fill an XYZ template. The path order is the provider's — Esri puts y first. */
export function tileUrl(template: string, tile: Tile): string {
  const parts: Record<string, number> = { z: tile.z, x: tile.x, y: tile.y };
  return template.replace(/\{([zxy])\}/g, (whole, key: string) => String(parts[key] ?? whole));
}
