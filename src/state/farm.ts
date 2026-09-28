import { BREEDS, BREED_BY_ID } from '../data/breeds';
import { createChickenFromBreed, viewOf, type Chicken } from '../chickens/chicken';
import { generateName } from '../chickens/naming';
import { createRng, freshSeed } from '../core/rng';
import { makeId } from '../core/ids';
import { abilitiesOf, type Abilities } from '../genetics/abilities';
import { MAIN_MISSIONS, MISSION_BY_ID, MISSIONS, type MissionDef } from '../farm/missions';
import type { World, ChickenLook } from '../farm/sim';
import type { WorldEvent } from '../farm/types';
import { chickenById, coopChickens, incubatorCapacity, takenNames } from './game';
import type { Egg, GameState, MissionProgress } from './types';

/**
 * Farm-side game rules: what an outing means for the save. The simulation
 * itself never touches state; it reports events and this module decides what
 * they are worth.
 */

export function currentMission(s: GameState): MissionDef | null {
  for (const m of MAIN_MISSIONS) {
    const p = s.farm.missions[m.id];
    if (!p || !p.solvedAt) return m;
  }
  return null;
}

export function missionProgress(s: GameState, id: string): MissionProgress | null {
  return s.farm.missions[id] ?? null;
}

export const missionSolved = (s: GameState, id: string) => !!s.farm.missions[id]?.solvedAt;
export const missionDiscovered = (s: GameState, id: string) => !!s.farm.missions[id];
export const solvedMissionIds = (s: GameState) => MISSIONS.filter((m) => missionSolved(s, m.id)).map((m) => m.id);
export const solvedMainCount = (s: GameState) => MAIN_MISSIONS.filter((m) => missionSolved(s, m.id)).length;

/** Chickens that can go out: anyone in the coop. */
export function outingCandidates(s: GameState): Chicken[] {
  return coopChickens(s);
}

export function lookOf(chicken: Chicken): ChickenLook {
  const p = viewOf(chicken).phenotype;
  return {
    bigWings: p.bigWings,
    curly: p.featherType === 'frizzle' || p.featherType === 'frazzle' || p.featherType === 'sizzle',
    silkie: p.featherType === 'silkie' || p.featherType === 'sizzle',
    rumpless: p.tail === 'rumpless',
    fluffy: p.density === 'fluffy' || p.density === 'cloud',
    webbed: p.webbed,
    diggerGene: p.digger,
    boots: p.legFeathering !== 'clean',
    grippy: p.gripGene + (p.toes === 5 ? 1 : 0) >= 2,
  };
}

export function abilitiesOfChicken(chicken: Chicken): Abilities {
  return abilitiesOf(viewOf(chicken).phenotype);
}

export function startOuting(s: GameState, chickenId: string): boolean {
  const c = chickenById(s, chickenId);
  if (!c || c.status !== 'coop') return false;
  s.farm.lastChickenId = chickenId;
  s.farm.outings += 1;
  return true;
}

export interface OutingReport {
  corn: number;
  solved: { mission: MissionDef; method: string }[];
  discovered: MissionDef[];
  clues: number;
  lore: string[];
  eggs: Egg[];
  /** Eggs found but left behind because the incubator was full. */
  eggsLeft: number;
}

export function emptyOutingReport(): OutingReport {
  return { corn: 0, solved: [], discovered: [], clues: 0, lore: [], eggs: [], eggsLeft: 0 };
}

