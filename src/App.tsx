import { AppHeader } from "./components/AppHeader.tsx";
import { ControlRail } from "./components/ControlRail.tsx";
import { MapStage } from "./components/MapStage.tsx";
import { ProgressBar } from "./components/ProgressBar.tsx";
import { useGameRound } from "./hooks/useGameRound.ts";
import { useI18n } from "./i18n/LanguageProvider.tsx";
import styles from "./App.module.css";

export default function App() {
  const game = useGameRound("country");
  const { scopeName } = useI18n();

  return (
    <div className={styles.app}>
      <AppHeader done={game.done} total={game.total} seconds={game.seconds} />
      <ProgressBar percent={game.percent} />

      <div className={styles.layout}>
        <ControlRail game={game} />
        <MapStage
          inScopeNames={game.scope.inScopeNames}
          found={game.found}
          revealed={game.over}
          focus={game.focus}
          label={scopeName(game.scope.kind, game.scope.id)}
          scopeToken={game.scope.token}
          onFocus={game.actions.setFocus}
        />
      </div>
    </div>
  );
}
