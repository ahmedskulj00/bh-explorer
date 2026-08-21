import { useCallback, useEffect, useMemo, useState } from "react";
import { BASEMAP, type BasemapSource } from "../data/basemap.ts";

const STORAGE_KEY = "bih-game.satellite";

export interface Basemap {
  /** Whether the imagery layer is drawn under the boundaries. */
  satellite: boolean;
  toggle: () => void;
  source: BasemapSource;
}

function initial(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage?.getItem(STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

/**
 * Satellite mode on or off, remembered between visits — like the language, it
 * is a preference about the board rather than part of a round, so restarting
 * does not clear it. Off by default: the plain board is the game's own drawing,
 * and it works with no network.
 */
export function useBasemap(): Basemap {
  const [satellite, setSatellite] = useState(initial);

  useEffect(() => {
    try {
      window.localStorage?.setItem(STORAGE_KEY, satellite ? "on" : "off");
    } catch {
      // private browsing, or storage disabled — the choice just will not persist
    }
  }, [satellite]);

  const toggle = useCallback(() => setSatellite((on) => !on), []);

  return useMemo(() => ({ satellite, toggle, source: BASEMAP }), [satellite, toggle]);
}
