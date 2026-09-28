import type { ColorId, Phenotype } from '../genetics/phenotype';
import { createRng } from '../core/rng';

/** Field-guide palette: fill + a darker ink for outlines/shading. */
export const COLORS: Record<ColorId, { fill: string; ink: string; light: string }> = {
  black: { fill: '#2e2b33', ink: '#17151a', light: '#4a4652' },
  blue: { fill: '#8a95a6', ink: '#525c6b', light: '#aeb7c4' },
  splash: { fill: '#e4e6ea', ink: '#8e97a6', light: '#f4f5f7' },
  lavender: { fill: '#c3b9d3', ink: '#8d80a4', light: '#dbd4e6' },
  chocolate: { fill: '#5c3a2b', ink: '#36211a', light: '#7a4f3c' },
  white: { fill: '#f8f4ea', ink: '#b8ad98', light: '#ffffff' },
  gold: { fill: '#d9963a', ink: '#8f5b16', light: '#ecb865' },
  red: { fill: '#9c3a22', ink: '#5e2012', light: '#bd5a3e' },
  buff: { fill: '#e6b96a', ink: '#a07a34', light: '#f2d295' },
  cream: { fill: '#f1e7cb', ink: '#b3a172', light: '#faf5e6' },
  silver: { fill: '#ebe9e2', ink: '#9a978d', light: '#ffffff' },
  partridge: { fill: '#8f5b2f', ink: '#553517', light: '#b07a4c' },
  wheaten: { fill: '#e9d2a3', ink: '#a8895a', light: '#f5e6c5' },
  straw: { fill: '#ecdfa9', ink: '#a89a5f', light: '#f6eecb' },
  dun: { fill: '#8f8279', ink: '#5a4f47', light: '#aa9f97' },
};

const LEG_COLORS: Record<Phenotype['legColor'], string> = {
  yellow: '#e2b33a',
  white: '#e9c7b5',
  slate: '#6f7a8a',
  willow: '#8a9a5a',
  black: '#2a262c',
};

const SKIN: Record<Phenotype['skin'], { comb: string; face: string }> = {
  yellow: { comb: '#d8402f', face: '#e2604c' },
  white: { comb: '#d8402f', face: '#e2604c' },
  black: { comb: '#3a2f3a', face: '#3f333f' },
};

export const EGG_COLORS: Record<Phenotype['eggColor'], { fill: string; ink: string }> = {
  white: { fill: '#f7f2e8', ink: '#c9bfae' },
  cream: { fill: '#f3e6cf', ink: '#c9b591' },
  tinted: { fill: '#e9d3b4', ink: '#b8996d' },
  brown: { fill: '#c98f5c', ink: '#8b5a2f' },
  darkBrown: { fill: '#9a5a32', ink: '#5e3418' },
  chocolate: { fill: '#5f3419', ink: '#3a1d0c' },
  blue: { fill: '#a9d3d6', ink: '#5f9ba0' },
  green: { fill: '#a9c49a', ink: '#6d8c5c' },
  olive: { fill: '#7f8a4d', ink: '#525a2c' },
  plum: { fill: '#c8a3b2', ink: '#8a6377' },
};

interface ShapeCfg {
  rx: number;
  ry: number;
  tilt: number;
  legLen: number;
  neckBase: [number, number];
  head: [number, number];
  tailBase: [number, number];
}

function shapeCfg(p: Phenotype): ShapeCfg {
  const fluff = p.density === 'cloud' ? 1.14 : p.density === 'fluffy' ? 1.07 : p.density === 'sleek' ? 0.94 : 1;
  const silk = p.featherType === 'silkie' || p.featherType === 'sizzle' ? 1.06 : 1;
  const f = fluff * silk;
  switch (p.shape) {
    case 'upright':
      return { rx: 36 * f, ry: 44 * f, tilt: -32, legLen: 54, neckBase: [-22, -34], head: [-30, -86], tailBase: [22, -34] };
    case 'round':
      return { rx: 52 * f, ry: 42 * f, tilt: -4, legLen: 26, neckBase: [-40, -22], head: [-52, -62], tailBase: [42, -26] };
    default:
      return { rx: 48 * f, ry: 36 * f, tilt: -8, legLen: 34, neckBase: [-38, -18], head: [-54, -62], tailBase: [40, -22] };
  }
}

