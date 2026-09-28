import type { ChickenView } from '../chickens/chicken';
import { chickenSvg, type Pose } from '../ui/chickenSvg';

/**
 * Turns the procedural chicken illustration into a handful of pose frames
 * the canvas renderer can draw. Every chicken you play as looks exactly like
 * its card, because it IS its card.
 */
export type FrameName = 'stand' | 'walk1' | 'walk2' | 'jump' | 'flap' | 'glide' | 'peck' | 'crow' | 'swim' | 'climb1' | 'climb2' | 'hide';

const POSES: Record<FrameName, Pose> = {
  stand: {},
  walk1: { stride: 1 },
  walk2: { stride: -1 },
  jump: { tuck: true, wingLift: 18 },
  flap: { tuck: true, wingLift: 60 },
  glide: { tuck: true, wingLift: 42 },
  peck: { peck: true },
  crow: { crow: true, wingLift: 25 },
  swim: { tuck: true, wingLift: 8 },
  climb1: { stride: 1, wingLift: 30 },
  climb2: { stride: -1, wingLift: 30 },
  hide: { tuck: true },
};

export interface SpriteSet {
  frames: Partial<Record<FrameName, HTMLImageElement>>;
  /** Bounding box of the figure inside the 240x240 SVG, from the stand frame. */
  box: { x: number; y: number; w: number; h: number };
  ready: boolean;
}

const SIZE = 240;

function svgToImage(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/** Alpha bounding box of an image drawn at native size. */
function measure(img: HTMLImageElement): { x: number; y: number; w: number; h: number } {
  const c = document.createElement('canvas');
  c.width = SIZE;
  c.height = SIZE;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { x: 40, y: 60, w: 160, h: 160 };
  ctx.drawImage(img, 0, 0, SIZE, SIZE);
  const data = ctx.getImageData(0, 0, SIZE, SIZE).data;
  let minX = SIZE, minY = SIZE, maxX = 0, maxY = 0;
  for (let y = 0; y < SIZE; y += 2) {
    for (let x = 0; x < SIZE; x += 2) {
      if ((data[(y * SIZE + x) * 4 + 3] ?? 0) > 40) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX <= minX) return { x: 40, y: 60, w: 160, h: 160 };
  return { x: minX, y: minY, w: maxX - minX + 2, h: maxY - minY + 2 };
}

const cache = new Map<string, SpriteSet>();

/** Build (or fetch) the frames for a chicken. Frames fill in asynchronously; `ready` flips when all are loaded. */
export function spritesFor(view: ChickenView): SpriteSet {
  const key = `${view.chicken.id}:${view.chicken.seed}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const set: SpriteSet = { frames: {}, box: { x: 40, y: 60, w: 160, h: 160 }, ready: false };
  cache.set(key, set);
  const names = Object.keys(POSES) as FrameName[];
  let loaded = 0;
  for (const name of names) {
    const svg = chickenSvg(view.phenotype, view.chicken.seed, { uid: `spr-${name}`, pose: POSES[name], sprite: true, shadow: false })
      .replace('<svg ', `<svg width="${SIZE}" height="${SIZE}" `);
    svgToImage(svg)
      .then((img) => {
        set.frames[name] = img;
        if (name === 'stand') set.box = measure(img);
        loaded++;
        if (loaded === names.length) set.ready = true;
      })
      .catch(() => {
        loaded++;
        if (loaded === names.length) set.ready = true;
      });
  }
  return set;
}

export interface DrawOpts {
  /** Feet position in canvas space. */
  x: number;
  y: number;
  /** Desired on-screen height of the figure's bounding box. */
  height: number;
  facing: 1 | -1;
  /** Rotation in radians (positive = nose down when facing right). */
  rot?: number;
  squashX?: number;
  squashY?: number;
  alpha?: number;
}

export function drawSprite(ctx: CanvasRenderingContext2D, set: SpriteSet, frame: FrameName, o: DrawOpts) {
  const img = set.frames[frame] ?? set.frames.stand;
  if (!img) return;
  const box = set.box;
  const scale = o.height / box.h;
  ctx.save();
  ctx.translate(o.x, o.y);
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
  // The illustration faces left; flip for right.
  ctx.scale(o.facing === 1 ? -1 : 1, 1);
  if (o.rot) ctx.rotate(o.rot * (o.facing === 1 ? 1 : -1));
  ctx.scale(scale * (o.squashX ?? 1), scale * (o.squashY ?? 1));
  // Feet are at the bottom-centre of the figure's box.
  ctx.drawImage(img, -(box.x + box.w / 2), -(box.y + box.h), SIZE, SIZE);
  ctx.restore();
}
