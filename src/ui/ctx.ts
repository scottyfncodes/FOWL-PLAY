import type { Store } from '../state/store';
import type { GameState } from '../state/types';
import type { DiscoveryReport } from '../state/game';
import type { Chicken } from '../chickens/chicken';

export type Tab = 'farm' | 'coop' | 'breed' | 'fowldex' | 'hatchery';

export interface UiState {
  tab: Tab;
  parentA: string | null;
  parentB: string | null;
  coopSort: 'newest' | 'rarity' | 'generation' | 'name';
  showMeadow: boolean;
  almanacTab: 'flock' | 'abilities' | 'breeds' | 'traits' | 'milestones';
  hatcheryTab: 'hatchery' | 'show';
  /** Chicken pre-selected for the next outing. */
  outingChickenId: string | null;
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
  /** Head out onto the farm as this chicken. */
  playAs(chickenId: string): void;
  /** Open the chicken picker for an outing. */
  chooseOuting(): void;
}
