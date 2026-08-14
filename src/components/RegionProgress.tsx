import type { RegionRow } from "../domain/scope.ts";
import { useI18n } from "../i18n/LanguageProvider.tsx";
import styles from "./RegionProgress.module.css";

/**
 * Per-canton tallies. The ordinals are the cantons' official numbers, so the
 * column carries real information rather than decorating the list.
 */
export function RegionProgress({ rows }: { rows: readonly RegionRow[] }) {
  const { t, region } = useI18n();

  return (
    <>
      <h2 className="label">{t("progress.byRegion")}</h2>
      <ul className={styles.list}>
        {rows.map((row) => (
          <li
            key={row.key}
            className={row.got === row.total ? `${styles.row} ${styles.done}` : styles.row}
          >
            <span className={styles.ordinal}>{row.no ?? "·"}</span>
            <span className={styles.name}>{region(row)}</span>
            <span className={styles.count}>
              {row.got}
              <i className={styles.of}>/{row.total}</i>
            </span>
            <span className={styles.track}>
              <i
                className={styles.fill}
                style={{ width: (row.total ? (row.got / row.total) * 100 : 0) + "%" }}
              />
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
