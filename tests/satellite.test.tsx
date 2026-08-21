import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BASEMAP } from "../src/data/basemap.ts";
import { COUNTRY_BOX, COUNTRY_LONLAT } from "../src/domain/geo.ts";
import { BY_NAME } from "../src/domain/municipalities.ts";
import { MIN_ZOOM, tileUrl, tilesFor, toLonLat, toMapPoint, zoomFor } from "../src/domain/tiles.ts";
import type { Size, ViewBox } from "../src/types.ts";
import { mount, shapes } from "./helpers.tsx";

const STAGE: Size = { width: 800, height: 600 };
const COUNTRY: ViewBox = [21, 130, 777, 751];

/**
 * Is a map point inside a shape? The `d` attribute is only ever `M x,y L … Z`
 * per ring, so it parses without an SVG engine. Crossings are counted across
 * every ring at once, which gets the even-odd rule right where a municipality
 * encloses a hole.
 */
function contains(path: string, [px, py]: readonly [number, number]): boolean {
  let crossings = 0;
  for (const segment of path.split("M").filter(Boolean)) {
    const ring = segment.replace(/Z$/, "").split("L").map((p) => p.split(",").map(Number));
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i] as [number, number];
      const [xj, yj] = ring[j] as [number, number];
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) crossings++;
    }
  }
  return crossings % 2 === 1;
}

describe("georeference", () => {
  /**
   * The imagery lines up only if the SVG space really is Web Mercator scaled
   * by one factor. These are the checks that would catch a drift, and they are
   * the reason the build script emits `COUNTRY_LONLAT` next to `COUNTRY_BOX`.
   */
  it("puts the country box back where it came from", () => {
    const [west, south, east, north] = COUNTRY_LONLAT;
    const [x0, y0, x1, y1] = COUNTRY_BOX;

    expect(toLonLat([x0, y0])[0]).toBeCloseTo(west, 9);
    expect(toLonLat([x0, y0])[1]).toBeCloseTo(north, 9);
    // the far corner is the real test: only the near corner and the x scale go
    // into the transform, so the south edge has to fall out of the maths
    expect(toLonLat([x1, y1])[0]).toBeCloseTo(east, 9);
    expect(toLonLat([x1, y1])[1]).toBeCloseTo(south, 3); // y1 is emitted rounded
  });

  it("drops real coordinates into the right municipality", () => {
    /**
     * The check that would actually catch a drift. Town-hall coordinates, from
     * the world rather than from this repo, are pushed through the transform
     * and have to land inside that municipality's own outline. Centar Sarajevo
     * is a few kilometres across, so passing pins the registration far tighter
     * than any comparison against a label point could.
     */
    const towns: Record<string, [number, number]> = {
      "Centar Sarajevo": [18.4131, 43.8563],
      "Banja Luka": [17.191, 44.7722],
      Mostar: [17.8078, 43.3438],
      Tuzla: [18.6739, 44.5384],
      Bihać: [15.8708, 44.8169],
      Trebinje: [18.3439, 42.7113],
      Brčko: [18.81, 44.8694],
      Livno: [17.0083, 43.8269],
    };

    for (const [name, lonLat] of Object.entries(towns)) {
      const shape = BY_NAME.get(name);
      expect(shape, name).toBeTruthy();
      expect(contains(shape!.path, toMapPoint(lonLat)), name).toBe(true);
    }
  });

  it("round-trips every label point", () => {
    for (const m of BY_NAME.values()) {
      const [x, y] = toMapPoint(toLonLat(m.labelPoint));
      expect(x).toBeCloseTo(m.labelPoint[0], 6);
      expect(y).toBeCloseTo(m.labelPoint[1], 6);
    }
  });
});

