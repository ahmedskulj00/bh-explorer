import type { FeedbackKind, FeedbackMessage } from "../hooks/useGameRound.ts";
import { useI18n } from "../i18n/LanguageProvider.tsx";
import styles from "./GuessFeedback.module.css";

const TONE: Record<FeedbackKind, string> = {
  hit: styles.hit as string,
  duplicate: styles.neutral as string,
  out: styles.neutral as string,
  broad: styles.neutral as string,
  miss: styles.miss as string,
};

interface Props {
  message: FeedbackMessage | null;
  idle: boolean;
}

/**
 * The reply to a guess. `useGameRound` hands over a translation key and its
 * values rather than a finished sentence, so the message follows the current
 * language. Kept in a fixed-height slot so the rail does not jump.
 */
export function GuessFeedback({ message, idle }: Props) {
  const { t, place, placeRegion } = useI18n();

  const render = (m: FeedbackMessage) => {
    const values = { ...m.values };
    if (values.name) values.name = place(values.name);

    const headline = m.key ? t(m.key, values) : (values.name ?? "");
    const detail = m.municipality
      ? placeRegion(m.municipality)
      : m.detailKey
        ? t(m.detailKey)
        : null;

    return (
      <p key={m.id} className={`${styles.message} ${TONE[m.kind] ?? ""}`}>
        <span className={styles.text}>{headline}</span>
        {detail && <span className={styles.detail}>{detail}</span>}
      </p>
    );
  };

  return (
    <div className={styles.slot} aria-live="polite">
      {message && render(message)}
      {!message && idle && <p className={styles.idle}>{t("guess.hint")}</p>}
    </div>
  );
}
