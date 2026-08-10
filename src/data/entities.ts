export type EntityId = "FBiH" | "RS" | "BD";

export interface Entity {
  id: EntityId;
  name: string;
  en: string;
}

/**
 * The three first-order units of Bosnia and Herzegovina.
 * Two entities plus the self-governing Brčko District, which belongs to
 * both entities in law but is administered separately.
 */
export const ENTITIES: readonly Entity[] = [
  { id: "FBiH", name: "Federacija Bosne i Hercegovine", en: "Federation of Bosnia and Herzegovina" },
  { id: "RS", name: "Republika Srpska", en: "Republika Srpska" },
  { id: "BD", name: "Brčko distrikt", en: "Brčko District" },
];

export const ENTITY_BY_ID: Readonly<Record<EntityId, Entity>> = Object.fromEntries(
  ENTITIES.map((e) => [e.id, e])
) as Record<EntityId, Entity>;
