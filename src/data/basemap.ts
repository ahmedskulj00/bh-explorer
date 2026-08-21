/** The raster layer drawn under the boundaries when satellite mode is on. */
export interface BasemapSource {
  /** XYZ template. `{z}`, `{x}` and `{y}` are substituted where they appear;
   *  the order in the path belongs to the provider, not to us. */
  url: string;
  /** Shown on the map whenever the layer is visible. Providers require it, and
   *  this app credits its boundary source too — same principle. */
  attribution: string;
  /** Deepest level served. Past it a provider returns blank or repeated tiles. */
  maxZoom: number;
  /**
   * Imagery only — never a hybrid or labelled layer. Labels on the basemap
   * would print the answers across the board, which is the same reason
   * `MapStage` gives an unfound shape no tooltip and no click handler. The
   * type is the literal `false` rather than `boolean`, so a labelled source
   * cannot be configured here without failing the build.
   */
  labelled: false;
}

/** Esri World Imagery: no key, global coverage, and no place labels. */
const ESRI_WORLD_IMAGERY: BasemapSource = {
  url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  attribution: "Esri, Maxar, Earthstar Geographics and the GIS user community",
  maxZoom: 19,
  labelled: false,
};

const url = import.meta.env?.VITE_BASEMAP_URL;

/**
 * The active source. Point it somewhere else with `VITE_BASEMAP_URL` and
 * `VITE_BASEMAP_ATTRIBUTION` rather than by editing this file — the default is
 * a public endpoint with no key, which suits local play and a demo, while
 * anything carrying real traffic wants a provider it holds terms with.
 */
export const BASEMAP: BasemapSource = url
  ? {
      url,
      attribution: import.meta.env?.VITE_BASEMAP_ATTRIBUTION ?? "",
      maxZoom: Number(import.meta.env?.VITE_BASEMAP_MAX_ZOOM ?? ESRI_WORLD_IMAGERY.maxZoom),
      labelled: false,
    }
  : ESRI_WORLD_IMAGERY;
