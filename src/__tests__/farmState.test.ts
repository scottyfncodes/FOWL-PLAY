import { describe, expect, it } from 'vitest';
import { startNewGame, breed, hatch, registerChicken, chickenById } from '../state/game';
import { applyFarmEvent, currentMission, emptyOutingReport, finishOuting, foundEgg, startOuting, missionSolved } from '../state/farm';
import { decodeSave, encodeSave, migrate, sanitizeState } from '../save/storage';
import { freshState } from '../state/game';
import { World } from '../farm/sim';
import { FARM_LEVEL } from '../farm/level';
import { MISSION_BY_ID } from '../farm/missions';
import { ab, LOOK } from './farmHarness';
import { BREED_BY_ID } from '../data/breeds';
import { createChickenFromBreed } from '../chickens/chicken';
import { createRng } from '../core/rng';
import { genotypeFromSpec } from '../genetics/loci';

const game = () => startNewGame(7);

describe('outings', () => {
  it('startOuting records the chicken and counts outings', () => {
    const s = game();
    const c = s.chickens[0]!;
    expect(startOuting(s, c.id)).toBe(true);
    expect(s.farm.lastChickenId).toBe(c.id);
    expect(s.farm.outings).toBe(1);
    expect(startOuting(s, 'nope')).toBe(false);
  });
  it('discovering a mission puts it on the board; revisiting counts attempts', () => {
    const s = game();
    const c = s.chickens[0]!;
    const r = emptyOutingReport();
    applyFarmEvent(s, { type: 'missionDiscovered', mission: 'gardenGate' }, c, r);
    expect(s.farm.missions.gardenGate?.attempts).toBe(1);
    expect(r.discovered.map((m) => m.id)).toEqual(['gardenGate']);
    applyFarmEvent(s, { type: 'missionDiscovered', mission: 'gardenGate' }, c, r);
    expect(s.farm.missions.gardenGate?.attempts).toBe(2);
    expect(r.discovered.length).toBe(1);
  });
  it('solving a mission pays once and remembers who and how', () => {
    const s = game();
    const c = s.chickens[0]!;
    const r = emptyOutingReport();
    const corn = s.corn;
    applyFarmEvent(s, { type: 'missionSolved', mission: 'gardenGate', method: 'gap' }, c, r);
    expect(s.corn).toBe(corn + MISSION_BY_ID.gardenGate!.reward);
    expect(s.farm.missions.gardenGate).toMatchObject({ chickenId: c.id, chickenName: c.name, method: 'gap' });
    expect(missionSolved(s, 'gardenGate')).toBe(true);
    applyFarmEvent(s, { type: 'missionSolved', mission: 'gardenGate', method: 'dig' }, c, r);
    expect(s.corn).toBe(corn + MISSION_BY_ID.gardenGate!.reward);
    expect(s.farm.missions.gardenGate?.method).toBe('gap');
    expect(s.log.some((e) => e.kind === 'mission')).toBe(true);
  });
  it('the current mission advances through the main chain and skips optional ones', () => {
    const s = game();
    const c = s.chickens[0]!;
    const r = emptyOutingReport();
    expect(currentMission(s)?.id).toBe('breakfast');
    applyFarmEvent(s, { type: 'missionSolved', mission: 'breakfast', method: 'peck' }, c, r);
    expect(currentMission(s)?.id).toBe('gardenGate');
    applyFarmEvent(s, { type: 'missionSolved', mission: 'gardenGate', method: 'gap' }, c, r);
    expect(currentMission(s)?.id).toBe('pond'); // crows are optional
  });
  it('clues are kept once each and create the board entry if needed', () => {
    const s = game();
    const c = s.chickens[0]!;
    const r = emptyOutingReport();
    applyFarmEvent(s, { type: 'clue', mission: 'pond', id: 'deep', text: 'x' }, c, r);
    applyFarmEvent(s, { type: 'clue', mission: 'pond', id: 'deep', text: 'x' }, c, r);
    expect(s.farm.clues.pond).toEqual(['deep']);
    expect(s.farm.missions.pond).toBeTruthy();
    expect(r.clues).toBe(1);
  });
  it('corn is paid once per kernel and lore once per note', () => {
    const s = game();
    const c = s.chickens[0]!;
    const r = emptyOutingReport();
    const corn = s.corn;
    applyFarmEvent(s, { type: 'corn', id: 'corn1', amount: 3 }, c, r);
    applyFarmEvent(s, { type: 'corn', id: 'corn1', amount: 3 }, c, r);
    expect(s.corn).toBe(corn + 3);
    applyFarmEvent(s, { type: 'lore', id: 'heavyWings' }, c, r);
    applyFarmEvent(s, { type: 'lore', id: 'heavyWings' }, c, r);
    expect(r.lore).toEqual(['heavyWings']);
  });
  it('a mystery egg goes into the incubator when there is room, and waits otherwise', () => {
    const s = game();
    const c = s.chickens[0]!;
    const r = emptyOutingReport();
    applyFarmEvent(s, { type: 'egg', id: 'egg-burrow' }, c, r);
    expect(s.eggs.length).toBe(1);
    expect(s.eggs[0]!.child.origin).toBe('found');
    expect(s.farm.eggsTaken).toEqual(['egg-burrow']);
    // fill the incubator
    while (foundEgg(s, 'x')) { /* fill */ }
    applyFarmEvent(s, { type: 'egg', id: 'egg-loft' }, c, r);
    expect(r.eggsLeft).toBe(1);
    expect(s.farm.eggsTaken).toEqual(['egg-burrow']);
  });
  it('finishOuting persists opened flags so the next chicken finds gates open', () => {
    const s = game();
    const world = new World(FARM_LEVEL, { abilities: ab({ tiny: true }), look: LOOK });
    world.flags.add('gardenGate');
    world.cornTaken.add('corn2');
    finishOuting(s, world);
    expect(s.farm.flags).toContain('gardenGate');
    expect(s.farm.cornTaken).toContain('corn2');
    const again = new World(FARM_LEVEL, { abilities: ab(), look: LOOK, flags: s.farm.flags });
    expect(again.flags.has('gardenGate')).toBe(true);
  });
  it('a found egg hatches into a numbered Fowldex entry', () => {
    const s = game();
    const c = s.chickens[0]!;
    const r = emptyOutingReport();
    applyFarmEvent(s, { type: 'egg', id: 'egg-burrow' }, c, r);
    const result = hatch(s, s.eggs[0]!.id);
    expect(result?.chicken.no).toBeGreaterThan(0);
    expect(result?.chicken.origin).toBe('found');
  });
});

