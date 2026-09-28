import { GROUND_Y, WORLD_H, type Entity, type Prop, type Rect } from './types';
import type { World } from './sim';
import { drawSprite, type FrameName, type SpriteSet } from './sprites';

/**
 * Canvas renderer for the farm. Field-guide colours, ink outlines, and a
 * chicken drawn from its own illustration. The world is authored in pixels;
 * the camera scales it to whatever screen it lands on.
 */

export interface Camera {
  x: number;
  y: number;
  scale: number;
  viewW: number;
  viewH: number;
}

const INK = '#2b2118';
const PAL = {
  sky1: '#f6e9cf',
  sky2: '#cfe3e6',
  sun: '#f4d27a',
  hillFar: '#c9d3ae',
  hillNear: '#a9bb86',
  grass: '#8fb36a',
  grassDark: '#6f9450',
  dirt: '#b98a5c',
  dirtDark: '#8d6440',
  underground: '#4a3a30',
  wood: '#c99a5b',
  woodDark: '#8f6a35',
  hedge: '#5f8a4b',
  hedgeDark: '#3f6633',
  stone: '#a7a29a',
  stoneDark: '#6d6861',
  water: '#7fb6c9',
  waterDeep: '#5f9ab1',
  barn: '#b74a3a',
  barnDark: '#7d2f24',
  barnInside: '#8a5a3a',
  house: '#f3e6cf',
  houseDark: '#b9a583',
  roof: '#7a5238',
  metal: '#8c8f96',
  brass: '#d9a441',
  corn: '#f2c141',
  fox: '#d0703a',
  foxDark: '#8a4420',
  crow: '#2a2730',
  rope: '#c8a46a',
};

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
  gravity: number;
  kind: 'dot' | 'feather' | 'ring' | 'text';
  text?: string;
}

export interface ChickenDrawState {
  frame: FrameName;
  rot: number;
  squashX: number;
  squashY: number;
  alpha: number;
}

export function computeCamera(world: World, viewW: number, viewH: number, prev: Camera | null, dt: number): Camera {
  // Show about 420 world px vertically on phones, a bit more on wide screens.
  const targetRows = viewW > viewH ? 460 : 360;
  let scale = viewH / targetRows;
  scale = Math.max(0.85, Math.min(2.4, scale));
  const w = viewW / scale;
  const h = viewH / scale;
  const c = world.chicken;
  const lookAhead = Math.max(-80, Math.min(80, c.vx * 0.35)) + c.facing * 30;
  const portrait = viewH > viewW;
  let tx = c.x + lookAhead - w / 2;
  let ty = c.y - h * (portrait ? 0.72 : 0.64);
  tx = Math.max(0, Math.min(world.level.width - w, tx));
  ty = Math.max(-120, Math.min(WORLD_H - h + 40, ty));
  if (!prev || prev.scale !== scale) return { x: tx, y: ty, scale, viewW, viewH };
  const k = 1 - Math.exp(-dt * 6);
  const ky = 1 - Math.exp(-dt * 4);
  return { x: prev.x + (tx - prev.x) * k, y: prev.y + (ty - prev.y) * ky, scale, viewW, viewH };
}

