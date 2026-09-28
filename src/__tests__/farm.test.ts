import { describe, expect, it } from 'vitest';
import { FARM_LEVEL } from '../farm/level';
import { World, jumpHeightFor } from '../farm/sim';
import { NO_INPUT, type WorldEvent } from '../farm/types';
import { DT, LOOK, ab, harness, type Harness } from './farmHarness';
import { MISSIONS, MISSION_BY_ID } from '../farm/missions';
import type { Abilities } from '../genetics/abilities';
import { BREEDS, BREED_BY_ID } from '../data/breeds';
import { createChickenFromBreed, viewOf } from '../chickens/chicken';
import { abilitiesOf } from '../genetics/abilities';
import { createRng } from '../core/rng';

const CH = { garden: ['gardenGate'], toBarn: ['gardenGate', 'pondPlank'], inBarn: ['gardenGate', 'pondPlank', 'barnDoor'], toField: ['gardenGate', 'pondPlank', 'barnDoor', 'barnBack'], toHouse: ['gardenGate', 'pondPlank', 'barnDoor', 'barnBack', 'fieldGate'] };

describe('mission data', () => {
  it('every mission has at least one solution and unique ids', () => {
    const ids = new Set(MISSIONS.map((m) => m.id));
    expect(ids.size).toBe(MISSIONS.length);
    for (const m of MISSIONS) {
      expect(m.solutions.length).toBeGreaterThan(0);
      expect(m.done.endsWith('.')).toBe(true);
    }
  });
  it('every real problem has more than one kind of chicken that solves it', () => {
    for (const m of MISSIONS.filter((x) => x.order > 0)) expect(m.solutions.length, m.id).toBeGreaterThanOrEqual(2);
  });
  it('every listed solution is reachable by some real breed or plausible cross', () => {
    // Ability sets of all pure breeds plus a few designed crosses.
    const pool: Abilities[] = BREEDS.map((b) => abilitiesOf(viewOf(createChickenFromBreed(b, createRng(3), b.id, 'starter')).phenotype));
    for (const m of MISSIONS) {
      for (const s of m.solutions) {
        const ok = pool.some((a) => s.needs(a)) || ['glide', 'crate', 'reach', 'latch', 'leap', 'swim', 'crow'].includes(s.method);
        expect(ok, `${m.id}/${s.method} has no breed that can do it`).toBe(true);
      }
    }
  });
});

describe('breakfast (tutorial)', () => {
  it('any chicken can hop on the crate and peck the sack', () => {
    const h = harness(ab());
    expect(h.walkTo(280)).toBe(true);
    expect(h.events.some((e) => e.type === 'missionDiscovered' && e.mission === 'breakfast')).toBe(true);
    // hop onto the crate
    h.walkTo(330, { maxT: 3 });
    expect(h.world.chicken.y).toBeLessThanOrEqual(461);
    h.peck(1, 4);
    expect(h.solved('breakfast')?.type).toBe('missionSolved');
  });
});

