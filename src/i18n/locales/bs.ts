import type { Phrase, TranslationKey } from "./en.ts";

const bs: Record<TranslationKey, Phrase> = {
  "app.eyebrow": "Bosna i Hercegovina · 142 općine",
  "app.title": "Imenuj ih po sjećanju",

  "language.label": "Jezik",

  "scope.countryName": "Bosna i Hercegovina",
  "scope.legend": "Runda",
  "scope.country": "Država",
  "scope.entity": "Entitet",
  "scope.canton": "Kanton",
  "scope.confirm": {
    one: "Započeti novu rundu? Izgubit ćete {count} pronađenu općinu.",
    few: "Započeti novu rundu? Izgubit ćete {count} pronađene općine.",
    other: "Započeti novu rundu? Izgubit ćete {count} pronađenih općina.",
  },

  "guess.label": "Pogađanje",
  "guess.placeholder": "Upiši ime općine…",
  "guess.placeholderOver": "Runda je gotova",
  "guess.hint": "Dijakritici nisu obavezni · ćirilica radi · tačni nazivi se upisuju sami",

  "feedback.duplicate": "{name} — već pronađeno",
  "feedback.shared": "Obje su na karti",
  "feedback.outOfScope": "{name} nije u ovoj rundi",
  "feedback.tooBroad": "„{value}“ obuhvata više općina",
  "feedback.tooBroadHint": "Imenuj jednu od njih",
  "feedback.unknown": "Nema općine s imenom „{value}“",

  "result.perfect": "Savršena runda",
  "result.over": "Runda je gotova",
  "result.tally": "{done} od {total}",
  "result.again": "Igraj ponovo",

  "progress.byRegion": "Po regijama",
  "progress.found": "Pronađeno ({count})",
  "progress.missed": "Propušteno ({count})",
  "progress.empty": "Još ništa. Upiši ime da se pojavi na karti.",

  "action.giveUp": "Predaj se i otkrij",
  "action.newRound": "Nova runda",
  "action.keepPlaying": "Nastavi igru",

  "map.playing": "Igraš",
  "map.aria": "Karta: {scope} — pronađeno {done} od {total} općina",
  "map.hint": "Povuci za pomjeranje · kotačić za zum",
  "map.zoomIn": "Približi",
  "map.zoomOut": "Udalji",
  "map.reset": "Vrati prikaz",
  "map.zoomTo": "Približi {name}",

  "source.note":
    "Granice: geoBoundaries (Runfola i dr.), CC BY 4.0 — pojednostavljene i reprojicirane. Stanari (RS, osnovani 2014) nisu izdvojeni iz Doboja, pa runda broji 142 jedinice umjesto 143.",
};

export default bs;
