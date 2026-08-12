import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GUESS, checkGuess, firesOnType, openKeys } from "../domain/answers.ts";
import type { Municipality } from "../domain/municipalities.ts";
import {
  defaultScopeId, municipalitiesInScope, regionRows,
  type RegionRow, type ScopeId, type ScopeKind,
} from "../domain/scope.ts";
import type { TranslationKey } from "../i18n/index.ts";
import { useRoundClock } from "./useRoundClock.ts";

export type FeedbackKind = "hit" | "duplicate" | "out" | "broad" | "miss";

/**
 * Feedback is stored as a translation key plus its values, never as a finished
 * sentence — otherwise the last message would freeze in whatever language it
 * was produced in when the player switches locale.
 */
export interface FeedbackMessage {
  id: number;
  kind: FeedbackKind;
  /** What to say. Omitted when the line is just a place name. */
  key?: TranslationKey;
  /** `name` is a raw Latin municipality name, localised at render time. */
  values: { name?: string; value?: string };
  /** Set when the second line is that municipality's region. */
  municipality?: Municipality;
  /** A translation key, when the second line is not a region. */
  detailKey?: TranslationKey | null;
}

export interface Scope {
  kind: ScopeKind;
  id: ScopeId;
  /** Identity of the current round, for anything that must restart with it. */
  token: string;
  municipalities: readonly Municipality[];
  inScopeNames: ReadonlySet<string>;
}

export interface GameActions {
  handleGuessChange: (value: string) => void;
  submitGuess: () => void;
  setFocus: (name: string | null) => void;
  giveUp: () => void;
  restart: () => void;
  requestScope: (kind: ScopeKind, id: ScopeId) => void;
  confirmScope: () => void;
  cancelScope: () => void;
}

export interface GameRound {
  scope: Scope;
  found: ReadonlySet<string>;
  foundList: readonly Municipality[];
  missedList: readonly Municipality[];
  regions: RegionRow[] | null;
  total: number;
  done: number;
  percent: number;
  complete: boolean;
  over: boolean;
  seconds: number;
  guess: string;
  message: FeedbackMessage | null;
  focus: string | null;
  pendingScope: { kind: ScopeKind; id: ScopeId } | null;
  actions: GameActions;
}

/**
 * The whole game: which municipalities are in play, what has been named, how
 * the clock is doing, and what to say back after each guess.
 *
 * Everything a component needs is returned ready to render, so the views stay
 * free of rules. The verdict itself comes from `checkGuess`, which is pure.
 */