const fmt = (n: number) => (Math.round(n * 10) / 10).toString();

/** Points along an ellipse (angle in radians measured before tilt). */
function ellipsePoint(cfg: ShapeCfg, a: number): [number, number] {
  const t = (cfg.tilt * Math.PI) / 180;
  const x = cfg.rx * Math.cos(a);
  const y = cfg.ry * Math.sin(a);
  return [x * Math.cos(t) - y * Math.sin(t), x * Math.sin(t) + y * Math.cos(t)];
}

function fluffRing(cfg: ShapeCfg, fill: string, ink: string, count: number, r: number, seed: number): string {
  const rng = createRng(seed);
  let s = '';
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rng.next() * 0.2;
    const [x, y] = ellipsePoint(cfg, a);
    const rr = r * (0.8 + rng.next() * 0.5);
    s += `<circle cx="${fmt(x)}" cy="${fmt(y)}" r="${fmt(rr)}" fill="${fill}" stroke="${ink}" stroke-width="0.8" stroke-opacity="0.35"/>`;
  }
  return s;
}

function frizzleCurls(cfg: ShapeCfg, ink: string, count: number, size: number, seed: number, chaos: number): string {
  const rng = createRng(seed);
  let s = '';
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rng.next() * 0.3;
    const [x, y] = ellipsePoint(cfg, a);
    const nx = x * 1.02;
    const ny = y * 1.02;
    const dx = (x / (cfg.rx || 1)) * size * (1 + rng.next() * chaos);
    const dy = (y / (cfg.ry || 1)) * size * (1 + rng.next() * chaos);
    // a small outward "c" curl
    s += `<path d="M${fmt(nx)} ${fmt(ny)} q ${fmt(dx * 0.6 - dy * 0.5)} ${fmt(dy * 0.6 + dx * 0.5)} ${fmt(dx)} ${fmt(dy)}" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round"/>`;
  }
  return s;
}

function patternOverlay(p: Phenotype, cfg: ShapeCfg, clipId: string): string {
  const marking = COLORS[p.marking].fill;
  const rx = cfg.rx;
  const ry = cfg.ry;
  let inner = '';
  const barredBody = p.barred && p.pattern !== 'columbian';
  if (barredBody) {
    for (let y = -ry; y < ry; y += 9) inner += `<rect x="${-rx}" y="${fmt(y)}" width="${rx * 2}" height="4.5" fill="${marking}" opacity="0.85"/>`;
  }
  if (p.pattern === 'laced' || p.pattern === 'pencilled' || p.pattern === 'spangled' || p.pattern === 'mottled' || (p.marking === 'white' && p.pattern === 'columbian') || p.primary === 'splash' || p.leakyWhite) {
    const step = 13;
    let row = 0;
    for (let y = -ry + 6; y < ry + 8; y += 11) {
      const offset = row % 2 === 0 ? 0 : step / 2;
      for (let x = -rx - 6 + offset; x < rx + 6; x += step) {
        if (p.pattern === 'laced') {
          inner += `<path d="M${fmt(x - 6)} ${fmt(y)} a6 6 0 0 0 12 0" fill="none" stroke="${marking}" stroke-width="2.2"/>`;
        } else if (p.pattern === 'pencilled') {
          inner += `<path d="M${fmt(x - 6)} ${fmt(y)} a6 6 0 0 0 12 0 M${fmt(x - 3.5)} ${fmt(y - 1)} a3.5 3.5 0 0 0 7 0" fill="none" stroke="${marking}" stroke-width="1.2"/>`;
        } else if (p.pattern === 'spangled') {
          inner += `<circle cx="${fmt(x)}" cy="${fmt(y + 2)}" r="2.8" fill="${marking}"/>`;
        } else if (p.primary === 'splash') {
          if ((row + Math.round(x)) % 3 === 0) inner += `<ellipse cx="${fmt(x)}" cy="${fmt(y)}" rx="3.5" ry="2.2" fill="${COLORS.blue.fill}" opacity="0.8"/>`;
        } else if (p.leakyWhite) {
          if ((row * 7 + Math.round(x)) % 5 === 0) inner += `<ellipse cx="${fmt(x)}" cy="${fmt(y)}" rx="2.5" ry="1.6" fill="#2e2b33" opacity="0.7"/>`;
        } else {
          // mottled / mille fleur: white tips
          inner += `<ellipse cx="${fmt(x)}" cy="${fmt(y + 2)}" rx="2.6" ry="1.8" fill="#fbf8f0"/>`;
        }
      }
      row++;
    }
  }
  if (!inner) return '';
  return `<g clip-path="url(#${clipId})" transform="rotate(${cfg.tilt})">${inner}</g>`;
}

