import { clock } from "../domain/format.ts";
import { useI18n } from "../i18n/LanguageProvider.tsx";
import { LanguageSwitch } from "./LanguageSwitch.tsx";
import styles from "./AppHeader.module.css";

interface Props {
  done: number;
  total: number;
  seconds: number;
}

export function AppHeader({ done, total, seconds }: Props) {
  const { t } = useI18n();

  return (
    <header className={styles.header}>
      <div>
        <p className={styles.eyebrow}>{t("app.eyebrow")}</p>
        <h1 className={styles.title}>{t("app.title")}</h1>
      </div>
      <div className={styles.right}>
        <LanguageSwitch />
        <div className={styles.score}>
          <span className={styles.count}>
            {done}
            <span className={styles.total}>/{total}</span>
          </span>
          <span className={styles.clock}>{clock(seconds)}</span>
        </div>
      </div>
    </header>
  );
}
