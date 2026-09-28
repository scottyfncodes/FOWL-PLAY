import { createRng, type Rng } from '../core/rng';
import { LOCI, type Genotype, type LocusId } from './loci';
import { computePhenotype } from './phenotype';
import { traitsOf } from './traits';
import { makeId } from '../core/ids';
import type { Chicken } from '../chickens/chicken';
import { TRAIT_BY_ID } from '../data/traits';

export interface BreedingResult {
  child: Chicken;
  seed: number;
  mutations: LocusId[];
}

/** Distinct breeds anywhere in the ancestry (capped for mutation maths). */
function ancestryDiversity(a: Chicken, b: Chicken): number {
  const set = new Set([...Object.keys(a.ancestry), ...Object.keys(b.ancestry)]);
  return set.size;
}

/**
 * Per-locus mutation probability. Purebred first-generation pairs rarely
 * mutate; mixed, many-generation lines mutate a little more. Mixing is
 * rewarded, but never dominates ordinary inheritance.
 */
export function mutationRate(a: Chicken, b: Chicken): number {
  const diversity = Math.min(5, ancestryDiversity(a, b));
  const gen = Math.min(5, Math.max(a.generation, b.generation));
  return 0.0015 + 0.0008 * diversity + 0.0004 * gen;
}

/** Mendelian inheritance: one random allele from each parent per locus, with a small mutation chance. */
export function inheritGenotype(a: Genotype, b: Genotype, rng: Rng, rate: number): { genotype: Genotype; mutations: LocusId[] } {
  const genotype = {} as Genotype;
  const mutations: LocusId[] = [];
  for (const locus of LOCI) {
    const pa = a[locus.id];
    const pb = b[locus.id];
    let fromA = rng.chance(0.5) ? pa[0] : pa[1];
    let fromB = rng.chance(0.5) ? pb[0] : pb[1];
    if (locus.mutations.length > 0 && rng.chance(rate * (locus.mutability ?? 1))) {
      const options = locus.mutations.filter((m) => m.allele !== fromA && m.allele !== fromB);
      if (options.length > 0) {
        const chosen = rng.weighted(options, options.map((m) => m.weight)).allele;
        if (rng.chance(0.5)) fromA = chosen;
        else fromB = chosen;
        mutations.push(locus.id);
      }
    }
    genotype[locus.id] = [fromA, fromB];
  }
  return { genotype, mutations };
}

export function mergeAncestry(a: Chicken, b: Chicken): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(a.ancestry)) out[k] = (out[k] ?? 0) + v / 2;
  for (const [k, v] of Object.entries(b.ancestry)) out[k] = (out[k] ?? 0) + v / 2;
  // Round to keep the save tidy and drop vanishing traces.
  for (const k of Object.keys(out)) {
    out[k] = Math.round((out[k] ?? 0) * 10000) / 10000;
    if ((out[k] ?? 0) < 0.002) delete out[k];
  }
  const total = Object.values(out).reduce((s, v) => s + v, 0) || 1;
  for (const k of Object.keys(out)) out[k] = (out[k] ?? 0) / total;
  return out;
}

/** Breed two chickens. Fully determined by `seed` (except the child's id). */
export function breedChickens(a: Chicken, b: Chicken, seed: number, name: string): BreedingResult {
  const rng = createRng(seed);
  const { genotype, mutations } = inheritGenotype(a.genotype, b.genotype, rng, mutationRate(a, b));
  const child: Chicken = {
    id: makeId('ck'),
    name,
    generation: Math.max(a.generation, b.generation) + 1,
    parents: [a.id, b.id],
    ancestry: mergeAncestry(a, b),
    genotype,
    seed: rng.int(0, 0x7fffffff),
    breedingSeed: seed,
    born: Date.now(),
    origin: 'hatched',
    status: 'coop',
    favorite: false,
    mutations,
    no: 0,
    knownGenes: [],
  };
  return { child, seed, mutations };
}

export interface TraitOdds {
  traitId: string;
  /** 0..1 */
  chance: number;
}

export interface BreedingPreview {
  certain: TraitOdds[];
  likely: TraitOdds[];
  possible: TraitOdds[];
  /** Traits with real odds that the player has not discovered yet. */
  unknownCount: number;
  /** Total number of traits that could appear. */
  totalOutcomes: number;
}

/**
 * Preview a pairing by simulating many offspring with a fixed seed.
 * Everything here comes straight from the same inheritance rules, so the
 * preview is honest: it never promises something the engine can't produce.
 */
export function previewPairing(a: Chicken, b: Chicken, discovered: ReadonlySet<string>, samples = 160): BreedingPreview {
  const rng = createRng(`preview:${a.id}:${b.id}`);
  const counts = new Map<string, number>();
  const rate = mutationRate(a, b);
  for (let i = 0; i < samples; i++) {
    const { genotype } = inheritGenotype(a.genotype, b.genotype, rng, rate);
    const traits = traitsOf(computePhenotype(genotype, rng.int(0, 0x7fffffff)));
    for (const t of traits) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  const odds: TraitOdds[] = [...counts.entries()].map(([traitId, n]) => ({ traitId, chance: n / samples }));
  const interesting = odds.filter((o) => {
    const def = TRAIT_BY_ID[o.traitId];
    return def && def.category !== 'personality' && !(def.rarity === 'common' && (def.category === 'legs' || def.category === 'egg' || def.category === 'body' || def.category === 'utility'));
  });
  const byChance = (x: TraitOdds, y: TraitOdds) => y.chance - x.chance;
  const certain = interesting.filter((o) => o.chance >= 0.97).sort(byChance);
  const likely = interesting.filter((o) => o.chance >= 0.35 && o.chance < 0.97).sort(byChance);
  const possible = interesting.filter((o) => o.chance >= 0.04 && o.chance < 0.35).sort(byChance);
  const unknownCount = odds.filter((o) => o.chance >= 0.02 && !discovered.has(o.traitId)).length;
  return { certain, likely, possible, unknownCount, totalOutcomes: odds.filter((o) => o.chance >= 0.02).length };
}
