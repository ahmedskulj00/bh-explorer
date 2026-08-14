import type { Municipality } from "../domain/municipalities.ts";
import { useI18n } from "../i18n/LanguageProvider.tsx";
import type { Size } from "../types.ts";
import styles from "./MapCallout.module.css";

export interface CalloutGeometry {
  x: number;
  y: number;
  elbowX: number;
  elbowY: number;
  endX: number;
  toRight: boolean;
}

interface Props {
  municipality: Municipality;
  geometry: CalloutGeometry;
  size: Size;
  missed: boolean;
}

/**
 * A surveyor-style annotation: a tick on the shape, a leader line, and the
 * name. Drawn in screen pixels rather than map units so it stays legible at
 * any zoom, and so the type is real HTML rather than SVG text.
 */
export function MapCallout({ municipality, geometry, size, missed }: Props) {
  const { place, placeRegion } = useI18n();
  const { x, y, elbowX, elbowY, endX, toRight } = geometry;

  return (
    <>
      <svg className={styles.overlay} width={size.width} height={size.height} aria-hidden="true">
        <circle className={styles.halo} cx={x} cy={y} r="11" />
        <circle className={styles.tick} cx={x} cy={y} r="3" />
        <path className={styles.leader} d={`M${x} ${y}L${elbowX} ${elbowY}L${endX} ${elbowY}`} />
      </svg>

      <div
        className={[styles.label, toRight ? "" : styles.left, missed ? styles.missed : ""]
          .filter(Boolean)
          .join(" ")}
        style={{
          left: toRight ? endX : undefined,
          right: toRight ? undefined : size.width - endX,
          top: elbowY,
        }}
      >
        <span className={styles.name}>{place(municipality.name)}</span>
        <span className={styles.place}>{placeRegion(municipality)}</span>
      </div>
    </>
  );
}
