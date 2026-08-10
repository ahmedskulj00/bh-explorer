import raw from "../data/municipalities.json";
import { CANTONS, CANTON_BY_CODE, type Canton, type CantonCode } from "../data/cantons.ts";
import { ENTITIES, type EntityId } from "../data/entities.ts";
import type { Box, Point } from "../types.ts";
import { normalize } from "./text.ts";

/**
 * The boundary file stores each municipality as a positional tuple rather than
 * an object — 142 records of mostly path data, so the key names would cost
 * more than the data. This is the only place that layout is known.
 */
type MunicipalityRow = [
  name: string,
  cantonCode: string,
  bbox: Box,
  labelPoint: Point,
  path: string,
  aliases: string[],
];

export interface Municipality {
  name: string;
  cantonCode: string;
  bbox: Box;
  labelPoint: Point;
  /** SVG path `d` attribute. */
  path: string;
  /** Historical, alternate and colloquial spellings. */
  aliases: readonly string[];
  entityId: EntityId;
  canton: Canton | null;
  /** Every accepted spelling, normalised. */
  terms: readonly string[];
}

export const MUNICIPALITIES: readonly Municipality[] = (raw as MunicipalityRow[]).map(
  ([name, cantonCode, bbox, labelPoint, path, aliases]) => {
    const bare = name.replace(/\s*\(.*?\)\s*$/, ""); // "Trnovo (RS)" answers to "Trnovo"
    const spellings = [name, ...aliases];
    if (bare !== name) spellings.push(bare);

    return {
      name,
      cantonCode,
      bbox,
      labelPoint,
      path,
      aliases,
      entityId: cantonCode === "RS" || cantonCode === "BD" ? (cantonCode as EntityId) : "FBiH",
      canton: CANTON_BY_CODE[cantonCode as CantonCode] ?? null,
      terms: [...new Set(spellings.map(normalize))],
    };
  }
);

export const BY_NAME: ReadonlyMap<string, Municipality> = new Map(
  MUNICIPALITIES.map((m) => [m.name, m])
);

export interface Region {
  key: CantonCode | EntityId;
  no: number | null;
  name: string;
  en: string;
}

/**
 * Every region a round can be broken down by: the ten cantons, then the two
 * units that have no cantons of their own.
 */
export const REGIONS: readonly Region[] = [
  ...CANTONS.map((c) => ({ key: c.code, no: c.no, name: c.name, en: c.en })),
  { key: "RS", no: null, name: "Republika Srpska", en: "Republika Srpska" },
  { key: "BD", no: null, name: "Brčko distrikt", en: "Brčko District" },
];

export const COUNT_BY_ENTITY: Readonly<Record<EntityId, number>> = Object.fromEntries(
  ENTITIES.map((e) => [e.id, MUNICIPALITIES.filter((m) => m.entityId === e.id).length])
) as Record<EntityId, number>;

export const COUNT_BY_CANTON: Readonly<Record<CantonCode, number>> = Object.fromEntries(
  CANTONS.map((c) => [c.code, MUNICIPALITIES.filter((m) => m.cantonCode === c.code).length])
) as Record<CantonCode, number>;