function combSvg(p: Phenotype, hx: number, hy: number, comb: string, ink: string): string {
  const r = 15;
  const top = hy - r + 2;
  switch (p.comb) {
    case 'single':
      return `<path d="M${fmt(hx - 11)} ${fmt(top + 1)} l3 -9 l3 7 l3 -11 l3 9 l3 -9 l3 7 l2 -6 l2 5 v6 z" fill="${comb}" stroke="${ink}" stroke-width="1"/>`;
    case 'rose':
      return `<path d="M${fmt(hx - 12)} ${fmt(top + 2)} q2 -6 6 -5 q3 -3 6 -1 q3 -3 6 0 q4 -1 6 3 l4 -4 l-1 7 z" fill="${comb}" stroke="${ink}" stroke-width="1"/>`;
    case 'pea':
      return `<path d="M${fmt(hx - 9)} ${fmt(top + 2)} q2 -4 4 -1 q2 -5 5 -1 q2 -5 5 -1 q2 -3 4 0 v3 z" fill="${comb}" stroke="${ink}" stroke-width="1"/>`;
    case 'walnut':
      return `<path d="M${fmt(hx - 10)} ${fmt(top + 2)} q1 -6 5 -6 q3 -3 6 -1 q4 -2 6 2 q3 1 2 5 z" fill="${comb}" stroke="${ink}" stroke-width="1"/><path d="M${fmt(hx - 5)} ${fmt(top - 2)} q3 2 6 0" fill="none" stroke="${ink}" stroke-width="0.8"/>`;
    case 'strawberry':
      return `<path d="M${fmt(hx - 12)} ${fmt(top + 3)} q0 -6 5 -6 q4 -1 6 2 q2 2 1 5 z" fill="${comb}" stroke="${ink}" stroke-width="1"/>`;
    case 'vshaped':
      return `<path d="M${fmt(hx - 6)} ${fmt(top + 3)} l-4 -12 M${fmt(hx - 2)} ${fmt(top + 2)} l4 -12" fill="none" stroke="${comb}" stroke-width="3.2" stroke-linecap="round"/><path d="M${fmt(hx - 6)} ${fmt(top + 3)} l-4 -12 M${fmt(hx - 2)} ${fmt(top + 2)} l4 -12" fill="none" stroke="${ink}" stroke-width="1" stroke-linecap="round" opacity="0.5"/>`;
    case 'buttercup':
      return `<path d="M${fmt(hx - 12)} ${fmt(top + 2)} l1 -8 l3 5 l2 -8 l3 6 l3 -8 l3 6 l2 -7 l1 9 q-9 5 -18 3 z" fill="${comb}" stroke="${ink}" stroke-width="1"/><ellipse cx="${fmt(hx - 3)}" cy="${fmt(top - 1)}" rx="5" ry="2" fill="none" stroke="${ink}" stroke-width="0.8"/>`;
  }
}

