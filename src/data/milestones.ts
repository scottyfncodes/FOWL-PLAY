import type { ChickenView } from '../chickens/chicken';

export interface MilestoneContext {
  /** All chickens the player has ever owned (coop + meadow). */
  all: ChickenView[];
  /** The chicken that just hatched, if this check follows a hatch. */
  hatched: ChickenView | null;
  hatchCount: number;
  discoveredTraits: ReadonlySet<string>;
  discoveredBreeds: ReadonlySet<string>;
  ribbons: Record<string, string>;
}

export interface MilestoneDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  reward: number;
  check: (ctx: MilestoneContext) => boolean;
}

const traitCount = (v: ChickenView) => v.traits.filter((t) => !t.startsWith('per.') && !t.startsWith('util.')).length;

export const MILESTONES: MilestoneDef[] = [
  { id: 'firstHatch', name: 'First Hatch', emoji: '🐣', description: 'Hatch your very first egg.', reward: 20, check: (c) => c.hatchCount >= 1 },
  { id: 'fiveHatches', name: 'Getting the Hang of It', emoji: '🥚', description: 'Hatch five eggs.', reward: 30, check: (c) => c.hatchCount >= 5 },
  { id: 'twentyHatches', name: 'Backyard Laboratory', emoji: '🔬', description: 'Hatch twenty eggs.', reward: 60, check: (c) => c.hatchCount >= 20 },
  { id: 'fiftyHatches', name: 'Unhinged Geneticist', emoji: '🧪', description: 'Hatch fifty eggs.', reward: 120, check: (c) => c.hatchCount >= 50 },
  { id: 'firstRare', name: 'First Rare Trait', emoji: '✨', description: 'Hatch a chicken with a rare trait.', reward: 30, check: (c) => !!c.hatched && c.hatched.traits.some((t) => ['rare', 'exotic', 'legendary'].includes(traitRarity(t))) },
  { id: 'firstExotic', name: 'Something Exotic', emoji: '🌟', description: 'Hatch a chicken with an exotic trait.', reward: 60, check: (c) => !!c.hatched && c.hatched.traits.some((t) => ['exotic', 'legendary'].includes(traitRarity(t))) },
  { id: 'firstLegendary', name: 'Legend of the Coop', emoji: '🏆', description: 'Hatch a chicken with a legendary trait.', reward: 150, check: (c) => !!c.hatched && c.hatched.traits.some((t) => traitRarity(t) === 'legendary') },
  { id: 'gen3', name: 'Three Generations Deep', emoji: '🌳', description: 'Hatch a third-generation chicken.', reward: 40, check: (c) => c.all.some((v) => v.chicken.generation >= 3) },
  { id: 'gen5', name: 'Family Tree', emoji: '🌲', description: 'Hatch a fifth-generation chicken.', reward: 80, check: (c) => c.all.some((v) => v.chicken.generation >= 5) },
  { id: 'fiveTraits', name: 'Loaded', emoji: '🎒', description: 'Hatch a chicken with fifteen or more visible traits.', reward: 40, check: (c) => !!c.hatched && traitCount(c.hatched) >= 15 },
  { id: 'mutation', name: 'Nobody Knows What Happened', emoji: '🧬', description: 'Hatch a chicken with a spontaneous mutation.', reward: 40, check: (c) => !!c.hatched && c.hatched.chicken.mutations.length > 0 },
  { id: 'bizarreEgg', name: 'Bizarre Egg', emoji: '🫒', description: 'Hatch a chicken that lays green, olive, chocolate or plum eggs.', reward: 40, check: (c) => c.all.some((v) => ['green', 'olive', 'chocolate', 'plum'].includes(v.phenotype.eggColor)) },
  { id: 'fourBreeds', name: 'Mongrel Magnificence', emoji: '🧩', description: 'Hatch a chicken with four or more breeds in its ancestry.', reward: 50, check: (c) => c.all.some((v) => Object.keys(v.chicken.ancestry).length >= 4) },
  { id: 'ridiculous', name: 'Truly Ridiculous', emoji: '🤡', description: 'Hatch a chicken of exotic or legendary rarity.', reward: 80, check: (c) => c.all.some((v) => v.chicken.origin === 'hatched' && (v.rarity.tier === 'exotic' || v.rarity.tier === 'legendary')) },
  { id: 'tenBreeds', name: 'Field Guide Regular', emoji: '📖', description: 'Discover ten breeds.', reward: 50, check: (c) => c.discoveredBreeds.size >= 10 },
  { id: 'twentyFiveBreeds', name: 'Serious Collector', emoji: '📚', description: 'Discover twenty-five breeds.', reward: 120, check: (c) => c.discoveredBreeds.size >= 25 },
  { id: 'twentyTraits', name: 'Trait Spotter', emoji: '🔍', description: 'Discover twenty traits.', reward: 40, check: (c) => c.discoveredTraits.size >= 20 },
  { id: 'fiftyTraits', name: 'Trait Hoarder', emoji: '🗂️', description: 'Discover fifty traits.', reward: 100, check: (c) => c.discoveredTraits.size >= 50 },
  { id: 'firstRibbon', name: 'Show Business', emoji: '🎀', description: 'Win a ribbon at the Chicken Show.', reward: 20, check: (c) => Object.values(c.ribbons).some((r) => r !== 'none') },
  { id: 'goldRibbon', name: 'Best in Show', emoji: '🥇', description: 'Win a gold ribbon.', reward: 60, check: (c) => Object.values(c.ribbons).includes('gold') },
  { id: 'silkieSurprise', name: 'Silkie Surprise', emoji: '☁️', description: 'Hatch a silkie-feathered chicken from two normal-feathered parents.', reward: 60, check: (c) => !!c.hatched && (c.hatched.phenotype.featherType === 'silkie' || c.hatched.phenotype.featherType === 'sizzle') && c.hatched.chicken.parents !== null && c.hatched.chicken.origin === 'hatched' && c.all.filter((v) => c.hatched!.chicken.parents!.includes(v.chicken.id)).every((v) => v.phenotype.featherType !== 'silkie' && v.phenotype.featherType !== 'sizzle') },
  { id: 'whiteSurprise', name: 'Colour From Nowhere', emoji: '🎨', description: 'Hatch a coloured chick from two white parents.', reward: 50, check: (c) => !!c.hatched && c.hatched.phenotype.primary !== 'white' && c.hatched.chicken.parents !== null && c.all.filter((v) => c.hatched!.chicken.parents!.includes(v.chicken.id)).length === 2 && c.all.filter((v) => c.hatched!.chicken.parents!.includes(v.chicken.id)).every((v) => v.phenotype.primary === 'white') },
];

export const MILESTONE_BY_ID: Record<string, MilestoneDef> = Object.fromEntries(MILESTONES.map((m) => [m.id, m]));

import { TRAIT_BY_ID } from './traits';
function traitRarity(id: string): string {
  return TRAIT_BY_ID[id]?.rarity ?? 'common';
}
