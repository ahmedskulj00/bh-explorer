import bs from "./locales/bs.ts";
import hr from "./locales/hr.ts";
import sr from "./locales/sr.ts";
import en, { type Phrase, type TranslationKey } from "./locales/en.ts";

export type { TranslationKey, Phrase };

export type LocaleId = "bs" | "hr" | "sr" | "en";
export type Script = "latin" | "cyrillic";

export interface LocaleMeta {
  id: LocaleId;
  short: string;
  name: string;
  script: Script;
}

/**
 * Bosnian, Croatian and Serbian are separate entries rather than one "BCS"
 * option. All three are official in Bosnia and Herzegovina, they differ in the
 * words this interface actually uses (obuhvata / obuhvaća, tačni / točni), and
 * Serbian is written here in Cyrillic — which also changes how place names are
 * rendered. Collapsing them would be a statement, not a simplification.
 */
export const LOCALES: readonly LocaleMeta[] = [
  { id: "bs", short: "BS", name: "Bosanski", script: "latin" },
  { id: "hr", short: "HR", name: "Hrvatski", script: "latin" },
  { id: "sr", short: "SR", name: "Српски", script: "cyrillic" },
  { id: "en", short: "EN", name: "English", script: "latin" },
];

export const DEFAULT_LOCALE: LocaleId = "bs";

const MESSAGES: Readonly<Record<LocaleId, Record<TranslationKey, Phrase>>> = { bs, hr, sr, en };

export function isLocale(id: unknown): id is LocaleId {
  return typeof id === "string" && Object.prototype.hasOwnProperty.call(MESSAGES, id);
}

/** Best match for the browser's preferences, falling back to Bosnian. */
export function detectLocale(languages: readonly string[] = []): LocaleId {
  for (const tag of languages) {
    const base = String(tag).toLowerCase().split("-")[0];
    if (isLocale(base)) return base;
    if (base === "sh" || base === "bos") return "bs"; // legacy Serbo-Croatian tags
  }
  return DEFAULT_LOCALE;
}

/**
 * Plural category via Intl, so Slavic one/few/other is handled by the platform
 * rather than by a hand-rolled modulo rule.
 */
function plural(locale: LocaleId, count: number): Intl.LDMLPluralRule {
  try {
    return new Intl.PluralRules(locale).select(count);
  } catch {
    return count === 1 ? "one" : "other";
  }
}

export type Vars = Record<string, string | number>;

const fill = (template: string, vars: Vars): string =>
  template.replace(/\{(\w+)\}/g, (whole, key: string) => (key in vars ? String(vars[key]) : whole));

export type Translator = (key: TranslationKey, vars?: Vars) => string;

/** Builds the lookup used by `useI18n`. */
export function createTranslator(locale: LocaleId): Translator {
  const strings = MESSAGES[locale] ?? MESSAGES[DEFAULT_LOCALE];

  return function t(key, vars = {}) {
    const entry = strings[key] ?? en[key];
    if (entry == null) {
      if (import.meta.env?.DEV) console.warn(`[i18n] missing key: ${key}`);
      return key;
    }
    if (typeof entry === "string") return fill(entry, vars);

    const form = plural(locale, Number(vars.count) || 0);
    const template = form === "one" ? entry.one : form === "few" ? (entry.few ?? entry.other) : entry.other;
    return fill(template, vars);
  };
}
