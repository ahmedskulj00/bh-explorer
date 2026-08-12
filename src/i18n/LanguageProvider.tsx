import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { CANTON_BY_CODE, type CantonCode } from "../data/cantons.ts";
import { ENTITY_BY_ID, type EntityId } from "../data/entities.ts";
import type { Municipality } from "../domain/municipalities.ts";
import type { ScopeId, ScopeKind } from "../domain/scope.ts";
import { toCyrillic } from "../domain/text.ts";
import {
  DEFAULT_LOCALE, LOCALES, createTranslator, detectLocale, isLocale,
  type LocaleId, type Translator,
} from "./index.ts";

const STORAGE_KEY = "bih-game.locale";

/** Anything with a local name and an English one: a canton, or a region row. */
export interface NamedRegion {
  name: string;
  en: string;
}

export interface I18n {
  locale: LocaleId;
  setLocale: (next: LocaleId) => void;
  t: Translator;
  /** A municipality name, in the current script. */
  place: (name: string) => string;
  region: (region: NamedRegion | null | undefined) => string;
  entity: (id: EntityId | undefined) => string;
  /** Where a municipality sits: its numbered canton, or its entity. */
  placeRegion: (m: Municipality | null | undefined) => string;
  /** What the current round covers. */
  scopeName: (kind: ScopeKind, id: ScopeId) => string;
}

const LanguageContext = createContext<I18n | null>(null);

function initialLocale(): LocaleId {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  const saved = window.localStorage?.getItem(STORAGE_KEY);
  if (isLocale(saved)) return saved;
  return detectLocale(window.navigator?.languages ?? [window.navigator?.language ?? ""]);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleId>(initialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    try {
      window.localStorage?.setItem(STORAGE_KEY, locale);
    } catch {
      // private browsing, or storage disabled — the choice just will not persist
    }
  }, [locale]);

  const setLocale = useCallback((next: LocaleId) => {
    if (isLocale(next)) setLocaleState(next);
  }, []);

  const value = useMemo<I18n>(() => {
    const t = createTranslator(locale);
    const cyrillic = LOCALES.find((l) => l.id === locale)?.script === "cyrillic";

    /**
     * Place names live in the data in Latin only. Serbian is written in
     * Cyrillic here, so names are transliterated for display — the answer
     * matching already accepts either script, so play is unaffected.
     */
    const place = (name: string) => (cyrillic ? toCyrillic(name) : name);

    const region = (r: NamedRegion | null | undefined) => {
      if (!r) return "";
      if (locale === "en") return r.en ?? r.name;
      return cyrillic ? toCyrillic(r.name) : r.name;
    };

    const entity = (id: EntityId | undefined) => {
      const e = id ? ENTITY_BY_ID[id] : undefined;
      if (!e) return "";
      if (locale === "en") return e.en;
      return cyrillic ? toCyrillic(e.name) : e.name;
    };

    return {
      locale,
      setLocale,
      t,
      place,
      region,
      entity,
      placeRegion: (m) => (m?.canton ? `${m.canton.no} · ${region(m.canton)}` : entity(m?.entityId)),
      scopeName: (kind, id) => {
        if (kind === "entity") return entity(id as EntityId);
        if (kind === "canton") return region(CANTON_BY_CODE[id as CantonCode]);
        return t("scope.countryName");
      },
    };
  }, [locale, setLocale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useI18n must be used inside <LanguageProvider>");
  return ctx;
}