function crestSvg(p: Phenotype, hx: number, hy: number, fill: string, ink: string, seed: number): string {
  if (p.crest === 'none') return '';
  const size = p.crest as Exclude<Phenotype['crest'], 'none'>;
  const n = { small: 4, medium: 7, large: 11, giant: 16 }[size];
  const spread = { small: 5, medium: 9, large: 14, giant: 20 }[size];
  const base = { small: 3.6, medium: 4.6, large: 5.6, giant: 6.8 }[size];
  const rng = createRng(seed + 11);
  const cx0 = hx + (size === 'small' ? -1 : 3);
  const cy0 = hy - 13 - spread * 0.45;
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = rng.next() * Math.PI * 2;
    const d = Math.sqrt(rng.next()) * spread;
    const cx = cx0 + Math.cos(a) * d;
    const cy = cy0 + Math.sin(a) * d * 0.75;
    const rr = base * (0.8 + rng.next() * 0.5);
    s += `<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(rr)}" fill="${fill}" stroke="${ink}" stroke-width="0.9"/>`;
  }
  return s;
}

function tailSvg(p: Phenotype, cfg: ShapeCfg, fill: string, ink: string, bodyFill: string): string {
  const [bx, by] = cfg.tailBase;
  const stroke = `stroke="${ink}" stroke-width="1.1"`;
  const feather = (dx1: number, dy1: number, dx2: number, dy2: number, w: number) =>
    `<path d="M${fmt(bx)} ${fmt(by)} q${fmt(dx1)} ${fmt(dy1)} ${fmt(dx2)} ${fmt(dy2)} q${fmt(-dx1 * 0.35 + w)} ${fmt(-dy1 * 0.2 + w)} ${fmt(-dx2 + 4)} ${fmt(-dy2 + 6)} z" fill="${fill}" ${stroke} stroke-linejoin="round"/>`;
  switch (p.tail) {
    case 'rumpless':
      return '';
    case 'cushion':
      return `<circle cx="${fmt(bx + 4)}" cy="${fmt(by - 4)}" r="17" fill="${bodyFill}" ${stroke}/><circle cx="${fmt(bx + 14)}" cy="${fmt(by + 2)}" r="12" fill="${fill}" ${stroke}/><circle cx="${fmt(bx + 6)}" cy="${fmt(by - 16)}" r="10" fill="${fill}" ${stroke}/>`;
    case 'squirrel':
      return feather(8, -40, -6, -52, 6) + feather(16, -36, 2, -48, 6) + feather(22, -30, 12, -42, 5) + feather(26, -18, 22, -30, 4);
    case 'flowing':
      return feather(40, -30, 70, 10, 8) + feather(44, -18, 74, 30, 7) + feather(30, -4, 66, 48, 6) + feather(20, 8, 56, 66, 5) + feather(34, -40, 58, -20, 6);
    case 'endless':
      return (
        feather(40, -34, 74, 2, 8) +
        feather(44, -20, 78, 26, 7) +
        feather(36, -6, 72, 46, 6) +
        feather(24, 8, 62, 70, 5) +
        `<path d="M${fmt(bx)} ${fmt(by)} q40 0 62 50 t-2 70 t-60 6 t20 -30" fill="none" stroke="${fill}" stroke-width="7" stroke-linecap="round"/>` +
        `<path d="M${fmt(bx)} ${fmt(by)} q40 0 62 50 t-2 70 t-60 6 t20 -30" fill="none" stroke="${ink}" stroke-width="1" stroke-linecap="round" opacity="0.6"/>`
      );
    default: {
      const up = p.shape === 'upright' ? -6 : 0;
      return feather(24, -34 + up, 30, -44 + up, 6) + feather(30, -26 + up, 40, -34 + up, 6) + feather(32, -14 + up, 44, -20 + up, 5) + feather(28, -4 + up, 40, -6 + up, 4);
    }
  }
}