export class FarmRenderer {
  private ctx: CanvasRenderingContext2D;
  private dpr = 1;
  private particles: Particle[] = [];
  private time = 0;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    this.ctx = ctx;
  }

  resize(w: number, h: number) {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.floor(w * this.dpr);
    this.canvas.height = Math.floor(h * this.dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
  }

  // -------------------------------------------------------------------------
  // Particles
  // -------------------------------------------------------------------------

  burst(x: number, y: number, kind: 'dust' | 'splash' | 'feathers' | 'dirt' | 'sparkle' | 'corn' | 'notes', n = 10) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 120;
      const base: Particle = { x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, life: 0, max: 0.5 + Math.random() * 0.4, color: '#c9bba3', size: 3, gravity: 300, kind: 'dot' };
      switch (kind) {
        case 'dust':
          base.vy = -Math.abs(base.vy) * 0.4;
          base.gravity = 80;
          break;
        case 'splash':
          base.color = PAL.water;
          base.vy = -Math.abs(base.vy) - 80;
          base.gravity = 600;
          break;
        case 'feathers':
          base.kind = 'feather';
          base.color = '#f5efe2';
          base.gravity = 60;
          base.max = 1.2;
          base.size = 5;
          break;
        case 'dirt':
          base.color = PAL.dirtDark;
          base.gravity = 700;
          break;
        case 'sparkle':
          base.kind = 'ring';
          base.color = PAL.brass;
          base.gravity = -20;
          base.max = 0.8;
          break;
        case 'corn':
          base.color = PAL.corn;
          base.gravity = 500;
          base.size = 2.5;
          break;
        case 'notes':
          base.kind = 'text';
          base.text = ['♪', '♫'][i % 2]!;
          base.color = INK;
          base.gravity = -120;
          base.vx *= 0.3;
          base.max = 1;
          break;
      }
      this.particles.push(base);
    }
  }

  floatText(x: number, y: number, text: string, color = INK) {
    this.particles.push({ x, y, vx: 0, vy: -50, life: 0, max: 1.1, color, size: 14, gravity: 0, kind: 'text', text });
  }

  private updateParticles(dt: number) {
    for (const p of this.particles) {
      p.life += dt;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === 'feather') p.vx += Math.sin(p.life * 9) * 60 * dt;
    }
    this.particles = this.particles.filter((p) => p.life < p.max);
  }

  // -------------------------------------------------------------------------
  // Main draw
  // -------------------------------------------------------------------------

  draw(world: World, cam: Camera, sprites: SpriteSet, chick: ChickenDrawState, dt: number) {
    this.time += dt;
    this.updateParticles(dt);
    const ctx = this.ctx;
    const { dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.drawSky(cam);
    ctx.setTransform(dpr * cam.scale, 0, 0, dpr * cam.scale, -cam.x * dpr * cam.scale, -cam.y * dpr * cam.scale);
    const view: Rect = { x: cam.x - 60, y: cam.y - 60, w: cam.viewW / cam.scale + 120, h: cam.viewH / cam.scale + 120 };
    const visible = (r: Rect) => r.x < view.x + view.w && r.x + r.w > view.x && r.y < view.y + view.h && r.y + r.h > view.y;

    this.drawBackdrop(world, cam);
    for (const p of world.level.props) this.drawPropBack(p, world, visible);

    // Ground & structure
    for (const e of world.entities) {
      if (e.kind === 'solid' && visible(e)) this.drawSolid(e, world);
    }
    for (const e of world.entities) {
      if (!('x' in e)) continue;
      switch (e.kind) {
        case 'water': if (visible(e)) this.drawWater(e); break;
        case 'gap': if (visible(e)) this.drawGap(e, world); break;
        case 'door': if (visible(e)) this.drawDoor(e, world); break;
        case 'board': if (visible(e)) this.drawBoard(e); break;
        case 'plate': if (visible(e)) this.drawPlate(e); break;
        case 'dig': if (visible(e)) this.drawDig(e, world); break;
        case 'climb': if (visible(e)) this.drawClimb(e); break;
        case 'crate': if (visible(e)) this.drawCrate(e); break;
        case 'target': if (visible(e)) this.drawTarget(e, world); break;
        case 'checkpoint': if (visible({ x: e.x - 20, y: e.y - 40, w: 40, h: 40 })) this.drawCheckpoint(e, world); break;
        case 'corn': if (!e.taken && visible({ x: e.x - 10, y: e.y - 10, w: 20, h: 20 })) this.drawCorn(e); break;
        case 'egg': if (!e.taken && visible({ x: e.x - 20, y: e.y - 30, w: 40, h: 30 })) this.drawEgg(e); break;
        case 'crows': if (visible({ x: e.x - 100, y: e.y - 200, w: e.w + 200, h: e.h + 200 })) this.drawCrows(e, world); break;
        default: break;
      }
    }
    for (const p of world.level.props) this.drawPropFront(p, world, visible);
    // Bushes behind the chicken unless it is hiding in one.
    for (const e of world.entities) if (e.kind === 'bush' && !world.chicken.hidden && visible(e)) this.drawBush(e);
    for (const e of world.entities) if (e.kind === 'fox') this.drawFox(e, world);

    this.drawChicken(world, sprites, chick);

    for (const e of world.entities) if (e.kind === 'bush' && world.chicken.hidden && visible(e)) this.drawBush(e);
    this.drawParticles();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // -------------------------------------------------------------------------
  // Backdrop
  // -------------------------------------------------------------------------

  private drawSky(cam: Camera) {
    const ctx = this.ctx;
    const g = ctx.createLinearGradient(0, 0, 0, cam.viewH);
    g.addColorStop(0, PAL.sky2);
    g.addColorStop(0.7, PAL.sky1);
    g.addColorStop(1, '#efdcb8');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cam.viewW, cam.viewH);
    // sun
    const sx = cam.viewW * 0.8 - cam.x * 0.02;
    const sy = 70 - cam.y * 0.1;
    ctx.fillStyle = PAL.sun;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(sx, sy, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  private drawBackdrop(world: World, cam: Camera) {
    const ctx = this.ctx;
    const horizon = GROUND_Y;
    // Far hills (parallax 0.25)
    const layers: { color: string; par: number; amp: number; freq: number; base: number }[] = [
      { color: PAL.hillFar, par: 0.25, amp: 40, freq: 0.004, base: horizon - 120 },
      { color: PAL.hillNear, par: 0.5, amp: 26, freq: 0.007, base: horizon - 60 },
    ];
    for (const l of layers) {
      const off = cam.x * (1 - l.par);
      ctx.fillStyle = l.color;
      ctx.beginPath();
      const x0 = cam.x - 40;
      const x1 = cam.x + cam.viewW / cam.scale + 40;
      ctx.moveTo(x0, horizon + 400);
      for (let x = x0; x <= x1; x += 24) {
        const wx = x + off;
        ctx.lineTo(x, l.base + Math.sin(wx * l.freq) * l.amp + Math.sin(wx * l.freq * 2.7 + 1) * l.amp * 0.4);
      }
      ctx.lineTo(x1, horizon + 400);
      ctx.closePath();
      ctx.fill();
    }
    // A line of distant trees along the near hills (parallax 0.6)
    {
      const par = 0.6;
      const off = cam.x * (1 - par);
      const x0 = cam.x - 80;
      const x1 = cam.x + cam.viewW / cam.scale + 80;
      const start = Math.floor((x0 + off) / 90) * 90;
      for (let wx = start; wx <= x1 + off; wx += 90) {
        const x = wx - off;
        const k = ((wx * 13) % 7) / 7;
        const ty = horizon - 60 + Math.sin(wx * 0.007) * 26 + Math.sin(wx * 0.019 + 1) * 10;
        const r = 16 + k * 10;
        ctx.fillStyle = k > 0.5 ? '#86a466' : '#7b9a5d';
        ctx.beginPath();
        ctx.arc(x, ty - r - 6, r, 0, Math.PI * 2);
        ctx.arc(x - r * 0.7, ty - r * 0.6 - 4, r * 0.75, 0, Math.PI * 2);
        ctx.arc(x + r * 0.7, ty - r * 0.6 - 4, r * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#6f5238';
        ctx.fillRect(x - 2.5, ty - 10, 5, 12);
      }
    }
    // Back fence along the yard, behind everything (parallax 0.85)
    {
      const par = 0.85;
      const off = cam.x * (1 - par);
      const x0 = cam.x - 80;
      const x1 = cam.x + cam.viewW / cam.scale + 80;
      const start = Math.floor((x0 + off) / 34) * 34;
      ctx.fillStyle = 'rgba(240, 228, 200, 0.9)';
      ctx.fillRect(x0, horizon - 30, x1 - x0, 4);
      ctx.fillRect(x0, horizon - 16, x1 - x0, 4);
      for (let wx = start; wx <= x1 + off; wx += 34) {
        const x = wx - off;
        ctx.fillRect(x, horizon - 40, 6, 40);
      }
    }
    // Grass strip at ground level
    ctx.fillStyle = '#9ec07a';
    ctx.fillRect(cam.x - 40, horizon - 14, cam.viewW / cam.scale + 80, 14);
    void world;
  }

  // -------------------------------------------------------------------------
  // Structures
  // -------------------------------------------------------------------------

  private ink(w = 1.4) {
    this.ctx.strokeStyle = INK;
    this.ctx.lineWidth = w;
    this.ctx.lineJoin = 'round';
    this.ctx.lineCap = 'round';
  }

  private box(x: number, y: number, w: number, h: number, fill: string, stroke = true, r = 0) {
    const ctx = this.ctx;
    ctx.fillStyle = fill;
    ctx.beginPath();
    if (r > 0) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
    ctx.fill();
    if (stroke) {
      this.ink();
      ctx.stroke();
    }
  }

  private drawSolid(e: Extract<Entity, { kind: 'solid' }>, world: World) {
    if (e.ifFlag && !world.flags.has(e.ifFlag)) return;
    if (e.unlessFlag && world.flags.has(e.unlessFlag)) return;
    const ctx = this.ctx;
    switch (e.decor) {
      case 'grass': {
        this.box(e.x, e.y, e.w, e.h, PAL.dirt, false);
        ctx.fillStyle = PAL.grass;
        ctx.fillRect(e.x, e.y, e.w, 12);
        ctx.fillStyle = PAL.grassDark;
        for (let x = e.x + 6; x < e.x + e.w - 4; x += 22) {
          const hh = 5 + ((x * 7) % 5);
          ctx.beginPath();
          ctx.moveTo(x, e.y + 12);
          ctx.lineTo(x + 3, e.y - hh);
          ctx.lineTo(x + 6, e.y + 12);
          ctx.fill();
        }
        this.ink(1.2);
        ctx.beginPath();
        ctx.moveTo(e.x, e.y + 0.5);
        ctx.lineTo(e.x + e.w, e.y + 0.5);
        ctx.stroke();
        break;
      }
      case 'dirt':
        this.box(e.x, e.y, e.w, e.h, PAL.dirt, false);
        ctx.fillStyle = PAL.dirtDark;
        for (let x = e.x + 8; x < e.x + e.w; x += 30) ctx.fillRect(x, e.y + 6 + ((x * 3) % 9), 5, 3);
        this.ink(1.2);
        ctx.beginPath();
        ctx.moveTo(e.x, e.y + 0.5);
        ctx.lineTo(e.x + e.w, e.y + 0.5);
        ctx.stroke();
        break;
      case 'underground':
        this.box(e.x, e.y, e.w, e.h, PAL.underground, false);
        ctx.fillStyle = '#5a4a3f';
        for (let x = e.x + 10; x < e.x + e.w; x += 26) ctx.fillRect(x, e.y + 8 + ((x * 5) % 14), 6, 4);
        break;
      case 'wood':
        this.box(e.x, e.y, e.w, e.h, PAL.wood, true, 3);
        ctx.strokeStyle = PAL.woodDark;
        ctx.lineWidth = 1;
        for (let y = e.y + 10; y < e.y + e.h - 4; y += 10) {
          ctx.beginPath();
          ctx.moveTo(e.x + 3, y);
          ctx.lineTo(e.x + e.w - 3, y);
          ctx.stroke();
        }
        break;
      case 'crate':
        this.drawCrateBox(e.x, e.y, e.w, e.h);
        break;
      case 'plank':
        this.box(e.x, e.y, e.w, e.h, PAL.wood, true, 2);
        ctx.strokeStyle = PAL.woodDark;
        ctx.lineWidth = 1;
        for (let x = e.x + 30; x < e.x + e.w; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, e.y + 2);
          ctx.lineTo(x, e.y + e.h - 2);
          ctx.stroke();
        }
        break;
      case 'stone':
        this.box(e.x, e.y, e.w, e.h, PAL.stone, true, 6);
        ctx.fillStyle = PAL.stoneDark;
        ctx.fillRect(e.x + 4, e.y + e.h * 0.4, e.w * 0.4, 3);
        break;
      case 'hedge': {
        ctx.fillStyle = PAL.hedge;
        ctx.beginPath();
        ctx.roundRect(e.x, e.y, e.w, e.h, 14);
        ctx.fill();
        ctx.fillStyle = PAL.hedgeDark;
        for (let i = 0; i < 18; i++) {
          const px = e.x + 8 + ((i * 37) % (e.w - 16));
          const py = e.y + 10 + ((i * 53) % (e.h - 20));
          ctx.beginPath();
          ctx.arc(px, py, 6, 0, Math.PI * 2);
          ctx.fill();
        }
        this.ink();
        ctx.beginPath();
        ctx.roundRect(e.x, e.y, e.w, e.h, 14);
        ctx.stroke();
        break;
      }
      case 'fence':
        this.drawPicket(e.x, e.y, e.w, e.h);
        break;
      case 'barn':
        this.box(e.x, e.y, e.w, e.h, PAL.barn, true);
        ctx.strokeStyle = PAL.barnDark;
        ctx.lineWidth = 1;
        for (let y = e.y + 12; y < e.y + e.h; y += 14) {
          ctx.beginPath();
          ctx.moveTo(e.x + 2, y);
          ctx.lineTo(e.x + e.w - 2, y);
          ctx.stroke();
        }
        break;
      case 'barnInside':
        this.box(e.x, e.y, e.w, e.h, PAL.barnInside, false);
        break;
      case 'house':
        this.box(e.x, e.y, e.w, e.h, PAL.house, true);
        // a door and a window on the wall
        this.box(e.x + 10, e.y + e.h - 90, 40, 90, PAL.roof, true, 3);
        ctx.fillStyle = PAL.brass;
        ctx.beginPath();
        ctx.arc(e.x + 44, e.y + e.h - 44, 2.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'porch':
        this.box(e.x, e.y, e.w, e.h, PAL.wood, true, 2);
        ctx.strokeStyle = PAL.woodDark;
        ctx.lineWidth = 1;
        for (let x = e.x + 16; x < e.x + e.w; x += 16) {
          ctx.beginPath();
          ctx.moveTo(x, e.y + 2);
          ctx.lineTo(x, e.y + e.h - 2);
          ctx.stroke();
        }
        break;
      case 'roof':
        this.box(e.x, e.y, e.w, e.h, PAL.roof, true, 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth = 1;
        for (let x = e.x + 12; x < e.x + e.w; x += 18) {
          ctx.beginPath();
          ctx.moveTo(x, e.y + 1);
          ctx.lineTo(x, e.y + e.h - 1);
          ctx.stroke();
        }
        break;
      case 'branch':
        this.box(e.x, e.y + 2, e.w, e.h - 2, PAL.woodDark, true, 4);
        break;
      case 'invisible':
        break;
      default:
        this.box(e.x, e.y, e.w, e.h, PAL.wood);
    }
  }

  private drawPicket(x: number, y: number, w: number, h: number) {
    const ctx = this.ctx;
    const cols = Math.max(1, Math.round(w / 16));
    const pw = w / cols;
    for (let i = 0; i < cols; i++) {
      const px = x + i * pw + pw * 0.15;
      this.box(px, y + 4, pw * 0.7, h - 4, '#f2e8d2', true, 2);
      ctx.fillStyle = '#f2e8d2';
      ctx.beginPath();
      ctx.moveTo(px, y + 4);
      ctx.lineTo(px + pw * 0.35, y - 4);
      ctx.lineTo(px + pw * 0.7, y + 4);
      ctx.fill();
      this.ink();
      ctx.stroke();
    }
    ctx.fillStyle = '#e4d6b8';
    ctx.fillRect(x, y + h * 0.3, w, 5);
    ctx.fillRect(x, y + h * 0.7, w, 5);
  }

  private drawCrateBox(x: number, y: number, w: number, h: number) {
    const ctx = this.ctx;
    this.box(x, y, w, h, PAL.wood, true, 2);
    this.ink(1.2);
    ctx.beginPath();
    ctx.moveTo(x + 3, y + 3);
    ctx.lineTo(x + w - 3, y + h - 3);
    ctx.moveTo(x + w - 3, y + 3);
    ctx.lineTo(x + 3, y + h - 3);
    ctx.stroke();
  }

  private drawCrate(e: Extract<Entity, { kind: 'crate' }>) {
    this.drawCrateBox(e.x, e.y, e.w, e.h);
  }

  private drawWater(e: Extract<Entity, { kind: 'water' }>) {
    const ctx = this.ctx;
    ctx.fillStyle = e.deep ? PAL.waterDeep : PAL.water;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(e.x, e.y, e.w, e.h);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = e.x; x <= e.x + e.w; x += 6) {
      const y = e.y + 2 + Math.sin(x * 0.08 + this.time * 3) * 1.6;
      if (x === e.x) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  private drawGap(e: Extract<Entity, { kind: 'gap' }>, world: World) {
    if (e.ifFlag && !world.flags.has(e.ifFlag)) return;
    const ctx = this.ctx;
    if (e.pipe) {
      this.box(e.x - 2, e.y - 3, e.w + 4, e.h + 6, PAL.metal, true, 4);
      ctx.fillStyle = '#5b5e66';
      ctx.fillRect(e.x, e.y, e.w, e.h);
      return;
    }
    const open = e.openFlag && world.flags.has(e.openFlag);
    ctx.fillStyle = '#3a2d24';
    ctx.beginPath();
    ctx.roundRect(e.x, e.y - (open ? 20 : 0), e.w, e.h + (open ? 20 : 0), [10, 10, 0, 0]);
    ctx.fill();
  }

  private drawDoor(e: Extract<Entity, { kind: 'door' }>, world: World) {
    const ctx = this.ctx;
    const open = world.flags.has(e.flag);
    if (e.decor === 'fence') {
      if (open) {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.transform(0.25, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 0.75;
        this.drawPicket(-e.w * 4, 0, e.w * 4, e.h);
        ctx.restore();
      } else this.drawPicket(e.x, e.y, e.w, e.h);
      return;
    }
    if (open) {
      // doorway, with the door swung inward as a thin slab
      ctx.fillStyle = '#3a2d24';
      ctx.fillRect(e.x, e.y, e.w, e.h);
      this.box(e.x + e.w, e.y, 6, e.h, PAL.woodDark, true, 1);
      return;
    }
    this.box(e.x, e.y, e.w, e.h, PAL.woodDark, true, 2);
    ctx.strokeStyle = PAL.wood;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(e.x + 3, e.y + 3);
    ctx.lineTo(e.x + e.w - 3, e.y + e.h - 3);
    ctx.stroke();
  }

  private drawBoard(e: Extract<Entity, { kind: 'board' }>) {
    const ctx = this.ctx;
    if (e.broken) {
      ctx.fillStyle = PAL.woodDark;
      ctx.fillRect(e.x - 8, e.y + e.h - 3, 10, 3);
      ctx.fillRect(e.x + e.w - 2, e.y + e.h - 4, 12, 3);
      return;
    }
    const wobble = e.hp < e.maxHp ? (e.maxHp - e.hp) * 1.5 : 0;
    this.box(e.x - wobble, e.y, e.w + wobble * 2, e.h, PAL.wood, true, 1);
    ctx.fillStyle = INK;
    ctx.fillRect(e.x + 3, e.y + 4, 2, 2);
    ctx.fillRect(e.x + e.w - 5, e.y + e.h - 6, 2, 2);
    if (e.hp < e.maxHp) {
      this.ink(1);
      ctx.beginPath();
      ctx.moveTo(e.x + 4, e.y + 2);
      ctx.lineTo(e.x + e.w / 2, e.y + e.h / 2);
      ctx.lineTo(e.x + e.w - 4, e.y + e.h - 2);
      ctx.stroke();
    }
  }

  private drawPlate(e: Extract<Entity, { kind: 'plate' }>) {
    const y = e.pressed ? e.y + 3 : e.y;
    this.box(e.x, y, e.w, e.h + (e.pressed ? -3 : 0), e.pressed ? '#6f7378' : PAL.metal, true, 2);
    const ctx = this.ctx;
    ctx.fillStyle = e.pressed ? '#9fd27a' : '#e0b04c';
    ctx.beginPath();
    ctx.arc(e.x + e.w / 2, y + 1.5, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawDig(e: Extract<Entity, { kind: 'dig' }>, world: World) {
    if (e.hiddenFlag && !world.flags.has(e.hiddenFlag)) return;
    const ctx = this.ctx;
    ctx.fillStyle = PAL.dirtDark;
    ctx.beginPath();
    ctx.ellipse(e.x + e.w / 2, e.y + e.h, e.w / 2, 7, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#d9c7a8';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(e.x + 8 + (i * (e.w - 16)) / 3, e.y + e.h - 3 - (i % 2) * 3, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawClimb(e: Extract<Entity, { kind: 'climb' }>) {
    const ctx = this.ctx;
    switch (e.decor) {
      case 'post':
        this.box(e.x + 3, e.y, e.w - 6, e.h, PAL.woodDark, true, 2);
        ctx.strokeStyle = PAL.wood;
        ctx.lineWidth = 1.5;
        for (let y = e.y + 10; y < e.y + e.h; y += 16) {
          ctx.beginPath();
          ctx.moveTo(e.x + 5, y);
          ctx.lineTo(e.x + e.w - 5, y + 4);
          ctx.stroke();
        }
        break;
      case 'ladder':
        this.ink(2);
        ctx.beginPath();
        ctx.moveTo(e.x + 3, e.y);
        ctx.lineTo(e.x + 3, e.y + e.h);
        ctx.moveTo(e.x + e.w - 3, e.y);
        ctx.lineTo(e.x + e.w - 3, e.y + e.h);
        for (let y = e.y + 8; y < e.y + e.h; y += 14) {
          ctx.moveTo(e.x + 3, y);
          ctx.lineTo(e.x + e.w - 3, y);
        }
        ctx.strokeStyle = PAL.woodDark;
        ctx.stroke();
        break;
      case 'trellis': {
        ctx.strokeStyle = '#e9dcc3';
        ctx.lineWidth = 1.5;
        for (let y = e.y; y < e.y + e.h; y += 12) {
          ctx.beginPath();
          ctx.moveTo(e.x, y);
          ctx.lineTo(e.x + e.w, y + 12);
          ctx.moveTo(e.x + e.w, y);
          ctx.lineTo(e.x, y + 12);
          ctx.stroke();
        }
        for (let i = 0; i < 7; i++) {
          ctx.fillStyle = i % 2 ? '#d9534f' : '#5f8a4b';
          ctx.beginPath();
          ctx.arc(e.x + 4 + ((i * 11) % (e.w - 6)), e.y + 10 + i * (e.h / 7), i % 2 ? 3.5 : 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'wall':
        ctx.strokeStyle = 'rgba(43,33,24,0.25)';
        ctx.lineWidth = 1;
        for (let y = e.y + 8; y < e.y + e.h; y += 12) {
          ctx.beginPath();
          ctx.moveTo(e.x + 4, y);
          ctx.lineTo(e.x + e.w - 4, y - 3);
          ctx.stroke();
        }
        break;
      case 'trunk':
        // drawn by the tree prop
        break;
    }
  }

  private drawTarget(e: Extract<Entity, { kind: 'target' }>, world: World) {
    const ctx = this.ctx;
    const glow = !e.done && (!e.ifFlag || world.flags.has(e.ifFlag));
    if (glow) {
      ctx.fillStyle = 'rgba(217,164,65,0.22)';
      ctx.beginPath();
      ctx.arc(e.x + e.w / 2, e.y + e.h / 2, 16 + Math.sin(this.time * 4) * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    switch (e.look) {
      case 'sack':
        this.box(e.x - 2, e.y + 4, e.w + 4, e.h - 4, '#e6d3ad', true, 6);
        ctx.fillStyle = INK;
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('FEED', e.x + e.w / 2, e.y + e.h * 0.66);
        if (e.done) {
          ctx.fillStyle = PAL.corn;
          for (let i = 0; i < 6; i++) {
            ctx.beginPath();
            ctx.arc(e.x - 4 + i * 7, e.y + e.h + 2 - (i % 2) * 3, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          ctx.fillStyle = '#c8b58e';
          ctx.fillRect(e.x + 4, e.y + 2, e.w - 8, 5);
        }
        break;
      case 'bolt':
        this.box(e.x, e.y + e.h / 2 - 3, e.w + (e.done ? -6 : 4), 6, PAL.metal, true, 2);
        ctx.fillStyle = PAL.stoneDark;
        ctx.fillRect(e.x + 2, e.y + e.h / 2 - 6, 4, 12);
        break;
      case 'latch':
        this.box(e.x, e.y + 4, e.w, 8, PAL.metal, true, 2);
        ctx.fillStyle = PAL.stoneDark;
        ctx.beginPath();
        ctx.arc(e.x + e.w - 3, e.y + 8, 2.5, 0, Math.PI * 2);
        ctx.fill();
        if (e.done) {
          ctx.strokeStyle = PAL.metal;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(e.x + 2, e.y + 8);
          ctx.lineTo(e.x + e.w - 6, e.y - 4);
          ctx.stroke();
        }
        break;
      case 'rope':
        ctx.strokeStyle = PAL.rope;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(e.x + e.w / 2, e.y - 20);
        if (e.done) ctx.lineTo(e.x + e.w / 2 + 6, e.y + 6);
        else ctx.lineTo(e.x + e.w / 2, e.y + e.h);
        ctx.stroke();
        if (!e.done) {
          // the propped plank
          ctx.save();
          ctx.translate(e.x + 8, e.y + e.h + 20);
          ctx.rotate(-1.15);
          this.box(0, -5, 90, 10, PAL.wood, true, 2);
          ctx.restore();
        }
        this.box(e.x - 6, e.y - 26, e.w + 12, 8, PAL.woodDark, true, 2);
        break;
      case 'bell': {
        this.box(e.x - 3, e.y, e.w + 6, e.h, '#f6efe0', true, 3);
        ctx.fillStyle = e.done ? '#9fd27a' : PAL.brass;
        ctx.beginPath();
        ctx.arc(e.x + e.w / 2, e.y + e.h / 2, 4, 0, Math.PI * 2);
        ctx.fill();
        this.ink(1);
        ctx.stroke();
        break;
      }
      case 'lever':
        this.box(e.x, e.y, e.w, e.h, PAL.metal);
        break;
    }
  }

  private drawCheckpoint(e: Extract<Entity, { kind: 'checkpoint' }>, world: World) {
    const ctx = this.ctx;
    const active = world.checkpoint.x === e.x;
    // a little nest
    ctx.fillStyle = '#c9a56a';
    ctx.beginPath();
    ctx.ellipse(e.x, e.y - 4, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PAL.woodDark;
    ctx.lineWidth = 1;
    for (let i = -10; i <= 10; i += 5) {
      ctx.beginPath();
      ctx.moveTo(e.x + i, e.y - 8);
      ctx.lineTo(e.x + i + 4, e.y - 2);
      ctx.stroke();
    }
    ctx.fillStyle = active ? '#f2c141' : '#f6efe0';
    ctx.beginPath();
    ctx.ellipse(e.x, e.y - 9, 5, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
    this.ink(1);
    ctx.stroke();
  }

  private drawCorn(e: Extract<Entity, { kind: 'corn' }>) {
    const ctx = this.ctx;
    const bob = Math.sin(this.time * 4 + e.x) * 2;
    ctx.fillStyle = PAL.corn;
    ctx.beginPath();
    ctx.ellipse(e.x, e.y + bob, 4.5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    this.ink(1);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(e.x - 1.5, e.y - 2 + bob, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawEgg(e: Extract<Entity, { kind: 'egg' }>) {
    const ctx = this.ctx;
    ctx.fillStyle = '#c9a56a';
    ctx.beginPath();
    ctx.ellipse(e.x, e.y - 3, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e7f0f2';
    ctx.beginPath();
    ctx.ellipse(e.x, e.y - 12, 8, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    this.ink(1.2);
    ctx.stroke();
    ctx.fillStyle = PAL.brass;
    const s = 3 + Math.sin(this.time * 5) * 1;
    ctx.beginPath();
    ctx.moveTo(e.x + 14, e.y - 26 - s);
    ctx.lineTo(e.x + 16, e.y - 22);
    ctx.lineTo(e.x + 14 + s, e.y - 20);
    ctx.lineTo(e.x + 12, e.y - 22);
    ctx.closePath();
    ctx.fill();
  }

  private drawBush(e: Extract<Entity, { kind: 'bush' }>) {
    const ctx = this.ctx;
    ctx.fillStyle = PAL.hedge;
    for (const [dx, dy, r] of [[0.25, 0.7, 0.42], [0.6, 0.55, 0.48], [0.85, 0.75, 0.36], [0.45, 0.85, 0.4]] as const) {
      ctx.beginPath();
      ctx.arc(e.x + e.w * dx, e.y + e.h * dy, e.h * r, 0, Math.PI * 2);
      ctx.fill();
    }
    this.ink(1.2);
    ctx.beginPath();
    ctx.arc(e.x + e.w * 0.6, e.y + e.h * 0.55, e.h * 0.48, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  }

  private drawCrows(e: Extract<Entity, { kind: 'crows' }>, world: World) {
    const air = e.airTime > 0;
    for (let i = 0; i < e.count; i++) {
      const bx = e.x + 14 + (i * (e.w - 28)) / Math.max(1, e.count - 1);
      let by = e.y + e.h - 6;
      let flap = 0;
      if (e.fled) {
        const t = Math.min(1, (2 - e.airTime) / 2 + 0.2);
        by -= 60 + t * 220 + i * 12;
        flap = Math.sin(this.time * 18 + i) * 6;
        const fx = bx + t * 260 + i * 20;
        this.drawBird(fx, by, flap, 1);
        continue;
      }
      if (air) {
        by -= 40 + Math.sin(this.time * 6 + i) * 10 + (2 - e.airTime) * 10;
        flap = Math.sin(this.time * 16 + i) * 6;
      }
      this.drawBird(bx, by, flap, world.chicken.x > bx ? 1 : -1);
    }
  }

  private drawBird(x: number, y: number, flap: number, facing: 1 | -1) {
    const ctx = this.ctx;
    ctx.fillStyle = PAL.crow;
    ctx.beginPath();
    ctx.ellipse(x, y, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + facing * 7, y - 3, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e0b04c';
    ctx.beginPath();
    ctx.moveTo(x + facing * 10, y - 3);
    ctx.lineTo(x + facing * 15, y - 2);
    ctx.lineTo(x + facing * 10, y - 1);
    ctx.fill();
    ctx.strokeStyle = PAL.crow;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x - 2, y - 2);
    ctx.lineTo(x - facing * 6, y - 8 - flap);
    ctx.stroke();
  }

  private drawFox(e: Extract<Entity, { kind: 'fox' }>, world: World) {
    const ctx = this.ctx;
    const x = e.x;
    const y = e.y;
    const f = e.facing;
    const asleep = e.state === 'asleep' || (e.state === 'sulk' && Math.abs(e.x - (e.maxX + 30)) < 10);
    const running = e.state === 'chase';
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(f, 1);
    // tail
    ctx.fillStyle = PAL.fox;
    ctx.beginPath();
    const wag = Math.sin(this.time * (running ? 20 : 4)) * 4;
    ctx.moveTo(-14, -14);
    ctx.quadraticCurveTo(-38, -30 + wag, -44, -12 + wag);
    ctx.quadraticCurveTo(-34, -4, -16, -8);
    ctx.fill();
    ctx.fillStyle = '#f6efe0';
    ctx.beginPath();
    ctx.arc(-42, -12 + wag, 5, 0, Math.PI * 2);
    ctx.fill();
    // body
    ctx.fillStyle = PAL.fox;
    ctx.beginPath();
    if (asleep) ctx.ellipse(0, -10, 22, 10, 0, 0, Math.PI * 2);
    else ctx.ellipse(0, -16, 22, 11, running ? 0.05 : 0, 0, Math.PI * 2);
    ctx.fill();
    this.ink(1.2);
    ctx.stroke();
    // legs
    if (!asleep) {
      ctx.strokeStyle = PAL.foxDark;
      ctx.lineWidth = 3.5;
      const gait = running ? Math.sin(this.time * 22) * 10 : Math.sin(this.time * 6) * 3;
      for (const [lx, ph] of [[-12, 1], [-6, -1], [8, -1], [14, 1]] as const) {
        ctx.beginPath();
        ctx.moveTo(lx, -8);
        ctx.lineTo(lx + gait * ph * 0.6, 0);
        ctx.stroke();
      }
    }
    // head
    ctx.fillStyle = PAL.fox;
    ctx.beginPath();
    ctx.moveTo(14, asleep ? -14 : -24);
    ctx.lineTo(34, asleep ? -10 : -18);
    ctx.lineTo(16, asleep ? -6 : -10);
    ctx.closePath();
    ctx.fill();
    this.ink(1.2);
    ctx.stroke();
    // ears
    ctx.fillStyle = PAL.fox;
    ctx.beginPath();
    ctx.moveTo(14, asleep ? -14 : -24);
    ctx.lineTo(16, asleep ? -26 : -36);
    ctx.lineTo(23, asleep ? -14 : -24);
    ctx.fill();
    ctx.stroke();
    // eye & nose
    ctx.fillStyle = INK;
    if (!asleep) {
      ctx.beginPath();
      ctx.arc(21, -20, 1.8, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(19, -11);
      ctx.lineTo(24, -11);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(34, asleep ? -10 : -18, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (asleep) {
      ctx.fillStyle = INK;
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      const z = (this.time * 0.8) % 1;
      ctx.globalAlpha = 1 - z;
      ctx.fillText('z', x + f * 20, y - 34 - z * 16);
      ctx.globalAlpha = 1;
    } else if (running) {
      ctx.fillStyle = INK;
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', x, y - 46);
    }
    void world;
  }

  // -------------------------------------------------------------------------
  // Props
  // -------------------------------------------------------------------------

  private drawPropBack(p: Prop, world: World, visible: (r: Rect) => boolean) {
    const ctx = this.ctx;
    switch (p.type) {
      case 'cloud': {
        if (!visible({ x: p.x - 200, y: p.y - 40, w: 400, h: 80 })) break;
        const drift = (this.time * 6) % 400;
        const x = p.x + drift - 200;
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        for (const [dx, dy, r] of [[0, 0, 22], [24, -8, 26], [50, 0, 20], [26, 8, 22]] as const) {
          ctx.beginPath();
          ctx.arc(x + dx * (p.variant ? 1.3 : 1), p.y + dy, r * (p.variant ? 1.2 : 1), 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'coop': {
        if (!visible({ x: p.x, y: p.y - 140, w: 200, h: 140 })) break;
        this.box(p.x, p.y - 96, 170, 96, '#d9b27a', true, 4);
        ctx.fillStyle = PAL.roof;
        ctx.beginPath();
        ctx.moveTo(p.x - 12, p.y - 96);
        ctx.lineTo(p.x + 85, p.y - 150);
        ctx.lineTo(p.x + 182, p.y - 96);
        ctx.closePath();
        ctx.fill();
        this.ink();
        ctx.stroke();
        this.box(p.x + 16, p.y - 70, 40, 70, '#3a2d24', true, 3);
        // ramp
        ctx.fillStyle = PAL.wood;
        ctx.beginPath();
        ctx.moveTo(p.x + 14, p.y);
        ctx.lineTo(p.x + 56, p.y);
        ctx.lineTo(p.x + 40, p.y - 8);
        ctx.lineTo(p.x + 30, p.y - 8);
        ctx.fill();
        this.box(p.x + 90, p.y - 62, 34, 30, '#f6efe0', true, 2);
        this.ink(1);
        ctx.beginPath();
        ctx.moveTo(p.x + 107, p.y - 62);
        ctx.lineTo(p.x + 107, p.y - 32);
        ctx.moveTo(p.x + 90, p.y - 47);
        ctx.lineTo(p.x + 124, p.y - 47);
        ctx.stroke();
        ctx.fillStyle = INK;
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('THE COOP', p.x + 85, p.y - 104);
        break;
      }
      case 'barnFront': {
        const w = p.w ?? 600;
        if (!visible({ x: p.x, y: p.y - 320, w, h: 320 })) break;
        // Interior back wall (cutaway view)
        this.box(p.x, 200, w, GROUND_Y - 200, PAL.barnInside, false);
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.lineWidth = 1;
        for (let y = 214; y < GROUND_Y; y += 14) {
          ctx.beginPath();
          ctx.moveTo(p.x, y);
          ctx.lineTo(p.x + w, y);
          ctx.stroke();
        }
        // roof gable
        ctx.fillStyle = PAL.barn;
        ctx.beginPath();
        ctx.moveTo(p.x - 20, 202);
        ctx.lineTo(p.x + w / 2, 110);
        ctx.lineTo(p.x + w + 20, 202);
        ctx.closePath();
        ctx.fill();
        this.ink();
        ctx.stroke();
        this.box(p.x + w / 2 - 22, 150, 44, 36, '#f6efe0', true, 3);
        ctx.fillStyle = INK;
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('BARN', p.x + w / 2, 174);
        // grain chute on the back wall
        const chute = world.flags.has('chute');
        this.box(p.x + w - 160, 260, 60, 120, PAL.woodDark, true, 3);
        this.box(p.x + w - 150, 370, 40, 18, chute ? PAL.corn : PAL.wood, true, 2);
        if (chute) {
          ctx.fillStyle = PAL.corn;
          ctx.beginPath();
          ctx.moveTo(p.x + w - 150, 388);
          ctx.lineTo(p.x + w - 110, 388);
          ctx.lineTo(p.x + w - 80, GROUND_Y);
          ctx.lineTo(p.x + w - 180, GROUND_Y);
          ctx.closePath();
          ctx.fill();
        }
        break;
      }
      case 'house': {
        const w = p.w ?? 400;
        if (!visible({ x: p.x, y: 100, w, h: GROUND_Y - 100 })) break;
        // Main house body behind the porch
        this.box(p.x + 20, 200, w - 20, GROUND_Y - 240, PAL.house, true);
        ctx.fillStyle = PAL.roof;
        ctx.beginPath();
        ctx.moveTo(p.x, 202);
        ctx.lineTo(p.x + w / 2 + 40, 120);
        ctx.lineTo(p.x + w + 20, 202);
        ctx.closePath();
        ctx.fill();
        this.ink();
        ctx.stroke();
        // windows
        for (const wx of [p.x + 60, p.x + 150, p.x + 240]) {
          this.box(wx, 330, 44, 50, '#bfd9e2', true, 3);
          this.ink(1);
          ctx.beginPath();
          ctx.moveTo(wx + 22, 330);
          ctx.lineTo(wx + 22, 380);
          ctx.moveTo(wx, 355);
          ctx.lineTo(wx + 44, 355);
          ctx.stroke();
        }
        // porch posts
        for (const px of [p.x + 10, p.x + 120, p.x + 230]) this.box(px, 312, 8, GROUND_Y - 40 - 312, '#f6efe0', true, 2);
        // the farmer, if summoned
        if (world.flags.has('farmerOut') || world.flags.has('bellRung')) this.drawFarmer(p.x + 305, GROUND_Y - 40);
        break;
      }
      case 'tree': {
        const h = p.h ?? 160;
        if (!visible({ x: p.x - 80, y: p.y - h - 80, w: 160, h: h + 80 })) break;
        this.box(p.x - 12, p.y - h, 24, h, PAL.woodDark, true, 6);
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1.5;
        for (let y = p.y - h + 20; y < p.y - 10; y += 22) {
          ctx.beginPath();
          ctx.moveTo(p.x - 6, y);
          ctx.lineTo(p.x + 4, y + 8);
          ctx.stroke();
        }
        const canopy = p.variant === 1 ? '#6f9450' : '#7fa35c';
        ctx.fillStyle = canopy;
        for (const [dx, dy, r] of [[-40, -h - 10, 34], [0, -h - 40, 42], [44, -h - 6, 34], [10, -h + 10, 30], [-30, -h + 14, 26]] as const) {
          ctx.beginPath();
          ctx.arc(p.x + dx, p.y + dy, r, 0, Math.PI * 2);
          ctx.fill();
        }
        this.ink(1.2);
        ctx.beginPath();
        ctx.arc(p.x, p.y - h - 40, 42, Math.PI * 1.05, Math.PI * 1.95);
        ctx.stroke();
        break;
      }
      case 'den': {
        if (!visible({ x: p.x - 60, y: p.y - 60, w: 120, h: 60 })) break;
        ctx.fillStyle = PAL.dirtDark;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 44, 14, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#2a201a';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 30, 22, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#f6efe0';
        ctx.fillRect(p.x + 12, p.y - 4, 10, 3);
        ctx.fillRect(p.x - 22, p.y - 3, 8, 3);
        break;
      }
      case 'well': {
        if (!visible({ x: p.x - 30, y: p.y - 90, w: 60, h: 90 })) break;
        this.box(p.x - 22, p.y - 36, 44, 36, PAL.stone, true, 4);
        this.box(p.x - 26, p.y - 84, 6, 50, PAL.woodDark, true, 1);
        this.box(p.x + 20, p.y - 84, 6, 50, PAL.woodDark, true, 1);
        ctx.fillStyle = PAL.roof;
        ctx.beginPath();
        ctx.moveTo(p.x - 34, p.y - 82);
        ctx.lineTo(p.x, p.y - 100);
        ctx.lineTo(p.x + 34, p.y - 82);
        ctx.closePath();
        ctx.fill();
        this.ink();
        ctx.stroke();
        break;
      }
      case 'scarecrow': {
        if (!visible({ x: p.x - 40, y: p.y - 130, w: 80, h: 130 })) break;
        this.box(p.x - 3, p.y - 110, 6, 110, PAL.woodDark, true, 1);
        this.box(p.x - 34, p.y - 88, 68, 6, PAL.woodDark, true, 1);
        this.box(p.x - 16, p.y - 92, 32, 44, '#7b8fb0', true, 4);
        ctx.fillStyle = '#e6d3ad';
        ctx.beginPath();
        ctx.arc(p.x, p.y - 104, 13, 0, Math.PI * 2);
        ctx.fill();
        this.ink(1.2);
        ctx.stroke();
        ctx.fillStyle = PAL.woodDark;
        ctx.beginPath();
        ctx.moveTo(p.x - 24, p.y - 112);
        ctx.lineTo(p.x + 24, p.y - 112);
        ctx.lineTo(p.x + 10, p.y - 128);
        ctx.lineTo(p.x - 10, p.y - 128);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = INK;
        ctx.fillRect(p.x - 6, p.y - 108, 3, 3);
        ctx.fillRect(p.x + 3, p.y - 108, 3, 3);
        break;
      }
      case 'bed': {
        const w = p.w ?? 100;
        if (!visible({ x: p.x, y: p.y - 30, w, h: 30 })) break;
        this.box(p.x, p.y - 10, w, 10, PAL.dirtDark, true, 2);
        ctx.strokeStyle = '#5f8a4b';
        ctx.lineWidth = 2.5;
        for (let x = p.x + 8; x < p.x + w - 4; x += 14) {
          ctx.beginPath();
          ctx.moveTo(x, p.y - 10);
          ctx.lineTo(x - 4, p.y - 22);
          ctx.moveTo(x, p.y - 10);
          ctx.lineTo(x + 4, p.y - 20);
          ctx.stroke();
        }
        break;
      }
      case 'hay': {
        if (!visible({ x: p.x - 40, y: p.y - 40, w: 80, h: 40 })) break;
        ctx.fillStyle = '#e2c56f';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y - 12, 36, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(p.x + 10, p.y - 26, 22, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        this.ink(1.1);
        ctx.stroke();
        break;
      }
      case 'flowers':
      case 'rocks':
      case 'pondBed':
      case 'sign':
      case 'bush':
        break;
    }
  }

  private drawPropFront(p: Prop, world: World, visible: (r: Rect) => boolean) {
    const ctx = this.ctx;
    void ctx;
    switch (p.type) {
      case 'sign': {
        if (!visible({ x: p.x - 30, y: p.y - 70, w: 60, h: 70 })) break;
        this.box(p.x - 3, p.y - 54, 6, 54, PAL.woodDark, true, 1);
        const text = p.text ?? '';
        ctx.font = 'bold 11px sans-serif';
        const tw = ctx.measureText(text).width + 16;
        this.box(p.x - tw / 2, p.y - 66, tw, 20, '#f6efe0', true, 3);
        ctx.fillStyle = INK;
        ctx.textAlign = 'center';
        ctx.fillText(text, p.x, p.y - 52);
        break;
      }
      case 'flowers': {
        if (!visible({ x: p.x - 30, y: p.y - 30, w: 60, h: 30 })) break;
        for (let i = 0; i < 5; i++) {
          const fx = p.x + i * 11 - 22;
          ctx.strokeStyle = '#5f8a4b';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(fx, p.y);
          ctx.lineTo(fx, p.y - 12 - (i % 2) * 4);
          ctx.stroke();
          ctx.fillStyle = ['#d9534f', '#f2c141', '#e08fb0', '#f6efe0', '#f2c141'][i]!;
          ctx.beginPath();
          ctx.arc(fx, p.y - 14 - (i % 2) * 4, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'rocks': {
        if (!visible({ x: p.x - 30, y: p.y - 20, w: 60, h: 20 })) break;
        ctx.fillStyle = PAL.stone;
        for (const [dx, r] of [[-14, 7], [0, 10], [16, 6]] as const) {
          ctx.beginPath();
          ctx.arc(p.x + dx, p.y - r + 1, r, 0, Math.PI * 2);
          ctx.fill();
          this.ink(1);
          ctx.stroke();
        }
        break;
      }
      default:
        break;
    }
    void world;
  }

  private drawFarmer(x: number, y: number) {
    const ctx = this.ctx;
    this.box(x - 12, y - 60, 24, 40, '#4c6a8f', true, 4);
    this.box(x - 9, y - 22, 7, 22, '#2f3d52', true, 1);
    this.box(x + 2, y - 22, 7, 22, '#2f3d52', true, 1);
    ctx.fillStyle = '#e6c9a8';
    ctx.beginPath();
    ctx.arc(x, y - 72, 12, 0, Math.PI * 2);
    ctx.fill();
    this.ink(1.2);
    ctx.stroke();
    ctx.fillStyle = PAL.corn;
    ctx.beginPath();
    ctx.ellipse(x, y - 84, 20, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x, y - 88, 10, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.fillRect(x - 5, y - 74, 2.5, 2.5);
    ctx.fillRect(x + 2, y - 74, 2.5, 2.5);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x, y - 68, 4, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }

  // -------------------------------------------------------------------------
  // Chicken
  // -------------------------------------------------------------------------

  private drawChicken(world: World, sprites: SpriteSet, s: ChickenDrawState) {
    const c = world.chicken;
    const ctx = this.ctx;
    // shadow
    if (!c.swimming && c.busyKind !== 'flounder') {
      const groundBelow = this.groundBelow(world);
      const alt = Math.max(0, groundBelow - c.y);
      const k = Math.max(0.35, 1 - alt / 260);
      ctx.fillStyle = 'rgba(43,33,24,0.18)';
      ctx.beginPath();
      ctx.ellipse(c.x, groundBelow + 1, (c.w * 0.75) * k, 4 * k, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    const height = c.h * 1.35;
    if (c.frozen > 0) {
      ctx.fillStyle = INK;
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', c.x, c.y - c.h - 18);
    }
    drawSprite(ctx, sprites, s.frame, { x: c.x, y: c.y + (c.swimming ? 6 : 0), height, facing: c.facing, rot: s.rot, squashX: s.squashX, squashY: s.squashY, alpha: s.alpha });
    if (c.swimming) {
      ctx.fillStyle = PAL.water;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y + 2, c.w * 0.8, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  private groundBelow(world: World): number {
    const c = world.chicken;
    let best = GROUND_Y + 200;
    for (const e of world.entities) {
      if (e.kind !== 'solid' && e.kind !== 'crate' && e.kind !== 'door') continue;
      if (e.kind === 'solid' && ((e.ifFlag && !world.flags.has(e.ifFlag)) || (e.unlessFlag && world.flags.has(e.unlessFlag)))) continue;
      if (e.kind === 'door' && world.flags.has(e.flag)) continue;
      if (c.x >= e.x && c.x <= e.x + e.w && e.y >= c.y - 1 && e.y < best) best = e.y;
    }
    return best;
  }

  private drawParticles() {
    const ctx = this.ctx;
    for (const p of this.particles) {
      const t = p.life / p.max;
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = p.color;
      switch (p.kind) {
        case 'dot':
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1 - t * 0.5), 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'feather':
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.life * 3);
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          break;
        case 'ring':
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4 + t * 14, 0, Math.PI * 2);
          ctx.stroke();
          break;
        case 'text':
          ctx.font = `bold ${p.size}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(p.text ?? '', p.x, p.y);
          break;
      }
    }
    ctx.globalAlpha = 1;
  }
}
