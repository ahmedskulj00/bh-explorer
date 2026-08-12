import type { Phrase, TranslationKey } from "./en.ts";

const sr: Record<TranslationKey, Phrase> = {
  "app.eyebrow": "Босна и Херцеговина · 142 општине",
  "app.title": "Именуј их по сећању",

  "language.label": "Језик",

  "scope.countryName": "Босна и Херцеговина",
  "scope.legend": "Рунда",
  "scope.country": "Држава",
  "scope.entity": "Ентитет",
  "scope.canton": "Кантон",
  "scope.confirm": {
    one: "Започети нову рунду? Изгубићете {count} пронађену општину.",
    few: "Започети нову рунду? Изгубићете {count} пронађене општине.",
    other: "Започети нову рунду? Изгубићете {count} пронађених општина.",
  },

  "guess.label": "Погађање",
  "guess.placeholder": "Упиши име општине…",
  "guess.placeholderOver": "Рунда је готова",
  "guess.hint": "Дијакритици нису обавезни · ћирилица ради · тачни називи се уписују сами",

  "feedback.duplicate": "{name} — већ пронађено",
  "feedback.shared": "Обе су на карти",
  "feedback.outOfScope": "{name} није у овој рунди",
  "feedback.tooBroad": "„{value}“ обухвата више општина",
  "feedback.tooBroadHint": "Именуј једну од њих",
  "feedback.unknown": "Нема општине с именом „{value}“",

  "result.perfect": "Савршена рунда",
  "result.over": "Рунда је готова",
  "result.tally": "{done} од {total}",
  "result.again": "Играј поново",

  "progress.byRegion": "По регијама",
  "progress.found": "Пронађено ({count})",
  "progress.missed": "Пропуштено ({count})",
  "progress.empty": "Још ништа. Упиши име да се појави на карти.",

  "action.giveUp": "Предај се и откриј",
  "action.newRound": "Нова рунда",
  "action.keepPlaying": "Настави игру",

  "map.playing": "Играш",
  "map.aria": "Карта: {scope} — пронађено {done} од {total} општина",
  "map.hint": "Превуци за померање · точкић за зум",
  "map.zoomIn": "Приближи",
  "map.zoomOut": "Удаљи",
  "map.reset": "Врати приказ",
  "map.zoomTo": "Приближи {name}",

  "source.note":
    "Границе: geoBoundaries (Runfola и др.), CC BY 4.0 — поједностављене и репројектоване. Станари (РС, основани 2014) нису издвојени из Добоја, па рунда броји 142 јединице уместо 143.",
};

export default sr;