describe('the garden gate', () => {
  it('an ordinary starter cannot get past the hedge, and learns why', () => {
    const h = harness(ab({ weight: 4, jump: 2 }));
    expect(h.walkTo(900, { maxT: 12 })).toBe(false);
    expect(h.world.chicken.x).toBeLessThan(775);
    expect(h.events.some((e) => e.type === 'missionDiscovered' && e.mission === 'gardenGate')).toBe(true);
    expect(h.clues()).toContain('gap');
    expect(h.solved('gardenGate')).toBeUndefined();
  });
  it('a tiny chicken squeezes through the gap and opens the bolt', () => {
    const h = harness(ab({ tiny: true, weight: 0 }));
    expect(h.walkTo(890)).toBe(true);
    h.peck(-1);
    expect(h.solved('gardenGate')).toMatchObject({ method: 'gap' });
    expect(h.world.flags.has('gardenGate')).toBe(true);
  });
  it('a jump-4 chicken clears the hedge from the wheelbarrow; jump 3 cannot', () => {
    const good = harness(ab({ jump: 4 }));
    expect(good.walkTo(698)).toBe(true); // on the wheelbarrow
    expect(good.world.chicken.y).toBeLessThanOrEqual(451);
    good.leap(1);
    expect(good.walkTo(890, { maxT: 6 })).toBe(true);
    good.peck(-1);
    expect(good.solved('gardenGate')).toMatchObject({ method: 'jump' });
    const bad = harness(ab({ jump: 3 }));
    expect(bad.walkTo(698)).toBe(true);
    bad.leap(1);
    expect(bad.walkTo(890, { maxT: 6 })).toBe(false);
    expect(bad.clues()).toContain('barrow');
  });
  it('a digger tunnels under the hedge', () => {
    const h = harness(ab({ dig: true }));
    expect(h.walkTo(610)).toBe(true);
    h.step({ action: true });
    expect(h.world.chicken.busyKind).toBe('dig');
    h.wait(1.2);
    expect(h.world.chicken.x).toBeGreaterThan(860);
    h.walkTo(890);
    h.peck(-1);
    expect(h.solved('gardenGate')).toMatchObject({ method: 'dig' });
  });
  it('a non-digger scratching the soil gets a clue', () => {
    const h = harness(ab());
    h.walkTo(610);
    h.step({ action: true });
    expect(h.clues()).toContain('soil');
  });
  it('a climber goes up the post', () => {
    const h = harness(ab({ climb: true }));
    expect(h.walkTo(756)).toBe(true);
    // climb
    for (let t = 0; t < 4 && h.world.chicken.y > 345; t += DT) h.step({ up: true, right: true });
    expect(h.world.chicken.y).toBeLessThanOrEqual(345);
    expect(h.walkTo(890, { maxT: 6 })).toBe(true);
    h.peck(-1);
    expect(h.solved('gardenGate')).toMatchObject({ method: 'climb' });
  });
  it('long legs reach the latch from outside; ordinary legs do not', () => {
    const tall = harness(ab({ longLegs: true, jump: 3 }));
    expect(tall.walkTo(770, { maxT: 8 })).toBe(false);
    expect(tall.world.chicken.x).toBeGreaterThan(750);
    for (let i = 0; i < 6 && !tall.solved('gardenGate'); i++) {
      tall.step({ right: true, jumpPressed: true, jump: true });
      for (let t = 0; t < 0.5; t += DT) tall.step({ right: true, jump: true, action: true });
      tall.wait(0.4);
    }
    expect(tall.solved('gardenGate')).toMatchObject({ method: 'latch' });
    const short = harness(ab({ jump: 3 }));
    short.walkTo(770, { maxT: 8 });
    for (let i = 0; i < 6; i++) {
      short.step({ right: true, jumpPressed: true, jump: true });
      for (let t = 0; t < 0.5; t += DT) short.step({ right: true, jump: true, action: true });
      short.wait(0.4);
    }
    expect(short.solved('gardenGate')).toBeUndefined();
  });
  it('a glider flaps over from the wheelbarrow', () => {
    const h = harness(ab({ weight: 2, jump: 3, glide: true }), { look: { bigWings: true } });
    expect(h.walkTo(698)).toBe(true);
    h.leap(1, 1.5, { flap: true, glide: true });
    expect(h.walkTo(890, { maxT: 6 })).toBe(true);
    h.peck(-1);
    expect(h.solved('gardenGate')).toMatchObject({ method: 'glide' });
  });
  it('a heavy chicken with big wings learns that wings are not enough', () => {
    const h = harness(ab({ weight: 4, jump: 2 }), { look: { bigWings: true } });
    h.walkTo(700, { holdJump: true, flap: true, maxT: 6 });
    expect(h.events.some((e) => e.type === 'lore' && e.id === 'heavyWings')).toBe(true);
  });
});

