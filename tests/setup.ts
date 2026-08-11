import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";

/** jsdom has no layout engine, so the browser APIs the map relies on are stubbed. */
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = function () {};
  Element.prototype.releasePointerCapture = function () {};
}

/**
 * Report reduced motion. The viewBox easing then resolves in a single step
 * instead of running requestAnimationFrame past the end of each assertion,
 * which keeps the tests deterministic.
 */
window.matchMedia = ((query: string) => ({
  media: query,
  matches: query.includes("prefers-reduced-motion"),
  onchange: null,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;

/** Tests assert on English copy; the app otherwise follows the browser. */
beforeEach(() => {
  window.localStorage.setItem("bih-game.locale", "en");
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});
