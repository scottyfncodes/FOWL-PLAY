import { genotypeFromSpec, sanitizeGenotype, type Genotype, type LocusId } from '../genetics/loci';
import { computePhenotype, type Phenotype } from '../genetics/phenotype';
import { rarityOf, traitsOf, type RarityInfo } from '../genetics/traits';
import { BREED_BY_ID, type BreedDef } from '../data/breeds';
import { makeId } from '../core/ids';
import type { Rng } from '../core/rng';

export type ChickenOrigin = 'starter' | 'hatchery' | 'hatched' | 'gift';
export type ChickenStatus = 'coop' | 'meadow';

export interface Chicken {
  id: string;
  name: string;
  generation: number;
  parents: [string, string] | null;
  /** Fraction of ancestry per breed id; sums to ~1. */
  ancestry: Record<string, number>;
  genotype: Genotype;
  /** Drives variable expression; stable for the chicken's life. */
  seed: number;
  /** Seed of the breeding event that produced this chicken, if hatched. */
  breedingSeed: number | null;
  born: number;
  origin: ChickenOrigin;
  status: ChickenStatus;
  favorite: boolean;
  /** Loci that mutated at conception. */
  mutations: LocusId[];
}

export interface ChickenView {
  chicken: Chicken;
  phenotype: Phenotype;
  traits: string[];
  rarity: RarityInfo;
}

const viewCache = new Map<string, ChickenView>();

/** Phenotype + traits + rarity, memoised per chicken (genotype never changes). */
export function viewOf(chicken: Chicken): ChickenView {
  const key = `${chicken.id}:${chicken.seed}`;
  const cached = viewCache.get(key);
  if (cached && cached.chicken.genotype === chicken.genotype) return cached;
  const phenotype = computePhenotype(chicken.genotype, chicken.seed);
  const traits = traitsOf(phenotype);
  const rarity = rarityOf(traits);
  const view = { chicken, phenotype, traits, rarity };
  viewCache.set(key, view);
  return view;
}

export function createChickenFromBreed(breed: BreedDef, rng: Rng, name: string, origin: ChickenOrigin): Chicken {
  const genotype = genotypeFromSpec(breed.genotype, (n) => rng.int(0, n - 1));
  return {
    id: makeId('ck'),
    name,
    generation: 1,
    parents: null,
    ancestry: { [breed.id]: 1 },
    genotype,
    seed: rng.int(0, 0x7fffffff),
    breedingSeed: null,
    born: Date.now(),
    origin,
    status: 'coop',
    favorite: false,
    mutations: [],
  };
}

/** Ancestry entries sorted by share, with breed names. */
export function ancestryList(chicken: Chicken): { id: string; name: string; share: number }[] {
  return Object.entries(chicken.ancestry)
    .map(([id, share]) => ({ id, name: BREED_BY_ID[id]?.name ?? 'Mystery', share }))
    .sort((a, b) => b.share - a.share);
}

/** "Brahma", "Brahma × Polish", or "Brahma × Polish mix". */
export function ancestryLabel(chicken: Chicken): string {
  const list = ancestryList(chicken);
  if (list.length === 0) return 'Mystery';
  const first = list[0]!;
  if (list.length === 1 || first.share >= 0.999) return first.name;
  const second = list[1]!;
  if (list.length === 2) return `${first.name} × ${second.name}`;
  return `${first.name} × ${second.name} mix`;
}

/** Pure breed id if the chicken is 100% one breed. */
export function pureBreedId(chicken: Chicken): string | null {
  const list = ancestryList(chicken);
  return list.length === 1 && (list[0]?.share ?? 0) >= 0.999 ? list[0]!.id : null;
}

/** Validate/repair a chicken loaded from storage. Returns null if it cannot be salvaged. */
export function sanitizeChicken(input: unknown): Chicken | null {
  if (!input || typeof input !== 'object') return null;
  const o = input as Record<string, unknown>;
  if (typeof o.id !== 'string' || !o.id) return null;
  const ancestry: Record<string, number> = {};
  if (o.ancestry && typeof o.ancestry === 'object') {
    for (const [k, v] of Object.entries(o.ancestry as Record<string, unknown>)) {
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) ancestry[k] = v;
    }
  }
  const parents = Array.isArray(o.parents) && o.parents.length === 2 && typeof o.parents[0] === 'string' && typeof o.parents[1] === 'string'
    ? ([o.parents[0], o.parents[1]] as [string, string])
    : null;
  const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
  const origin: ChickenOrigin = (['starter', 'hatchery', 'hatched', 'gift'] as const).includes(o.origin as ChickenOrigin) ? (o.origin as ChickenOrigin) : 'hatched';
  return {
    id: o.id,
    name: typeof o.name === 'string' && o.name.trim() ? o.name.slice(0, 40) : 'Unnamed',
    generation: Math.max(1, Math.floor(num(o.generation, 1))),
    parents,
    ancestry,
    genotype: sanitizeGenotype(o.genotype),
    seed: Math.floor(num(o.seed, 1)),
    breedingSeed: typeof o.breedingSeed === 'number' ? o.breedingSeed : null,
    born: num(o.born, Date.now()),
    origin,
    status: o.status === 'meadow' ? 'meadow' : 'coop',
    favorite: o.favorite === true,
    mutations: Array.isArray(o.mutations) ? (o.mutations.filter((m) => typeof m === 'string') as LocusId[]) : [],
  };
}