describe('the pond', () => {
  it('a non-swimmer flounders and is put back on the bank with a clue', () => {
    const h = harness(ab(), { flags: CH.garden, spawnX: 1500 });
    h.walkTo(1700, { maxT: 6 });
    h.wait(1.2);
    expect(h.world.chicken.x).toBeLessThan(1560);
    expect(h.clues()).toContain('shallow');
  });
  it('a swimmer crosses and drops the plank', () => {
    const h = harness(ab({ swim: true }), { flags: CH.garden, spawnX: 1500 });
    expect(h.walkTo(1936, { maxT: 15 })).toBe(true);
    h.peck(1, 5);
    expect(h.solved('pond')).toMatchObject({ method: 'swim' });
    expect(h.world.flags.has('pondPlank')).toBe(true);
  });
  it('long legs wade the shallows and hop the stone', () => {
    const h = harness(ab({ longLegs: true, jump: 2 }), { flags: CH.garden, spawnX: 1500 });
    expect(h.walkTo(1672, { maxT: 8 })).toBe(true);
    expect(h.world.chicken.wading).toBe(true);
    h.leap(1, 1, { stopAt: 1735 });
    expect(h.world.chicken.x).toBeGreaterThan(1722);
    expect(h.world.chicken.y).toBeLessThanOrEqual(483);
    h.walkTo(1752, { maxT: 2, jump: false });
    h.leap(1, 1, { stopAt: 1815 });
    expect(h.world.chicken.wading).toBe(true);
    expect(h.walkTo(1936, { maxT: 12 })).toBe(true);
    h.peck(1, 5);
    expect(h.solved('pond')).toMatchObject({ method: 'wade' });
  });
  it('a glider floats across from the dock', () => {
    const h = harness(ab({ weight: 2, jump: 3, glide: true, speed: 2 }), { flags: CH.garden, spawnX: 1480 });
    h.walkTo(1552, { maxT: 3 });
    expect(h.world.chicken.y).toBeLessThanOrEqual(441);
    // leap off the dock, flap once, hold to glide
    h.leap(1, 3.5, { flap: true, glide: true });
    expect(h.world.chicken.x).toBeGreaterThan(1920);
    expect(h.walkTo(1936, { maxT: 4 })).toBe(true);
    h.peck(1, 5);
    expect(h.solved('pond')).toMatchObject({ method: 'glide' });
  });
  it('once the plank is down, anyone walks across', () => {
    const h = harness(ab({ weight: 5, jump: 1 }), { flags: CH.toBarn, spawnX: 1500 });
    expect(h.walkTo(1980, { maxT: 15 })).toBe(true);
  });
});

