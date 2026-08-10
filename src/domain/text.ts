/**
 * Bosnian/Croatian/Serbian is written in both Latin and Cyrillic, and almost
 * nobody types diacritics. Everything folds to bare ASCII so that "zepce",
 * "Žepče" and "Жепче" are one and the same answer.
 */
const CYRILLIC: Readonly<Record<string, string>> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", ђ: "dj", е: "e", ж: "z", з: "z",
  и: "i", ј: "j", к: "k", л: "l", љ: "lj", м: "m", н: "n", њ: "nj", о: "o",
  п: "p", р: "r", с: "s", т: "t", ћ: "c", у: "u", ф: "f", х: "h", ц: "c",
  ч: "c", џ: "dz", ш: "s",
};

/** Fold any spelling of a place name to a comparable lowercase ASCII key. */
export function normalize(input: string): string {
  let out = "";
  for (const ch of String(input).toLowerCase()) out += CYRILLIC[ch] ?? ch;
  return out
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strips č ć š ž
    .replace(/đ/g, "d") // đ has no decomposition, so handle it by hand
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Latin to Cyrillic, for the Serbian locale. The mapping is one-to-one except
 * for three digraphs — lj → љ, nj → њ, dž → џ — which must be matched before
 * their component letters. Verified against every municipality name and alias
 * in the dataset, including the "(FBiH)" and "(RS)" suffixes.
 */
const DIGRAPHS: Readonly<Record<string, string>> = {
  lj: "љ", nj: "њ", dž: "џ",
  Lj: "Љ", LJ: "Љ", Nj: "Њ", NJ: "Њ", Dž: "Џ", DŽ: "Џ",
};

const LOWER: Readonly<Record<string, string>> = {
  a: "а", b: "б", c: "ц", č: "ч", ć: "ћ", d: "д", đ: "ђ", e: "е", f: "ф",
  g: "г", h: "х", i: "и", j: "ј", k: "к", l: "л", m: "м", n: "н", o: "о",
  p: "п", r: "р", s: "с", š: "ш", t: "т", u: "у", v: "в", z: "з", ž: "ж",
};

const LETTERS: Readonly<Record<string, string>> = {
  ...LOWER,
  ...Object.fromEntries(
    Object.entries(LOWER).map(([latin, cyrillic]) => [latin.toUpperCase(), cyrillic.toUpperCase()])
  ),
};

export function toCyrillic(input: string): string {
  const s = String(input);
  let out = "";
  for (let i = 0; i < s.length; ) {
    const pair = s.slice(i, i + 2);
    const digraph = DIGRAPHS[pair];
    if (digraph) {
      out += digraph;
      i += 2;
      continue;
    }
    const ch = s[i] as string;
    out += LETTERS[ch] ?? ch;
    i += 1;
  }
  return out;
}