function legsSvg(p: Phenotype, cfg: ShapeCfg, bodyFill: string, ink: string, legInk: string, pose: Pose): string {
  const leg = LEG_COLORS[p.legColor];
  const stride = pose.stride ?? 0;
  const tuck = pose.tuck ? 10 : 0;
  const legs: [number, number][] = [
    [-8 - stride * 9, 0 - tuck - (stride > 0 ? 4 : 0)],
    [10 + stride * 9, 3 - tuck - (stride < 0 ? 4 : 0)],
  ];
  const top = -(cfg.legLen + cfg.ry * 0.55);
  let s = '';
  for (const [x, dy] of legs) {
    const footY = 0 + dy;
    const hockY = top + cfg.legLen * 0.45;
    // shank
    s += `<path d="M${fmt(x)} ${fmt(top)} L${fmt(x + 2)} ${fmt(hockY)} L${fmt(x)} ${fmt(footY - 2)}" fill="none" stroke="${leg}" stroke-width="4.2" stroke-linecap="round"/>`;
    s += `<path d="M${fmt(x)} ${fmt(top)} L${fmt(x + 2)} ${fmt(hockY)} L${fmt(x)} ${fmt(footY - 2)}" fill="none" stroke="${legInk}" stroke-width="1" stroke-opacity="0.35" stroke-linecap="round"/>`;
    // toes
    const toes = [
      [-14, 0],
      [-10, 2],
      [-4, 3],
      [7, 1],
    ];
    if (p.toes === 5) toes.push([9, -4]);
    for (const [tx, ty] of toes) {
      s += `<path d="M${fmt(x)} ${fmt(footY - 2)} l${fmt(tx ?? 0)} ${fmt(ty ?? 0)}" fill="none" stroke="${leg}" stroke-width="3" stroke-linecap="round"/>`;
    }
    // hocks / feathering
    if (p.vultureHocks) {
      for (let i = 0; i < 3; i++) s += `<path d="M${fmt(x + 3)} ${fmt(hockY - 2 + i * 3)} l14 ${8 + i * 5}" stroke="${bodyFill}" stroke-width="4" stroke-linecap="round"/><path d="M${fmt(x + 3)} ${fmt(hockY - 2 + i * 3)} l14 ${8 + i * 5}" stroke="${ink}" stroke-width="1" stroke-linecap="round" opacity="0.5"/>`;
    }
    if (p.legFeathering !== 'clean') {
      const heavy = p.legFeathering === 'heavy';
      const w = heavy ? 12 : 7;
      const steps = heavy ? 6 : 4;
      let d = `M${fmt(x + 1)} ${fmt(hockY - 3)}`;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const yy = hockY + (footY - 2 - hockY) * t;
        const ww = w * (1 - t * 0.35) * (i % 2 === 0 ? 1 : 0.7);
        d += ` L${fmt(x + 2 + ww)} ${fmt(yy)}`;
      }
      d += ` L${fmt(x + 1)} ${fmt(footY - 2)} z`;
      s += `<path d="${d}" fill="${bodyFill}" stroke="${ink}" stroke-width="0.9" stroke-linejoin="round"/>`;
      if (heavy) s += `<path d="M${fmt(x - 12)} ${fmt(footY - 3)} q6 -9 16 -6 q9 2 12 8 q-8 4 -16 3 q-8 0 -12 -5 z" fill="${bodyFill}" stroke="${ink}" stroke-width="0.9"/>`;
    }
  }
  return s;
}

/** Body pose for sprite frames. */
export interface Pose {
  /** -1..1: legs apart in a stride. */
  stride?: number;
  /** Legs tucked up (jumping). */
  tuck?: boolean;
  /** Degrees the wing is lifted (flapping / gliding). */
  wingLift?: number;
  /** Beak pushed forward and down (pecking). */
  peck?: boolean;
  /** Head thrown back (crowing). */
  crow?: boolean;
}

export interface ChickenSvgOptions {
  /** Unique id used for clip paths; defaults to a hash of the seed. */
  uid?: string;
  pose?: Pose;
  /** Draw only the figure (no shadow) for sprite sheets. */
  sprite?: boolean;
  /** Add a CSS class for animation hooks. */
  className?: string;
  /** Draw a soft ground shadow. */
  shadow?: boolean;
}

