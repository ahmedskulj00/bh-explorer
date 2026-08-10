export type CantonCode =
  | "USK" | "PK" | "TK" | "ZDK" | "BPK"
  | "SBK" | "HNK" | "ZHK" | "KS" | "K10";

export interface Canton {
  code: CantonCode;
  /** The official ordinal from the Federation constitution, not a display index. */
  no: number;
  name: string;
  en: string;
}

export const CANTONS: readonly Canton[] = [
  { code: "USK", no: 1, name: "Unsko-sanski kanton", en: "Una-Sana Canton" },
  { code: "PK", no: 2, name: "Posavski kanton", en: "Posavina Canton" },
  { code: "TK", no: 3, name: "Tuzlanski kanton", en: "Tuzla Canton" },
  { code: "ZDK", no: 4, name: "Zeničko-dobojski kanton", en: "Zenica-Doboj Canton" },
  { code: "BPK", no: 5, name: "Bosansko-podrinjski kanton", en: "Bosnian Podrinje Canton" },
  { code: "SBK", no: 6, name: "Srednjobosanski kanton", en: "Central Bosnia Canton" },
  { code: "HNK", no: 7, name: "Hercegovačko-neretvanski kanton", en: "Herzegovina-Neretva Canton" },
  { code: "ZHK", no: 8, name: "Zapadnohercegovački kanton", en: "West Herzegovina Canton" },
  { code: "KS", no: 9, name: "Kanton Sarajevo", en: "Sarajevo Canton" },
  { code: "K10", no: 10, name: "Kanton 10", en: "Canton 10" },
];

export const CANTON_BY_CODE: Readonly<Record<CantonCode, Canton>> = Object.fromEntries(
  CANTONS.map((c) => [c.code, c])
) as Record<CantonCode, Canton>;
