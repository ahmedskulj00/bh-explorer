import { useI18n } from "../i18n/LanguageProvider.tsx";
import styles from "./MapControls.module.css";

interface Props {
  focusName: string | null;
  satellite: boolean;
  onToggleSatellite: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onZoomToFocus: () => void;
}

/** Zoom, reset and the imagery switch. Panning has no button — you drag the map. */
export function MapControls({
  focusName,
  satellite,
  onToggleSatellite,
  onZoomIn,
  onZoomOut,
  onReset,
  onZoomToFocus,
}: Props) {
  const { t } = useI18n();

  return (
    <div className={styles.cluster}>
      {focusName && (
        <button className={styles.wide} onClick={onZoomToFocus}>
          {t("map.zoomTo", { name: focusName })}
        </button>
      )}
      <div className={styles.buttons}>
        {/* A switch, not an action: `aria-pressed` is what tells a screen
            reader the board is currently showing imagery. */}
        <button
          className={styles.icon}
          onClick={onToggleSatellite}
          aria-pressed={satellite}
          aria-label={t("map.satellite")}
          title={t("map.satellite")}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 2.2 14.2 5.6 8 9 1.8 5.6z" />
            <path d="m2.4 8.4 5.6 3.1 5.6-3.1" />
          </svg>
        </button>
        <button className={styles.icon} onClick={onZoomIn} aria-label={t("map.zoomIn")} title={t("map.zoomIn")}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 3.5v9M3.5 8h9" />
          </svg>
        </button>
        <button className={styles.icon} onClick={onZoomOut} aria-label={t("map.zoomOut")} title={t("map.zoomOut")}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3.5 8h9" />
          </svg>
        </button>
        <button className={styles.icon} onClick={onReset} aria-label={t("map.reset")} title={t("map.reset")}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M12.5 7a4.5 4.5 0 1 0-1.3 3.6" />
            <path d="M12.9 3.4v3.4h-3.4" />
          </svg>
        </button>
      </div>
    </div>
  );
}