/** Render a chicken as an inline SVG string. Pure: same phenotype+seed → same picture. */
export function chickenSvg(p: Phenotype, seed: number, opts: ChickenSvgOptions = {}): string {
  const uid = opts.uid ?? `c${(seed >>> 0).toString(36)}`;
  const pose: Pose = opts.pose ?? {};
  const cfg = shapeCfg(p);
  const body = COLORS[p.primary];
  const hackle = COLORS[p.hackle];
  const tail = COLORS[p.tailColor];
  const wing = p.pattern === 'columbian' ? COLORS[p.primary] : COLORS[p.secondary === p.primary ? p.primary : p.secondary];
  const skin = SKIN[p.skin];
  const ink = body.ink;
  const scale = 0.66 + p.sizeScore * 0.07;
  const groundY = 218;
  const cx = 124;
  const clipId = `${uid}-clip`;
  const silkie = p.featherType === 'silkie' || p.featherType === 'sizzle';
  const frizz = p.featherType === 'frizzle' || p.featherType === 'sizzle';
  const frazzle = p.featherType === 'frazzle';

  const bodyCy = -(cfg.legLen + cfg.ry * 0.9) + (pose.tuck ? 6 : 0);
  const headDx = pose.peck ? -10 : pose.crow ? 6 : 0;
  const headDy = pose.peck ? 14 : pose.crow ? -10 : 0;
  const [hx, hy] = [cfg.head[0] + headDx, cfg.head[1] + bodyCy + cfg.ry * 0.9 - 8 + headDy];
  const [nx, ny] = [cfg.neckBase[0], cfg.neckBase[1] + bodyCy];
  const [tx, ty] = [cfg.tailBase[0], cfg.tailBase[1] + bodyCy];
  const tailCfg: ShapeCfg = { ...cfg, tailBase: [tx, ty] };

  const parts: string[] = [];

  // shadow
  if (opts.shadow !== false && !opts.sprite) parts.push(`<ellipse cx="4" cy="4" rx="${fmt(cfg.rx * 1.1)}" ry="7" fill="#2b2118" opacity="0.12"/>`);

  // tail (behind body)
  parts.push(tailSvg(p, tailCfg, tail.fill, tail.ink, body.fill));

  // back leg (behind body)
  parts.push(`<g>${legsSvg(p, cfg, body.fill, ink, body.ink, pose)}</g>`);

  // body group
  const bodyGroup: string[] = [];
  if (silkie) bodyGroup.push(`<g transform="translate(0 ${fmt(bodyCy)})">${fluffRing(cfg, body.fill, body.ink, 26, 7.5, seed)}</g>`);
  bodyGroup.push(`<g transform="translate(0 ${fmt(bodyCy)})"><ellipse rx="${fmt(cfg.rx)}" ry="${fmt(cfg.ry)}" transform="rotate(${cfg.tilt})" fill="${body.fill}" stroke="${ink}" stroke-width="1.4"/>`);
  if (p.sheen) bodyGroup.push(`<ellipse rx="${fmt(cfg.rx)}" ry="${fmt(cfg.ry)}" transform="rotate(${cfg.tilt})" fill="url(#${uid}-sheen)"/>`);
  bodyGroup.push(patternOverlay(p, cfg, clipId));
  // wing
  const wrx = cfg.rx * 0.55;
  const wry = cfg.ry * 0.42;
  const wingPath = `M${fmt(-wrx * 0.6)} ${fmt(-wry * 0.6)} q${fmt(wrx * 1.3)} ${fmt(-wry * 0.6)} ${fmt(wrx * 1.5)} ${fmt(wry * 0.8)} q${fmt(-wrx * 0.5)} ${fmt(wry * 1.1)} ${fmt(-wrx * 1.4)} ${fmt(wry * 0.4)} z`;
  const lift = pose.wingLift ?? 0;
  bodyGroup.push(`<g transform="rotate(${cfg.tilt})${lift ? ` rotate(${fmt(-lift)} ${fmt(wrx * 0.6)} ${fmt(-wry * 0.6)})` : ''}"><path d="${wingPath}" fill="${body.fill}" stroke="${body.ink}" stroke-width="1.1"/><path d="${wingPath}" fill="${body.ink}" opacity="0.1"/>`);
  if (wing.fill !== body.fill) bodyGroup.push(`<path d="M${fmt(-wrx * 0.5)} ${fmt(wry * 0.95)} q${fmt(wrx * 0.8)} ${fmt(wry * 0.45)} ${fmt(wrx * 1.35)} ${fmt(wry * 0.15)}" fill="none" stroke="${wing.fill}" stroke-width="3.5" stroke-linecap="round" opacity="0.9"/>`);
  if (p.barred && p.pattern !== 'columbian') bodyGroup.push(`<g clip-path="url(#${clipId})">${[-8, 2, 12].map((y) => `<rect x="${fmt(-wrx)}" y="${fmt(y)}" width="${fmt(wrx * 2)}" height="4" fill="${COLORS[p.marking].fill}" opacity="0.85"/>`).join('')}</g>`);
  bodyGroup.push('</g>');
  if (frizz || frazzle) bodyGroup.push(frizzleCurls(cfg, body.ink, frazzle ? 14 : 22, frazzle ? 13 : 9, seed, frazzle ? 1.2 : 0.4));
  bodyGroup.push('</g>');
  parts.push(bodyGroup.join(''));

  // neck
  const nakedNeck = p.nakedNeck !== 'none';
  const neckFill = nakedNeck ? skin.face : hackle.fill;
  const neckInk = nakedNeck ? '#a03a2a' : hackle.ink;
  const neckW = nakedNeck ? 7 : 12;
  parts.push(`<path d="M${fmt(nx - neckW)} ${fmt(ny + 6)} Q${fmt(hx - neckW - 4)} ${fmt((ny + hy) / 2)} ${fmt(hx - neckW * 0.7)} ${fmt(hy + 4)} L${fmt(hx + neckW * 0.7)} ${fmt(hy + 6)} Q${fmt(hx + neckW + 6)} ${fmt((ny + hy) / 2 + 6)} ${fmt(nx + neckW + 4)} ${fmt(ny + 10)} z" fill="${neckFill}" stroke="${neckInk}" stroke-width="1.2"/>`);
  if (!nakedNeck && (p.pattern === 'columbian' || p.barred)) {
    // hackle striping
    const stripe = p.barred && p.pattern === 'columbian' ? COLORS[p.marking === 'white' ? 'black' : p.marking].fill : COLORS[p.primary].fill;
    for (let i = 0; i < 4; i++) {
      const t = 0.25 + i * 0.18;
      const sx = nx + (hx - nx) * t;
      const sy = ny + 8 + (hy - ny) * t;
      parts.push(`<path d="M${fmt(sx - 5)} ${fmt(sy)} l10 -3" stroke="${stripe}" stroke-width="2" stroke-linecap="round" opacity="0.8"/>`);
    }
  }
  if (p.nakedNeck === 'bowtie') parts.push(`<circle cx="${fmt((nx + hx) / 2 - 8)}" cy="${fmt((ny + hy) / 2 + 4)}" r="6" fill="${hackle.fill}" stroke="${hackle.ink}" stroke-width="1"/>`);

  // head
  const headFill = nakedNeck && p.nakedNeck === 'full' ? hackle.fill : hackle.fill;
  parts.push(`<circle cx="${fmt(hx)}" cy="${fmt(hy)}" r="15" fill="${headFill}" stroke="${hackle.ink}" stroke-width="1.3"/>`);
  if (p.earTufts) parts.push(`<path d="M${fmt(hx + 9)} ${fmt(hy - 2)} l16 -8 l-4 6 l6 4 l-16 3 z" fill="${hackle.fill}" stroke="${hackle.ink}" stroke-width="1"/>`);
  // beard & muffs
  if (p.beard) {
    parts.push(`<circle cx="${fmt(hx - 4)}" cy="${fmt(hy + 12)}" r="8" fill="${hackle.fill}" stroke="${hackle.ink}" stroke-width="1"/><circle cx="${fmt(hx + 7)}" cy="${fmt(hy + 9)}" r="8" fill="${hackle.fill}" stroke="${hackle.ink}" stroke-width="1"/><circle cx="${fmt(hx - 11)}" cy="${fmt(hy + 6)}" r="6" fill="${hackle.fill}" stroke="${hackle.ink}" stroke-width="1"/>`);
  }
  // wattles
  if (!p.beard) parts.push(`<ellipse cx="${fmt(hx - 6)}" cy="${fmt(hy + 15)}" rx="3.2" ry="5" fill="${skin.comb}" stroke="${skin.comb === '#d8402f' ? '#8c2418' : '#1f191f'}" stroke-width="0.8"/>`);
  // beak (open when crowing)
  if (pose.crow) parts.push(`<path d="M${fmt(hx - 13)} ${fmt(hy - 3)} l-13 -4 l12 6 z M${fmt(hx - 13)} ${fmt(hy + 1)} l-12 8 l13 -3 z" fill="${p.skin === 'black' ? '#3d353d' : '#e0b04c'}" stroke="${p.skin === 'black' ? '#1f191f' : '#8f6a1c'}" stroke-width="1"/>`);
  else parts.push(`<path d="M${fmt(hx - 13)} ${fmt(hy - 2)} l-13 4 l13 5 z" fill="${p.skin === 'black' ? '#3d353d' : '#e0b04c'}" stroke="${p.skin === 'black' ? '#1f191f' : '#8f6a1c'}" stroke-width="1"/>`);
  // eye
  parts.push(`<circle cx="${fmt(hx - 6)}" cy="${fmt(hy - 4)}" r="3" fill="#1c1a1e"/><circle cx="${fmt(hx - 7)}" cy="${fmt(hy - 5)}" r="1" fill="#fff"/>`);
  // comb
  parts.push(combSvg(p, hx, hy, skin.comb, skin.comb === '#d8402f' ? '#8c2418' : '#1f191f'));
  // crest (on top of comb)
  parts.push(crestSvg(p, hx, hy, hackle.fill, hackle.ink, seed));
  if (silkie && p.crest === 'none') parts.push(`<circle cx="${fmt(hx + 2)}" cy="${fmt(hy - 12)}" r="6" fill="${hackle.fill}" stroke="${hackle.ink}" stroke-width="0.9"/>`);

  const defs = `<defs><clipPath id="${clipId}"><ellipse rx="${fmt(cfg.rx)}" ry="${fmt(cfg.ry)}"/></clipPath><linearGradient id="${uid}-sheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3ddc84" stop-opacity="0.45"/><stop offset="0.5" stop-color="#3ddc84" stop-opacity="0"/><stop offset="1" stop-color="#7c4dff" stop-opacity="0.2"/></linearGradient></defs>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" class="chicken-svg ${opts.className ?? ''}" role="img" aria-label="Illustration of a chicken">${defs}<g transform="translate(${cx} ${groundY}) scale(${fmt(scale)})">${parts.join('')}</g></svg>`;
}

