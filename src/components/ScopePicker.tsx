import { CANTONS } from "../data/cantons.ts";
import { ENTITIES } from "../data/entities.ts";
import { COUNT_BY_CANTON, COUNT_BY_ENTITY } from "../domain/municipalities.ts";
import { SCOPE_KINDS, defaultScopeId, type ScopeId, type ScopeKind } from "../domain/scope.ts";
import { useI18n } from "../i18n/LanguageProvider.tsx";
import styles from "./ScopePicker.module.css";

interface Props {
  kind: ScopeKind;
  id: ScopeId;
  pending: { kind: ScopeKind; id: ScopeId } | null;
  foundCount: number;
  onRequest: (kind: ScopeKind, id: ScopeId) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Chooses what a round covers. Because switching wipes progress, a change
 * mid-round asks for confirmation rather than silently clearing the board.
 */
export function ScopePicker({ kind, id, pending, foundCount, onRequest, onConfirm, onCancel }: Props) {
  const { t, region, entity } = useI18n();

  return (
    <section className="block">
      <h2 className="label">{t("scope.legend")}</h2>

      <div className={styles.tabs} role="tablist" aria-label={t("scope.legend")}>
        {SCOPE_KINDS.map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={kind === s}
            className={kind === s ? `${styles.tab} ${styles.tabOn}` : styles.tab}
            onClick={() => onRequest(s, defaultScopeId(s))}
          >
            {t(`scope.${s}`)}
          </button>
        ))}
      </div>

      {kind === "entity" && (
        <ul className={styles.options}>
          {ENTITIES.map((e) => (
            <Option
              key={e.id}
              selected={id === e.id}
              name={entity(e.id)}
              count={COUNT_BY_ENTITY[e.id]}
              onClick={() => onRequest("entity", e.id)}
            />
          ))}
        </ul>
      )}

      {kind === "canton" && (
        <ul className={styles.options}>
          {CANTONS.map((c) => (
            <Option
              key={c.code}
              selected={id === c.code}
              ordinal={c.no}
              name={region(c)}
              count={COUNT_BY_CANTON[c.code]}
              onClick={() => onRequest("canton", c.code)}
            />
          ))}
        </ul>
      )}

      {pending && (
        <div className={styles.confirm} role="alertdialog" aria-label={t("action.newRound")}>
          <p className={styles.confirmText}>{t("scope.confirm", { count: foundCount })}</p>
          <div className={styles.confirmActions}>
            <button className="btn btnSolid" onClick={onConfirm}>{t("action.newRound")}</button>
            <button className="btn btnGhost" onClick={onCancel}>{t("action.keepPlaying")}</button>
          </div>
        </div>
      )}
    </section>
  );
}

interface OptionProps {
  selected: boolean;
  ordinal?: number;
  name: string;
  count: number;
  onClick: () => void;
}

function Option({ selected, ordinal, name, count, onClick }: OptionProps) {
  return (
    <li>
      <button
        className={selected ? `${styles.option} ${styles.optionOn}` : styles.option}
        onClick={onClick}
      >
        {ordinal != null && <span className={styles.ordinal}>{ordinal}</span>}
        <span className={styles.name}>{name}</span>
        <span className={styles.count}>{count}</span>
      </button>
    </li>
  );
}
