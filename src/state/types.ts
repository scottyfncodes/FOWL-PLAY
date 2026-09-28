import type { Chicken } from '../chickens/chicken';
import type { Ribbon } from '../data/shows';

export interface Egg {
  id: string;
  parents: [string, string];
  /** Names of the parents at the time of breeding (parents may later be retired). */
  parentNames: [string, string];
  seed: number;
  createdAt: number;
  /** The chick is decided at breeding time; hatching only reveals it. */
  child: Chicken;
}

export interface HatcheryOffer {
  id: string;
  breedId: string;
  chicken: Chicken;
  price: number;
}

export interface BreedDiscovery {
  at: number;
  how: 'owned' | 'resemblance';
  chickenId: string;
}

export interface TraitDiscovery {
  at: number;
  chickenId: string;
}

export interface ShowRecord {
  ribbon: Ribbon;
  score: number;
  chickenId: string;
  chickenName: string;
  at: number;
}

export interface BreedingRecord {
  at: number;
  parents: [string, string];
  parentNames: [string, string];
  childId: string;
  childName: string;
  seed: number;
}

export type DiscoveryEventKind = 'trait' | 'breed' | 'resemblance' | 'milestone' | 'ribbon' | 'mutation' | 'mission' | 'ability' | 'carrier';

export interface DiscoveryEvent {
  kind: DiscoveryEventKind;
  refId: string;
  chickenId: string | null;
  at: number;
  corn: number;
}

export type OnboardingStep = 'welcome' | 'pickSecond' | 'firstBreed' | 'done';

export interface MissionProgress {
  discoveredAt: number;
  solvedAt: number | null;
  /** Chicken that solved it (kept even if that chicken later retires). */
  chickenId: string | null;
  chickenName: string | null;
  /** Solution method id, e.g. 'gap' or 'glide'. */
  method: string | null;
  attempts: number;
}

export interface AbilityDiscovery {
  at: number;
  chickenId: string;
}

export interface FarmState {
  missions: Record<string, MissionProgress>;
  /** Clue ids discovered per mission, in the order they were found. */
  clues: Record<string, string[]>;
  /** Abilities seen on a chicken in the flock, by ability id. */
  discoveredAbilities: Record<string, AbilityDiscovery>;
  /** Field notes learned the hard way (e.g. "fluffy chickens sink"). */
  lore: Record<string, number>;
  /** Corn kernels already collected, by id, so the farm is not a corn farm. */
  cornTaken: string[];
  /** Mystery eggs already found. */
  eggsTaken: string[];
  lastChickenId: string | null;
  outings: number;
  /** Next Fowldex number to hand out. */
  nextNo: number;
}

export interface GameState {
  version: number;
  createdAt: number;
  corn: number;
  chickens: Chicken[];
  eggs: Egg[];
  discoveredTraits: Record<string, TraitDiscovery>;
  discoveredBreeds: Record<string, BreedDiscovery>;
  milestones: Record<string, number>;
  upgrades: Record<string, number>;
  theme: string;
  ribbons: Record<string, ShowRecord>;
  hatchery: { offers: HatcheryOffer[]; hatchesSinceRefresh: number };
  stats: { hatches: number; breedings: number; purchases: number; showEntries: number };
  history: BreedingRecord[];
  log: DiscoveryEvent[];
  onboarding: OnboardingStep;
  settings: { sound: boolean };
  /** First chicken the player met; used for the welcome flow. */
  starterId: string | null;
  farm: FarmState;
}

export const SAVE_VERSION = 2;

export function freshFarm(): FarmState {
  return { missions: {}, clues: {}, discoveredAbilities: {}, lore: {}, cornTaken: [], eggsTaken: [], lastChickenId: null, outings: 0, nextNo: 1 };
}
