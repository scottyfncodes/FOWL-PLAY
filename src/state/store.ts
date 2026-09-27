import { loadState, saveState, clearSave } from '../save/storage';
import { freshState, startNewGame } from './game';
import type { GameState } from './types';

type Listener = (state: GameState) => void;

/** Tiny observable store. Screens re-render on every commit. */
export class Store {
  state: GameState;
  private listeners = new Set<Listener>();
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  readonly loadNote: string | null;

  constructor(private storage: Storage | null) {
    const loaded = storage ? loadState(storage, freshState) : { state: null, note: null };
    this.loadNote = loaded.note;
    this.state = loaded.state ?? startNewGame();
    if (!loaded.state) this.persistNow();
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Apply a mutation, persist (debounced), notify listeners. */
  commit<T>(fn: (s: GameState) => T): T {
    const result = fn(this.state);
    this.schedulePersist();
    for (const l of this.listeners) l(this.state);
    return result;
  }

  private schedulePersist() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.persistNow(), 150);
  }

  persistNow(): boolean {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    return this.storage ? saveState(this.storage, this.state) : false;
  }

  replace(state: GameState) {
    this.state = state;
    this.persistNow();
    for (const l of this.listeners) l(this.state);
  }

  reset() {
    if (this.storage) clearSave(this.storage);
    this.replace(startNewGame());
  }
}
