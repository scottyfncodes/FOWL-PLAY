import type { Phenotype } from './phenotype';

/**
 * What a chicken can physically DO, derived from what it IS.
 *
 * Abilities are the bridge between the genetics engine and the farm: every
 * obstacle out there checks one or more of these numbers. Most abilities are
 * combinations, so a useful chicken usually needs several genes at once, and
 * a chicken can carry a promising gene without being able to use it (big
 * wings on a heavy body, digging claws under feathered feet, webbed feet on
 * a fluffball). Discovering those rules is the game.
 */
export interface Abilities {
  /** 0..6, straight from body size. Weight matters for pressure plates and gaps. */
  weight: number;
  /** Fits through gaps most chickens cannot. */
  tiny: boolean;
  /** 0..5: pushes crates, breaks weak boards. */
  strength: number;
  /** 0..5 running pace. A fox runs at about 4. */
  speed: number;
  /** 1..6 jump power. */
  jump: number;
  /** How high the beak can get: jump plus a bonus for long legs. */
  reach: number;
  longLegs: boolean;
  /** Can wade through shallow water. */
  wade: boolean;
  /** Extra flap in the air and a slow, drifting fall. */
  glide: boolean;
  swim: boolean;
  /** 0..2 pecking power. */
  beak: number;
  climb: boolean;
  dig: boolean;
  /** 0..3 volume of the crow. */
  crow: number;
  sneaky: boolean;
  brave: boolean;
  aggressive: boolean;
  skittish: boolean;
  curious: boolean;
  greedy: boolean;
  calm: boolean;
}

export type SizeWord = 'tiny' | 'small' | 'medium' | 'large' | 'giant';

