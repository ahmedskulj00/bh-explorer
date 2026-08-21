/** Plural-aware message. Slavic locales need `few`; English does not. */
export type PluralForms = { one: string; few?: string; other: string };
export type Phrase = string | PluralForms;

/**
 * English is the source of truth. Its keys become `TranslationKey`, and every
 * other catalogue is typed `Record<TranslationKey, Phrase>` — so a missing or
 * misspelled key is a compile error rather than a string that silently falls
 * back at runtime.
 */
const en = {
  "app.eyebrow": "Bosnia and Herzegovina · 142 municipalities",
  "app.title": "Name them from memory",

  "language.label": "Language",

  "scope.countryName": "Bosnia and Herzegovina",
  "scope.legend": "Round",
  "scope.country": "Country",
  "scope.entity": "Entity",
  "scope.canton": "Canton",
  "scope.confirm": {
    one: "Start a new round? You will lose {count} found municipality.",
    other: "Start a new round? You will lose {count} found municipalities.",
  },

  "guess.label": "Your guess",
  "guess.placeholder": "Type a municipality…",
  "guess.placeholderOver": "Round over",
  "guess.hint": "Diacritics optional · Cyrillic works · correct names lock in as you type",

  "feedback.duplicate": "{name} — already found",
  "feedback.shared": "Both are on the board",
  "feedback.outOfScope": "{name} is not in this round",
  "feedback.tooBroad": "“{value}” covers several municipalities",
  "feedback.tooBroadHint": "Name one of them instead",
  "feedback.unknown": "No municipality called “{value}”",

  "result.perfect": "Perfect round",
  "result.over": "Round over",
  "result.tally": "{done} of {total}",
  "result.again": "Play again",

  "progress.byRegion": "By region",
  "progress.found": "Found ({count})",
  "progress.missed": "Missed ({count})",
  "progress.empty": "Nothing yet. Type a name to put it on the map.",

  "action.giveUp": "Give up and reveal",
  "action.newRound": "New round",
  "action.keepPlaying": "Keep playing",

  "map.playing": "Playing",
  "map.aria": "Map of {scope}: {done} of {total} municipalities found",
  "map.hint": "Drag to move · scroll to zoom",
  "map.zoomIn": "Zoom in",
  "map.zoomOut": "Zoom out",
  "map.reset": "Reset view",
  "map.zoomTo": "Zoom to {name}",
  "map.satellite": "Satellite imagery",

  "source.imagery": "Imagery: {credit}",
  "source.note":
    "Boundaries: geoBoundaries (Runfola et al.), CC BY 4.0 — simplified and reprojected. Stanari (RS, formed 2014) is not split out from Doboj, so a round counts 142 units rather than 143.",
} satisfies Record<string, Phrase>;

export default en;

export type TranslationKey = keyof typeof en;