describe('save round trip with farm state', () => {
  it('missions, clues, flags and Fowldex numbers survive encode/decode', () => {
    const s = game();
    const c = s.chickens[0]!;
    const r = emptyOutingReport();
    applyFarmEvent(s, { type: 'missionSolved', mission: 'breakfast', method: 'peck' }, c, r);
    applyFarmEvent(s, { type: 'clue', mission: 'gardenGate', id: 'gap', text: 'x' }, c, r);
    s.farm.flags.push('breakfast');
    const back = decodeSave(encodeSave(s), freshState)!;
    expect(back.farm.missions.breakfast?.method).toBe('peck');
    expect(back.farm.clues.gardenGate).toEqual(['gap']);
    expect(back.farm.flags).toEqual(['breakfast']);
    expect(back.chickens.map((x) => x.no)).toEqual(s.chickens.map((x) => x.no));
    expect(back.farm.nextNo).toBe(s.farm.nextNo);
  });
  it('v1 saves migrate: chickens get Fowldex numbers in hatch order and a fresh farm', () => {
    const raw = {
      chickens: [
        { id: 'b', name: 'B', born: 200, genotype: {} },
        { id: 'a', name: 'A', born: 100, genotype: {} },
      ],
      corn: 10,
    };
    const migrated = migrate(raw, 1);
    const s = sanitizeState(migrated, freshState);
    expect(chickenById(s, 'a')?.no).toBe(1);
    expect(chickenById(s, 'b')?.no).toBe(2);
    expect(s.farm.nextNo).toBe(3);
    expect(s.farm.missions).toEqual({});
  });
  it('garbage farm data is dropped, not fatal', () => {
    const s = sanitizeState({ farm: { missions: { x: 5, gardenGate: { solvedAt: 'no', attempts: -3 } }, clues: { a: 'b' }, flags: [1, 'ok'] } }, freshState);
    expect(s.farm.missions.x).toBeUndefined();
    expect(s.farm.missions.gardenGate).toMatchObject({ solvedAt: null, attempts: 0 });
    expect(s.farm.clues.a).toBeUndefined();
    expect(s.farm.flags).toEqual(['ok']);
  });
});

describe('hidden genes proven by breeding', () => {
  it('a long-legged chick from two ordinary carriers marks both parents', () => {
    const s = freshState();
    const rng = createRng(11);
    const a = createChickenFromBreed(BREED_BY_ID.wyandotte!, rng, 'A', 'starter');
    const b = createChickenFromBreed(BREED_BY_ID.australorp!, rng, 'B', 'starter');
    a.genotype.legLen = ['L+', 'lg'];
    b.genotype.legLen = ['L+', 'lg'];
    s.chickens.push(a, b);
    s.upgrades.coop = 30; // plenty of roosts for the trial
    registerChicken(s, a, false);
    registerChicken(s, b, false);
    // Breed until a long-legged chick appears (25% per egg).
    let proven = false;
    for (let seed = 1; seed < 60 && !proven; seed++) {
      const egg = breed(s, a, b, seed);
      if (!egg) break;
      const res = hatch(s, egg.id);
      if (res && res.chicken.genotype.legLen[0] === 'lg' && res.chicken.genotype.legLen[1] === 'lg') {
        expect(res.report.provenCarriers.map((p) => p.parentId).sort()).toEqual([a.id, b.id].sort());
        expect(a.knownGenes).toContain('longLegs');
        expect(b.knownGenes).toContain('longLegs');
        proven = true;
      }
    }
    expect(proven).toBe(true);
  });
  it('new farm abilities are recorded in the Fowldex when first seen', () => {
    const s = freshState();
    const c = createChickenFromBreed(BREED_BY_ID.serama!, createRng(2), 'Pip', 'hatchery');
    s.chickens.push(c);
    const r = registerChicken(s, c, false);
    expect(r.newAbilities).toContain('tiny');
    expect(s.farm.discoveredAbilities.tiny?.chickenId).toBe(c.id);
    const d = createChickenFromBreed(BREED_BY_ID.dutchbantam!, createRng(3), 'Pop', 'hatchery');
    s.chickens.push(d);
    expect(registerChicken(s, d, false).newAbilities).not.toContain('tiny');
  });
  it('genotypeFromSpec still accepts the new loci', () => {
    const g = genotypeFromSpec({ legLen: 'lg/lg', web: 'wb/wb', spring: 'Jp/Jp' });
    expect(g.legLen).toEqual(['lg', 'lg']);
    expect(g.nerve).toEqual(['steady', 'steady']);
  });
});
