# Boundary data

`geoBoundaries-BIH-ADM2.geojson` (cantons, plus Republika Srpska and Brčko as
their own units) and `geoBoundaries-BIH-ADM3.geojson` (municipalities) come from
the **geoBoundaries** Global Database of Political Administrative Boundaries,
William & Mary geoLab — <https://www.geoboundaries.org>.

Released under **CC BY 4.0**. Attribution is a licence condition, and the
project asks to be cited:

> Runfola, D. et al. (2020) geoBoundaries: A global database of political
> administrative boundaries. PLoS ONE 15(4): e0231866.

The app credits this in its own footer, in every language.

## Modifications made

`src/data/municipalities.json` is a derived product, not a copy. The build
(`npm run build:data`) reprojects to spherical Mercator, fits the result to a
flat SVG space, simplifies the rings with Douglas–Peucker, and computes a
bounding box and an interior label point per municipality.

It also corrects three things in the source, each pinned by a test:

- One ADM3 feature is named **"Republika Srpska"**, an entity rather than a
  municipality. It is **Višegrad**: the polygon contains the town and its area
  (~465 km²) matches Višegrad's 448 km². Left alone, the municipality vanishes.
- **"Kupra na Uni"** is a misspelling of **Krupa na Uni**.
- **Istočni Stari Grad** falls entirely inside the ADM2 *Sarajevo Canton*
  polygon, but it is one of the six East Sarajevo municipalities and belongs to
  Republika Srpska. Every other one of the 142 agrees with the previous,
  independently checked dataset.

Two further naming differences are reconciled rather than corrected: several
names are anglicised (`Brcko District`, `Doboj East`), and the `(RS)`/`(BiH)`
suffixes are applied to the opposite member of the Kupres and Trnovo pairs from
the convention this project uses.

## Known gap

**Stanari** (Republika Srpska, formed 2014 out of Doboj) is absent from this
release, so a full round counts 142 municipalities rather than the current 143.

ADM0 and ADM1 are not used by the build; ADM2 supplies the grouping the app
needs, and ADM1 adds nothing beyond it.
