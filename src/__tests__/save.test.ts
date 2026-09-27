import { describe, expect, it } from 'vitest';
import { BACKUP_KEY, MIGRATIONS, SAVE_KEY, clearSave, decodeSave, encodeSave, loadState, migrate, saveState } from '../save/storage';
import { breed, buyOffer, canBreed, enterShow, freshState, hatch, pickSecondChicken, startNewGame, coopChickens, sendToMeadow, bringBack } from '../state/game';
import { SAVE_VERSION } from '../state/types';
import { BREEDS } from '../data/breeds';

class MemStorage implements Storage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  clear() { this.m.clear(); }
  getItem(k: string) { return this.m.get(k) ?? null; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  removeItem(k: string) { this.m.delete(k); }
  setItem(k: string, v: string) { this.m.set(k, v); }
}

describe('save system', () => {
  it('round-trips a full game state', () => {
    const s = startNewGame(1);
    pickSecondChicken(s, s.hatchery.offers[0]!.id);
    const [a, b] = coopChickens(s);
    const egg = breed(s, a!, b!, 77)!;
    hatch(s, egg.id);
    const storage = new MemStorage();
    expect(saveState(storage, s)).toBe(true);
    const loaded = loadState(storage, freshState).state!;
    expect(loaded.chickens.map((c) => c.id)).toEqual(s.chickens.map((c) => c.id));
    expect(loaded.chickens[2]!.genotype).toEqual(s.chickens[2]!.genotype);
    expect(loaded.corn).toBe(s.corn);
    expect(loaded.discoveredTraits).toEqual(s.discoveredTraits);
    expect(loaded.history.length).toBe(1);
  });
  it('keeps a backup and restores from it when the primary is corrupt', () => {
    const storage = new MemStorage();
    const s = startNewGame(2);
    saveState(storage, s);
    s.corn = 999;
    saveState(storage, s);
    expect(storage.getItem(BACKUP_KEY)).not.toBeNull();
    storage.setItem(SAVE_KEY, '{not json');
    const r = loadState(storage, freshState);
    expect(r.state).not.toBeNull();
    expect(r.note).toMatch(/backup/);
    expect(r.state!.corn).toBe(60);
    clearSave(storage);
    expect(loadState(storage, freshState).state).toBeNull();
  });
  it('sanitises malformed data instead of crashing', () => {
    const bad = JSON.stringify({ app: 'fowl-play', version: 1, state: { chickens: [{ id: 'x', genotype: { base: ['E', 'zzz'] }, name: 5 }, null, 42, { id: 'x' }], corn: 'nope', eggs: [{ child: null }, 'egg'], discoveredTraits: { 'col.black': 'yes' }, upgrades: { coop: -3 } } });
    const s = decodeSave(bad, freshState)!;
    expect(s.chickens.length).toBe(1);
    expect(s.chickens[0]!.name).toBe('Unnamed');
    expect(s.chickens[0]!.genotype.base).toEqual(['eb', 'eb']);
    expect(s.corn).toBe(60);
    expect(s.eggs).toEqual([]);
    expect(s.discoveredTraits).toEqual({});
    expect(s.upgrades).toEqual({});
    expect(decodeSave('null', freshState)).toBeNull();
    expect(decodeSave('{"app":"other"}', freshState)).toBeNull();
    expect(() => decodeSave(JSON.stringify({ app: 'fowl-play', version: SAVE_VERSION + 5, state: {} }), freshState)).toThrow();
  });
  it('has a migration chain that covers every version below the current one', () => {
    expect(MIGRATIONS.length).toBe(SAVE_VERSION - 1);
    expect(migrate({ a: 1 }, SAVE_VERSION)).toEqual({ a: 1 });
    expect(() => migrate({}, 0)).toThrow();
  });
  it('never duplicates an egg child that already hatched', () => {
    const s = startNewGame(3);
    pickSecondChicken(s, s.hatchery.offers[0]!.id);
    const [a, b] = coopChickens(s);
    const egg = breed(s, a!, b!, 5)!;
    const snapshot = JSON.parse(encodeSave(s));
    hatch(s, egg.id);
    // Simulate a save that somehow contains both the hatched chicken and the egg.
    snapshot.state.chickens = s.chickens;
    const loaded = decodeSave(JSON.stringify(snapshot), freshState)!;
    expect(loaded.eggs.length).toBe(0);
    expect(new Set(loaded.chickens.map((c) => c.id)).size).toBe(loaded.chickens.length);
  });
});

describe('game rules', () => {
  it('new game gives one chicken and three welcome offers', () => {
    const s = startNewGame(9);
    expect(s.chickens.length).toBe(1);
    expect(s.hatchery.offers.length).toBe(3);
    expect(s.onboarding).toBe('pickSecond');
    expect(s.corn).toBe(60);
  });
  it('enforces coop and incubator capacity', () => {
    const s = startNewGame(4);
    pickSecondChicken(s, s.hatchery.offers[0]!.id);
    const [a, b] = coopChickens(s);
    expect(canBreed(s, a!, a!).ok).toBe(false);
    expect(breed(s, a!, b!, 1)).not.toBeNull();
    expect(breed(s, a!, b!, 2)).not.toBeNull();
    expect(breed(s, a!, b!, 3)).toBeNull(); // incubator full (2)
    hatch(s, s.eggs[0]!.id);
    hatch(s, s.eggs[0]!.id);
    for (let i = 0; i < 10; i++) {
      const e = breed(s, a!, b!, 10 + i);
      if (e) hatch(s, e.id);
    }
    expect(coopChickens(s).length).toBe(8);
    expect(canBreed(s, a!, b!).ok).toBe(false);
    expect(sendToMeadow(s, coopChickens(s)[7]!.id)).toBe(true);
    expect(canBreed(s, a!, b!).ok).toBe(true);
    expect(bringBack(s, s.chickens.find((c) => c.status === 'meadow')!.id).ok).toBe(true);
  });
  it('hatchery purchases cost corn, respect capacity and replace the offer', () => {
    const s = startNewGame(5);
    pickSecondChicken(s, s.hatchery.offers[0]!.id);
    expect(s.hatchery.offers.length).toBe(4);
    s.corn = 0;
    const offer = s.hatchery.offers[0]!;
    expect(buyOffer(s, offer.id).ok).toBe(false);
    s.corn = 1000;
    const r = buyOffer(s, offer.id);
    expect(r.ok).toBe(true);
    expect(s.corn).toBe(1000 - offer.price + (r.ok ? r.result.report.corn : 0));
    expect(s.hatchery.offers.find((o) => o.id === offer.id)).toBeUndefined();
    expect(s.hatchery.offers.length).toBe(4);
  });
  it('show entries are deterministic and reward improvement', () => {
    const s = startNewGame(6);
    const c = s.chickens[0]!;
    const r1 = enterShow(s, 'mostRidiculous', c.id)!;
    const r2 = enterShow(s, 'mostRidiculous', c.id)!;
    expect(r1.score).toBe(r2.score);
    expect(r2.improved).toBe(false);
    expect(r2.corn).toBe(0);
  });
  it('the catalogue has no duplicate breed names ignoring case and punctuation', () => {
    const norm = BREEDS.map((b) => b.name.toLowerCase().replace(/[^a-z]/g, ''));
    expect(new Set(norm).size).toBe(norm.length);
  });
});
