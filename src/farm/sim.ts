import type { Abilities } from '../genetics/abilities';
import { GRAVITY, GROUND_Y, NO_INPUT, type Board, type Crate, type Crows, type Entity, type Fox, type Input, type LevelDef, type Rect, type WorldEvent } from './types';

/**
 * The farm simulation. Pure: no DOM, fixed timestep, deterministic for a
 * given level, chicken and input sequence. The renderer reads from it; the
 * UI acts on the events it returns.
 */

/** Body facts the world needs that are not abilities (used for field notes). */
export interface ChickenLook {
  bigWings: boolean;
  curly: boolean;
  silkie: boolean;
  rumpless: boolean;
  fluffy: boolean;
  webbed: boolean;
  diggerGene: boolean;
  boots: boolean;
  /** Has the gripping toes, whether or not it can use them. */
  grippy: boolean;
}

export interface WorldOptions {
  abilities: Abilities;
  look: ChickenLook;
  /** World flags already set (doors already open). */
  flags?: Iterable<string>;
  solved?: Iterable<string>;
  cornTaken?: Iterable<string>;
  eggsTaken?: Iterable<string>;
  /** Field notes already learned (so they are not repeated). */
  lore?: Iterable<string>;
}

export type Anim = 'stand' | 'run' | 'jump' | 'fall' | 'glide' | 'swim' | 'climb' | 'dig' | 'peck' | 'crow' | 'caught' | 'flounder' | 'hide' | 'frozen';

export interface ChickenBody {
  x: number;
  /** Feet. */
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  facing: 1 | -1;
  onGround: boolean;
  coyote: number;
  flaps: number;
  gliding: boolean;
  swimming: boolean;
  wading: boolean;
  climbing: boolean;
  hidden: boolean;
  frozen: number;
  /** Animation state and a clock for it. */
  anim: Anim;
  animT: number;
  /** Busy timers: pecking, crowing, digging, caught, floundering. */
  busy: number;
  busyKind: 'none' | 'peck' | 'crow' | 'dig' | 'caught' | 'flounder';
  digTo: { x: number; y: number } | null;
  /** Distance run, for footstep animation. */
  odometer: number;
  /** Whether the chicken is currently pushing something. */
  pushing: boolean;
}

export const FOX_CHASE_SPEED = 235;

export function runSpeedFor(a: Abilities): number {
  return 110 + a.speed * 30;
}
export function jumpHeightFor(a: Abilities): number {
  return 44 + a.jump * 20;
}
export function bodySizeFor(a: Abilities): { w: number; h: number } {
  return { w: Math.round(22 + a.weight * 2.5), h: Math.round(24 + a.weight * 4 + (a.longLegs ? 14 : 0)) };
}

/** 'tiny' → boolean ability; 'jump>=4' → numeric comparison. */
export function hasAbility(a: Abilities, key: string): boolean {
  const m = /^(\w+)>=(\d+)$/.exec(key);
  const rec = a as unknown as Record<string, number | boolean>;
  if (m) return Number(rec[m[1]!] ?? 0) >= Number(m[2]);
  return !!rec[key];
}

const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

function cloneEntity<T extends Entity>(e: T): T {
  return JSON.parse(JSON.stringify(e)) as T;
}

export class World {
  readonly level: LevelDef;
  readonly entities: Entity[];
  readonly flags: Set<string>;
  readonly solved: Set<string>;
  readonly discovered = new Set<string>();
  readonly cluesShown = new Set<string>();
  readonly loreKnown: Set<string>;
  readonly cornTaken: Set<string>;
  readonly eggsTaken: Set<string>;
  readonly abilities: Abilities;
  readonly look: ChickenLook;
  readonly chicken: ChickenBody;
  /** Route the chicken used, per mission, for the solve record. */
  readonly routes: Record<string, string> = {};
  checkpoint: { x: number; y: number };
  time = 0;
  /** Whether the fox ever gave chase this outing. */
  chased = false;
  private events: WorldEvent[] = [];
  private lastInput: Input = NO_INPUT;
  private glideNoteGiven = false;
  private zonesInside = new Set<string>();
  /** Time spent shoving a board, by id. */
  private shoveTime: Record<string, number> = {};
  private idleCrow = 0;