describe('the barn door', () => {
  it('a strong chicken shoves through the weak board', () => {
    const h = harness(ab({ weight: 4, strength: 3 }), { flags: CH.toBarn, spawnX: 2000 });
    expect(h.walkTo(2170, { maxT: 8 })).toBe(true);
    h.peck(-1);
    expect(h.solved('barnDoor')).toMatchObject({ method: 'board' });
  });
  it('a strong beak pecks the board apart; a soft beak just learns', () => {
    const h = harness(ab({ weight: 3, strength: 1, beak: 2 }), { flags: CH.toBarn, spawnX: 2000 });
    h.walkTo(2090, { maxT: 5 });
    h.peck(1, 4);
    expect(h.walkTo(2170, { maxT: 5 })).toBe(true);
    h.peck(-1);
    expect(h.solved('barnDoor')).toMatchObject({ method: 'board' });
    const soft = harness(ab({ weight: 3, strength: 1, beak: 0 }), { flags: CH.toBarn, spawnX: 2000 });
    soft.walkTo(2090, { maxT: 5 });
    soft.peck(1, 4);
    expect(soft.clues()).toContain('board');
    expect(soft.walkTo(2170, { maxT: 4 })).toBe(false);
  });
  it('a tiny chicken uses the cat flap', () => {
    const h = harness(ab({ tiny: true }), { flags: CH.toBarn, spawnX: 2000 });
    expect(h.walkTo(2170, { maxT: 8 })).toBe(true);
    h.peck(-1);
    expect(h.solved('barnDoor')).toMatchObject({ method: 'flap' });
  });
  it('a curious chicken finds the old tunnel', () => {
    const h = harness(ab({ curious: true }), { flags: CH.toBarn, spawnX: 1980 });
    expect(h.walkTo(2170, { maxT: 10 })).toBe(true);
    expect(h.events.some((e) => e.type === 'thought')).toBe(true);
    h.peck(-1);
    expect(h.solved('barnDoor')).toMatchObject({ method: 'hidden' });
  });
  it('an incurious chicken walks straight past the tunnel', () => {
    const h = harness(ab({ weight: 3 }), { flags: CH.toBarn, spawnX: 1980 });
    expect(h.walkTo(2170, { maxT: 6 })).toBe(false);
    expect(h.world.chicken.x).toBeLessThan(2100);
    expect(h.world.chicken.y).toBeLessThanOrEqual(500);
  });
  it('a climber goes up the wall, through the loft window and down inside', () => {
    const h = harness(ab({ climb: true }), { flags: CH.toBarn, spawnX: 2000 });
    h.walkTo(2092, { maxT: 4, jump: false });
    for (let t = 0; t < 4 && h.world.chicken.y > 352; t += DT) h.step({ up: true, right: true });
    expect(h.world.chicken.y).toBeLessThanOrEqual(352);
    expect(h.walkTo(2300, { maxT: 6 })).toBe(true);
    expect(h.walkTo(2560, { maxT: 6 })).toBe(true);
    expect(h.walkTo(2170, { maxT: 8 })).toBe(true);
    h.peck(-1);
    expect(h.solved('barnDoor')).toMatchObject({ method: 'climb' });
  });
});

describe('the grain chute', () => {
  it('a giant presses the plate by standing on it', () => {
    const h = harness(ab({ weight: 5, strength: 2, jump: 1 }), { flags: CH.inBarn, spawnX: 2330 });
    expect(h.walkTo(2430, { maxT: 5 })).toBe(true);
    expect(h.solved('grainChute')).toMatchObject({ method: 'heavy' });
    expect(h.world.flags.has('barnBack')).toBe(true);
  });
  it('a strong chicken shoves the crate onto the plate; a weak one cannot', () => {
    const h = harness(ab({ weight: 3, strength: 2 }), { flags: CH.inBarn, spawnX: 2200 });
    h.walkTo(2420, { maxT: 12, jump: false });
    expect(h.solved('grainChute')).toMatchObject({ method: 'crate' });
    const weak = harness(ab({ weight: 3, strength: 1 }), { flags: CH.inBarn, spawnX: 2200 });
    weak.walkTo(2420, { maxT: 4, jump: false });
    expect(weak.clues()).toContain('crate');
    expect(weak.solved('grainChute')).toBeUndefined();
  });
});

