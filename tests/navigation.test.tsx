import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { clampViewBox, fitViewBox } from "../src/domain/geo.ts";
import { board, drag, guess, KANTON_SARAJEVO, mount, viewBox } from "./helpers.tsx";

describe("viewBox maths", () => {
  it("widens a box to the container's aspect", () => {
    const [x, y, w, h] = fitViewBox([0, 0, 100, 100], 2);
    expect(w / h).toBeCloseTo(2);
    expect(h).toBe(100); // the tall side is preserved, the short side grows
    expect(x + w / 2).toBe(50);
    expect(y + h / 2).toBe(50);
  });

  it("keeps the aspect when the container is tall", () => {
    const [, , w, h] = fitViewBox([0, 0, 100, 100], 0.5);
    expect(w / h).toBeCloseTo(0.5);
  });

  it("refuses to zoom past the limits", () => {
    const limits = { minWidth: 10, maxWidth: 100, bounds: [0, 0, 200, 200] as const };
    expect(clampViewBox([0, 0, 2, 2], limits)[2]).toBe(10);
    expect(clampViewBox([0, 0, 500, 500], limits)[2]).toBe(100);
  });

  it("keeps the centre over the map", () => {
    const limits = { minWidth: 10, maxWidth: 100, bounds: [0, 0, 200, 200] as const };
    const [x, y, w, h] = clampViewBox([9000, 9000, 40, 40], limits);
    expect(x + w / 2).toBe(200);
    expect(y + h / 2).toBe(200);
  });

  it("preserves aspect while clamping size", () => {
    const limits = { minWidth: 10, maxWidth: 100, bounds: [0, 0, 200, 200] as const };
    const [, , w, h] = clampViewBox([0, 0, 4, 2], limits);
    expect(w / h).toBeCloseTo(2);
  });
});

describe("map navigation", () => {
  const btn = (name: string | RegExp) => screen.getByRole("button", { name });
  const width = () => viewBox()[2] as number;
  const left = () => viewBox()[0] as number;

  beforeEach(() => mount({ sizedStage: true }));

  it("exposes zoom and reset controls", () => {
    expect(btn("Zoom in")).toBeInTheDocument();
    expect(btn("Zoom out")).toBeInTheDocument();
    expect(btn("Reset view")).toBeInTheDocument();
  });

  it("narrows the frame on zoom in and widens it on zoom out", () => {
    const start = width();
    fireEvent.click(btn("Zoom in"));
    const zoomed = width();
    expect(zoomed).toBeLessThan(start);

    fireEvent.click(btn("Zoom out"));
    expect(width()).toBeGreaterThan(zoomed);
  });

  it("returns to the round's frame on reset", () => {
    const start = width();
    fireEvent.click(btn("Zoom in"));
    fireEvent.click(btn("Zoom in"));
    expect(width()).not.toBeCloseTo(start, 1);

    fireEvent.click(btn("Reset view"));
    expect(width()).toBeCloseTo(start, 1);
  });

  it("moves the frame by the dragged distance, not further", () => {
    const before = viewBox();
    drag(400, 300); // 100px left
    const after = viewBox();

    // 100 screen px at this scale, and the zoom must not change
    const scale = 800 / (before[2] as number);
    expect((after[0] as number) - (before[0] as number)).toBeCloseTo(100 / scale, 1);
    expect(after[2]).toBeCloseTo(before[2] as number);
  });

  it("keeps the keyboard usable", () => {
    expect(board()).toHaveAttribute("tabindex", "0");
    const before = viewBox();
    fireEvent.keyDown(board(), { key: "ArrowRight" });
    expect(left()).toBeGreaterThan(before[0] as number);

    fireEvent.keyDown(board(), { key: "+" });
    expect(width()).toBeLessThan(before[2] as number);
  });

  it("zooms toward the pointer on pinch", () => {
    const before = width();
    fireEvent.pointerDown(board(), { pointerId: 1, clientX: 300, clientY: 300, button: 0 });
    fireEvent.pointerDown(board(), { pointerId: 2, clientX: 500, clientY: 300, button: 0 });
    fireEvent.pointerMove(board(), { pointerId: 2, clientX: 700, clientY: 300 });
    expect(width()).toBeLessThan(before);
  });

  it("does not select a shape when the pointer was dragged across it", () => {
    guess("tuzla");
    guess("mostar"); // the later guess takes the focus
    expect(btn(/^Zoom to/)).toHaveTextContent("Zoom to Mostar");

    drag(400, 320);
    for (const shape of document.querySelectorAll('path[data-status="found"]')) {
      fireEvent.click(shape);
    }
    expect(btn(/^Zoom to/)).toHaveTextContent("Zoom to Mostar");
  });

  it("starts a fresh view when the round changes", () => {
    fireEvent.click(btn("Zoom in"));
    const zoomed = width();
    fireEvent.click(screen.getAllByRole("tab")[2]!); // Canton
    expect(width()).not.toBeCloseTo(zoomed, 1);
  });
});

/** Both of these were reported as "the map zooms out and I cannot move it". */
describe("regressions", () => {
  const btn = (name: string | RegExp) => screen.getByRole("button", { name });
  const width = () => viewBox()[2] as number;

  beforeEach(() => mount({ sizedStage: true }));

  it("keeps the frame put when the round completes", () => {
    fireEvent.click(screen.getAllByRole("tab")[2]!);
    KANTON_SARAJEVO.slice(0, 8).forEach(guess);
    const before = viewBox();
    guess(KANTON_SARAJEVO[8]!); // completes the round
    expect(viewBox()).toEqual(before);
  });

  it("can still zoom out and pan after the round is over", () => {
    fireEvent.click(screen.getAllByRole("tab")[2]!);
    KANTON_SARAJEVO.forEach(guess);

    const start = width();
    fireEvent.click(btn("Zoom out"));
    expect(width()).toBeGreaterThan(start);

    const before = viewBox();
    drag(400, 300);
    expect(viewBox()[0]).toBeGreaterThan(before[0] as number);
  });

  it("holds the frame still after zooming to a municipality and guessing on", () => {
    fireEvent.click(screen.getAllByRole("tab")[2]!);
    guess(KANTON_SARAJEVO[0]!);
    fireEvent.click(btn(/^Zoom to/));
    const framed = viewBox();

    // "Zoom to X" is a one-shot, not a mode: later guesses must not move the map
    guess(KANTON_SARAJEVO[1]!);
    expect(viewBox()).toEqual(framed);
    guess(KANTON_SARAJEVO[2]!);
    expect(viewBox()).toEqual(framed);
  });

  it("keeps a manual zoom through a guess and through completion", () => {
    fireEvent.click(screen.getAllByRole("tab")[2]!);
    fireEvent.click(btn("Zoom in"));
    const zoomed = viewBox();
    KANTON_SARAJEVO.forEach(guess);
    expect(viewBox()).toEqual(zoomed);
  });
});
