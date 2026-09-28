/**
 * Farm world data. Everything here is plain data so the level can be
 * authored in one file, simulated without a DOM, and drawn by the renderer.
 * Coordinates are world pixels; y grows downward; the main ground surface is
 * at GROUND_Y.
 */
export const GROUND_Y = 500;
export const WORLD_H = 600;
export const GRAVITY = 1500;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Decor =
  | 'grass'
  | 'dirt'
  | 'wood'
  | 'stone'
  | 'hedge'
  | 'barn'
  | 'barnInside'
  | 'house'
  | 'porch'
  | 'roof'
  | 'crate'
  | 'plank'
  | 'branch'
  | 'trunk'
  | 'fence'
  | 'underground'
  | 'invisible';

export interface Solid extends Rect {
  kind: 'solid';
  id?: string;
  /** Can be jumped through from below and landed on from above. */
  oneWay?: boolean;
  decor: Decor;
  /** Present only while this flag is set (e.g. the pond plank). */
  ifFlag?: string;
  /** Present only while this flag is NOT set (e.g. the cover over a hidden hole). */
  unlessFlag?: string;
}

/** A low opening. Passable only by chickens up to `maxWeight`; solid otherwise. */
export interface Gap extends Rect {
  kind: 'gap';
  id: string;
  maxWeight: number;
  /** Route recorded when a chicken passes through. */
  route?: { mission: string; method: string };
  /** Thought shown when a too-big chicken pushes into it. */
  clue?: { mission: string; id: string; text: string };
  /** Invisible and solid until this flag is set (used for hidden tunnels). */
  ifFlag?: string;
  /** Cosmetic: drawn as a pipe rather than a hole. */
  pipe?: boolean;
  /** Once this flag is set (e.g. a board broken above it) the opening is bigger. */
  openFlag?: string;
  openMaxWeight?: number;
}

export interface Water extends Rect {
  kind: 'water';
  id: string;
  deep: boolean;
  /** Where a floundering chicken is put back on land (near bank / far bank). */
  shore: { x: number; y: number };
  shore2?: { x: number; y: number };
  clue?: { mission: string; id: string; text: string };
  route?: { mission: string; method: string };
}

export interface Crate extends Rect {
  kind: 'crate';
  id: string;
  /** Strength needed to shove it. */
  weight: number;
  vx: number;
  vy: number;
  onGround: boolean;
  clue?: { mission: string; id: string; text: string };
}

export interface Board extends Rect {
  kind: 'board';
  id: string;
  /** Pecks or shoves it can take. */
  hp: number;
  maxHp: number;
  /** Strength that breaks it by shoving. */
  strength: number;
  /** Beak strength that lets pecks count. */
  beak: number;
  broken: boolean;
  route?: { mission: string; method: string };
  clue?: { mission: string; id: string; text: string };
  /** Flags set when broken (e.g. to unlock a gap beneath it). */
  sets?: string[];
}

export interface Plate extends Rect {
  kind: 'plate';
  id: string;
  needWeight: number;
  pressed: boolean;
  sets: string[];
  mission?: { id: string; method: string };
  clue?: { mission: string; id: string; text: string };
}

export interface Door extends Rect {
  kind: 'door';
  id: string;
  /** Flag that opens it. */
  flag: string;
  decor: Decor;
}

/** Something to peck: a bolt, latch, rope, sack, bell. */
export interface Target extends Rect {
  kind: 'target';
  id: string;
  label: string;
  /** Pecks needed. */
  pecks: number;
  done: boolean;
  sets: string[];
  mission?: { id: string; method?: string };
  clue?: { mission: string; id: string; text: string };
  /** Cosmetic type for the renderer. */
  look: 'bolt' | 'latch' | 'rope' | 'sack' | 'bell' | 'lever';
  /** Only usable once this flag is set. */
  ifFlag?: string;
}

export interface DigSpot extends Rect {
  kind: 'dig';
  id: string;
  to: { x: number; y: number };
  route?: { mission: string; method: string };
  clue?: { mission: string; id: string; text: string };
  /** Hidden until revealed (needs a curious chicken nearby, or the flag). */
  hiddenFlag?: string;
}

export interface Climbable extends Rect {
  kind: 'climb';
  id: string;
  decor: 'post' | 'trunk' | 'wall' | 'ladder' | 'trellis';
  route?: { mission: string; method: string };
  clue?: { mission: string; id: string; text: string };
}

