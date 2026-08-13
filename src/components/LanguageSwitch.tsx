import { LOCALES } from "../i18n/index.ts";
import { useI18n } from "../i18n/LanguageProvider.tsx";
import styles from "./LanguageSwitch.module.css";

export function LanguageSwitch() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className={styles.group} role="group" aria-label={t("language.label")}>
      {LOCALES.map((l) => (
        <button
          key={l.id}
          lang={l.id}
          title={l.name}
          aria-label={l.name}
          aria-pressed={locale === l.id}
          className={locale === l.id ? `${styles.option} ${styles.on}` : styles.option}
          onClick={() => setLocale(l.id)}
        >
          {l.short}
        </button>
      ))}
    </div>
  );
}
