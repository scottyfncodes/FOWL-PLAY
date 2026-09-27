import { copies, has, type Genotype } from './loci';
import { createRng } from '../core/rng';

export type ColorId =
  | 'black' | 'blue' | 'splash' | 'lavender' | 'chocolate' | 'white'
  | 'gold' | 'red' | 'buff' | 'cream' | 'silver' | 'partridge' | 'wheaten' | 'straw' | 'dun';

export type PatternId = 'solid' | 'barred' | 'columbian' | 'laced' | 'pencilled' | 'spangled' | 'mottled';
export type FeatherType = 'normal' | 'silkie' | 'frizzle' | 'frazzle' | 'sizzle';
export type Density = 'sleek' | 'normal' | 'fluffy' | 'cloud';
export type CrestSize = 'none' | 'small' | 'medium' | 'large' | 'giant';
export type LegFeathering = 'clean' | 'light' | 'heavy';
export type CombType = 'single' | 'rose' | 'pea' | 'walnut' | 'vshaped' | 'buttercup' | 'strawberry';
export type NakedNeck = 'none' | 'bowtie' | 'full';
export type TailType = 'normal' | 'cushion' | 'flowing' | 'endless' | 'squirrel' | 'rumpless';
export type SizeClass = 'bantam' | 'small' | 'medium' | 'large' | 'giant' | 'colossal';
export type Shape = 'upright' | 'standard' | 'round';
export type SkinColor = 'yellow' | 'white' | 'black';
export type LegColor = 'yellow' | 'white' | 'slate' | 'willow' | 'black';
export type EggColor = 'white' | 'cream' | 'tinted' | 'brown' | 'darkBrown' | 'chocolate' | 'blue' | 'green' | 'olive' | 'plum';
export type EggSize = 'tiny' | 'small' | 'medium' | 'large' | 'jumbo';
export type Laying = 'occasional' | 'steady' | 'prolific';
export type Growth = 'slow' | 'steady' | 'fast';

export interface Phenotype {
  primary: ColorId;
  secondary: ColorId;
  /** Colour used for pattern markings (lacing, bars, spangles). */
  marking: ColorId;
  /** Neck (hackle) colour. */
  hackle: ColorId;
  /** Tail colour. */
  tailColor: ColorId;
  pattern: PatternId;
  barred: boolean;
  sheen: boolean;
  leakyWhite: boolean;
  featherType: FeatherType;
  density: Density;
  crest: CrestSize;
  beard: boolean;
  legFeathering: LegFeathering;
  vultureHocks: boolean;
  comb: CombType;
  nakedNeck: NakedNeck;
  tail: TailType;
  size: SizeClass;
  sizeScore: number;
  shape: Shape;
  skin: SkinColor;
  legColor: LegColor;
  toes: 4 | 5;
  earTufts: boolean;
  eggColor: EggColor;
  eggSpeckled: boolean;
  eggSize: EggSize;
  laying: Laying;
  personality: string[];
  growth: Growth;
  coldHardy: boolean;
  heatTolerant: boolean;
}

const SIZE_CLASSES: SizeClass[] = ['bantam', 'small', 'small', 'medium', 'large', 'giant', 'colossal'];
const EGG_SIZES: EggSize[] = ['tiny', 'small', 'medium', 'large', 'jumbo'];

/**
 * Turn a genotype into what you actually see.
 * `seed` drives the small amount of "variable expression" so the same chicken
 * always looks the same.
 */