  constructor(level: LevelDef, opts: WorldOptions) {
    this.level = level;
    this.entities = level.entities.map(cloneEntity);
    this.flags = new Set(opts.flags ?? []);
    this.solved = new Set(opts.solved ?? []);
    this.loreKnown = new Set(opts.lore ?? []);
    this.cornTaken = new Set(opts.cornTaken ?? []);
    this.eggsTaken = new Set(opts.eggsTaken ?? []);
    this.abilities = opts.abilities;
    this.look = opts.look;
    for (const e of this.entities) {
      if (e.kind === 'corn' && this.cornTaken.has(e.id)) e.taken = true;
      if (e.kind === 'egg' && this.eggsTaken.has(e.id)) e.taken = true;
      if (e.kind === 'target' && e.sets.every((f) => this.flags.has(f)) && e.sets.length > 0) e.done = true;
      if (e.kind === 'board' && e.sets && e.sets.length > 0 && e.sets.every((f) => this.flags.has(f))) e.broken = true;
      if (e.kind === 'crows' && e.sets.some((f) => this.flags.has(f))) e.fled = true;
      if (e.kind === 'fox' && this.flags.has(e.sleepFlag)) e.state = 'asleep';
    }
    const size = bodySizeFor(opts.abilities);
    this.chicken = {
      x: level.spawn.x,
      y: level.spawn.y,
      vx: 0,
      vy: 0,
      w: size.w,
      h: size.h,
      facing: 1,
      onGround: false,
      coyote: 0,
      flaps: 0,
      gliding: false,
      swimming: false,
      wading: false,
      climbing: false,
      hidden: false,
      frozen: 0,
      anim: 'stand',
      animT: 0,
      busy: 0,
      busyKind: 'none',
      digTo: null,
      odometer: 0,
      pushing: false,
    };
    this.checkpoint = { x: level.spawn.x, y: level.spawn.y };
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  get body(): Rect {
    const c = this.chicken;
    return { x: c.x - c.w / 2, y: c.y - c.h, w: c.w, h: c.h };
  }

  /** Where the beak is. */
  beak(): { x: number; y: number } {
    const c = this.chicken;
    return { x: c.x + c.facing * (c.w * 0.5 + 8), y: c.y - c.h * 0.72 };
  }

  private emit(e: WorldEvent) {
    this.events.push(e);
  }

  private clue(c: { mission: string; id: string; text: string } | undefined) {
    if (!c) return;
    const key = `${c.mission}:${c.id}`;
    if (this.cluesShown.has(key)) return;
    this.cluesShown.add(key);
    this.emit({ type: 'clue', mission: c.mission, id: c.id, text: c.text });
  }

  private lore(id: string) {
    if (this.loreKnown.has(id)) return;
    this.loreKnown.add(id);
    this.emit({ type: 'lore', id });
  }

  private setFlags(flags: string[] | undefined) {
    if (!flags) return;
    for (const f of flags) {
      if (!this.flags.has(f)) {
        this.flags.add(f);
        this.emit({ type: 'sfx', name: 'unlock' });
      }
    }
  }

  /** Record how a mission is being approached. The first route recorded wins. */
  private route(r: { mission: string; method: string; ifAbility?: string } | undefined) {
    if (!r || this.solved.has(r.mission) || this.routes[r.mission]) return;
    if (r.ifAbility && !hasAbility(this.abilities, r.ifAbility)) return;
    this.routes[r.mission] = r.method;
  }

  private solve(mission: string, method: string | undefined) {
    if (this.solved.has(mission)) return;
    this.solved.add(mission);
    let used = this.routes[mission] ?? method;
    if (mission === 'foxField' && !this.routes[mission]) used = this.chased ? 'outrun' : this.abilities.sneaky ? 'sneak' : 'timing';
    this.emit({ type: 'missionSolved', mission, method: used ?? 'unknown' });
  }

  private gapPassable(e: Extract<Entity, { kind: 'gap' }>): boolean {
    if (e.ifFlag && !this.flags.has(e.ifFlag)) return false;
    const max = e.openFlag && this.flags.has(e.openFlag) ? (e.openMaxWeight ?? 6) : e.maxWeight;
    return this.abilities.weight <= max;
  }

  /** Rectangles the chicken cannot pass through right now. */
  private colliders(): { rect: Rect; e: Entity | null; oneWay: boolean }[] {
    const out: { rect: Rect; e: Entity | null; oneWay: boolean }[] = [];
    for (const e of this.entities) {
      switch (e.kind) {
        case 'solid':
          if (e.ifFlag && !this.flags.has(e.ifFlag)) break;
          if (e.unlessFlag && this.flags.has(e.unlessFlag)) break;
          out.push({ rect: e, e, oneWay: !!e.oneWay });
          break;
        case 'door':
          if (!this.flags.has(e.flag)) out.push({ rect: e, e, oneWay: false });
          break;
        case 'gap':
          if (!this.gapPassable(e)) out.push({ rect: e, e, oneWay: false });
          break;
        case 'board':
          if (!e.broken) out.push({ rect: e, e, oneWay: false });
          break;
        case 'crate':
          out.push({ rect: e, e, oneWay: false });
          break;
        default:
          break;
      }
    }
    return out;
  }

  private cratesAsSolids(except: Crate | null): Rect[] {
    const out: Rect[] = [];
    for (const e of this.entities) {
      if (e.kind === 'solid' && (!e.ifFlag || this.flags.has(e.ifFlag)) && (!e.unlessFlag || !this.flags.has(e.unlessFlag)) && !e.oneWay) out.push(e);
      else if (e.kind === 'door' && !this.flags.has(e.flag)) out.push(e);
      else if (e.kind === 'board' && !e.broken) out.push(e);
      else if (e.kind === 'crate' && e !== except) out.push(e);
      else if (e.kind === 'gap' && !this.gapPassable(e)) out.push(e);
    }
    return out;
  }

  // -------------------------------------------------------------------------
  // Step
  // -------------------------------------------------------------------------

  step(input: Input, dt: number): WorldEvent[] {
    this.events = [];
    this.time += dt;
    const c = this.chicken;
    const a = this.abilities;
    c.animT += dt;
    const jumpPressed = input.jumpPressed || (input.jump && !this.lastInput.jump);
    const actionPressed = input.action;
    this.lastInput = input;

    // ---- busy states -----------------------------------------------------
    if (c.busy > 0) {
      c.busy -= dt;
      if (c.busyKind === 'dig' && c.busy <= 0 && c.digTo) {
        c.x = c.digTo.x;
        c.y = c.digTo.y;
        c.vx = 0;
        c.vy = 0;
        c.digTo = null;
      }
      if ((c.busyKind === 'caught' || c.busyKind === 'flounder') && c.busy <= 0) this.respawn();
      if (c.busy <= 0) {
        c.busyKind = 'none';
        c.anim = 'stand';
      } else {
        // A peck is quick and does not stop the world: momentum and gravity carry on.
        if (c.busyKind === 'peck') {
          if (!c.climbing && !c.swimming) c.vy += GRAVITY * dt;
          if (!c.onGround && !c.climbing) this.moveX(dt);
          else c.vx = 0;
          if (!c.climbing && !c.swimming) this.moveY(dt);
          if (c.onGround) c.coyote = 0.1;
        }
        this.updateCrates(dt);
        this.updateFoxes(dt);
        return this.events;
      }
    }
    if (c.frozen > 0) {
      c.frozen -= dt;
      c.anim = 'frozen';
      c.vx = 0;
      this.applyGravityAndMove(dt);
      this.updateCrates(dt);
      this.updateFoxes(dt);
      return this.events;
    }

    const run = runSpeedFor(a);
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (dir !== 0) c.facing = dir as 1 | -1;

    // ---- environment queries --------------------------------------------
    const body = this.body;
    const centre = { x: c.x, y: c.y - c.h * 0.5 };
    const inWater = this.entities.find((e): e is Extract<Entity, { kind: 'water' }> => e.kind === 'water' && centre.x >= e.x && centre.x <= e.x + e.w && c.y >= e.y + 4);
    const climbZone = a.climb ? this.entities.find((e): e is Extract<Entity, { kind: 'climb' }> => e.kind === 'climb' && overlaps(body, e)) : undefined;
    const bush = this.entities.find((e): e is Extract<Entity, { kind: 'bush' }> => e.kind === 'bush' && overlaps(body, e));

    // ---- hiding --------------------------------------------------------------
    c.hidden = !!bush && input.down && c.onGround && dir === 0;

    // ---- water ---------------------------------------------------------------
    c.swimming = false;
    c.wading = false;
    if (inWater) {
      if (inWater.deep) {
        if (a.swim) {
          c.swimming = true;
          this.route(inWater.route);
        } else {
          this.flounder(inWater);
          return this.events;
        }
      } else if (a.wade) {
        c.wading = true;
        this.route(inWater.route);
      } else if (a.swim) {
        c.swimming = true;
      } else {
        this.flounder(inWater);
        return this.events;
      }
    }

    // ---- climbing ------------------------------------------------------------
    c.climbing = false;
    if (climbZone && (input.up || (input.jump && !c.onGround) || (c.climbing && !c.onGround))) {
      c.climbing = true;
      this.route(climbZone.route);
    }
    if (climbZone && !c.onGround && !input.down && (input.jump || input.up)) c.climbing = true;

    // ---- horizontal ----------------------------------------------------------
    let speed = run;
    if (c.swimming) speed *= 0.7;
    if (c.wading) speed *= 0.55;
    if (c.climbing) speed *= 0.4;
    const target = dir * speed;
    const accel = c.onGround || c.climbing || c.swimming ? 2600 : 1500;
    if (target > c.vx) c.vx = Math.min(target, c.vx + accel * dt);
    else if (target < c.vx) c.vx = Math.max(target, c.vx - accel * dt);
    if (dir === 0 && Math.abs(c.vx) < 4) c.vx = 0;

    // ---- vertical ------------------------------------------------------------
    c.gliding = false;
    if (c.climbing) {
      c.vy = input.up ? -110 : input.down ? 110 : input.jump ? -110 : 0;
      c.flaps = a.glide ? 1 : 0;
      if (jumpPressed && dir !== 0) {
        c.climbing = false;
        c.vy = -Math.sqrt(2 * GRAVITY * jumpHeightFor(a) * 0.7);
        this.emit({ type: 'sfx', name: 'jump' });
      }
    } else if (c.swimming) {
      const surface = inWater!.y + c.h * 0.45;
      c.vy += (surface - c.y) * 12 * dt * 10;
      c.vy *= 0.85;
      if (jumpPressed) {
        c.vy = -Math.sqrt(2 * GRAVITY * jumpHeightFor(a) * 0.8);
        this.emit({ type: 'sfx', name: 'splash' });
      }
    } else {
      if (jumpPressed) {
        if (c.onGround || c.coyote > 0) {
          c.vy = -Math.sqrt(2 * GRAVITY * jumpHeightFor(a));
          c.onGround = false;
          c.coyote = 0;
          c.flaps = a.glide ? 1 : 0;
          this.emit({ type: 'sfx', name: 'jump' });
        } else if (c.flaps > 0) {
          c.vy = -Math.sqrt(2 * GRAVITY * jumpHeightFor(a) * 0.55);
          c.flaps -= 1;
          this.emit({ type: 'sfx', name: 'flap' });
        } else if (!a.glide && !this.glideNoteGiven) {
          this.noteWhyNoGlide();
        }
      }
      // Short hop: releasing early cuts the jump.
      if (!input.jump && c.vy < -200) c.vy = -200;
      // Glide: hold jump while falling.
      if (!c.onGround && c.vy > 0 && input.jump) {
        if (a.glide) {
          c.gliding = true;
          c.vy = Math.min(c.vy, 70);
          if (dir !== 0) c.vx = dir * Math.max(Math.abs(c.vx), run * 1.05, 200);
        } else if (!this.glideNoteGiven && c.vy > 250) {
          this.noteWhyNoGlide();
        }
      }
      c.vy += GRAVITY * dt;
      if (c.vy > 900) c.vy = 900;
    }

    // ---- move & collide -----------------------------------------------------
    const wasOnGround = c.onGround;
    this.moveX(dt);
    this.moveY(dt);
    if (c.onGround && !wasOnGround) this.emit({ type: 'sfx', name: 'land' });
    if (c.onGround) {
      c.coyote = 0.1;
      c.flaps = a.glide ? 1 : 0;
    } else c.coyote = Math.max(0, c.coyote - dt);
    if (c.onGround && dir !== 0) c.odometer += Math.abs(c.vx) * dt;
    // Passing through a low opening counts as a route.
    for (const e of this.entities) {
      if (e.kind === 'gap' && e.route && this.gapPassable(e) && overlaps(this.body, e)) this.route(e.route);
    }

    // ---- actions ---------------------------------------------------------
    if (actionPressed) this.act();

    // ---- pickups, zones, hidden things, mechanisms ------------------------
    this.checkPickups();
    this.checkZones();
    this.checkHidden();
    this.updatePlates();
    this.updateCrates(dt);
    this.updateCrows(dt);
    this.updateFoxes(dt);

    // ---- animation ------------------------------------------------------
    const prev = c.anim;
    if (c.busyKind !== 'none') {
      // set by act()
    } else if (c.hidden) c.anim = 'hide';
    else if (c.climbing) c.anim = 'climb';
    else if (c.swimming) c.anim = 'swim';
    else if (!c.onGround) c.anim = c.gliding ? 'glide' : c.vy < 0 ? 'jump' : 'fall';
    else if (Math.abs(c.vx) > 10) c.anim = 'run';
    else c.anim = 'stand';
    if (c.anim !== prev) c.animT = 0;
    return this.events;
  }

  private noteWhyNoGlide() {
    const l = this.look;
    this.glideNoteGiven = true;
    if (!l.bigWings) return;
    if (l.silkie) this.lore('silkieGrounded');
    else if (l.curly) this.lore('frizzleNoGlide');
    else if (l.rumpless) this.lore('rumplessNoGlide');
    else if (this.abilities.weight > 2) this.lore('heavyWings');
  }

  private applyGravityAndMove(dt: number) {
    const c = this.chicken;
    c.vy += GRAVITY * dt;
    this.moveX(dt);
    this.moveY(dt);
  }

  private moveX(dt: number) {
    const c = this.chicken;
    if (c.vx === 0) {
      c.pushing = false;
      return;
    }
    const dx = c.vx * dt;
    const next: Rect = { x: c.x - c.w / 2 + dx, y: c.y - c.h + 1, w: c.w, h: c.h - 2 };
    c.pushing = false;
    for (const col of this.colliders()) {
      if (col.oneWay) continue;
      if (!overlaps(next, col.rect)) continue;
      const e = col.e;
      if (e && e.kind === 'crate') {
        if (this.abilities.strength >= e.weight) {
          // Shove it along; it may be blocked itself.
          const pushed = this.pushCrate(e, dx * 0.85);
          if (pushed !== 0) {
            c.pushing = true;
            c.x += pushed;
            this.emit({ type: 'sfx', name: 'push' });
            return;
          }
        } else this.clue(e.clue);
      }
      if (e && e.kind === 'board' && !e.broken) {
        if (this.abilities.strength >= e.strength) {
          this.shoveTime[e.id] = (this.shoveTime[e.id] ?? 0) + dt;
          if ((this.shoveTime[e.id] ?? 0) > 0.45) this.breakBoard(e);
        } else this.clue(e.clue);
      }
      if (e && e.kind === 'gap') this.clue(e.clue);
      // Ledge assist: a lip no higher than the ankle is stepped onto, not bumped.
      if (col.rect.y >= c.y - 12 && col.rect.y < c.y && (c.onGround || c.climbing)) {
        const lifted: Rect = { x: next.x, y: col.rect.y - c.h + 1, w: c.w, h: c.h - 2 };
        const clear = this.colliders().every((o) => o.oneWay || !overlaps(lifted, o.rect));
        if (clear) {
          c.y = col.rect.y;
          c.x += dx;
          c.onGround = true;
          c.climbing = false;
          return;
        }
      }
      // Resolve.
      if (dx > 0) c.x = col.rect.x - c.w / 2 - 0.01;
      else c.x = col.rect.x + col.rect.w + c.w / 2 + 0.01;
      c.vx = 0;
      return;
    }
    c.x += dx;
    if (c.x < c.w / 2) {
      c.x = c.w / 2;
      c.vx = 0;
    }
    if (c.x > this.level.width - c.w / 2) {
      c.x = this.level.width - c.w / 2;
      c.vx = 0;
    }
  }

  private moveY(dt: number) {
    const c = this.chicken;
    const dy = c.vy * dt;
    const prevFeet = c.y;
    const next: Rect = { x: c.x - c.w / 2 + 2, y: c.y - c.h + dy, w: c.w - 4, h: c.h };
    c.onGround = false;
    let landed: { rect: Rect; e: Entity | null } | null = null;
    for (const col of this.colliders()) {
      if (!overlaps(next, col.rect)) continue;
      if (dy >= 0) {
        // Falling: land on top if we were above it.
        if (prevFeet <= col.rect.y + 1) {
          if (!landed || col.rect.y < landed.rect.y) landed = col;
        } else if (!col.oneWay) {
          // Overlapping from the side while falling: ignore (x resolved it).
        }
      } else if (!col.oneWay) {
        // Rising: bump head.
        const head = c.y - c.h + dy;
        if (head < col.rect.y + col.rect.h && prevFeet - c.h >= col.rect.y + col.rect.h - 1) {
          c.y = col.rect.y + col.rect.h + c.h;
          c.vy = 0;
          return;
        }
      }
    }
    if (landed) {
      c.y = landed.rect.y;
      c.vy = 0;
      c.onGround = true;
      return;
    }
    c.y += dy;
    // World floor: never fall out of the world.
    if (c.y > this.levelFloor()) {
      c.y = this.levelFloor();
      c.vy = 0;
      c.onGround = true;
    }
  }

  private levelFloor(): number {
    return GROUND_Y + 200;
  }

  // -------------------------------------------------------------------------
  // Crates & plates
  // -------------------------------------------------------------------------

  private pushCrate(crate: Crate, dx: number): number {
    const next: Rect = { x: crate.x + dx, y: crate.y + 1, w: crate.w, h: crate.h - 2 };
    for (const s of this.cratesAsSolids(crate)) {
      if (overlaps(next, s)) return 0;
    }
    if (next.x < 0 || next.x + next.w > this.level.width) return 0;
    crate.x += dx;
    return dx;
  }

  private updateCrates(dt: number) {
    for (const e of this.entities) {
      if (e.kind !== 'crate') continue;
      e.vy += GRAVITY * dt;
      const dy = e.vy * dt;
      const next: Rect = { x: e.x + 1, y: e.y + dy, w: e.w - 2, h: e.h };
      let landedY: number | null = null;
      for (const s of this.cratesAsSolids(e)) {
        if (overlaps(next, s) && e.y + e.h <= s.y + 1) landedY = landedY === null ? s.y : Math.min(landedY, s.y);
      }
      // One-way platforms hold crates too.
      for (const s of this.entities) {
        if (s.kind === 'solid' && s.oneWay && overlaps(next, s) && e.y + e.h <= s.y + 1) landedY = landedY === null ? s.y : Math.min(landedY, s.y);
      }
      if (landedY !== null) {
        e.y = landedY - e.h;
        e.vy = 0;
        e.onGround = true;
      } else {
        e.y += dy;
        e.onGround = false;
        if (e.y + e.h > this.levelFloor()) {
          e.y = this.levelFloor() - e.h;
          e.vy = 0;
          e.onGround = true;
        }
      }
    }
  }

  private updatePlates() {
    const c = this.chicken;
    for (const e of this.entities) {
      if (e.kind !== 'plate') continue;
      const zone: Rect = { x: e.x, y: e.y - 6, w: e.w, h: e.h + 6 };
      let weight = 0;
      const feet: Rect = { x: c.x - c.w / 2, y: c.y - 4, w: c.w, h: 6 };
      if (c.onGround && overlaps(feet, zone)) weight += this.abilities.weight;
      for (const k of this.entities) {
        if (k.kind === 'crate' && k.onGround && overlaps({ x: k.x, y: k.y + k.h - 4, w: k.w, h: 6 }, zone)) weight += 6;
      }
      const pressed = weight >= e.needWeight;
      if (pressed && !e.pressed) {
        e.pressed = true;
        this.setFlags(e.sets);
        this.emit({ type: 'sfx', name: 'unlock' });
        if (e.mission) {
          if (!this.routes[e.mission.id]) this.routes[e.mission.id] = weight > this.abilities.weight ? 'crate' : 'heavy';
          this.solve(e.mission.id, e.mission.method);
        }
      } else if (!pressed && e.pressed) {
        // Plates latch once pressed (the chute stays open). Nothing to do.
      }
      if (!pressed && c.onGround && overlaps(feet, zone) && weight < e.needWeight) this.clue(e.clue);
    }
  }

  private breakBoard(b: Board) {
    if (b.broken) return;
    b.broken = true;
    b.hp = 0;
    this.emit({ type: 'sfx', name: 'crack' });
    this.setFlags(b.sets);
    this.route(b.route);
  }

  // -------------------------------------------------------------------------
  // Actions: peck / dig / crow
  // -------------------------------------------------------------------------

  private act() {
    const c = this.chicken;
    const a = this.abilities;
    const beak = this.beak();
    // 1. Targets in reach.
    for (const e of this.entities) {
      if (e.kind !== 'target' || e.done) continue;
      if (e.ifFlag && !this.flags.has(e.ifFlag)) continue;
      const cx = Math.max(e.x, Math.min(beak.x, e.x + e.w));
      if (Math.abs(beak.x - cx) > 10) continue;
      if (beak.y > e.y + e.h + 4 || beak.y < e.y - 30) continue;
      this.peckAnim();
      e.pecks -= 1;
      this.emit({ type: 'sfx', name: 'peck' });
      if (e.pecks <= 0) {
        e.done = true;
        this.setFlags(e.sets);
        this.emit({ type: 'sfx', name: e.look === 'bell' ? 'bell' : 'unlock' });
        if (e.mission) this.solve(e.mission.id, e.mission.method);
      }
      return;
    }
    // 2. Boards.
    for (const e of this.entities) {
      if (e.kind !== 'board' || e.broken) continue;
      const near: Rect = { x: e.x - 14, y: e.y - 10, w: e.w + 28, h: e.h + 10 };
      if (!overlaps(this.body, near)) continue;
      this.peckAnim();
      if (a.beak >= e.beak) {
        e.hp -= 1;
        this.emit({ type: 'sfx', name: 'peck' });
        if (e.hp <= 0) this.breakBoard(e);
      } else {
        this.emit({ type: 'sfx', name: 'peck' });
        this.clue(e.clue);
      }
      return;
    }
    // 3. Dig spots.
    for (const e of this.entities) {
      if (e.kind !== 'dig') continue;
      if (e.hiddenFlag && !this.flags.has(e.hiddenFlag)) continue;
      if (!overlaps(this.body, { x: e.x, y: e.y - 10, w: e.w, h: e.h + 10 })) continue;
      if (a.dig) {
        c.busy = 0.9;
        c.busyKind = 'dig';
        c.anim = 'dig';
        c.animT = 0;
        c.digTo = e.to;
        c.vx = 0;
        this.route(e.route);
        this.emit({ type: 'sfx', name: 'dig' });
      } else {
        this.peckAnim();
        if (this.look.diggerGene && this.look.boots) this.lore('bootsNoDig');
        this.clue(e.clue);
      }
      return;
    }
    // 4. Climb clue: pecking at a post you cannot climb.
    for (const e of this.entities) {
      if (e.kind === 'climb' && !a.climb && overlaps(this.body, { x: e.x - 10, y: e.y, w: e.w + 20, h: e.h })) {
        this.peckAnim();
        if (this.look.silkie && this.look.grippy) this.lore('silkieNoClimb');
        this.clue(e.clue);
        return;
      }
    }
    // 5. Nothing to peck: crow (only with both feet on the ground).
    if (c.onGround && !c.climbing && !c.swimming) this.crow();
  }

  private peckAnim() {
    const c = this.chicken;
    c.busy = 0.18;
    c.busyKind = 'peck';
    c.anim = 'peck';
    c.animT = 0;
  }

  private crow() {
    const c = this.chicken;
    const a = this.abilities;
    c.busy = 0.55;
    c.busyKind = 'crow';
    c.anim = 'crow';
    c.animT = 0;
    c.vx = 0;
    this.idleCrow += 1;
    this.emit({ type: 'sfx', name: 'crow' });
    const radius = 120 + a.crow * 90;
    for (const e of this.entities) {
      if (e.kind === 'crows' && !e.fled && a.crow >= 2 && Math.abs(e.x + e.w / 2 - c.x) < radius) {
        this.route({ mission: e.mission, method: 'crow' });
        this.scatterCrows(e);
      }
      if (e.kind === 'zone' && e.bellCrow && overlaps(this.body, e)) {
        if (a.crow >= 3) {
          this.route({ mission: e.bellCrow.mission, method: 'crow' });
          this.setFlags(['farmerOut']);
          this.solve(e.bellCrow.mission, 'crow');
        } else if (this.idleCrow >= 2) {
          this.clue({ mission: e.bellCrow.mission, id: 'crowNotLoud', text: 'Crowing at the door. Nothing. A much louder chicken might get a reaction.' });
        }
      }
      if (e.kind === 'fox' && e.state === 'patrol' && Math.abs(e.x - c.x) < radius) {
        e.facing = c.x > e.x ? 1 : -1;
      }
    }
  }

  private scatterCrows(e: Crows) {
    e.fled = true;
    e.airTime = 2;
    this.setFlags(e.sets);
    this.emit({ type: 'sfx', name: 'caw' });
    this.solve(e.mission, this.routes[e.mission] ?? 'crow');
  }

  // -------------------------------------------------------------------------
  // Pickups, zones, hidden things
  // -------------------------------------------------------------------------

  private checkPickups() {
    const body = this.body;
    for (const e of this.entities) {
      if (e.kind === 'corn' && !e.taken && overlaps(body, { x: e.x - 8, y: e.y - 8, w: 16, h: 16 })) {
        e.taken = true;
        this.cornTaken.add(e.id);
        this.emit({ type: 'corn', id: e.id, amount: this.abilities.greedy ? 5 : 3 });
        this.emit({ type: 'sfx', name: 'corn' });
      }
      if (e.kind === 'egg' && !e.taken && overlaps(body, { x: e.x - 12, y: e.y - 16, w: 24, h: 20 })) {
        e.taken = true;
        this.eggsTaken.add(e.id);
        this.emit({ type: 'egg', id: e.id });
      }
      if (e.kind === 'checkpoint' && Math.abs(e.x - this.chicken.x) < 24 && Math.abs(e.y - this.chicken.y) < 30) {
        if (this.checkpoint.x !== e.x) {
          this.checkpoint = { x: e.x, y: e.y };
          this.emit({ type: 'checkpoint', id: e.id });
        }
      }
    }
  }

  private checkZones() {
    const body = this.body;
    const a = this.abilities;
    for (const e of this.entities) {
      if (e.kind !== 'zone') continue;
      const inside = overlaps(body, e) && (!e.onGroundOnly || this.chicken.onGround);
      const was = this.zonesInside.has(e.id);
      if (inside && !was) {
        this.zonesInside.add(e.id);
        if (e.discover && !this.discovered.has(e.discover)) {
          this.discovered.add(e.discover);
          this.emit({ type: 'missionDiscovered', mission: e.discover });
        }
        this.route(e.route);
        if (e.clue && (!e.clueUnless || !hasAbility(a, e.clueUnless))) this.clue(e.clue);
        if (e.sets && (!e.setsIf || (e.setsIf === 'curious' && a.curious))) {
          const fresh = e.sets.filter((f) => !this.flags.has(f));
          this.setFlags(e.sets);
          if (fresh.length && e.setsIf === 'curious') this.emit({ type: 'thought', text: 'Hm. What is that?' });
        }
        if (e.exit) this.emit({ type: 'exit' });
        if (e.scary && a.skittish) {
          this.chicken.frozen = 0.8;
          this.lore('skittishFreeze');
        }
      } else if (!inside && was) this.zonesInside.delete(e.id);
    }
  }

  private checkHidden() {
    if (!this.abilities.curious) return;
    const c = this.chicken;
    for (const e of this.entities) {
      if (e.kind !== 'hidden' || this.flags.has(e.flag)) continue;
      const cx = e.x + e.w / 2;
      const cy = e.y + e.h / 2;
      if (Math.hypot(cx - c.x, cy - (c.y - c.h / 2)) < e.radius) {
        this.flags.add(e.flag);
        this.emit({ type: 'thought', text: e.text });
        this.emit({ type: 'sfx', name: 'unlock' });
      }
    }
  }

  // -------------------------------------------------------------------------
  // Creatures
  // -------------------------------------------------------------------------

  private updateCrows(dt: number) {
    const c = this.chicken;
    const a = this.abilities;
    for (const e of this.entities) {
      if (e.kind !== 'crows') continue;
      if (e.airTime > 0) e.airTime -= dt;
      if (e.fled) continue;
      const dist = Math.abs(e.x + e.w / 2 - c.x);
      if (dist < 150) {
        if (a.aggressive) {
          this.route({ mission: e.mission, method: 'aggressive' });
          this.scatterCrows(e);
        } else if (a.brave && a.speed >= 3 && dist < 90 && Math.abs(c.vx) > 100) {
          this.route({ mission: e.mission, method: 'chase' });
          this.scatterCrows(e);
        } else {
          if (e.airTime <= 0) this.emit({ type: 'sfx', name: 'caw' });
          e.airTime = Math.max(e.airTime, 1.2);
          if (dist < 90) this.clue({ mission: e.mission, id: 'crowsReturn', text: 'They lift off and settle right back the moment I turn away. Something louder, or meaner, might convince them.' });
        }
      }
    }
  }

  private updateFoxes(dt: number) {
    const c = this.chicken;
    const a = this.abilities;
    for (const e of this.entities) {
      if (e.kind !== 'fox') continue;
      if (this.flags.has(e.sleepFlag)) e.state = 'asleep';
      if (e.state === 'asleep') continue;
      const dx = c.x - e.x;
      const dist = Math.abs(dx);
      const inField = c.x > e.minX - 60 && c.x < e.maxX + 60;
      // A sneaky chicken is never noticed; the fox only reacts if they actually collide.
      const sight = a.sneaky ? 0 : e.sight;
      const aboveGround = c.y > GROUND_Y - 120 && c.y <= GROUND_Y + 8;
      const visible = !c.hidden && inField && c.busyKind !== 'caught' && Math.sign(dx) === e.facing && dist < sight && aboveGround;
      /** Foxes take a moment to turn around; a chicken can use that. */
      const face = (want: 1 | -1) => {
        if (e.facing === want) {
          e.turn = 0;
          return;
        }
        e.turn += dt;
        if (e.turn > 0.25) {
          e.facing = want;
          e.turn = 0;
        }
      };
      switch (e.state) {
        case 'patrol': {
          e.x += e.facing * e.patrolSpeed * dt;
          if (e.x > e.maxX) e.facing = -1;
          if (e.x < e.minX) e.facing = 1;
          if (a.sneaky && !c.hidden && dist < (c.w + 20) / 2 && aboveGround && c.y > GROUND_Y - 34 && c.busyKind !== 'caught') {
            this.caught(e);
            break;
          }
          if (visible) {
            e.state = 'chase';
            e.turn = 0;
            this.chased = true;
            this.emit({ type: 'sfx', name: 'fox' });
            if (a.skittish) {
              c.frozen = 0.7;
              this.lore('skittishFreeze');
            }
          }
          break;
        }
        case 'chase': {
          face(dx > 0 ? 1 : -1);
          if (a.brave && a.strength >= 3 && dist < 70 && c.facing === -e.facing && c.onGround) {
            e.state = 'flinch';
            e.timer = 1.2;
            this.route({ mission: e.mission, method: 'brave' });
            this.emit({ type: 'thought', text: 'The fox reconsidered.' });
            break;
          }
          e.x += e.facing * e.chaseSpeed * dt;
          if (c.hidden || dist > 520 || !inField || !aboveGround) {
            e.state = 'return';
            break;
          }
          // Only a chicken on the ground can be grabbed; jumping over a fox is legal.
          if (dist < (c.w + 26) / 2 && c.y > GROUND_Y - 34 && c.busyKind !== 'caught') this.caught(e);
          break;
        }
        case 'flinch': {
          e.timer -= dt;
          e.x -= e.facing * 90 * dt;
          if (e.timer <= 0) {
            e.state = 'sulk';
            e.timer = 9;
          }
          break;
        }
        case 'sulk': {
          // Slinks back to the den at the far end and sulks there for a while.
          const den = e.maxX + 30;
          if (Math.abs(den - e.x) > 8) {
            e.facing = den > e.x ? 1 : -1;
            e.x += e.facing * e.patrolSpeed * 1.6 * dt;
          } else {
            e.timer -= dt;
            e.facing = -1;
            if (e.timer <= 0) e.state = 'patrol';
          }
          break;
        }
        case 'return': {
          const home = (e.minX + e.maxX) / 2;
          const d = home - e.x;
          e.facing = d > 0 ? 1 : -1;
          e.x += e.facing * e.patrolSpeed * 1.4 * dt;
          if (Math.abs(d) < 10) e.state = 'patrol';
          if (visible && !c.hidden) e.state = 'chase';
          break;
        }
        default:
          break;
      }
      e.x = Math.max(e.minX - 80, Math.min(e.maxX + 80, e.x));
    }
  }

  private caught(fox: Fox) {
    const c = this.chicken;
    c.busy = 1.1;
    c.busyKind = 'caught';
    c.anim = 'caught';
    c.animT = 0;
    c.vx = 0;
    c.vy = 0;
    fox.state = 'return';
    this.emit({ type: 'caught', by: fox.id });
    const why = this.abilities.speed >= 5 ? 'Nearly outran it. Nearly.' : 'The fox is faster than this chicken. Faster, sneakier or braver would help. Or a smaller way round.';
    this.clue({ mission: fox.mission, id: 'caught', text: why });
  }

  private flounder(water: Extract<Entity, { kind: 'water' }>) {
    const c = this.chicken;
    c.busy = 0.9;
    c.busyKind = 'flounder';
    c.anim = 'flounder';
    c.animT = 0;
    c.vx = 0;
    c.vy = 0;
    c.y = water.y + c.h * 0.6;
    this.emit({ type: 'flounder' });
    this.emit({ type: 'sfx', name: 'splash' });
    if (this.look.webbed && (this.look.fluffy || this.look.silkie)) this.lore('fluffySink');
    this.clue(water.clue);
    const far = water.shore2 && c.x > water.x + water.w / 2 ? water.shore2 : water.shore;
    this.respawnAt = { x: far.x, y: far.y };
  }
  /** One-off respawn point (a shore); otherwise the checkpoint is used. */
  private respawnAt: { x: number; y: number } | null = null;

  private respawn() {
    const c = this.chicken;
    const at = this.respawnAt ?? this.checkpoint;
    this.respawnAt = null;
    c.x = at.x;
    c.y = at.y;
    c.vx = 0;
    c.vy = 0;
    c.onGround = false;
    c.hidden = false;
  }

  // -------------------------------------------------------------------------
  // Queries for the UI
  // -------------------------------------------------------------------------

  /** Is there something the action button would peck right now? */
  actionHint(): string | null {
    const beak = this.beak();
    for (const e of this.entities) {
      if (e.kind !== 'target' || e.done) continue;
      if (e.ifFlag && !this.flags.has(e.ifFlag)) continue;
      const cx = Math.max(e.x, Math.min(beak.x, e.x + e.w));
      if (Math.abs(beak.x - cx) <= 10 && beak.y <= e.y + e.h + 4 && beak.y >= e.y - 30) return e.label;
    }
    for (const e of this.entities) {
      if (e.kind === 'board' && !e.broken && overlaps(this.body, { x: e.x - 14, y: e.y - 10, w: e.w + 28, h: e.h + 10 })) return 'Peck the board';
      if (e.kind === 'dig' && (!e.hiddenFlag || this.flags.has(e.hiddenFlag)) && overlaps(this.body, { x: e.x, y: e.y - 10, w: e.w, h: e.h + 10 })) return this.abilities.dig ? 'Dig' : 'Scratch';
    }
    return null;
  }
}
