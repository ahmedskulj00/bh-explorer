import { describe, expect, it } from "vitest";
import { checkGuess, firesOnType, openKeys, GUESS, type RoundState } from "../src/domain/answers.ts";
import { MUNICIPALITIES } from "../src/domain/municipalities.ts";
import type { EntityId } from "../src/data/entities.ts";
import { normalize } from "../src/domain/text.ts";

/** These need no DOM: the matching rules are pure functions. */

const everything: RoundState = {
  inScopeNames: new Set(MUNICIPALITIES.map((m) => m.name)),
  found: new Set<string>(),
};

const nameOf = (guess: string, round: RoundState = everything) =>
  checkGuess(guess, round).municipality?.name;

describe("normalize", () => {
  it("folds diacritics, Cyrillic and punctuation to one key", () => {
    expect(normalize("Žepče")).toBe("zepce");
    expect(normalize("Жепче")).toBe("zepce");
    expect(normalize("  ŽEPČE  ")).toBe("zepce");
    expect(normalize("Бања Лука")).toBe("banja luka");
    expect(normalize("Đurđevik")).toBe("durdevik");
  });
});

describe("checkGuess", () => {
  it("accepts any spelling of the same place", () => {
    for (const spelling of ["Žepče", "zepce", "ZEPCE", "Жепче"]) {
      expect(nameOf(spelling)).toBe("Žepče");
    }
  });

  it("accepts historical and renamed forms", () => {
    expect(nameOf("Duvno")).toBe("Tomislavgrad");
    expect(nameOf("Srbinje")).toBe("Foča");
    expect(nameOf("Bosanski Novi")).toBe("Novi Grad");
    expect(nameOf("Skender Vakuf")).toBe("Kneževo");
  });

  it("rejects names that do not exist", () => {
    expect(checkGuess("qqqq", everything).result).toBe(GUESS.UNKNOWN);
  });

  it("refuses a name covering more than two municipalities", () => {
    // "Sarajevo" is an alias on all eight Kanton Sarajevo municipalities;
    // accepting it would hand over the whole canton for one word.
    expect(checkGuess("Sarajevo", everything).result).toBe(GUESS.TOO_BROAD);
  });

  it("lets a name shared by exactly two be claimed twice", () => {
    const found = new Set<string>();
    const round: RoundState = { inScopeNames: everything.inScopeNames, found };

    const first = checkGuess("Trnovo", round);
    expect(first.result).toBe(GUESS.HIT);
    found.add(first.municipality!.name);

    const second = checkGuess("Trnovo", round);
    expect(second.result).toBe(GUESS.HIT);
    expect(second.municipality!.name).not.toBe(first.municipality!.name);
    found.add(second.municipality!.name);

    expect(checkGuess("Trnovo", round).result).toBe(GUESS.DUPLICATE);
  });

  it("reports a real name that is outside the round", () => {
    const round: RoundState = {
      inScopeNames: new Set(MUNICIPALITIES.filter((m) => m.cantonCode === "KS").map((m) => m.name)),
      found: new Set<string>(),
    };
    const verdict = checkGuess("Tuzla", round);
    expect(verdict.result).toBe(GUESS.OUT_OF_SCOPE);
    expect(verdict.municipality!.name).toBe("Tuzla");
  });

  it("flags an already-found name", () => {
    const round: RoundState = { inScopeNames: everything.inScopeNames, found: new Set(["Tuzla"]) };
    expect(checkGuess("Tuzla", round).result).toBe(GUESS.DUPLICATE);
  });
});

describe("alias hygiene", () => {
  it("carries no alias that only differs by diacritics", () => {
    // matching already folds diacritics, so such an alias is dead weight
    const bare = (x: string) => normalize(x);
    for (const m of MUNICIPALITIES) {
      for (const a of m.aliases) {
        expect(bare(a), `${m.name} ← ${a}`).not.toBe(bare(m.name));
      }
    }
  });

  it("only blocks auto-fire where another municipality really extends the name", () => {
    const keys = openKeys(everything);
    const blocked = MUNICIPALITIES.filter((m) => !firesOnType(normalize(m.name), keys)).map((m) => m.name);
    expect(blocked.sort()).toEqual(["Doboj", "Foča", "Kupres", "Novi Grad", "Pale"]);
  });
});

describe("firesOnType", () => {
  const keys = openKeys(everything);

  it("holds a value that another answer continues", () => {
    // "Novi Grad" is a municipality and the start of "Novi Grad Sarajevo"
    expect(firesOnType("novi grad", keys)).toBe(false);
  });

  it("fires once nothing longer can follow", () => {
    expect(firesOnType("novi grad sarajevo", keys)).toBe(true);
    expect(firesOnType("tuzla", keys)).toBe(true);
  });
});

describe("dataset", () => {
  it("holds every municipality exactly once", () => {
    expect(MUNICIPALITIES).toHaveLength(142);
    expect(new Set(MUNICIPALITIES.map((m) => m.name)).size).toBe(142);
  });

  it("splits into the correct entity totals", () => {
    const per = (id: EntityId) => MUNICIPALITIES.filter((m) => m.entityId === id).length;
    expect(per("FBiH")).toBe(79);
    expect(per("RS")).toBe(62);
    expect(per("BD")).toBe(1);
  });

  it("keeps the municipalities the source data gets wrong", () => {
    const by = (n: string) => MUNICIPALITIES.find((m) => m.name === n);

    // geoBoundaries labels this feature "Republika Srpska"; it is Višegrad
    expect(by("Višegrad")?.cantonCode).toBe("RS");
    // and misspells Krupa na Uni as "Kupra na Uni"
    expect(by("Krupa na Uni")?.cantonCode).toBe("RS");
    // its ADM2 places this inside Sarajevo Canton; it is an East Sarajevo municipality
    expect(by("Istočni Stari Grad")?.cantonCode).toBe("RS");
  });

  it("tells apart the names that are used twice", () => {
    const by = (n: string) => MUNICIPALITIES.find((m) => m.name === n);
    expect(by("Novi Grad")?.entityId).toBe("RS");
    expect(by("Novi Grad Sarajevo")?.cantonCode).toBe("KS");
    // geoBoundaries suffixes the Federation member of each pair, this project the RS one
    expect(by("Kupres")?.cantonCode).toBe("K10");
    expect(by("Kupres (RS)")?.entityId).toBe("RS");
    expect(by("Trnovo (FBiH)")?.cantonCode).toBe("KS");
    expect(by("Trnovo (RS)")?.entityId).toBe("RS");
  });

  it("leaves every municipality reachable by at least one answer", () => {
    for (const m of MUNICIPALITIES) {
      const reachable = m.terms.some((t) => checkGuess(t, everything).municipality);
      expect(reachable, m.name).toBe(true);
    }
  });
});