export function sizeWord(weight: number): SizeWord {
  if (weight <= 0) return 'tiny';
  if (weight <= 2) return 'small';
  if (weight === 3) return 'medium';
  if (weight === 4) return 'large';
  return 'giant';
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function abilitiesOf(p: Phenotype): Abilities {
  const weight = p.sizeScore;
  const heavy = weight >= 5;
  const fluffy = p.density === 'fluffy' || p.density === 'cloud';
  const silkie = p.featherType === 'silkie' || p.featherType === 'sizzle';
  const curly = p.featherType === 'frizzle' || p.featherType === 'frazzle' || p.featherType === 'sizzle';
  const longLegs = p.longLegs;

  const strength = clamp(Math.floor(weight / 2) + p.brawn, 0, 5);
  const speed = clamp(2 + p.pace + (longLegs ? 1 : 0) - (heavy ? 1 : 0) - (p.density === 'cloud' ? 1 : 0), 0, 5);
  const lightEnough = weight <= 2;
  const glide = p.bigWings && lightEnough && !curly && !silkie && p.density !== 'cloud' && p.tail !== 'rumpless';
  const springy = p.spring === 2;
  const jump = clamp(2 + (springy ? 2 : 0) + (longLegs ? 1 : 0) + (glide ? 1 : 0) - (heavy ? 1 : 0) - (silkie ? 1 : 0), 1, 6);
  const swim = p.webbed && !fluffy && !silkie;
  const climb = p.gripGene + (p.toes === 5 ? 1 : 0) >= 2 && !silkie;
  const dig = p.digger && p.legFeathering === 'clean';
  const noisy = p.habit === 'noisy';
  const crow = clamp(p.crowGene + (noisy ? 1 : 0), 0, 3);

  return {
    weight,
    tiny: weight <= 0,
    strength,
    speed,
    jump,
    reach: jump + (longLegs ? 1 : 0),
    longLegs,
    wade: longLegs,
    glide,
    swim,
    beak: p.beakStrength,
    climb,
    dig,
    crow,
    sneaky: p.habit === 'sneaky',
    brave: p.nerve === 'brave' || p.nerve === 'aggressive',
    aggressive: p.nerve === 'aggressive',
    skittish: p.nerve === 'skittish',
    curious: p.personality.includes('curious'),
    greedy: p.habit === 'greedy',
    calm: p.personality.includes('calm'),
  };
}

// ---------------------------------------------------------------------------
// Ability catalogue: player-facing names, icons and explanations.
// ---------------------------------------------------------------------------

export interface AbilityDef {
  id: string;
  name: string;
  emoji: string;
  /** What it lets the chicken do out on the farm. */
  does: string;
  /** Breeding note revealed in the Fowldex once discovered. */
  breeding: string;
  /** Level shown on the badge, if any. Null hides the badge. */
  level: (a: Abilities) => number | null;
  /** Show as a flaw rather than a strength. */
  flaw?: boolean;
}

const yes = (b: boolean) => (b ? 1 : null);

export const ABILITIES: AbilityDef[] = [
  { id: 'tiny', name: 'Tiny', emoji: '🐜', does: 'Squeezes through gaps, pipes and cat flaps.', breeding: 'Comes from a very small body. Two small parents give the best odds; big chickens can still carry small.', level: (a) => yes(a.tiny) },
  { id: 'heavy', name: 'Heavy', emoji: '⚖️', does: 'Presses heavy pressure plates just by standing on them.', breeding: 'Body size adds up across three size genes. Two giant parents make giant chicks.', level: (a) => (a.weight >= 5 ? a.weight - 3 : null) },
  { id: 'strong', name: 'Strong', emoji: '💪', does: 'Shoves crates and breaks weak boards. Higher is stronger.', breeding: 'Size gives some strength; the brawny gene (dominant) adds more.', level: (a) => (a.strength >= 2 ? a.strength : null) },
  { id: 'fast', name: 'Fast', emoji: '💨', does: 'Outruns things with teeth. A fox runs at 4.', breeding: 'Quick and slow pace genes add up. Long legs help; a giant body slows things down.', level: (a) => (a.speed >= 3 ? a.speed : null) },
  { id: 'jumper', name: 'High Jumper', emoji: '🦘', does: 'Clears fences and reaches ledges. Higher is higher.', breeding: 'Springy legs (recessive: two copies), long legs and glide-ready wings all add jump. Heavy bodies and silkie fluff subtract.', level: (a) => (a.jump >= 3 ? a.jump : null) },
  { id: 'longLegs', name: 'Long Legs', emoji: '🦵', does: 'Reaches high latches and wades through shallow water.', breeding: 'Recessive: needs the long-leg gene from both parents. Ordinary-looking chickens often carry one.', level: (a) => yes(a.longLegs) },
  { id: 'glide', name: 'Glider', emoji: '🪽', does: 'Flaps once more in the air and floats down slowly. Crosses gaps and drops from heights.', breeding: 'Big wings (dominant) on a small body with smooth feathers. Frizzle, silkie fluff or a missing tail keep it grounded.', level: (a) => yes(a.glide) },
  { id: 'swim', name: 'Swimmer', emoji: '🏊', does: 'Crosses deep water.', breeding: 'Webbed feet (recessive, both parents) plus feathers that shed water. Fluffy chickens sink.', level: (a) => yes(a.swim) },
  { id: 'beak', name: 'Strong Beak', emoji: '🔨', does: 'Pecks through boards and latches other beaks bounce off.', breeding: 'Dominant beak gene. Two copies for the hardest jobs.', level: (a) => (a.beak >= 1 ? a.beak : null) },
  { id: 'climb', name: 'Climber', emoji: '🧗', does: 'Scrambles up rough walls, posts and trellises.', breeding: 'Recessive grip gene, or one copy plus a fifth toe. Silkie fluff snags on everything, so silkies themselves stay on the ground.', level: (a) => yes(a.climb) },
  { id: 'dig', name: 'Digger', emoji: '⛏️', does: 'Burrows through soft soil to whatever is on the other side.', breeding: 'Recessive digging gene. Feathered legs get in the way, so clean legs only.', level: (a) => yes(a.dig) },
  { id: 'crow', name: 'Loud Crow', emoji: '📯', does: 'Scares off crows, wakes sleepers, gets attention. Louder is better.', breeding: 'Dominant crow gene. A noisy personality adds a level.', level: (a) => (a.crow >= 1 ? a.crow : null) },
  { id: 'sneaky', name: 'Sneaky', emoji: '🥷', does: 'Predators and people notice it much later.', breeding: 'Mostly recessive habit. Two sneaky parents, or carriers with luck.', level: (a) => yes(a.sneaky) },
  { id: 'brave', name: 'Brave', emoji: '🛡️', does: 'Does not freeze. Stands its ground against small threats.', breeding: 'Brave nerve is dominant over steady and skittish.', level: (a) => yes(a.brave && !a.aggressive) },
  { id: 'aggressive', name: 'Aggressive', emoji: '😤', does: 'Chases off crows and anything smaller than a fox.', breeding: 'Rare dominant nerve gene.', level: (a) => yes(a.aggressive) },
  { id: 'curious', name: 'Curious', emoji: '🔍', does: 'Notices hidden routes that others walk straight past.', breeding: 'A common temperament. Blends from both parents.', level: (a) => yes(a.curious) },
  { id: 'greedy', name: 'Greedy', emoji: '🌽', does: 'Finds half again as much corn.', breeding: 'Dominant habit.', level: (a) => yes(a.greedy) },
  { id: 'skittish', name: 'Skittish', emoji: '😱', does: 'Freezes for a moment when something scary shows up. A flaw, mostly.', breeding: 'Mostly recessive nerve gene.', level: (a) => yes(a.skittish), flaw: true },
];

export const ABILITY_BY_ID: Record<string, AbilityDef> = Object.fromEntries(ABILITIES.map((a) => [a.id, a]));

export interface AbilityBadge {
  id: string;
  level: number;
  def: AbilityDef;
}

/** Badges worth showing for a chicken, strengths first. */
export function abilityBadges(a: Abilities): AbilityBadge[] {
  const out: AbilityBadge[] = [];
  for (const def of ABILITIES) {
    const level = def.level(a);
    if (level !== null) out.push({ id: def.id, level, def });
  }
  return out;
}

/** Ids of every ability this chicken expresses (used for discovery tracking). */
export function abilityIds(a: Abilities): string[] {
  return abilityBadges(a).map((b) => b.id);
}

/** The recessive/hidden genes that matter on the farm, for carrier detection. */
export const CARRIER_GENES: { locus: 'legLen' | 'web' | 'grip' | 'dig' | 'spring' | 'habit' | 'nerve'; allele: string; abilityId: string; name: string }[] = [
  { locus: 'legLen', allele: 'lg', abilityId: 'longLegs', name: 'long legs' },
  { locus: 'web', allele: 'wb', abilityId: 'swim', name: 'webbed feet' },
  { locus: 'grip', allele: 'gr', abilityId: 'climb', name: 'climbing grip' },
  { locus: 'dig', allele: 'dg', abilityId: 'dig', name: 'digging claws' },
  { locus: 'spring', allele: 'Jp', abilityId: 'jumper', name: 'springy legs' },
  { locus: 'habit', allele: 'sneaky', abilityId: 'sneaky', name: 'sneakiness' },
  { locus: 'nerve', allele: 'skittish', abilityId: 'skittish', name: 'skittishness' },
];
