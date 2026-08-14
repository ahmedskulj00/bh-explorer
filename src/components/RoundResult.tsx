import { clock } from "../domain/format.ts";
import { useI18n } from "../i18n/LanguageProvider.tsx";
import styles from "./RoundResult.module.css";

interface Props {
  complete: boolean;
  done: number;
  total: number;
  percent: number;
  seconds: number;
  scopeLabel: string;
  onRestart: () => void;
}

export function RoundResult({ complete, done, total, percent, seconds, scopeLabel, onRestart }: Props) {
  const { t } = useI18n();

  return (
    <section className="block">
      <article className={styles.card}>
        <p className={styles.eyebrow}>{t(complete ? "result.perfect" : "result.over")}</p>
        <h3 className={styles.score}>{t("result.tally", { done, total })}</h3>
        <p className={styles.meta}>
          {scopeLabel} · {clock(seconds)} · {percent}%
        </p>
        <button className="btn btnSolid full" onClick={onRestart}>
          {t("result.again")}
        </button>
      </article>
    </section>
  );
}
