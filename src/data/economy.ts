export const CURRENCY = 'Corn';
export const CURRENCY_ICON = '🌽';

export const STARTING_CORN = 60;
export const STARTING_COOP_SLOTS = 8;
export const STARTING_INCUBATOR_SLOTS = 2;

export const REWARDS = {
  hatch: 5,
  traitDiscovery: { common: 4, uncommon: 12, rare: 30, exotic: 60, legendary: 120 } as Record<string, number>,
  breedDiscovery: 25,
  breedResemblance: 40,
  showImproved: 8,
};

/** Hatchery price by breed tier. */
export const HATCHERY_PRICE: Record<number, number> = { 1: 35, 2: 70, 3: 130, 4: 260 };
export const HATCHERY_REFRESH_COST = 10;
export const HATCHERY_SLOTS = 4;
/** After this many hatches the hatchery refreshes for free. */
export const HATCHERY_FREE_REFRESH_EVERY = 4;

export interface UpgradeDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  /** Cost for level n (0-based index). Length = max levels. */
  costs: number[];
}

export const UPGRADES: UpgradeDef[] = [
  { id: 'coop', name: 'Coop Extension', emoji: '🏠', description: 'Four more roosting slots in the coop.', costs: [60, 110, 170, 240, 320, 420, 540, 700] },
  { id: 'incubator', name: 'Incubator Tray', emoji: '🔥', description: 'One more egg can wait in the incubator.', costs: [80, 160, 280, 450] },
  { id: 'fieldNotes', name: 'Field Notes', emoji: '📝', description: 'Reveal inheritance hints for undiscovered traits in the Almanac.', costs: [90] },
  { id: 'pedigree', name: 'Pedigree Ledger', emoji: '📜', description: 'Show ancestry three generations deep instead of two.', costs: [120] },
  { id: 'bunting', name: 'Bunting', emoji: '🎏', description: 'Decorative bunting across the coop. Purely for morale.', costs: [40] },
  { id: 'nameplates', name: 'Brass Nameplates', emoji: '🪧', description: 'Fancy nameplates on every chicken card.', costs: [50] },
];

export const UPGRADE_BY_ID: Record<string, UpgradeDef> = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

export const COOP_THEMES = [
  { id: 'paper', name: 'Field Notebook', emoji: '📒', cost: 0 },
  { id: 'meadow', name: 'Meadow Green', emoji: '🌿', cost: 45 },
  { id: 'dusk', name: 'Dusk Blue', emoji: '🌙', cost: 45 },
  { id: 'terracotta', name: 'Terracotta', emoji: '🏺', cost: 45 },
] as const;