/** Apply one world event to the save. Returns what the UI should shout about. */
export function applyFarmEvent(s: GameState, ev: WorldEvent, chicken: Chicken, report: OutingReport): void {
  const now = Date.now();
  switch (ev.type) {
    case 'missionDiscovered': {
      const def = MISSION_BY_ID[ev.mission];
      if (!def) return;
      const p = s.farm.missions[ev.mission];
      if (!p) {
        s.farm.missions[ev.mission] = { discoveredAt: now, solvedAt: null, chickenId: null, chickenName: null, method: null, attempts: 1 };
        report.discovered.push(def);
      } else if (!p.solvedAt) p.attempts += 1;
      return;
    }
    case 'missionSolved': {
      const def = MISSION_BY_ID[ev.mission];
      if (!def) return;
      const p = s.farm.missions[ev.mission] ?? { discoveredAt: now, solvedAt: null, chickenId: null, chickenName: null, method: null, attempts: 1 };
      if (p.solvedAt) return;
      p.solvedAt = now;
      p.chickenId = chicken.id;
      p.chickenName = chicken.name;
      p.method = ev.method;
      s.farm.missions[ev.mission] = p;
      s.corn += def.reward;
      report.corn += def.reward;
      report.solved.push({ mission: def, method: ev.method });
      s.log.push({ kind: 'mission', refId: ev.mission, chickenId: chicken.id, at: now, corn: def.reward });
      if (s.log.length > 100) s.log.splice(0, s.log.length - 100);
      return;
    }
    case 'clue': {
      const list = (s.farm.clues[ev.mission] ??= []);
      if (!list.includes(ev.id)) {
        list.push(ev.id);
        report.clues += 1;
      }
      // Make sure the mission exists on the board, even if its discover zone was skipped.
      if (!s.farm.missions[ev.mission] && MISSION_BY_ID[ev.mission]) {
        s.farm.missions[ev.mission] = { discoveredAt: now, solvedAt: null, chickenId: null, chickenName: null, method: null, attempts: 1 };
        report.discovered.push(MISSION_BY_ID[ev.mission]!);
      }
      return;
    }
    case 'lore': {
      if (!s.farm.lore[ev.id]) {
        s.farm.lore[ev.id] = now;
        report.lore.push(ev.id);
      }
      return;
    }
    case 'corn': {
      if (s.farm.cornTaken.includes(ev.id)) return;
      s.farm.cornTaken.push(ev.id);
      s.corn += ev.amount;
      report.corn += ev.amount;
      return;
    }
    case 'egg': {
      if (s.farm.eggsTaken.includes(ev.id)) return;
      const egg = foundEgg(s, ev.id);
      if (egg) {
        s.farm.eggsTaken.push(ev.id);
        report.eggs.push(egg);
      } else report.eggsLeft += 1;
      return;
    }
    default:
      return;
  }
}

/** Write the world's persistent bits (flags, corn, eggs) back into the save. */
export function finishOuting(s: GameState, world: World): void {
  const flags = new Set(s.farm.flags);
  for (const f of world.flags) flags.add(f);
  s.farm.flags = [...flags];
  for (const id of world.cornTaken) if (!s.farm.cornTaken.includes(id)) s.farm.cornTaken.push(id);
}

/**
 * A mystery egg found on the farm: an unknown hen's egg with a random breed
 * behind it, weighted towards breeds that bring useful genes. Returns null if
 * the incubator is full (the egg stays where it is).
 */
export function foundEgg(s: GameState, spotId: string): Egg | null {
  if (s.eggs.length >= incubatorCapacity(s)) return null;
  const rng = createRng(freshSeed());
  const useful = ['leghorn', 'ancona', 'hamburg', 'sebright', 'dutchbantam', 'serama', 'fayoumi', 'moderngame', 'spitzhauben', 'chantecler', 'dorking', 'icelandic', 'oeg', 'sumatra', 'lafleche', 'campine', 'nakedneck', 'swedishflower', 'java'];
  const pool = BREEDS.filter((b) => b.tier <= 3);
  const weights = pool.map((b) => (useful.includes(b.id) ? 4 : 1) * (s.discoveredBreeds[b.id] ? 0.5 : 1));
  const breed = rng.weighted(pool, weights) ?? BREED_BY_ID.leghorn!;
  const child = createChickenFromBreed(breed, rng, generateName(rng, takenNames(s)), 'found');
  const egg: Egg = { id: makeId('egg'), parents: ['wild', 'wild'], parentNames: ['A wild hen', 'nobody knows'], seed: freshSeed(), createdAt: Date.now(), child };
  s.eggs.push(egg);
  void spotId;
  return egg;
}

/** Discovered-but-unsolved missions, most recent first, for the board. */
export function openMissions(s: GameState): MissionDef[] {
  return MISSIONS.filter((m) => s.farm.missions[m.id] && !s.farm.missions[m.id]!.solvedAt).sort((a, b) => a.order - b.order);
}

export function missionClues(s: GameState, id: string): string[] {
  return s.farm.clues[id] ?? [];
}

/** How many of the main problems have been solved, as a fraction. */
export function farmProgress(s: GameState): number {
  return solvedMainCount(s) / MAIN_MISSIONS.length;
}
