import type { Municipality } from "../domain/municipalities.ts";
import { useI18n } from "../i18n/LanguageProvider.tsx";
import styles from "./NameChips.module.css";

interface Props {
  items: readonly Municipality[];
  tone?: "found" | "missed";
  onSelect: (name: string) => void;
}

/** A wrap of municipality names; clicking one points the map at it. */
export function NameChips({ items, tone = "found", onSelect }: Props) {
  const { place } = useI18n();

  return (
    <ul className={styles.list}>
      {items.map((m) => (
        <li key={m.name}>
          <button
            className={tone === "missed" ? `${styles.chip} ${styles.missed}` : styles.chip}
            onClick={() => onSelect(m.name)}
          >
            {place(m.name)}
          </button>
        </li>
      ))}
    </ul>
  );
}
