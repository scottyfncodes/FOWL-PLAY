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

export type DiscoveryEventKind = 'trait' | 'breed' | 'resemblance' | 'milestone' | 'ribbon' | 'mutation';

export interface DiscoveryEvent {
  kind: DiscoveryEventKind;
  refId: string;
  chickenId: string | null;
  at: number;
  corn: number;
}

export type OnboardingStep = 'welcome' | 'pickSecond' | 'firstBreed' | 'done';

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
}

export const SAVE_VERSION = 1;
