import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type RefObject } from "react";
import { clampViewBox, type Limits } from "../domain/geo.ts";
import type { ViewBox } from "../types.ts";

const ZOOM_STEP = 1.5;
const WHEEL_SENSITIVITY = 0.0016;
const DRAG_THRESHOLD = 3;
const FLIGHT_MS = 620;

export interface SurfaceProps {
  onPointerDown: (e: PointerEvent<SVGSVGElement>) => void;
  onPointerMove: (e: PointerEvent<SVGSVGElement>) => void;
  onPointerUp: (e: PointerEvent<SVGSVGElement>) => void;
  onPointerCancel: (e: PointerEvent<SVGSVGElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<SVGSVGElement>) => void;
}

export interface MapNavigation {
  viewBox: ViewBox;
  /** True once the user has taken over from the round's own framing. */
  manual: boolean;
  /** Whether the pointer travelled far enough that a click means a drag. */
  dragged: () => boolean;
  reset: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  /** One-shot flight to an arbitrary frame; hands control to the user. */
  flyTo: (target: ViewBox) => void;
  surfaceProps: SurfaceProps;
}

interface Options {
  stageRef: RefObject<HTMLElement | null>;
  baseViewBox: ViewBox;
  limits: Limits;
  reduced: boolean;
  /** Changing this starts a fresh view, discarding any manual pan or zoom. */
  resetToken: string;
}

type Pointers = Map<number, { x: number; y: number }>;

/**
 * Free pan and zoom over an SVG viewBox, plus the eased flights between rounds.
 *
 * Two modes share one value. Normally the view follows `baseViewBox` — the
 * frame the current round implies — and eases toward it whenever that changes.
 * The moment the user drags, pinches, scrolls or asks for a specific frame, the
 * view becomes theirs and stops chasing the base until `resetToken` changes or
 * they reset.
 */
