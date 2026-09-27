import type { Store } from '../state/store';
import type { GameState } from '../state/types';
import type { DiscoveryReport } from '../state/game';
import type { Chicken } from '../chickens/chicken';

export type Tab = 'coop' | 'breed' | 'hatchery' | 'almanac' | 'show';

export interface UiState {
  tab: Tab;
  parentA: string | null;
  parentB: string | null;
  coopSort: 'newest' | 'rarity' | 'generation' | 'name';
  showMeadow: boolean;
  almanacTab: 'breeds' | 'traits' | 'milestones';
  /** Chicken to flash when the coop next renders. */
  highlightId: string | null;
}

export interface Ctx {
  store: Store;
  readonly state: GameState;
  ui: UiState;
  navigate(tab: Tab): void;
  rerender(): void;
  showChicken(id: string): void;
  openHatch(eggId: string): void;
  /** Announce discoveries from any report with toasts + sound. */
  announce(report: DiscoveryReport, chicken?: Chicken | null): void;
  breedWith(chickenId: string): void;
  openSettings(): void;
  toastCorn(amount: number): void;
}
