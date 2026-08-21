# BH Explorer

Name all 142 municipalities of Bosnia and Herzegovina from memory. Every correct
answer lights up on the map.

<!-- ![The game board](docs/screenshot-board.png) -->

## Play

Pick what the round covers — the whole country, one entity, or a single canton —
then start typing. Correct names lock in on their own; the map fills in as you
go, and a clock runs from your first guess.

Stuck? Give up and everything you missed floods in, so you can see what you
didn't know.

<!-- ![Naming a municipality](docs/screenshot-guess.png) -->

## Choose your round

| Round | Municipalities |
| --- | --- |
| The whole country | 142 |
| Federation of BiH | 79 |
| Republika Srpska | 62 |
| Brčko District | 1 |
| A single canton | 3–13 |

Whole-country and Federation rounds also break your progress down canton by
canton, so you can see you've cleared Posavina but never touched Herzegovina.

<!-- ![Progress by region](docs/screenshot-progress.png) -->

## Type it however you like

Diacritics are optional and Cyrillic works, so **Žepče**, **zepce** and
**Жепче** all score the same. Historical and alternate names count too —
**Duvno** finds Tomislavgrad, **Srbinje** finds Foča, **Bosanski Novi** finds
Novi Grad.

A few names belong to two different municipalities. Trnovo and Kupres each exist
in both entities, so name them twice and you get both.

## Four languages

Bosanski, Hrvatski, Српски and English, switchable at any time — mid-round is
fine. In Serbian the place names are written in Cyrillic, and you can still
answer in either script.

<!-- ![Serbian, in Cyrillic](docs/screenshot-cyrillic.png) -->

## Getting around the map

Drag to move, scroll or pinch to zoom. There are buttons for zoom in, zoom out
and reset in the corner, and the map takes keyboard input too — arrow keys to
pan, `+` and `−` to zoom, `0` to reset.

Click any municipality you've already found to point the callout at it, or click
its name in the sidebar.

<!-- ![Zoomed in on Kanton Sarajevo](docs/screenshot-zoom.png) -->

## Running it

```bash
npm install
npm run dev
```

Then open the address it prints, usually `http://localhost:5173`.

## Boundary data

Boundaries come from [geoBoundaries](https://www.geoboundaries.org) (William &
Mary geoLab), used under CC BY 4.0 and simplified for the web. Full credit and
the list of changes are in `scripts/geoboundaries/ATTRIBUTION.md`.

One gap worth knowing: **Stanari** (Republika Srpska, formed in 2014) isn't in
this release, so a full round counts 142 municipalities rather than the current
143.
