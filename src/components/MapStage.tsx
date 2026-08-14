import { useCallback, useMemo, useRef, useState } from "react";
import {
  COUNTRY_BOX, fitViewBox, focusViewBox, padBox, projectPoint, scopeBounds,
  type Limits,
} from "../domain/geo.ts";
import { MUNICIPALITIES, type Municipality } from "../domain/municipalities.ts";
import { useElementSize } from "../hooks/useElementSize.ts";
import { useMapNavigation } from "../hooks/useMapNavigation.ts";
import { useReducedMotion } from "../hooks/useReducedMotion.ts";
import { useI18n } from "../i18n/LanguageProvider.tsx";
import { MapCallout, type CalloutGeometry } from "./MapCallout.tsx";
import { MapControls } from "./MapControls.tsx";
import styles from "./MapStage.module.css";

const MAX_ZOOM = 40;
const FALLBACK_ASPECT = 1.4;

type Status = "found" | "missed" | "todo" | "out";

interface Props {
  inScopeNames: ReadonlySet<string>;
  found: ReadonlySet<string>;
  revealed: boolean;
  focus: string | null;
  label: string;
  /** Identity of the round; a change discards any manual pan or zoom. */
  scopeToken: string;
  onFocus: (name: string) => void;
}

/**
 * The board. Every municipality is always drawn; only its status changes.
 *
 *   found   named by the player
 *   missed  revealed after the round ends
 *   todo    in play, not yet named — deliberately anonymous, no tooltip,
 *           not clickable, because either would give the answer away
 *   out     outside the round, kept for orientation
 */
export function MapStage({ inScopeNames, found, revealed, focus, label, scopeToken, onFocus }: Props) {
  const { t, place } = useI18n();
  const stageRef = useRef<HTMLElement | null>(null);
  const size = useElementSize(stageRef);
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState<Municipality | null>(null);

  const inScope = useMemo(
    () => MUNICIPALITIES.filter((m) => inScopeNames.has(m.name)),
    [inScopeNames]
  );
  const focused = useMemo(
    () => MUNICIPALITIES.find((m) => m.name === focus) ?? null,
    [focus]
  );

  const aspect = size.width && size.height ? size.width / size.height : FALLBACK_ASPECT;
  const bounds = useMemo(() => scopeBounds(inScope), [inScope]);
  const baseViewBox = useMemo(() => fitViewBox(bounds, aspect), [bounds, aspect]);

  /* You can always pull back far enough to see the whole country, and push in
     to MAX_ZOOM times the round's own frame. The ceiling has to account for the
     padding around the country too, otherwise the default country view is
     itself wider than the limit and gets cropped on the way in. */
  const limits = useMemo<Limits>(() => {
    const roundWidth = baseViewBox[2];
    const worldBox = padBox(COUNTRY_BOX, 0.05);
    return {
      minWidth: roundWidth / MAX_ZOOM,
      maxWidth: Math.max(fitViewBox(worldBox, aspect)[2], roundWidth),
      bounds: worldBox,
    };
  }, [baseViewBox, aspect]);

  const nav = useMapNavigation({ stageRef, baseViewBox, limits, reduced, resetToken: scopeToken });

  const statusOf = useCallback(
    (m: Municipality): Status => {
      if (found.has(m.name)) return "found";
      if (!inScopeNames.has(m.name)) return "out";
      return revealed ? "missed" : "todo";
    },
    [found, inScopeNames, revealed]
  );

  /* A drag that ends over a shape must not also select it. */
  const select = useCallback(
    (name: string) => {
      if (nav.dragged()) return;
      onFocus(name);
    },
    [nav, onFocus]
  );

  /* Memoised so panning and the eased flights do not re-diff 142 paths on
     every frame; only a real status change rebuilds this list. */
  const shapes = useMemo(
    () =>
      MUNICIPALITIES.map((m) => {
        const status = statusOf(m);
        const known = status === "found" || status === "missed";
        return (
          <path
            key={m.name}
            d={m.path}
            data-status={status}
            className={[styles.shape, styles[status], m.name === focus ? styles.focused : ""]
              .filter(Boolean)
              .join(" ")}
            vectorEffect="non-scaling-stroke"
            onClick={known ? () => select(m.name) : undefined}
            onMouseEnter={known ? () => setHovered(m) : undefined}
            onMouseLeave={known ? () => setHovered(null) : undefined}
          />
        );
      }),
    [statusOf, focus, select]
  );

  const callout = useMemo<CalloutGeometry | null>(() => {
    if (!focused || !size.width) return null;
    const point = projectPoint(focused.labelPoint, nav.viewBox, size);
    if (!point) return null;

    const [x, y] = point;
    const toRight = x < size.width * 0.55;
    const reach = Math.min(74, Math.max(38, size.width * 0.09));
    const elbowX = x + (toRight ? reach : -reach);
    // keep the label clear of the stage heading and the bottom edge
    const elbowY = Math.min(
      size.height - 18,
      Math.max(76, y + (y > size.height * 0.3 ? -reach : reach))
    );
    return { x, y, elbowX, elbowY, endX: elbowX + (toRight ? 46 : -46), toRight };
  }, [focused, nav.viewBox, size]);

  return (
    <section className={styles.stage} ref={stageRef}>
      <div className={styles.heading}>
        <span className={styles.scope}>{label}</span>
      </div>

      <svg
        className={styles.map}
        viewBox={nav.viewBox.join(" ")}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        tabIndex={0}
        aria-label={t("map.aria", { scope: label, done: found.size, total: inScope.length })}
        {...nav.surfaceProps}
      >
        <g>{shapes}</g>
      </svg>

      {callout && focused && (
        <MapCallout
          municipality={focused}
          geometry={callout}
          size={size}
          missed={!found.has(focused.name)}
        />
      )}

      {hovered && hovered.name !== focused?.name && (
        <div className={styles.tooltip}>{place(hovered.name)}</div>
      )}

      <p className={styles.hint}>{t("map.hint")}</p>

      <MapControls
        focusName={focused ? place(focused.name) : null}
        onZoomIn={nav.zoomIn}
        onZoomOut={nav.zoomOut}
        onReset={nav.reset}
        /* A one-shot flight, not a mode: without this the map would yank to
           each newly found municipality for the rest of the round. */
        onZoomToFocus={() => focused && nav.flyTo(focusViewBox(focused, bounds, aspect))}
      />
    </section>
  );
}