/** A small egg illustration for the incubator and cards. */
export function eggSvg(color: Phenotype['eggColor'], speckled: boolean, size: Phenotype['eggSize'] = 'medium', opts: { className?: string; uid?: string } = {}): string {
  const c = EGG_COLORS[color];
  const scale = { tiny: 0.72, small: 0.85, medium: 1, large: 1.1, jumbo: 1.22 }[size];
  let speck = '';
  if (speckled) {
    const rng = createRng(`${color}${size}`);
    for (let i = 0; i < 14; i++) speck += `<circle cx="${fmt(50 + (rng.next() - 0.5) * 44)}" cy="${fmt(58 + (rng.next() - 0.5) * 60)}" r="${fmt(1.2 + rng.next() * 1.6)}" fill="${c.ink}" opacity="0.7"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" class="egg-svg ${opts.className ?? ''}" role="img" aria-label="Egg"><g transform="translate(50 60) scale(${scale}) translate(-50 -60)"><path d="M50 8 C72 8 84 40 84 66 C84 92 68 110 50 110 C32 110 16 92 16 66 C16 40 28 8 50 8 z" fill="${c.fill}" stroke="${c.ink}" stroke-width="2"/><path d="M36 26 q-10 14 -8 34" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity="0.45"/>${speck}</g></svg>`;
}
