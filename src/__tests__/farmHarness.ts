import { FARM_LEVEL } from '../farm/level';
import { World, type ChickenLook } from '../farm/sim';
import { NO_INPUT, type Input, type WorldEvent } from '../farm/types';
import type { Abilities } from '../genetics/abilities';

export const DT = 1 / 60;

/** A fully specified ability set with sensible farm-chicken defaults. */
export function ab(over: Partial<Abilities> = {}): Abilities {
  const base: Abilities = {
    weight: 3, tiny: false, strength: 1, speed: 2, jump: 2, reach: 2, longLegs: false, wade: false, glide: false, swim: false,
    beak: 0, climb: false, dig: false, crow: 0, sneaky: false, brave: false, aggressive: false, skittish: false, curious: false, greedy: false, calm: false,
  };
  const a = { ...base, ...over };
  if (over.tiny) a.weight = 0;
  if (over.weight === 0) a.tiny = true;
  if (over.longLegs) { a.wade = true; a.reach = a.jump + 1; } else a.reach = a.jump;
  return a;
}
export const LOOK: ChickenLook = { bigWings: false, curly: false, silkie: false, rumpless: false, fluffy: false, webbed: false, diggerGene: false, boots: false, grippy: false };

export interface Harness {
  world: World;
  events: WorldEvent[];
  step(input?: Partial<Input>): void;
  /** Walk towards x, auto-jumping when blocked. Returns true if arrived. */
  walkTo(x: number, opts?: { maxT?: number; jump?: boolean; up?: boolean; holdJump?: boolean; flap?: boolean; hopFoxes?: boolean }): boolean;
  /** Jump while moving in a direction, holding the button, for t seconds. */
  leap(dir: 1 | -1, t?: number, opts?: { flap?: boolean; glide?: boolean; stopAt?: number }): void;
  peck(facing: 1 | -1, times?: number): void;
  wait(t: number): void;
  solved(id: string): WorldEvent | undefined;
  clues(): string[];
}

export function harness(a: Abilities, opts: { flags?: string[]; look?: Partial<ChickenLook>; spawnX?: number } = {}): Harness {
  const world = new World(FARM_LEVEL, { abilities: a, look: { ...LOOK, ...opts.look }, flags: opts.flags ?? [] });
  if (opts.spawnX !== undefined) world.chicken.x = opts.spawnX;
  const events: WorldEvent[] = [];
  const step = (input: Partial<Input> = {}) => {
    events.push(...world.step({ ...NO_INPUT, ...input }, DT));
  };
  const walkTo: Harness['walkTo'] = (x, o = {}) => {
    const maxT = o.maxT ?? 20;
    let blockedFor = 0;
    let lastX = world.chicken.x;
    let flapped = false;
    let hold = 0; // keep the jump button down for a moment after pressing, like a player does
    for (let t = 0; t < maxT; t += DT) {
      const c = world.chicken;
      const dir = x > c.x ? 1 : -1;
      if (Math.abs(c.x - x) < 4) {
        // Arrived: let the chicken land before handing control back.
        for (let w = 0; w < 1.5 && !(c.onGround || c.swimming || c.climbing); w += DT) step();
        return true;
      }
      const grounded = c.onGround || c.swimming;
      const blocked = Math.abs(c.x - lastX) < 0.2 && grounded;
      blockedFor = blocked ? blockedFor + DT : 0;
      lastX = c.x;
      const jumpNow = o.jump !== false && blocked && blockedFor > 0.15 && grounded;
      if (c.onGround) flapped = false;
      let flapNow = false;
      if (o.flap && !c.onGround && c.vy > -50 && !flapped) {
        flapNow = true;
        flapped = true;
      }
      let hopNow = false;
      let waitNow = false;
      if (o.hopFoxes && c.onGround) {
        for (const e of world.entities) {
          if (e.kind !== 'fox' || e.state === 'asleep' || Math.sign(e.x - c.x) !== dir) continue;
          const d = Math.abs(e.x - c.x);
          const facingMe = Math.sign(c.x - e.x) === e.facing;
          if (facingMe && d < (e.state === 'chase' ? 110 : 70)) hopNow = true;
          else if (!facingMe && d < 70) waitNow = true; // never hop onto a fox's back; follow it
        }
      }
      if (jumpNow || flapNow || hopNow) hold = 0.3;
      const jumpHeld = hold > 0 || (!!o.holdJump && !c.onGround);
      hold = Math.max(0, hold - DT);
      step({ right: !waitNow && dir > 0, left: !waitNow && dir < 0, up: !!o.up, jump: jumpHeld, jumpPressed: jumpNow || flapNow || hopNow });
      if (c.busyKind === 'caught' || c.busyKind === 'flounder') return false;
    }
    return false;
  };
  const leap: Harness['leap'] = (dir, t = 1.2, o = {}) => {
    let flapped = false;
    for (let w = 0; w < 1.5 && !(world.chicken.onGround || world.chicken.swimming); w += DT) step();
    step({ right: dir > 0, left: dir < 0, jump: true, jumpPressed: true });
    for (let s = 0; s < t; s += DT) {
      const c = world.chicken;
      let flapNow = false;
      if (o.flap && !c.onGround && c.vy > -50 && !flapped) {
        flapNow = true;
        flapped = true;
      }
      const held = s < 0.3 || flapNow || (!!o.glide && !c.onGround) || (flapped && s < 0.9);
      const go = o.stopAt === undefined || (dir > 0 ? c.x < o.stopAt : c.x > o.stopAt);
      step({ right: go && dir > 0, left: go && dir < 0, jump: held, jumpPressed: flapNow });
    }
  };
  const peck: Harness['peck'] = (facing, times = 4) => {
    for (let t = 0; t < 1 && !(world.chicken.onGround || world.chicken.swimming); t += DT) step();
    for (let i = 0; i < times; i++) {
      step({ right: facing > 0, left: facing < 0 });
      step({ action: true });
      for (let t = 0; t < 0.3; t += DT) step();
    }
  };
  const wait = (t: number) => { for (let s = 0; s < t; s += DT) step(); };
  return {
    world,
    events,
    step,
    walkTo,
    leap,
    peck,
    wait,
    solved: (id) => events.find((e) => e.type === 'missionSolved' && e.mission === id),
    clues: () => events.filter((e): e is Extract<WorldEvent, { type: 'clue' }> => e.type === 'clue').map((e) => e.id),
  };
}

