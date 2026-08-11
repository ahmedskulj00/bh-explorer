import { MUNICIPALITIES, type Municipality } from "./municipalities.ts";
import { normalize } from "./text.ts";

export const GUESS = {
  EMPTY: "empty",
  HIT: "hit",
  DUPLICATE: "duplicate",
  OUT_OF_SCOPE: "out_of_scope",
  TOO_BROAD: "too_broad",
  UNKNOWN: "unknown",
} as const;

export type GuessResult = (typeof GUESS)[keyof typeof GUESS];

export interface RoundState {
  inScopeNames: ReadonlySet<string>;
  found: ReadonlySet<string>;
}

export interface Verdict {
  result: GuessResult;
  key: string;
  municipality?: Municipality;
  /** True when the name is shared by a second municipality. */
  shared?: boolean;
  /** Whether the input box should be cleared. */
  consumed: boolean;
}

/**
 * The answer index, built once.
 *
 * A spelling shared by two municipalities stays playable — Trnovo and Kupres
 * each exist twice, in the Federation and in Republika Srpska, so you name it
 * twice. A spelling shared by more than two is too blunt to accept:
 * "Sarajevo" is an alias on all eight Kanton Sarajevo municipalities and
 * would otherwise hand over the entire canton for one word.
 */
function buildIndex() {
  const byTerm = new Map<string, Municipality[]>();
  for (const m of MUNICIPALITIES) {
    for (const term of m.terms) {
      const list = byTerm.get(term) ?? [];
      if (!list.includes(m)) list.push(m);
      byTerm.set(term, list);
    }
  }

  const answers = new Map<string, Municipality[]>();
  const broad = new Set<string>();
  for (const [term, list] of byTerm) {
    if (list.length > 2) broad.add(term);
    else answers.set(term, list);
  }
  return { answers, broad };
}

const index = buildIndex();
export const ANSWERS: ReadonlyMap<string, readonly Municipality[]> = index.answers;
export const BROAD: ReadonlySet<string> = index.broad;

/**
 * Judge one guess. Pure: hand it the round state, get back a verdict.
 * `consumed` says whether the input box should be cleared — a real place name
 * is cleared even when it scores nothing, a typo is left alone until Enter.
 */
export function checkGuess(rawInput: string, { inScopeNames, found }: RoundState): Verdict {
  const key = normalize(rawInput);
  if (!key) return { result: GUESS.EMPTY, key, consumed: false };

  if (BROAD.has(key)) return { result: GUESS.TOO_BROAD, key, consumed: false };

  const candidates = ANSWERS.get(key);
  if (!candidates || candidates.length === 0) {
    return { result: GUESS.UNKNOWN, key, consumed: false };
  }

  const here = candidates.filter((m) => inScopeNames.has(m.name));
  const first = here[0];
  if (!first) {
    return {
      result: GUESS.OUT_OF_SCOPE,
      key,
      municipality: candidates[0] as Municipality,
      consumed: true,
    };
  }

  const fresh = here.find((m) => !found.has(m.name));
  if (!fresh) {
    return {
      result: GUESS.DUPLICATE,
      key,
      municipality: first,
      shared: here.length > 1,
      consumed: true,
    };
  }

  return { result: GUESS.HIT, key, municipality: fresh, consumed: true };
}

/** Answer keys still unclaimed in this round. */
export function openKeys({ inScopeNames, found }: RoundState): string[] {
  const keys: string[] = [];
  for (const [term, list] of ANSWERS) {
    if (list.some((m) => inScopeNames.has(m.name) && !found.has(m.name))) keys.push(term);
  }
  return keys;
}

/**
 * Whether a typed value should score without waiting for Enter.
 * "Novi Grad" is a municipality in its own right and also the opening of
 * "Novi Grad Sarajevo", so it has to wait; anything with no longer answer
 * ahead of it can fire immediately.
 */
export function firesOnType(key: string, keys: readonly string[]): boolean {
  if (!ANSWERS.has(key)) return false;
  return !keys.some((t) => t.length > key.length && t.startsWith(key));
}
