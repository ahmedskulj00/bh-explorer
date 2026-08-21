/// <reference types="vite/client" />

/** Swap the satellite basemap without touching `src/data/basemap.ts`. */
interface ImportMetaEnv {
  readonly VITE_BASEMAP_URL?: string;
  readonly VITE_BASEMAP_ATTRIBUTION?: string;
  readonly VITE_BASEMAP_MAX_ZOOM?: string;
}
