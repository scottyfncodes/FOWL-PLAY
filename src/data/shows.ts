import type { Phenotype } from '../genetics/phenotype';
import type { RarityInfo } from '../genetics/traits';

export interface ShowEntryInput {
  phenotype: Phenotype;
  traits: string[];
  rarity: RarityInfo;
  generation: number;
  breedCount: number;
}

export interface ShowCategory {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  /** Deterministic score 0..100. */
  score: (c: ShowEntryInput) => number;
  /** Judge's remark for a strong entry. */
  praise: string;
  /** Judge's remark for a weak entry. */
  shrug: string;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const sizeIdx = (p: Phenotype) => p.sizeScore; // 0..6
const crestIdx = (p: Phenotype) => ({ none: 0, small: 1, medium: 2, large: 3, giant: 4 })[p.crest];
const densityIdx = (p: Phenotype) => ({ sleek: 0, normal: 1, fluffy: 2, cloud: 3 })[p.density];

export const SHOW_CATEGORIES: ShowCategory[] = [
  {
    id: 'fluffiest',
    name: 'Fluffiest',
    emoji: '☁️',
    blurb: 'Judged on sheer volume of fluff.',
    score: ({ phenotype: p }) => clamp(densityIdx(p) * 22 + (p.featherType === 'silkie' ? 25 : p.featherType === 'sizzle' ? 30 : 0) + (p.tail === 'cushion' ? 10 : 0) + (p.legFeathering === 'heavy' ? 8 : p.legFeathering === 'light' ? 4 : 0) + (p.beard ? 6 : 0) + (p.shape === 'round' ? 6 : 0)),
    praise: 'The judge attempted to find the chicken inside the fluff and failed.',
    shrug: 'The judge could clearly see the outline of a chicken. Disqualifyingly aerodynamic.',
  },
  {
    id: 'bestCrest',
    name: 'Best Crest',
    emoji: '👑',
    blurb: 'Bigger is better. Vision is optional.',
    score: ({ phenotype: p }) => clamp(crestIdx(p) * 22 + (p.beard ? 8 : 0) + (p.featherType === 'silkie' || p.featherType === 'sizzle' ? 6 : 0) + (p.comb === 'vshaped' ? 4 : 0)),
    praise: 'A crest of such magnitude that the judge briefly mistook it for a second chicken.',
    shrug: 'The judge squinted, but no crest was forthcoming.',
  },
  {
    id: 'weirdestFeet',
    name: 'Weirdest Feet',
    emoji: '🦶',
    blurb: 'Toes, boots, hocks: the more going on down there, the better.',
    score: ({ phenotype: p }) => clamp((p.toes === 5 ? 30 : 0) + (p.legFeathering === 'heavy' ? 30 : p.legFeathering === 'light' ? 15 : 0) + (p.vultureHocks ? 22 : 0) + (p.legColor === 'black' ? 10 : p.legColor === 'willow' ? 8 : p.legColor === 'slate' ? 4 : 0) + ((p.featherType === 'frizzle' || p.featherType === 'frazzle') && p.legFeathering !== 'clean' ? 12 : 0)),
    praise: 'The judge asked to see the feet again, then asked to sit down.',
    shrug: 'Four toes, no feathers. The judge wrote "feet: present".',
  },
  {
    id: 'mostDramatic',
    name: 'Most Dramatic',
    emoji: '🎭',
    blurb: 'Personality, posture and a flair for the theatrical.',
    score: ({ phenotype: p }) => clamp((p.personality.includes('dramatic') ? 40 : 0) + (p.personality.includes('judgmental') ? 15 : 0) + (p.personality.includes('energetic') ? 10 : 0) + (p.shape === 'upright' ? 12 : 0) + (p.tail === 'squirrel' ? 10 : p.tail === 'flowing' || p.tail === 'endless' ? 12 : 0) + (p.crest !== 'none' ? 8 : 0) + (p.featherType === 'frizzle' || p.featherType === 'frazzle' ? 8 : 0) + (p.comb === 'vshaped' || p.comb === 'buttercup' ? 6 : 0)),
    praise: 'Entered the ring like it was owed money. The judge wept.',
    shrug: 'Stood there. Pecked at something. Left.',
  },
  {
    id: 'mostRidiculous',
    name: 'Most Ridiculous',
    emoji: '🤪',
    blurb: 'The judge counts everything unusual and adds it up.',
    score: ({ rarity }) => clamp(rarity.score * 3.2),
    praise: 'The judge laughed, then apologised, then laughed again.',
    shrug: 'A perfectly reasonable chicken. The judge was unmoved.',
  },
  {
    id: 'bestEgg',
    name: 'Best Egg',
    emoji: '🥚',
    blurb: 'Unusual colours and impressive sizes score highest.',
    score: ({ phenotype: p }) => clamp(({ white: 8, cream: 10, tinted: 14, brown: 22, darkBrown: 40, chocolate: 58, blue: 48, green: 58, olive: 70, plum: 85 })[p.eggColor] + (p.eggSpeckled ? 15 : 0) + ({ tiny: 8, small: 4, medium: 6, large: 10, jumbo: 18 })[p.eggSize] + (p.laying === 'prolific' ? 6 : 0)),
    praise: 'The judge held the egg up to the light and made a small, involuntary noise.',
    shrug: 'An egg. Beige. The judge has seen eggs before.',
  },
  {
    id: 'mostUnexpected',
    name: 'Most Unexpected',
    emoji: '❓',
    blurb: 'Rewards deep lineages and thoroughly mixed ancestry.',
    score: ({ generation, breedCount, rarity }) => clamp(Math.min(5, generation - 1) * 10 + Math.min(6, breedCount) * 7 + rarity.score * 1.2),
    praise: 'The judge could not guess what this was, and that is the highest compliment.',
    shrug: 'The judge guessed the breed on sight. Bit obvious, really.',
  },
  {
    id: 'tiny',
    name: 'Tiny Chicken',
    emoji: '🐥',
    blurb: 'Smallest wins. Fits-in-a-teacup energy.',
    score: ({ phenotype: p }) => clamp((6 - sizeIdx(p)) * 14 + (p.eggSize === 'tiny' ? 10 : 0) + (p.density === 'sleek' ? 4 : 0) + (p.tail === 'squirrel' ? 4 : 0)),
    praise: 'The judge nearly lost it in the straw. Superb.',
    shrug: 'Visible from space. Not what this category is about.',
  },
  {
    id: 'absoluteUnit',
    name: 'Absolute Unit',
    emoji: '🏔️',
    blurb: 'Biggest wins. Blocks-a-doorway energy.',
    score: ({ phenotype: p }) => clamp(sizeIdx(p) * 14 + densityIdx(p) * 3 + (p.legFeathering === 'heavy' ? 4 : 0) + (p.eggSize === 'jumbo' ? 6 : 0) + (p.shape === 'upright' ? 4 : 0)),
    praise: 'The judge asked whether it was, technically, still a chicken. It is. Barely.',
    shrug: 'The judge picked it up with one hand. Next.',
  },
];

export const SHOW_BY_ID: Record<string, ShowCategory> = Object.fromEntries(SHOW_CATEGORIES.map((c) => [c.id, c]));

export type Ribbon = 'none' | 'bronze' | 'silver' | 'gold';

export function ribbonFor(score: number): Ribbon {
  if (score >= 85) return 'gold';
  if (score >= 65) return 'silver';
  if (score >= 40) return 'bronze';
  return 'none';
}

export const RIBBON_LABEL: Record<Ribbon, string> = { none: 'No ribbon', bronze: 'Bronze ribbon', silver: 'Silver ribbon', gold: 'Gold ribbon' };
export const RIBBON_REWARD: Record<Ribbon, number> = { none: 0, bronze: 15, silver: 30, gold: 60 };