export interface Fox {
  kind: 'fox';
  id: string;
  x: number;
  y: number;
  minX: number;
  maxX: number;
  facing: 1 | -1;
  state: 'patrol' | 'chase' | 'return' | 'flinch' | 'sulk' | 'asleep';
  timer: number;
  /** Time spent wanting to turn around; foxes take a moment. */
  turn: number;
  sight: number;
  patrolSpeed: number;
  chaseSpeed: number;
  /** Set once the mission is solved: the fox sleeps. */
  sleepFlag: string;
  mission: string;
}

export interface Crows extends Rect {
  kind: 'crows';
  id: string;
  count: number;
  /** 0 = settled, >0 = time left in the air. */
  airTime: number;
  fled: boolean;
  mission: string;
  sets: string[];
}

export interface Bush extends Rect {
  kind: 'bush';
  id: string;
}

export interface Corn {
  kind: 'corn';
  id: string;
  x: number;
  y: number;
  taken: boolean;
}

export interface MysteryEgg {
  kind: 'egg';
  id: string;
  x: number;
  y: number;
  taken: boolean;
}

export interface Checkpoint {
  kind: 'checkpoint';
  id: string;
  x: number;
  y: number;
}

export interface Zone extends Rect {
  kind: 'zone';
  id: string;
  /** Mission discovered when entered. */
  discover?: string;
  /** Route recorded when entered (first route recorded for a mission wins). */
  route?: { mission: string; method: string; ifAbility?: string };
  /** A thought shown on entering (once per outing), optionally only when a predicate fails. */
  clue?: { mission: string; id: string; text: string };
  /** Only trigger the clue for chickens lacking this: an ability id, or 'jump>=4' style. */
  clueUnless?: string;
  /** Set flags on entering (e.g. reveal hidden things for curious chickens). */
  sets?: string[];
  setsIf?: 'curious';
  /** Chicken exits the farm here. */
  exit?: boolean;
  /** Scares skittish chickens. */
  scary?: boolean;
  /** Only triggers while the chicken is standing on something. */
  onGroundOnly?: boolean;
  /** Farmer answers to a loud crow here. */
  bellCrow?: { mission: string };
}

export interface Hidden extends Rect {
  kind: 'hidden';
  id: string;
  /** Flag set when revealed. */
  flag: string;
  /** How close a curious chicken must be (px). */
  radius: number;
  text: string;
}

export type Entity = Solid | Gap | Water | Crate | Board | Plate | Door | Target | DigSpot | Climbable | Fox | Crows | Bush | Corn | MysteryEgg | Checkpoint | Zone | Hidden;

export interface LevelDef {
  id: string;
  name: string;
  width: number;
  spawn: { x: number; y: number };
  entities: Entity[];
  /** Background props for the renderer only. */
  props: Prop[];
}

export interface Prop {
  type: 'tree' | 'coop' | 'barnFront' | 'house' | 'bed' | 'scarecrow' | 'sign' | 'bush' | 'flowers' | 'rocks' | 'den' | 'well' | 'hay' | 'pondBed' | 'cloud';
  x: number;
  y: number;
  w?: number;
  h?: number;
  text?: string;
  variant?: number;
}

// ---------------------------------------------------------------------------
// Input & events
// ---------------------------------------------------------------------------

export interface Input {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  /** Jump held. */
  jump: boolean;
  /** Jump pressed this tick. */
  jumpPressed: boolean;
  /** Peck / interact pressed this tick. */
  action: boolean;
}

export const NO_INPUT: Input = { left: false, right: false, up: false, down: false, jump: false, jumpPressed: false, action: false };

export type WorldEvent =
  | { type: 'missionDiscovered'; mission: string }
  | { type: 'missionSolved'; mission: string; method: string }
  | { type: 'clue'; mission: string; id: string; text: string }
  | { type: 'lore'; id: string }
  | { type: 'thought'; text: string }
  | { type: 'corn'; id: string; amount: number }
  | { type: 'egg'; id: string }
  | { type: 'caught'; by: string }
  | { type: 'flounder' }
  | { type: 'checkpoint'; id: string }
  | { type: 'exit' }
  | { type: 'sfx'; name: 'jump' | 'flap' | 'peck' | 'crack' | 'splash' | 'crow' | 'land' | 'corn' | 'push' | 'dig' | 'fox' | 'caw' | 'bell' | 'unlock' };
