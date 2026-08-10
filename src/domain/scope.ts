import type { CantonCode } from "../data/cantons.ts";
import type { EntityId } from "../data/entities.ts";
import { MUNICIPALITIES, REGIONS, type Municipality } from "./municipalities.ts";

export type ScopeKind = "country" | "entity" | "canton";
export type ScopeId = EntityId | CantonCode | null;

/** Labels come from the `scope.<kind>` translation keys. */
export const SCOPE_KINDS = ["country", "entity", "canton"] as const satisfies readonly ScopeKind[];

/** The first option offered when someone switches to a scope kind. */
export function defaultScopeId(kind: ScopeKind): ScopeId {
  if (kind === "entity") return "FBiH";
  if (kind === "canton") return "KS";
  return null;
}

export function municipalitiesInScope(kind: ScopeKind, id: ScopeId): readonly Municipality[] {
  if (kind === "entity" && id) return MUNICIPALITIES.filter((m) => m.entityId === id);
  if (kind === "canton" && id) return MUNICIPALITIES.filter((m) => m.cantonCode === id);
  return MUNICIPALITIES;
}

export interface RegionRow {
  key: string;
  no: number | null;
  name: string;
  en: string;
  total: number;
  got: number;
}

/**
 * Per-region tallies for the current round. Returns null when the round only
 * spans one region, because a single full-width row says nothing.
 */
export function regionRows(
  municipalities: readonly Municipality[],
  found: ReadonlySet<string>
): RegionRow[] | null {
  const rows = REGIONS.map((region) => {
    const members = municipalities.filter((m) =>
      region.key === "RS" || region.key === "BD"
        ? m.entityId === region.key
        : m.cantonCode === region.key
    );
    return {
      ...region,
      total: members.length,
      got: members.filter((m) => found.has(m.name)).length,
    };
  }).filter((r) => r.total > 0);

  return rows.length > 1 ? rows : null;
}
