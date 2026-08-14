import type { KeyboardEvent } from "react";
import type { FeedbackMessage } from "../hooks/useGameRound.ts";
import { useI18n } from "../i18n/LanguageProvider.tsx";
import { GuessFeedback } from "./GuessFeedback.tsx";
import styles from "./GuessField.module.css";

interface Props {
  value: string;
  disabled: boolean;
  message: FeedbackMessage | null;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export function GuessField({ value, disabled, message, onChange, onSubmit }: Props) {
  const { t } = useI18n();

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    onSubmit();
  };

  return (
    <section className="block">
      <h2 className="label" id="guess-label">{t("guess.label")}</h2>
      <input
        id="guess"
        className={styles.field}
        value={value}
        disabled={disabled}
        placeholder={disabled ? t("guess.placeholderOver") : t("guess.placeholder")}
        aria-labelledby="guess-label"
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <GuessFeedback message={message} idle={!disabled} />
    </section>
  );
}
