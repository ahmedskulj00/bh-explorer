import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import App from "../src/App.tsx";
import { LanguageProvider } from "../src/i18n/LanguageProvider.tsx";
import { createTranslator, detectLocale, LOCALES, type TranslationKey } from "../src/i18n/index.ts";
import { toCyrillic } from "../src/domain/text.ts";
import { MUNICIPALITIES } from "../src/domain/municipalities.ts";
import en from "../src/i18n/locales/en.ts";
import bs from "../src/i18n/locales/bs.ts";
import hr from "../src/i18n/locales/hr.ts";
import sr from "../src/i18n/locales/sr.ts";

describe("transliteration", () => {
  it("handles the three digraphs", () => {
    expect(toCyrillic("Banja Luka")).toBe("Бања Лука");
    expect(toCyrillic("Ljubuški")).toBe("Љубушки");
    expect(toCyrillic("Odžak")).toBe("Оџак");
    expect(toCyrillic("Konjic")).toBe("Коњиц");
  });

  it("handles the disambiguation suffixes", () => {
    expect(toCyrillic("Trnovo (FBiH)")).toBe("Трново (ФБиХ)");
    expect(toCyrillic("Kupres (RS)")).toBe("Купрес (РС)");
  });

  it("leaves no Latin letters behind in any place name", () => {
    for (const m of MUNICIPALITIES) {
      expect(toCyrillic(m.name), m.name).not.toMatch(/[A-Za-z]/);
    }
  });
});

describe("locale files", () => {
  const catalogues: Record<string, Record<string, unknown>> = { bs, hr, sr, en };

  it("cover every key English defines", () => {
    for (const [id, strings] of Object.entries(catalogues)) {
      const missing = Object.keys(en).filter((k) => !(k in strings));
      expect(missing, `${id} is missing keys`).toEqual([]);
    }
  });

  it("keep the plural forms Slavic locales need", () => {
    for (const id of ["bs", "hr", "sr"]) {
      const entry = catalogues[id]!["scope.confirm"] as Record<string, string>;
      expect(Object.keys(entry).sort(), id).toEqual(["few", "one", "other"]);
    }
  });

  it("are distinct where the languages genuinely differ", () => {
    // Bosnian obuhvata / Croatian obuhvaća, Bosnian tačni / Croatian točni
    expect(bs["feedback.tooBroad"]).not.toBe(hr["feedback.tooBroad"]);
    expect(bs["guess.hint"]).not.toBe(hr["guess.hint"]);
  });
});

describe("translator", () => {
  it("selects the right Slavic plural form", () => {
    const t = createTranslator("bs");
    expect(t("scope.confirm", { count: 1 })).toContain("pronađenu općinu");
    expect(t("scope.confirm", { count: 3 })).toContain("pronađene općine");
    expect(t("scope.confirm", { count: 7 })).toContain("pronađenih općina");
  });

  it("uses one/other for English", () => {
    const t = createTranslator("en");
    expect(t("scope.confirm", { count: 1 })).toContain("municipality.");
    expect(t("scope.confirm", { count: 5 })).toContain("municipalities.");
  });

  it("falls back to English for an unknown key", () => {
    expect(createTranslator("sr")("nope.missing" as TranslationKey)).toBe("nope.missing");
  });
});

describe("locale detection", () => {
  it("matches on the base tag", () => {
    expect(detectLocale(["hr-HR"])).toBe("hr");
    expect(detectLocale(["sr-Cyrl-BA"])).toBe("sr");
    expect(detectLocale(["en-GB", "bs"])).toBe("en");
  });

  it("maps legacy Serbo-Croatian tags and falls back to Bosnian", () => {
    expect(detectLocale(["sh"])).toBe("bs");
    expect(detectLocale(["de-DE"])).toBe("bs");
    expect(detectLocale([])).toBe("bs");
  });
});

describe("switching language in the app", () => {
  beforeEach(() => {
    window.localStorage.setItem("bih-game.locale", "en");
    render(
      <LanguageProvider>
        <App />
      </LanguageProvider>
    );
  });

  const switchTo = (short: string) =>
    fireEvent.click(screen.getByRole("button", { name: LOCALES.find((l) => l.short === short)!.name }));

  it("offers all four languages", () => {
    for (const l of LOCALES) {
      expect(screen.getByRole("button", { name: l.name })).toBeInTheDocument();
    }
  });

  it("retranslates the interface", () => {
    expect(screen.getByText("Name them from memory")).toBeInTheDocument();
    switchTo("BS");
    expect(screen.getByText("Imenuj ih po sjećanju")).toBeInTheDocument();
    switchTo("SR");
    expect(screen.getByText("Именуј их по сећању")).toBeInTheDocument();
  });

  it("renders place names in Cyrillic for Serbian", () => {
    switchTo("SR");
    fireEvent.change(screen.getByLabelText("Погађање"), { target: { value: "banja luka" } });
    expect(screen.getByText("Бања Лука")).toBeInTheDocument();
  });

  it("keeps answers script-agnostic when the locale changes", () => {
    // typed in Latin under Serbian, still scores
    switchTo("SR");
    fireEvent.change(screen.getByLabelText("Погађање"), { target: { value: "tuzla" } });
    expect(document.querySelectorAll('path[data-status="found"]')).toHaveLength(1);
  });

  it("translates the scope name on the map", () => {
    switchTo("SR");
    expect(screen.getByText("Босна и Херцеговина")).toBeInTheDocument();
  });

  it("re-renders an existing message in the new language", () => {
    fireEvent.change(screen.getByLabelText("Your guess"), { target: { value: "tuzla" } });
    fireEvent.change(screen.getByLabelText("Your guess"), { target: { value: "tuzla" } });
    fireEvent.keyDown(screen.getByLabelText("Your guess"), { key: "Enter" });
    expect(screen.getByText(/already found/)).toBeInTheDocument();

    switchTo("SR");
    expect(screen.getByText(/већ пронађено/)).toBeInTheDocument();
  });

  it("remembers the choice", () => {
    switchTo("HR");
    expect(window.localStorage.getItem("bih-game.locale")).toBe("hr");
    expect(document.documentElement.lang).toBe("hr");
  });
});