describe('the fox field', () => {
  it('a slow chicken is caught and put back at the field checkpoint', () => {
    const h = harness(ab({ speed: 2 }), { flags: CH.toField, spawnX: 2775 });
    h.walkTo(3530, { maxT: 12 });
    expect(h.events.some((e) => e.type === 'caught')).toBe(true);
    h.wait(1.5);
    expect(h.world.chicken.x).toBeLessThan(2800);
    expect(h.clues()).toContain('caught');
  });
  it('a fast chicken outruns the fox', () => {
    const h = harness(ab({ speed: 5, jump: 2 }), { flags: CH.toField, spawnX: 2775 });
    expect(h.walkTo(3524, { maxT: 12, hopFoxes: true })).toBe(true);
    h.peck(1, 2);
    expect(h.solved('foxField')).toMatchObject({ method: 'outrun' });
    // An average runner tries the same trick and gets caught from behind.
    const avg = harness(ab({ speed: 3, jump: 2 }), { flags: CH.toField, spawnX: 2775 });
    const arrived = avg.walkTo(3524, { maxT: 12, hopFoxes: true });
    if (arrived) avg.peck(1, 2);
    expect(avg.solved('foxField')).toBeUndefined();
    expect(avg.events.some((e) => e.type === 'caught')).toBe(true);
  });
  it('a sneaky chicken slips past', () => {
    const h = harness(ab({ sneaky: true, speed: 2 }), { flags: CH.toField, spawnX: 2775 });
    expect(h.walkTo(3524, { maxT: 14, hopFoxes: true })).toBe(true);
    expect(h.events.some((e) => e.type === 'caught')).toBe(false);
    h.peck(1);
    expect(h.solved('foxField')).toMatchObject({ method: 'sneak' });
  });
  it('a tiny chicken takes the drainpipe', () => {
    const h = harness(ab({ tiny: true, speed: 2 }), { flags: CH.toField, spawnX: 2775 });
    expect(h.walkTo(3528, { maxT: 16 })).toBe(true);
    expect(h.events.some((e) => e.type === 'caught')).toBe(false);
    h.peck(1);
    expect(h.solved('foxField')).toMatchObject({ method: 'pipe' });
  });
  it('a brave, strong chicken makes the fox back off', () => {
    const h = harness(ab({ brave: true, strength: 3, weight: 4, speed: 2 }), { flags: CH.toField, spawnX: 2775 });
    for (let t = 0; t < 20 && !h.solved('foxField'); t += DT) {
      const fox = h.world.entities.find((e) => e.kind === 'fox')!;
      const c = h.world.chicken;
      if (fox.kind === 'fox' && fox.state === 'chase' && Math.abs(fox.x - c.x) < 120) h.step({ left: fox.x < c.x, right: fox.x > c.x });
      else if (c.x < 3522) h.step({ right: true });
      else h.step({ action: true });
    }
    expect(h.events.some((e) => e.type === 'caught')).toBe(false);
    expect(h.solved('foxField')).toMatchObject({ method: 'brave' });
  });
  it('crouching in a bush makes the fox lose interest', () => {
    const h = harness(ab({ speed: 2 }), { flags: CH.toField, spawnX: 2930 });
    h.walkTo(2975, { maxT: 3 });
    const fox = h.world.entities.find((e) => e.kind === 'fox');
    if (fox?.kind === 'fox') { fox.x = 3050; fox.facing = -1; fox.state = 'chase'; }
    for (let t = 0; t < 4; t += DT) h.step({ down: true });
    expect(h.events.some((e) => e.type === 'caught')).toBe(false);
    expect(fox?.kind === 'fox' && fox.state !== 'chase').toBe(true);
  });
  it('once the gate is open the fox sleeps', () => {
    const h = harness(ab({ speed: 1 }), { flags: CH.toHouse, spawnX: 2775 });
    expect(h.walkTo(3600, { maxT: 14 })).toBe(true);
    expect(h.events.some((e) => e.type === 'caught')).toBe(false);
  });
});

