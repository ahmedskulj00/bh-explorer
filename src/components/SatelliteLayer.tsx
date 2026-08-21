import type { BasemapSource } from "../data/basemap.ts";
import { tileUrl, type Tile } from "../domain/tiles.ts";
import styles from "./SatelliteLayer.module.css";

/**
 * Neighbouring tiles are drawn a hair larger than their true size. Their edges
 * land on fractional device pixels at most zoom levels, and without the overlap
 * the rounding leaves a one-pixel seam of board colour between them.
 */
const BLEED = 1.004;

interface Props {
  tiles: readonly Tile[];
  source: BasemapSource;
}

/**
 * The imagery, as one `<image>` per tile inside the map's own coordinate
 * space — so pan and zoom move the tiles with the boundaries for free, with no
 * second transform to keep in step.
 *
 * Decorative: the layer carries no information the shapes do not, and a screen
 * reader gets the round's summary from the map's own label instead.
 */
export function SatelliteLayer({ tiles, source }: Props) {
  return (
    <g className={styles.layer} aria-hidden="true">
      {tiles.map((tile) => (
        <image
          key={tile.key}
          className={styles.tile}
          href={tileUrl(source.url, tile)}
          x={tile.sx}
          y={tile.sy}
          width={tile.size * BLEED}
          height={tile.size * BLEED}
          preserveAspectRatio="none"
        />
      ))}
    </g>
  );
}