export function useMapNavigation({
  stageRef,
  baseViewBox,
  limits,
  reduced,
  resetToken,
}: Options): MapNavigation {
  const [viewBox, setViewBox] = useState<ViewBox>(baseViewBox);
  const [manual, setManual] = useState(false);

  const view = useRef<ViewBox>(baseViewBox); // current value, readable inside gesture handlers
  const base = useRef<ViewBox>(baseViewBox);
  const manualRef = useRef(false);
  const frame = useRef(0);
  const lastToken = useRef(resetToken);
  const gesture = useRef<{ pointers: Pointers; pinch: number; moved: boolean }>({
    pointers: new Map(),
    pinch: 0,
    moved: false,
  });

  base.current = baseViewBox;

  const commit = useCallback(
    (next: ViewBox) => {
      const clamped = clampViewBox(next, limits);
      view.current = clamped;
      setViewBox(clamped);
    },
    [limits]
  );

  const animateTo = useCallback(
    (target: ViewBox) => {
      cancelAnimationFrame(frame.current);
      if (reduced) {
        commit(target);
        return;
      }
      const from = view.current;
      const start = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - start) / FLIGHT_MS);
        const eased = 1 - Math.pow(1 - p, 3);
        commit([
          from[0] + (target[0] - from[0]) * eased,
          from[1] + (target[1] - from[1]) * eased,
          from[2] + (target[2] - from[2]) * eased,
          from[3] + (target[3] - from[3]) * eased,
        ]);
        if (p < 1) frame.current = requestAnimationFrame(step);
      };
      frame.current = requestAnimationFrame(step);
    },
    [commit, reduced]
  );

  const takeControl = useCallback(() => {
    if (manualRef.current) return;
    cancelAnimationFrame(frame.current);
    manualRef.current = true;
    setManual(true);
  }, []);

  /**
   * A one-shot flight. It marks the view as manual, so later state changes —
   * another correct guess, say — do not drag the map somewhere else.
   */
  const flyTo = useCallback(
    (target: ViewBox) => {
      manualRef.current = true;
      setManual(true);
      animateTo(target);
    },
    [animateTo]
  );

  const reset = useCallback(() => {
    manualRef.current = false;
    setManual(false);
    animateTo(base.current);
  }, [animateTo]);

  /* Follow the base frame: always when the round changes, otherwise only while
     the user has not taken over — so a resize does not undo a pan. */
  const baseKey = baseViewBox.join(",");
  useEffect(() => {
    const changedRound = lastToken.current !== resetToken;
    lastToken.current = resetToken;
    if (changedRound) {
      manualRef.current = false;
      setManual(false);
    }
    if (!manualRef.current) animateTo(base.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseKey, resetToken]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  /* ── zooming ── */

  const zoomAtPoint = useCallback(
    (clientX: number, clientY: number, factor: number) => {
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      takeControl();

      const [x, y, w, h] = view.current;
      const k = Math.min(rect.width / w, rect.height / h);
      const mapX = x + (clientX - rect.left - (rect.width - w * k) / 2) / k;
      const mapY = y + (clientY - rect.top - (rect.height - h * k) / 2) / k;

      const nw = w / factor;
      const nh = h / factor;
      // hold the anchor point still on screen while the frame changes around it
      commit([mapX - (mapX - x) * (nw / w), mapY - (mapY - y) * (nh / h), nw, nh]);
    },
    [stageRef, takeControl, commit]
  );

  const zoomBy = useCallback(
    (factor: number) => {
      const rect = stageRef.current?.getBoundingClientRect();
      if (!rect) return;
      zoomAtPoint(rect.left + rect.width / 2, rect.top + rect.height / 2, factor);
    },
    [stageRef, zoomAtPoint]
  );

  const panByPixels = useCallback(
    (dx: number, dy: number) => {
      const rect = stageRef.current?.getBoundingClientRect();
      if (!rect || !rect.width || !rect.height) return;
      takeControl();
      const [x, y, w, h] = view.current;
      const k = Math.min(rect.width / w, rect.height / h);
      commit([x - dx / k, y - dy / k, w, h]);
    },
    [stageRef, takeControl, commit]
  );

  /* Wheel has to be bound by hand: React's onWheel is passive, so it cannot
     preventDefault, and the page would scroll while the map zoomed. */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAtPoint(e.clientX, e.clientY, Math.exp(-e.deltaY * WHEEL_SENSITIVITY));
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [stageRef, zoomAtPoint]);

  /* ── drag and pinch ── */

  const midpoint = (points: Pointers) => {
    const list = [...points.values()];
    const sum = list.reduce((a, p) => ({ x: a.x + p.x, y: a.y + p.y }), { x: 0, y: 0 });
    return { x: sum.x / list.length, y: sum.y / list.length };
  };

  const spread = (points: Pointers) => {
    const [a, b] = [...points.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };

  const onPointerDown = useCallback((e: PointerEvent<SVGSVGElement>) => {
    if (e.button != null && e.button !== 0) return;
    const g = gesture.current;
    g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    g.moved = false;
    if (g.pointers.size === 2) g.pinch = spread(g.pointers);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e: PointerEvent<SVGSVGElement>) => {
      const g = gesture.current;
      const previous = g.pointers.get(e.pointerId);
      if (!previous) return;

      const before = midpoint(g.pointers);
      g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (Math.hypot(e.clientX - previous.x, e.clientY - previous.y) > DRAG_THRESHOLD) g.moved = true;

      if (g.pointers.size === 2) {
        const distance = spread(g.pointers);
        if (g.pinch > 0 && distance > 0) {
          const centre = midpoint(g.pointers);
          zoomAtPoint(centre.x, centre.y, distance / g.pinch);
          g.moved = true;
        }
        g.pinch = distance;
        return;
      }

      const after = midpoint(g.pointers);
      panByPixels(after.x - before.x, after.y - before.y);
    },
    [zoomAtPoint, panByPixels]
  );

  const endPointer = useCallback((e: PointerEvent<SVGSVGElement>) => {
    const g = gesture.current;
    g.pointers.delete(e.pointerId);
    if (g.pointers.size < 2) g.pinch = 0;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  }, []);

  const dragged = useCallback(() => gesture.current.moved, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<SVGSVGElement>) => {
      const nudge = 60;
      const actions: Record<string, () => void> = {
        ArrowLeft: () => panByPixels(nudge, 0),
        ArrowRight: () => panByPixels(-nudge, 0),
        ArrowUp: () => panByPixels(0, nudge),
        ArrowDown: () => panByPixels(0, -nudge),
        "+": () => zoomBy(ZOOM_STEP),
        "=": () => zoomBy(ZOOM_STEP),
        "-": () => zoomBy(1 / ZOOM_STEP),
        _: () => zoomBy(1 / ZOOM_STEP),
        "0": reset,
      };
      const action = actions[e.key];
      if (!action) return;
      e.preventDefault();
      action();
    },
    [panByPixels, zoomBy, reset]
  );

  const zoomIn = useCallback(() => zoomBy(ZOOM_STEP), [zoomBy]);
  const zoomOut = useCallback(() => zoomBy(1 / ZOOM_STEP), [zoomBy]);

  const surfaceProps = useMemo<SurfaceProps>(
    () => ({
      onPointerDown,
      onPointerMove,
      onPointerUp: endPointer,
      onPointerCancel: endPointer,
      onKeyDown,
    }),
    [onPointerDown, onPointerMove, endPointer, onKeyDown]
  );

  /* A stable object: MapStage memoises 142 <path> elements against callbacks
     from here, and a fresh identity every render would rebuild all of them on
     every pan frame. */
  return useMemo(
    () => ({ viewBox, manual, dragged, reset, zoomIn, zoomOut, flyTo, surfaceProps }),
    [viewBox, manual, dragged, reset, zoomIn, zoomOut, flyTo, surfaceProps]
  );
}