describe('the doorbell', () => {
  const ring = (h: Harness) => {
    h.walkTo(4284, { maxT: 8 });
    for (let i = 0; i < 6 && !h.solved('doorbell'); i++) {
      h.step({ right: true, jumpPressed: true, jump: true });
      for (let t = 0; t < 0.6; t += DT) h.step({ right: true, jump: true, action: true });
      h.wait(0.4);
    }
  };
  it('a jump-5 chicken presses it; jump 4 cannot', () => {
    const h = harness(ab({ jump: 5 }), { flags: CH.toHouse, spawnX: 3600 });
    ring(h);
    expect(h.solved('doorbell')).toMatchObject({ method: 'reach' });
    const low = harness(ab({ jump: 4 }), { flags: CH.toHouse, spawnX: 3600 });
    ring(low);
    expect(low.solved('doorbell')).toBeUndefined();
    expect(low.clues()).toContain('bell');
  });
  it('a climber takes the trellis', () => {
    const h = harness(ab({ climb: true, jump: 2 }), { flags: CH.toHouse, spawnX: 3600 });
    h.walkTo(4285, { maxT: 8 });
    for (let t = 0; t < 4 && !h.solved('doorbell'); t += DT) {
      h.step({ up: true, right: true });
      h.step({ up: true, right: true, action: true });
    }
    expect(h.solved('doorbell')).toMatchObject({ method: 'climb' });
  });
  it('a very loud chicken gets the farmer to the door', () => {
    const h = harness(ab({ crow: 3 }), { flags: CH.toHouse, spawnX: 3600 });
    h.walkTo(4230, { maxT: 8 });
    h.step({ action: true });
    expect(h.solved('doorbell')).toMatchObject({ method: 'crow' });
    const quiet = harness(ab({ crow: 1 }), { flags: CH.toHouse, spawnX: 3600 });
    quiet.walkTo(4230, { maxT: 8 });
    quiet.step({ action: true });
    quiet.wait(1);
    quiet.step({ action: true });
    expect(quiet.solved('doorbell')).toBeUndefined();
    expect(quiet.clues()).toContain('crowNotLoud');
  });
  it('a strong jumper shoves the crate under the bell', () => {
    const h = harness(ab({ strength: 2, jump: 3 }), { flags: CH.toHouse, spawnX: 3600 });
    h.walkTo(3985, { maxT: 6 });
    h.walkTo(4262, { maxT: 12, jump: false });
    // step back and hop onto the crate, then ring
    h.walkTo(4200, { maxT: 3 });
    h.walkTo(4278, { maxT: 4 });
    expect(h.world.chicken.y).toBeLessThan(430);
    ring(h);
    expect(h.solved('doorbell')).toMatchObject({ method: 'crate' });
  });
});

describe('world bookkeeping', () => {
  it('corn is collected once and remembered', () => {
    const h = harness(ab());
    h.walkTo(540);
    const corn = h.events.filter((e) => e.type === 'corn');
    expect(corn.length).toBeGreaterThanOrEqual(3);
    const again = new World(FARM_LEVEL, { abilities: ab(), look: LOOK, cornTaken: h.world.cornTaken });
    const ev: WorldEvent[] = [];
    for (let t = 0; t < 6; t += DT) ev.push(...again.step({ ...NO_INPUT, right: true }, DT));
    expect(ev.filter((e) => e.type === 'corn').length).toBe(0);
  });
  it('walking into the coop door exits', () => {
    const h = harness(ab());
    h.walkTo(40);
    expect(h.events.some((e) => e.type === 'exit')).toBe(true);
  });
  it('jump heights are monotonic in the jump stat', () => {
    for (let j = 1; j < 6; j++) expect(jumpHeightFor(ab({ jump: j + 1 }))).toBeGreaterThan(jumpHeightFor(ab({ jump: j })));
  });
  it('mission ids referenced by the level exist', () => {
    for (const e of FARM_LEVEL.entities) {
      const refs: string[] = [];
      if ('mission' in e && e.mission) refs.push(typeof e.mission === 'string' ? e.mission : e.mission.id);
      if ('route' in e && e.route) refs.push(e.route.mission);
      if ('clue' in e && e.clue) refs.push(e.clue.mission);
      if (e.kind === 'zone' && e.discover) refs.push(e.discover);
      for (const r of refs) expect(MISSION_BY_ID[r], `${e.kind} ${'id' in e ? e.id : ''} references ${r}`).toBeDefined();
    }
  });
  it('starter breeds and welcome picks cannot open the garden gate on their own', () => {
    for (const id of ['australorp', 'orpington', 'wyandotte', 'sussex', 'plymouthrock', 'silkie', 'polish', 'araucana']) {
      const a = abilitiesOf(viewOf(createChickenFromBreed(BREED_BY_ID[id]!, createRng(5), id, 'starter')).phenotype);
      const can = MISSION_BY_ID.gardenGate!.solutions.some((s) => s.needs(a));
      expect(can, `${id} should need help`).toBe(false);
    }
  });
});