export function useGameRound(initialKind: ScopeKind = "country"): GameRound {
  const [scopeKind, setScopeKind] = useState<ScopeKind>(initialKind);
  const [scopeId, setScopeId] = useState<ScopeId>(defaultScopeId(initialKind));
  const [pendingScope, setPendingScope] = useState<{ kind: ScopeKind; id: ScopeId } | null>(null);

  const [found, setFound] = useState<ReadonlySet<string>>(() => new Set());
  const [guess, setGuess] = useState("");
  const [message, setMessage] = useState<FeedbackMessage | null>(null);
  const [over, setOver] = useState(false);
  const [focus, setFocus] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  const messageId = useRef(0);

  const municipalities = useMemo(
    () => municipalitiesInScope(scopeKind, scopeId),
    [scopeKind, scopeId]
  );
  const inScopeNames = useMemo<ReadonlySet<string>>(
    () => new Set(municipalities.map((m) => m.name)),
    [municipalities]
  );

  const total = municipalities.length;
  const done = found.size;
  const complete = total > 0 && done === total;

  const [seconds, resetClock] = useRoundClock(started && !over);

  useEffect(() => {
    if (complete) setOver(true);
  }, [complete]);

  const say = useCallback((kind: FeedbackKind, parts: Omit<Partial<FeedbackMessage>, "id" | "kind">) => {
    messageId.current += 1;
    setMessage({ kind, id: messageId.current, values: {}, ...parts });
  }, []);

  /* ── round lifecycle ── */

  const startRound = useCallback(
    (kind: ScopeKind, id: ScopeId) => {
      setScopeKind(kind);
      setScopeId(id);
      setFound(new Set());
      setGuess("");
      setMessage(null);
      setOver(false);
      setFocus(null);
      setStarted(false);
      setPendingScope(null);
      resetClock();
    },
    [resetClock]
  );

  /** Switching scope restarts, so ask first if there is progress to lose. */
  const requestScope = useCallback(
    (kind: ScopeKind, id: ScopeId) => {
      if (kind === scopeKind && id === scopeId) return;
      if (found.size > 0 && !over) setPendingScope({ kind, id });
      else startRound(kind, id);
    },
    [scopeKind, scopeId, found, over, startRound]
  );

  const confirmScope = useCallback(() => {
    if (pendingScope) startRound(pendingScope.kind, pendingScope.id);
  }, [pendingScope, startRound]);

  const cancelScope = useCallback(() => setPendingScope(null), []);
  const restart = useCallback(() => startRound(scopeKind, scopeId), [startRound, scopeKind, scopeId]);

  const giveUp = useCallback(() => {
    setOver(true);
    setMessage(null);
    setGuess("");
  }, []);

  /* ── guessing ── */

  const judge = useCallback(
    (raw: string, viaEnter: boolean) => {
      const verdict = checkGuess(raw, { inScopeNames, found });
      const m = verdict.municipality;

      switch (verdict.result) {
        case GUESS.HIT:
          if (!m) break;
          setFound((prev) => new Set(prev).add(m.name));
          setFocus(m.name);
          say("hit", { values: { name: m.name }, municipality: m });
          break;
        case GUESS.DUPLICATE:
          if (!m) break;
          say("duplicate", {
            key: "feedback.duplicate",
            values: { name: m.name },
            detailKey: verdict.shared ? "feedback.shared" : null,
          });
          break;
        case GUESS.OUT_OF_SCOPE:
          if (!m) break;
          say("out", { key: "feedback.outOfScope", values: { name: m.name }, municipality: m });
          break;
        case GUESS.TOO_BROAD:
          if (viaEnter) {
            say("broad", {
              key: "feedback.tooBroad",
              values: { value: raw.trim() },
              detailKey: "feedback.tooBroadHint",
            });
          }
          break;
        case GUESS.UNKNOWN:
          if (viaEnter) say("miss", { key: "feedback.unknown", values: { value: raw.trim() } });
          break;
        default:
          break;
      }

      return verdict;
    },
    [inScopeNames, found, say]
  );

  const unclaimedKeys = useMemo(() => openKeys({ inScopeNames, found }), [inScopeNames, found]);

  /** Typing scores on its own as soon as the value can only mean one place. */
  const handleGuessChange = useCallback(
    (value: string) => {
      setGuess(value);
      if (!started && value.trim()) setStarted(true);
      if (over) return;

      const verdict = checkGuess(value, { inScopeNames, found });
      if (verdict.result === GUESS.EMPTY) return;
      if (!firesOnType(verdict.key, unclaimedKeys)) return;

      judge(value, false);
      if (verdict.consumed) setGuess("");
    },
    [started, over, inScopeNames, found, unclaimedKeys, judge]
  );

  const submitGuess = useCallback(() => {
    if (over) return;
    judge(guess, true);
    setGuess("");
  }, [over, guess, judge]);

  /* ── derived views ── */

  const byName = (a: Municipality, b: Municipality) => a.name.localeCompare(b.name);
  const foundList = useMemo(
    () => municipalities.filter((m) => found.has(m.name)).sort(byName),
    [municipalities, found]
  );
  const missedList = useMemo(
    () => (over ? municipalities.filter((m) => !found.has(m.name)).sort(byName) : []),
    [over, municipalities, found]
  );
  const regions = useMemo(() => regionRows(municipalities, found), [municipalities, found]);

  const actions = useMemo<GameActions>(
    () => ({
      handleGuessChange, submitGuess, setFocus, giveUp, restart,
      requestScope, confirmScope, cancelScope,
    }),
    [handleGuessChange, submitGuess, giveUp, restart, requestScope, confirmScope, cancelScope]
  );

  return {
    scope: {
      kind: scopeKind,
      id: scopeId,
      token: `${scopeKind}:${scopeId ?? ""}`,
      municipalities,
      inScopeNames,
    },
    found,
    foundList,
    missedList,
    regions,
    total,
    done,
    percent: total ? Math.round((done / total) * 100) : 0,
    complete,
    over,
    seconds,
    guess,
    message,
    focus,
    pendingScope,
    actions,
  };
}