export function computePhenotype(g: Genotype, seed: number | string): Phenotype {
  const rng = createRng(typeof seed === 'string' ? `pheno:${seed}` : seed ^ 0x9e3779b9);
  const vary = rng.next(); // one roll reused for variable expression decisions
  const vary2 = rng.next();

  // ---------- colour ----------
  const isWhite = copies(g, 'recWhite', 'c') === 2 || has(g, 'domWhite', 'I');
  const leakyWhite = has(g, 'domWhite', 'I') && copies(g, 'domWhite', 'I') === 1 && copies(g, 'recWhite', 'c') < 2 && vary < 0.35;
  const blueCopies = copies(g, 'dilute', 'Bl');
  const lav = copies(g, 'lavender', 'lav') === 2;
  const choc = copies(g, 'chocolate', 'choc') === 2;
  const silver = has(g, 'silver', 'S');
  const mahogany = has(g, 'mahogany', 'Mh');
  const buff = has(g, 'buffDilute', 'Di');

  let dark: ColorId = 'black';
  if (choc) dark = 'chocolate';
  else if (lav) dark = 'lavender';
  else if (blueCopies === 2) dark = 'splash';
  else if (blueCopies === 1) dark = 'blue';

  let light: ColorId;
  if (silver) light = lav ? 'cream' : 'silver';
  else if (buff) light = lav ? 'straw' : 'buff';
  else if (mahogany) light = lav ? 'straw' : 'red';
  else light = lav ? 'straw' : 'gold';

  const base = g.base;
  const baseRank = (a: string) => ({ E: 3, eWh: 2, eb: 1, 'e+': 0 })[a] ?? 0;
  const dominantBase = baseRank(base[0]) >= baseRank(base[1]) ? base[0] : base[1];

  let primary: ColorId;
  let secondary: ColorId;
  let marking: ColorId = dark;
  switch (dominantBase) {
    case 'E':
      primary = dark;
      secondary = dark;
      marking = light;
      break;
    case 'eWh':
      primary = silver ? 'cream' : buff ? 'buff' : mahogany ? 'red' : 'wheaten';
      // Buff dilution on a wheaten base gives an even, self-coloured bird.
      secondary = buff && !silver ? primary : dark;
      break;
    case 'eb':
      primary = silver ? 'silver' : dark === 'blue' ? 'dun' : lav ? 'straw' : 'partridge';
      secondary = light;
      break;
    default: // e+
      primary = light;
      secondary = dark;
  }

  // ---------- pattern ----------
  const patRank: Record<string, number> = { Co: 4, Lg: 3, Pg: 2, Sp: 1, wt: 0 };
  const patAllele = (patRank[g.pattern[0]] ?? 0) >= (patRank[g.pattern[1]] ?? 0) ? g.pattern[0] : g.pattern[1];
  let pattern: PatternId = 'solid';
  const mottled = copies(g, 'mottle', 'mo') === 2;
  if (patAllele === 'Co') {
    pattern = 'columbian';
    // Columbian pushes colour to the neck/tail; body becomes light.
    primary = dominantBase === 'E' ? light : primary;
    secondary = dark;
  } else if (patAllele === 'Lg') {
    pattern = 'laced';
    marking = dark;
    if (dominantBase === 'E') {
      primary = light;
      secondary = dark;
    }
  } else if (patAllele === 'Pg') {
    pattern = 'pencilled';
    marking = dark;
    if (dominantBase === 'E') {
      primary = light;
      secondary = dark;
    }
  } else if (patAllele === 'Sp') {
    pattern = 'spangled';
    marking = dark;
    if (dominantBase === 'E') {
      primary = light;
      secondary = dark;
    }
  } else if (mottled) {
    pattern = 'mottled';
    marking = 'white';
  }
  if (mottled && pattern === 'columbian') {
    // Mille fleur: mottling on a columbian base keeps the columbian body but adds white tips.
    marking = 'white';
  }
  const barred = has(g, 'barring', 'B');

  if (isWhite) {
    primary = 'white';
    secondary = 'white';
    marking = leakyWhite ? 'black' : 'white';
    pattern = 'solid';
  }

  // Region colours for the illustration.
  let hackle: ColorId;
  let tailColor: ColorId = secondary;
  if (isWhite) {
    hackle = 'white';
    tailColor = 'white';
  } else if (pattern === 'columbian') {
    hackle = dark;
    tailColor = dark;
  } else if (dominantBase === 'E') {
    hackle = primary;
  } else if (dominantBase === 'eWh') {
    hackle = primary;
  } else {
    hackle = light;
  }
  if (pattern === 'laced' || pattern === 'pencilled' || pattern === 'spangled') {
    hackle = primary;
    tailColor = marking;
  }
  if (pattern === 'mottled') hackle = primary;

  const sheen = has(g, 'sheen', 'Sh') && !isWhite && (primary === 'black' || secondary === 'black');

  // ---------- feathers ----------
  const silkie = copies(g, 'silkie', 'h') === 2;
  const frizzleCopies = copies(g, 'frizzle', 'F');
  let featherType: FeatherType = 'normal';
  if (silkie && frizzleCopies > 0) featherType = 'sizzle';
  else if (silkie) featherType = 'silkie';
  else if (frizzleCopies === 2) featherType = 'frazzle';
  else if (frizzleCopies === 1) featherType = 'frizzle';

  const fluffCount = copies(g, 'fluff1', 'Fl') + copies(g, 'fluff2', 'Fl');
  let density: Density = fluffCount === 0 ? 'sleek' : fluffCount <= 2 ? 'normal' : fluffCount === 3 ? 'fluffy' : 'cloud';
  if (featherType === 'frazzle') density = 'sleek';
  if (silkie && density === 'normal') density = 'fluffy';

  // ---------- head ----------
  const crestCopies = copies(g, 'crest', 'Cr');
  let crest: CrestSize = 'none';
  if (crestCopies > 0) {
    const score = crestCopies + copies(g, 'crestSize', 'big');
    crest = (['small', 'small', 'medium', 'large', 'giant'] as CrestSize[])[score] ?? 'giant';
  }
  const beard = has(g, 'beard', 'Mb');

  const pea = has(g, 'peaComb', 'P');
  const rose = has(g, 'roseComb', 'R');
  const duplex = has(g, 'duplexComb', 'D');
  let comb: CombType;
  if (pea && rose) comb = 'walnut';
  else if (pea) comb = duplex ? 'strawberry' : 'pea';
  else if (rose) comb = duplex ? 'buttercup' : 'rose';
  else comb = duplex ? 'vshaped' : 'single';

  const naCopies = copies(g, 'nakedNeck', 'Na');
  const nakedNeck: NakedNeck = naCopies === 2 ? 'full' : naCopies === 1 ? 'bowtie' : 'none';
  const earTufts = has(g, 'earTufts', 'Et');

  // ---------- body ----------
  const sizeScore = copies(g, 'size1', 'L') + copies(g, 'size2', 'L') + copies(g, 'size3', 'L');
  const size = SIZE_CLASSES[sizeScore] ?? 'medium';
  const post = g.posture;
  const pScore = (a: string) => ({ up: 0, st: 1, rd: 2 })[a] ?? 1;
  const postureSum = pScore(post[0]) + pScore(post[1]);
  const shape: Shape = postureSum <= 1 ? 'upright' : postureSum >= 3 ? 'round' : 'standard';

  let tail: TailType = 'normal';
  const longTail = copies(g, 'longTail', 'lt') === 2;
  if (has(g, 'rumpless', 'Rp')) tail = 'rumpless';
  else if (longTail && copies(g, 'endlessTail', 'nm') === 2) tail = 'endless';
  else if (longTail) tail = 'flowing';
  else if (has(g, 'squirrelTail', 'Sq')) tail = 'squirrel';
  else if (shape === 'round' && (density === 'fluffy' || density === 'cloud')) tail = 'cushion';

  // ---------- legs ----------
  const ptiCount = copies(g, 'legFeather1', 'Pti') + copies(g, 'legFeather2', 'Pti');
  const legFeathering: LegFeathering = ptiCount === 0 ? 'clean' : ptiCount <= 2 ? 'light' : 'heavy';
  const vultureHocks = copies(g, 'vulture', 'v') === 2 && legFeathering !== 'clean';
  const fibro = has(g, 'fibro', 'Fm');
  const skin: SkinColor = fibro ? 'black' : has(g, 'skin', 'W') ? 'white' : 'yellow';
  const darkLegs = copies(g, 'dermal', 'id') === 2;
  let legColor: LegColor;
  if (fibro) legColor = 'black';
  else if (darkLegs) legColor = skin === 'yellow' ? 'willow' : 'slate';
  else legColor = skin === 'yellow' ? 'yellow' : 'white';
  const toes: 4 | 5 = has(g, 'polydactyl', 'Po') ? 5 : 4;

  // ---------- eggs ----------
  const brown = copies(g, 'brown1', 'Br') + copies(g, 'brown2', 'Br') + copies(g, 'brown3', 'Br');
  const blue = has(g, 'blueEgg', 'O');
  let eggColor: EggColor;
  if (blue) eggColor = brown <= 1 ? 'blue' : brown <= 3 ? 'green' : 'olive';
  else eggColor = (['white', 'cream', 'tinted', 'brown', 'brown', 'darkBrown', 'chocolate'] as EggColor[])[brown] ?? 'brown';
  if (!blue && copies(g, 'bloom', 'pk') === 2 && brown >= 1) eggColor = 'plum';
  const eggSpeckled = copies(g, 'speckle', 'sp') === 2 && eggColor !== 'white';
  const eggScore = Math.round(sizeScore / 2) + copies(g, 'eggSize', 'EL');
  const eggSize = EGG_SIZES[Math.min(4, eggScore)] ?? 'medium';
  const layScore = (a: string) => ({ hi: 2, mid: 1, lo: 0 })[a] ?? 1;
  const laySum = layScore(g.laying[0]) + layScore(g.laying[1]);
  const laying: Laying = laySum >= 4 ? 'prolific' : laySum <= 1 ? 'occasional' : 'steady';

  // ---------- personality (dominance ranks, with a little variable expression) ----------
  const temperRank: Record<string, number> = { energetic: 2, curious: 1, calm: 0 };
  const socialRank: Record<string, number> = { stubborn: 3, aloof: 2, friendly: 1, social: 0 };
  const flairRank: Record<string, number> = { dramatic: 3, judgmental: 2, dignified: 1, none: 0 };
  const express = (pair: [string, string], rank: Record<string, number>, roll: number) => {
    const [a, b] = pair;
    if (a === b) return a;
    const dom = (rank[a] ?? 0) >= (rank[b] ?? 0) ? a : b;
    const rec = dom === a ? b : a;
    return roll < 0.2 ? rec : dom; // 20% of the time the "recessive" personality shows through
  };
  const personality = [express(g.temper, temperRank, vary), express(g.social, socialRank, vary2)];
  const flair = express(g.flair, flairRank, (vary + vary2) % 1);
  if (flair !== 'none') personality.push(flair);

  const growthCopies = copies(g, 'growth', 'fast');
  const growth: Growth = growthCopies === 2 ? 'fast' : growthCopies === 1 ? 'steady' : 'slow';

  const smallComb = comb === 'pea' || comb === 'rose' || comb === 'walnut' || comb === 'strawberry';
  const coldHardy = smallComb && density !== 'sleek' && sizeScore >= 3;
  const heatTolerant = nakedNeck !== 'none' || (density === 'sleek' && comb === 'single' && sizeScore <= 3);

  return {
    primary,
    secondary,
    marking,
    hackle,
    tailColor,
    pattern,
    barred: barred && !isWhite,
    sheen,
    leakyWhite,
    featherType,
    density,
    crest,
    beard,
    legFeathering,
    vultureHocks,
    comb,
    nakedNeck,
    tail,
    size,
    sizeScore,
    shape,
    skin,
    legColor,
    toes,
    earTufts,
    eggColor,
    eggSpeckled,
    eggSize,
    laying,
    personality,
    growth,
    coldHardy,
    heatTolerant,
  };
}
