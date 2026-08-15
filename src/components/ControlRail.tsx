import type { GameRound } from "../hooks/useGameRound.ts";
import { useI18n } from "../i18n/LanguageProvider.tsx";
import { GuessField } from "./GuessField.tsx";
import { NameChips } from "./NameChips.tsx";
import { RegionProgress } from "./RegionProgress.tsx";
import { RoundResult } from "./RoundResult.tsx";
import { ScopePicker } from "./ScopePicker.tsx";
import styles from "./ControlRail.module.css";

/** Everything the player operates, in the order they need it. */
export function ControlRail({ game }: { game: GameRound }) {
  const { t, scopeName } = useI18n();
  const { scope, actions, over, complete, done, total, percent, seconds } = game;

  return (
    <aside className={styles.rail}>
      <ScopePicker
        kind={scope.kind}
        id={scope.id}
        pending={game.pendingScope}
        foundCount={done}
        onRequest={actions.requestScope}
        onConfirm={actions.confirmScope}
        onCancel={actions.cancelScope}
      />

      <GuessField
        value={game.guess}
        disabled={over}
        message={game.message}
        onChange={actions.handleGuessChange}
        onSubmit={actions.submitGuess}
      />

      {over && (
        <RoundResult
          complete={complete}
          done={done}
          total={total}
          percent={percent}
          seconds={seconds}
          scopeLabel={scopeName(scope.kind, scope.id)}
          onRestart={actions.restart}
        />
      )}

      <section className={`block ${styles.grow}`}>
        {game.regions ? (
          <RegionProgress rows={game.regions} />
        ) : (
          <>
            <h2 className="label">{t("progress.found", { count: game.foundList.length })}</h2>
            {game.foundList.length === 0 ? (
              <p className={styles.empty}>{t("progress.empty")}</p>
            ) : (
              <NameChips items={game.foundList} onSelect={actions.setFocus} />
            )}
          </>
        )}

        {over && game.missedList.length > 0 && (
          <>
            <h2 className={`label ${styles.spaced}`}>
              {t("progress.missed", { count: game.missedList.length })}
            </h2>
            <NameChips items={game.missedList} tone="missed" onSelect={actions.setFocus} />
          </>
        )}
      </section>

      <div>
        {over ? (
          <button className="btn btnGhost full" onClick={actions.restart}>
            {t("action.newRound")}
          </button>
        ) : (
          <button className="btn btnGhost full" onClick={actions.giveUp} disabled={total === 0}>
            {t("action.giveUp")}
          </button>
        )}
      </div>

      <p className={styles.source}>{t("source.note")}</p>
    </aside>
  );
}