describe("tile selection", () => {
  const covers = (tiles: readonly { sx: number; sy: number; size: number }[], x: number, y: number) =>
    tiles.some((t) => x >= t.sx && x <= t.sx + t.size && y >= t.sy && y <= t.sy + t.size);

  it("covers every corner of the view", () => {
    const tiles = tilesFor(COUNTRY, STAGE);
    const [x, y, w, h] = COUNTRY;
    for (const px of [x, x + w]) {
      for (const py of [y, y + h]) expect(covers(tiles, px, py), `${px},${py}`).toBe(true);
    }
  });

  it("asks for sharper tiles as the view narrows", () => {
    const wide = zoomFor(COUNTRY, STAGE, BASEMAP.maxZoom);
    const close = zoomFor([400, 500, 12, 9], STAGE, BASEMAP.maxZoom);
    expect(close).toBeGreaterThan(wide);
    expect(wide).toBeGreaterThanOrEqual(MIN_ZOOM);
  });

  it("never asks for a level the provider does not serve", () => {
    expect(zoomFor([400, 500, 0.001, 0.001], STAGE, BASEMAP.maxZoom)).toBe(BASEMAP.maxZoom);
    expect(zoomFor([0, 0, 1e7, 1e7], STAGE, BASEMAP.maxZoom)).toBe(MIN_ZOOM);
  });

  it("keeps one grid, at one level, without gaps", () => {
    const tiles = tilesFor(COUNTRY, STAGE);
    expect(new Set(tiles.map((t) => t.z)).size).toBe(1);
    expect(new Set(tiles.map((t) => t.key)).size).toBe(tiles.length);
    expect(new Set(tiles.map((t) => t.size)).size).toBe(1);
  });

  it("coarsens for the underlay", () => {
    const [sharp] = tilesFor(COUNTRY, STAGE);
    const [coarse] = tilesFor(COUNTRY, STAGE, { coarsen: 3 });
    expect(coarse!.z).toBe(sharp!.z - 3);
    expect(coarse!.size).toBeCloseTo(sharp!.size * 8);
  });

  it("trades resolution rather than flooding a huge stage with requests", () => {
    const tiles = tilesFor(COUNTRY, { width: 8000, height: 6000 });
    expect(tiles.length).toBeLessThanOrEqual(96);
    expect(tiles.length).toBeGreaterThan(0);
  });

  it("draws nothing for a collapsed view", () => {
    expect(tilesFor([0, 0, 0, 0], STAGE)).toEqual([]);
  });

  it("fills the template in the provider's own order", () => {
    const tile = { z: 9, x: 285, y: 187, sx: 0, sy: 0, size: 1, key: "9/285/187" };
    expect(tileUrl("https://x/{z}/{y}/{x}", tile)).toBe("https://x/9/187/285");
    expect(tileUrl("https://x/{z}/{x}/{y}.png", tile)).toBe("https://x/9/285/187.png");
  });
});

describe("basemap source", () => {
  it("is imagery, not a labelled layer", () => {
    // A hybrid or reference layer would print the answers on the board. The
    // type makes it a build error; this pins the shipped default too.
    expect(BASEMAP.labelled).toBe(false);
    expect(BASEMAP.url).not.toMatch(/label|reference|hybrid|boundaries_and_places/i);
  });

  it("credits the provider", () => {
    expect(BASEMAP.attribution.length).toBeGreaterThan(0);
  });
});

describe("satellite mode", () => {
  const toggle = () => screen.getByRole("button", { name: "Satellite imagery" });
  const tiles = () => document.querySelectorAll("image");

  it("is off until asked for", () => {
    mount();
    expect(tiles()).toHaveLength(0);
    expect(toggle()).toHaveAttribute("aria-pressed", "false");
  });

  it("lays tiles under the shapes and credits them", () => {
    mount();
    fireEvent.click(toggle());

    expect(tiles().length).toBeGreaterThan(0);
    expect(toggle()).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/Imagery:/)).toHaveTextContent(BASEMAP.attribution);

    // under, not over: every tile has to paint before the first shape
    const map = document.querySelector("svg[role=img]")!;
    const painted = [...map.querySelectorAll("image, path")].map((node) => node.tagName);
    const firstShape = painted.indexOf("path");
    expect(firstShape).toBeGreaterThan(0);
    expect(painted.slice(firstShape)).not.toContain("image");
  });

  it("puts the board back when switched off", () => {
    mount();
    fireEvent.click(toggle());
    fireEvent.click(toggle());
    expect(tiles()).toHaveLength(0);
    expect(screen.queryByText(/Imagery:/)).not.toBeInTheDocument();
  });

  it("remembers the choice", () => {
    mount();
    fireEvent.click(toggle());
    expect(window.localStorage.getItem("bih-game.satellite")).toBe("on");
  });

  it("comes back on for a returning player", () => {
    window.localStorage.setItem("bih-game.satellite", "on");
    mount();
    expect(tiles().length).toBeGreaterThan(0);
  });

  it("keeps unfound shapes anonymous over imagery", () => {
    mount();
    fireEvent.click(toggle());
    const unfound = shapes("todo");
    expect(unfound.length).toBeGreaterThan(0);
    expect(unfound[0]).not.toHaveAttribute("aria-label");
    expect((unfound[0] as SVGPathElement).onclick).toBeNull();
  });
});
