import type { Phenotype } from './phenotype';
import { RARITY_WEIGHT, TRAIT_BY_ID, type TraitRarity } from '../data/traits';

const COLOR_TRAIT: Record<string, string> = {
  black: 'col.black',
  white: 'col.white',
  gold: 'col.gold',
  red: 'col.red',
  buff: 'col.buff',
  cream: 'col.cream',
  silver: 'col.silver',
  partridge: 'col.partridge',
  wheaten: 'col.wheaten',
  blue: 'col.blue',
  splash: 'col.splash',
  lavender: 'col.lavender',
  chocolate: 'col.chocolate',
  straw: 'col.straw',
  dun: 'col.dun',
};

/** Derive the list of trait tags a phenotype expresses. Order = display order. */
export function traitsOf(p: Phenotype): string[] {
  const out: string[] = [];
  const add = (id: string) => {
    if (!TRAIT_BY_ID[id]) throw new Error(`traitsOf produced unknown trait ${id}`);
    if (!out.includes(id)) out.push(id);
  };

  // --- combos first so they lead the reveal ---
  const blackish = p.primary === 'black' && p.secondary === 'black';
  if (blackish && p.skin === 'black' && p.legColor === 'black' && p.sheen) add('combo.void');
  if (p.pattern === 'columbian' && p.marking === 'white' && (p.primary === 'buff' || p.primary === 'straw' || p.primary === 'red' || p.primary === 'gold')) {
    add(p.primary === 'straw' || p.secondary === 'lavender' ? 'pat.porcelain' : 'pat.milleFleur');
  }
  if (p.pattern === 'laced' && (p.marking === 'blue' || p.secondary === 'blue')) add('pat.blueLaced');
  if (p.barred && p.pattern === 'columbian') add('pat.barredColumbian');
  else if (p.barred && p.primary === 'black') add('pat.cuckoo');
  else if (p.barred && (p.primary === 'gold' || p.primary === 'red')) add('pat.crele');
  if (p.tail === 'endless') add('body.endlessTail');
  if (p.featherType === 'sizzle') add('fea.sizzle');
  if (p.crest !== 'none' && p.beard && p.legFeathering !== 'clean' && p.toes === 5) add('combo.dandy');
  else if (p.crest !== 'none' && p.beard) add('combo.fullRegalia');
  if ((p.featherType === 'frizzle' || p.featherType === 'frazzle') && p.legFeathering !== 'clean') add('combo.curlyBoots');
  if (p.size === 'bantam' && p.shape === 'upright' && p.tail === 'squirrel') add('combo.pocket');

  // --- colour ---
  const c1 = COLOR_TRAIT[p.primary];
  if (c1) add(c1);
  const c2 = COLOR_TRAIT[p.secondary];
  const specialSecondary = ['blue', 'splash', 'lavender', 'chocolate', 'dun', 'straw'];
  if (c2 && p.secondary !== p.primary && p.primary !== 'white' && specialSecondary.includes(p.secondary)) add(c2);
  if (p.sheen) add('col.sheen');
  if (p.leakyWhite) add('col.leaky');

  // --- pattern ---
  if (p.primary !== 'white') {
    if (p.pattern === 'barred') add('pat.barred');
    if (p.pattern === 'columbian') add('pat.columbian');
    if (p.pattern === 'laced') add('pat.laced');
    if (p.pattern === 'pencilled') add('pat.pencilled');
    if (p.pattern === 'spangled') add('pat.spangled');
    if (p.pattern === 'mottled' || (p.marking === 'white' && p.pattern === 'columbian')) add('pat.mottled');
    if (p.barred) add('pat.barred');
  }

  // --- feathers ---
  if (p.featherType === 'silkie') add('fea.silkie');
  if (p.featherType === 'frizzle') add('fea.frizzle');
  if (p.featherType === 'frazzle') add('fea.frazzle');
  if (p.density === 'sleek') add('fea.sleek');
  if (p.density === 'fluffy') add('fea.fluffy');
  if (p.density === 'cloud') add('fea.cloud');
  if (p.nakedNeck === 'full') add('fea.nakedNeck');
  if (p.nakedNeck === 'bowtie') add('fea.bowtie');

  // --- head ---
  if (p.crest === 'giant') add('head.giantCrest');
  else if (p.crest === 'large') add('head.bigCrest');
  else if (p.crest !== 'none') add('head.crest');
  if (p.beard) add('head.beard');
  add(`head.${p.comb}`);
  if (p.earTufts) add('head.earTufts');

  // --- body ---
  add(`body.${p.size}`);
  if (p.shape === 'upright') add('body.upright');
  if (p.shape === 'round') add('body.round');
  if (p.tail === 'flowing') add('body.flowingTail');
  if (p.tail === 'squirrel') add('body.squirrel');
  if (p.tail === 'cushion') add('body.cushion');
  if (p.tail === 'rumpless') add('body.rumpless');

  // --- legs ---
  if (p.legFeathering === 'heavy') add('leg.boots');
  else if (p.legFeathering === 'light') add('leg.feathered');
  if (p.vultureHocks) add('leg.vulture');
  if (p.toes === 5) add('leg.fiveToes');
  add(`leg.${p.legColor}`);

  // --- eggs ---
  add(`egg.${p.eggColor}`);
  if (p.eggSpeckled) add('egg.speckled');
  if (p.eggSize === 'tiny') add('egg.tiny');
  if (p.eggSize === 'jumbo') add('egg.jumbo');
  if (p.laying === 'prolific') add('egg.prolific');
  if (p.laying === 'occasional') add('egg.occasional');

  // --- personality ---
  for (const per of p.personality) add(`per.${per}`);

  // --- utility ---
  if (p.coldHardy) add('util.coldHardy');
  if (p.heatTolerant) add('util.heatTolerant');
  if (p.growth === 'fast') add('util.fastGrower');
  if (p.growth === 'slow') add('util.slowGrower');

  return out;
}

export type RarityTier = 'common' | 'uncommon' | 'rare' | 'exotic' | 'legendary';

export interface RarityInfo {
  tier: RarityTier;
  score: number;
}

/** Rarity is the sum of the rarity weights of everything the chicken expresses. */
export function rarityOf(traits: string[]): RarityInfo {
  let score = 0;
  let top: TraitRarity = 'common';
  for (const id of traits) {
    const t = TRAIT_BY_ID[id];
    if (!t) continue;
    score += RARITY_WEIGHT[t.rarity];
    if (RARITY_WEIGHT[t.rarity] > RARITY_WEIGHT[top]) top = t.rarity;
  }
  let tier: RarityTier;
  if (top === 'legendary' || score >= 26) tier = 'legendary';
  else if (top === 'exotic' || score >= 16) tier = 'exotic';
  else if (score >= 9) tier = 'rare';
  else if (score >= 4) tier = 'uncommon';
  else tier = 'common';
  return { tier, score };
}

export const RARITY_LABEL: Record<RarityTier, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  exotic: 'Exotic',
  legendary: 'Legendary',
};
