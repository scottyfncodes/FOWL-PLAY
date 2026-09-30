import { BREEDS, BREED_BY_ID, type BreedDef } from '../data/breeds';
import { createChickenFromBreed, pureBreedId, viewOf, type Chicken, type ChickenView } from '../chickens/chicken';
import { generateName } from '../chickens/naming';
import { createRng, freshSeed } from '../core/rng';
import { makeId } from '../core/ids';
import { breedChickens } from '../genetics/breeding';
import { resemblingBreeds } from '../genetics/resemblance';
import { TRAIT_BY_ID } from '../data/traits';
import { MILESTONES, type MilestoneContext } from '../data/milestones';
import { HATCHERY_FREE_REFRESH_EVERY, HATCHERY_PRICE, HATCHERY_REFRESH_COST, HATCHERY_SLOTS, REWARDS, STARTING_COOP_SLOTS, STARTING_CORN, STARTING_INCUBATOR_SLOTS, UPGRADE_BY_ID, COOP_THEMES } from '../data/economy';
import { RIBBON_REWARD, SHOW_BY_ID, ribbonFor, type Ribbon } from '../data/shows';
import { SAVE_VERSION, freshFarm, type DiscoveryEvent, type Egg, type GameState, type HatcheryOffer } from './types';
import { abilitiesOf, abilityIds, CARRIER_GENES } from '../genetics/abilities';
import { copies } from '../genetics/loci';

// ---------------------------------------------------------------------------
// Fresh game
// ---------------------------------------------------------------------------

export const STARTER_BREEDS = ['orpington', 'plymouthrock', 'wyandotte', 'sussex', 'australorp'];
export const SECOND_PICK_BREEDS = ['silkie', 'polish', 'araucana'];

export function freshState(): GameState {
  return {
    version: SAVE_VERSION,
    createdAt: Date.now(),
    corn: STARTING_CORN,
    chickens: [],
    eggs: [],
    discoveredTraits: {},
    discoveredBreeds: {},
    milestones: {},
    upgrades: {},
    theme: 'paper',
    ribbons: {},
    hatchery: { offers: [], hatchesSinceRefresh: 0 },
    stats: { hatches: 0, breedings: 0, purchases: 0, showEntries: 0 },
    history: [],
    log: [],
    onboarding: 'welcome',
    settings: { sound: true },
    starterId: null,
    farm: freshFarm(),
  };
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export const takenNames = (s: GameState) => new Set([...s.chickens.map((c) => c.name), ...s.eggs.map((e) => e.child.name)]);
export const coopChickens = (s: GameState) => s.chickens.filter((c) => c.status === 'coop');
export const meadowChickens = (s: GameState) => s.chickens.filter((c) => c.status === 'meadow');
export const chickenById = (s: GameState, id: string | null | undefined) => (id ? s.chickens.find((c) => c.id === id) ?? null : null);
export const upgradeLevel = (s: GameState, id: string) => s.upgrades[id] ?? 0;
export const coopCapacity = (s: GameState) => STARTING_COOP_SLOTS + upgradeLevel(s, 'coop') * 4;
export const incubatorCapacity = (s: GameState) => STARTING_INCUBATOR_SLOTS + upgradeLevel(s, 'incubator');
export const coopLoad = (s: GameState) => coopChickens(s).length + s.eggs.length;
export const coopIsFull = (s: GameState) => coopLoad(s) >= coopCapacity(s);
export const discoveredTraitSet = (s: GameState) => new Set(Object.keys(s.discoveredTraits));
export const discoveredBreedSet = (s: GameState) => new Set(Object.keys(s.discoveredBreeds));

export function upgradeCost(s: GameState, id: string): number | null {
  const def = UPGRADE_BY_ID[id];
  if (!def) return null;
  const level = upgradeLevel(s, id);
  return def.costs[level] ?? null;
}

// ---------------------------------------------------------------------------
// Discovery reporting
// ---------------------------------------------------------------------------

export interface DiscoveryReport {
  newTraits: string[];
  newBreeds: { id: string; how: 'owned' | 'resemblance' }[];
  milestones: string[];
  corn: number;
  mutated: boolean;
  /** Farm abilities never seen in this flock before. */
  newAbilities: string[];
  /** Parents proven to carry a hidden gene by this chick: [parentId, abilityId]. */
  provenCarriers: { parentId: string; parentName: string; abilityId: string }[];
}

function emptyReport(): DiscoveryReport {
  return { newTraits: [], newBreeds: [], milestones: [], corn: 0, mutated: false, newAbilities: [], provenCarriers: [] };
}

function pushLog(s: GameState, e: DiscoveryEvent) {
  s.log.push(e);
  if (s.log.length > 100) s.log.splice(0, s.log.length - 100);
}

/** Record everything new about a chicken that just entered the collection. Mutates state. */
export function registerChicken(s: GameState, chicken: Chicken, viaHatch: boolean): DiscoveryReport {
  const report = emptyReport();
  const view = viewOf(chicken);
  const now = Date.now();
  if (!chicken.no) {
    chicken.no = s.farm.nextNo;
    s.farm.nextNo += 1;
  }

  // Farm abilities: what can this one actually do?
  const abilities = abilitiesOf(view.phenotype);
  for (const id of abilityIds(abilities)) {
    if (!s.farm.discoveredAbilities[id]) {
      s.farm.discoveredAbilities[id] = { at: now, chickenId: chicken.id };
      report.newAbilities.push(id);
      pushLog(s, { kind: 'ability', refId: id, chickenId: chicken.id, at: now, corn: 0 });
    }
  }
  // Hidden genes: a chick that expresses a recessive proves both parents carry it.
  if (viaHatch && chicken.parents) {
    for (const gene of CARRIER_GENES) {
      if (copies(chicken.genotype, gene.locus, gene.allele) !== 2) continue;
      for (const pid of chicken.parents) {
        const parent = chickenById(s, pid);
        if (!parent || copies(parent.genotype, gene.locus, gene.allele) === 2) continue; // parent shows it already
        if (parent.knownGenes.includes(gene.abilityId)) continue;
        parent.knownGenes.push(gene.abilityId);
        report.provenCarriers.push({ parentId: parent.id, parentName: parent.name, abilityId: gene.abilityId });
        pushLog(s, { kind: 'carrier', refId: gene.abilityId, chickenId: parent.id, at: now, corn: 0 });
      }
    }
  }

  for (const t of view.traits) {
    if (!s.discoveredTraits[t]) {
      s.discoveredTraits[t] = { at: now, chickenId: chicken.id };
      const reward = REWARDS.traitDiscovery[TRAIT_BY_ID[t]?.rarity ?? 'common'] ?? 8;
      report.newTraits.push(t);
      report.corn += reward;
      pushLog(s, { kind: 'trait', refId: t, chickenId: chicken.id, at: now, corn: reward });
    }
  }

  const pure = pureBreedId(chicken);
  if (pure && !s.discoveredBreeds[pure]) {
    s.discoveredBreeds[pure] = { at: now, how: 'owned', chickenId: chicken.id };
    report.newBreeds.push({ id: pure, how: 'owned' });
    report.corn += REWARDS.breedDiscovery;
    pushLog(s, { kind: 'breed', refId: pure, chickenId: chicken.id, at: now, corn: REWARDS.breedDiscovery });
  }
  if (viaHatch) {
    for (const b of resemblingBreeds(view.traits)) {
      if (!s.discoveredBreeds[b.id]) {
        s.discoveredBreeds[b.id] = { at: now, how: 'resemblance', chickenId: chicken.id };
        report.newBreeds.push({ id: b.id, how: 'resemblance' });
        report.corn += REWARDS.breedResemblance;
        pushLog(s, { kind: 'resemblance', refId: b.id, chickenId: chicken.id, at: now, corn: REWARDS.breedResemblance });
      }
    }
    if (chicken.mutations.length > 0) {
      report.mutated = true;
      pushLog(s, { kind: 'mutation', refId: chicken.mutations.join(','), chickenId: chicken.id, at: now, corn: 0 });
    }
  }

  report.milestones = checkMilestones(s, viaHatch ? view : null, report);
  s.corn += report.corn;
  return report;
}

function checkMilestones(s: GameState, hatched: ChickenView | null, report: DiscoveryReport): string[] {
  const ctx: MilestoneContext = {
    all: s.chickens.map(viewOf),
    hatched,
    hatchCount: s.stats.hatches,
    discoveredTraits: discoveredTraitSet(s),
    discoveredBreeds: discoveredBreedSet(s),
    ribbons: Object.fromEntries(Object.entries(s.ribbons).map(([k, v]) => [k, v.ribbon])),
  };
  const unlocked: string[] = [];
  const now = Date.now();
  for (const m of MILESTONES) {
    if (s.milestones[m.id]) continue;
    let ok = false;
    try {
      ok = m.check(ctx);
    } catch (err) {
      console.warn('milestone check failed', m.id, err);
    }
    if (ok) {
      s.milestones[m.id] = now;
      unlocked.push(m.id);
      report.corn += m.reward;
      pushLog(s, { kind: 'milestone', refId: m.id, chickenId: hatched?.chicken.id ?? null, at: now, corn: m.reward });
    }
  }
  return unlocked;
}

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

export function startNewGame(seed = freshSeed()): GameState {
  const s = freshState();
  const rng = createRng(seed);
  const breed = BREED_BY_ID[rng.pick(STARTER_BREEDS)]!;
  const first = createChickenFromBreed(breed, rng, generateName(rng, new Set()), 'starter');
  s.chickens.push(first);
  s.starterId = first.id;
  registerChicken(s, first, false);
  s.corn = STARTING_CORN; // discovery rewards don't count during the welcome
  s.log = [];
  s.hatchery.offers = SECOND_PICK_BREEDS.map((id) => makeOffer(s, BREED_BY_ID[id]!, rng));
  s.onboarding = 'pickSecond';
  return s;
}

/** The player picks their free second chicken from the welcome offers. */
export function pickSecondChicken(s: GameState, offerId: string): DiscoveryReport | null {
  if (s.onboarding !== 'pickSecond') return null;
  const offer = s.hatchery.offers.find((o) => o.id === offerId);
  if (!offer) return null;
  const chicken = { ...offer.chicken, origin: 'gift' as const, born: Date.now() };
  s.chickens.push(chicken);
  s.hatchery.offers = s.hatchery.offers.filter((o) => o.id !== offerId);
  const report = registerChicken(s, chicken, false);
  s.corn -= report.corn; // the welcome gift records discoveries but pays nothing
  report.corn = 0;
  s.onboarding = 'firstBreed';
  // Fill the hatchery up around the remaining welcome offers.
  const rng = createRng(freshSeed());
  while (s.hatchery.offers.length < HATCHERY_SLOTS) s.hatchery.offers.push(makeOffer(s, pickHatcheryBreed(s, rng), rng));
  return report;
}

export function finishOnboarding(s: GameState) {
  s.onboarding = 'done';
}

// ---------------------------------------------------------------------------
// Breeding & hatching
// ---------------------------------------------------------------------------

export type BreedBlock = { ok: true } | { ok: false; reason: string };

export function canBreed(s: GameState, a: Chicken | null, b: Chicken | null): BreedBlock {
  if (!a || !b) return { ok: false, reason: 'Choose two parents.' };
  if (a.id === b.id) return { ok: false, reason: 'A chicken cannot breed with itself. It has tried.' };
  if (a.status !== 'coop' || b.status !== 'coop') return { ok: false, reason: 'Both parents must be in the coop.' };
  if (s.eggs.length >= incubatorCapacity(s)) return { ok: false, reason: 'The incubator is full. Hatch an egg first.' };
  if (coopIsFull(s)) return { ok: false, reason: 'The coop is full. Retire a chicken to the meadow or extend the coop.' };
  return { ok: true };
}

export function breed(s: GameState, a: Chicken, b: Chicken, seed = freshSeed()): Egg | null {
  if (!canBreed(s, a, b).ok) return null;
  const rng = createRng(seed ^ 0x5bd1e995);
  const name = generateName(rng, takenNames(s));
  const result = breedChickens(a, b, seed, name);
  const egg: Egg = { id: makeId('egg'), parents: [a.id, b.id], parentNames: [a.name, b.name], seed, createdAt: Date.now(), child: result.child };
  s.eggs.push(egg);
  s.stats.breedings += 1;
  if (s.onboarding === 'firstBreed') s.onboarding = 'done';
  return egg;
}

export interface HatchResult {
  chicken: Chicken;
  report: DiscoveryReport;
}

export function hatch(s: GameState, eggId: string): HatchResult | null {
  const idx = s.eggs.findIndex((e) => e.id === eggId);
  if (idx < 0) return null;
  const egg = s.eggs[idx]!;
  s.eggs.splice(idx, 1);
  const chicken = { ...egg.child, born: Date.now(), status: 'coop' as const };
  if (s.chickens.some((c) => c.id === chicken.id)) chicken.id = makeId('ck');
  s.chickens.push(chicken);
  s.stats.hatches += 1;
  s.hatchery.hatchesSinceRefresh += 1;
  s.history.push({ at: Date.now(), parents: egg.parents, parentNames: egg.parentNames, childId: chicken.id, childName: chicken.name, seed: egg.seed });
  if (s.history.length > 200) s.history.splice(0, s.history.length - 200);
  const report = registerChicken(s, chicken, true);
  report.corn += REWARDS.hatch;
  s.corn += REWARDS.hatch;
  if (s.hatchery.hatchesSinceRefresh >= HATCHERY_FREE_REFRESH_EVERY) {
    s.hatchery.hatchesSinceRefresh = 0;
    refreshHatchery(s, false);
  }
  return { chicken, report };
}

// ---------------------------------------------------------------------------
// Coop management
// ---------------------------------------------------------------------------

export function renameChicken(s: GameState, id: string, name: string): boolean {
  const c = chickenById(s, id);
  const clean = name.trim().slice(0, 32);
  if (!c || !clean) return false;
  c.name = clean;
  return true;
}

/** A fresh generated name that no other chicken (or egg) is using. */
export function suggestName(s: GameState): string {
  return generateName(createRng(freshSeed()), takenNames(s));
}

export function toggleFavorite(s: GameState, id: string) {
  const c = chickenById(s, id);
  if (c) c.favorite = !c.favorite;
}

export function sendToMeadow(s: GameState, id: string): boolean {
  const c = chickenById(s, id);
  if (!c || c.status !== 'coop') return false;
  c.status = 'meadow';
  c.favorite = false;
  return true;
}

export function bringBack(s: GameState, id: string): BreedBlock {
  const c = chickenById(s, id);
  if (!c || c.status !== 'meadow') return { ok: false, reason: 'That chicken is not in the meadow.' };
  if (coopIsFull(s)) return { ok: false, reason: 'The coop is full.' };
  c.status = 'coop';
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Hatchery
// ---------------------------------------------------------------------------

function makeOffer(s: GameState, breed: BreedDef, rng: ReturnType<typeof createRng>): HatcheryOffer {
  const chicken = createChickenFromBreed(breed, rng, generateName(rng, takenNames(s)), 'hatchery');
  return { id: makeId('off'), breedId: breed.id, chicken, price: HATCHERY_PRICE[breed.tier] ?? 100 };
}

/** Weighted pick favouring undiscovered breeds of a tier the player can plausibly afford. */
function pickHatcheryBreed(s: GameState, rng: ReturnType<typeof createRng>): BreedDef {
  const discovered = discoveredBreedSet(s);
  const offered = new Set(s.hatchery.offers.map((o) => o.breedId));
  const progress = discovered.size; // more discoveries → higher tiers appear
  const tierWeight: Record<number, number> = {
    1: 6,
    2: progress >= 2 ? 5 : 1.5,
    3: progress >= 6 ? 3 : 0.4,
    4: progress >= 12 ? 1.2 : 0.1,
  };
  const candidates = BREEDS.filter((b) => !offered.has(b.id));
  const weights = candidates.map((b) => (tierWeight[b.tier] ?? 1) * (discovered.has(b.id) ? 0.25 : 1));
  return rng.weighted(candidates, weights);
}

export function refreshHatchery(s: GameState, charge: boolean): BreedBlock {
  if (charge) {
    if (s.corn < HATCHERY_REFRESH_COST) return { ok: false, reason: `You need ${HATCHERY_REFRESH_COST} corn to call in new arrivals.` };
    s.corn -= HATCHERY_REFRESH_COST;
  }
  const rng = createRng(freshSeed());
  const keep = s.onboarding === 'pickSecond' ? s.hatchery.offers : [];
  s.hatchery.offers = [...keep];
  while (s.hatchery.offers.length < HATCHERY_SLOTS) s.hatchery.offers.push(makeOffer(s, pickHatcheryBreed(s, rng), rng));
  s.hatchery.hatchesSinceRefresh = 0;
  return { ok: true };
}

export interface PurchaseResult {
  chicken: Chicken;
  report: DiscoveryReport;
}

export function buyOffer(s: GameState, offerId: string): { ok: true; result: PurchaseResult } | { ok: false; reason: string } {
  const offer = s.hatchery.offers.find((o) => o.id === offerId);
  if (!offer) return { ok: false, reason: 'That chicken has already found a home.' };
  if (s.corn < offer.price) return { ok: false, reason: `You need ${offer.price - s.corn} more corn.` };
  if (coopIsFull(s)) return { ok: false, reason: 'The coop is full. Retire a chicken to the meadow or extend the coop.' };
  s.corn -= offer.price;
  s.stats.purchases += 1;
  const chicken = { ...offer.chicken, born: Date.now(), status: 'coop' as const };
  s.chickens.push(chicken);
  const rng = createRng(freshSeed());
  s.hatchery.offers = s.hatchery.offers.map((o) => (o.id === offerId ? makeOffer(s, pickHatcheryBreed(s, rng), rng) : o));
  const report = registerChicken(s, chicken, false);
  return { ok: true, result: { chicken, report } };
}

export function buyUpgrade(s: GameState, id: string): BreedBlock {
  const cost = upgradeCost(s, id);
  if (cost === null) return { ok: false, reason: 'Fully upgraded.' };
  if (s.corn < cost) return { ok: false, reason: `You need ${cost - s.corn} more corn.` };
  s.corn -= cost;
  s.upgrades[id] = upgradeLevel(s, id) + 1;
  return { ok: true };
}

export function ownsTheme(s: GameState, id: string): boolean {
  return id === 'paper' || (s.upgrades[`theme:${id}`] ?? 0) > 0;
}

export function selectTheme(s: GameState, id: string): BreedBlock {
  const theme = COOP_THEMES.find((t) => t.id === id);
  if (!theme) return { ok: false, reason: 'Unknown theme.' };
  if (!ownsTheme(s, id)) {
    if (s.corn < theme.cost) return { ok: false, reason: `You need ${theme.cost - s.corn} more corn.` };
    s.corn -= theme.cost;
    s.upgrades[`theme:${id}`] = 1;
  }
  s.theme = id;
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Chicken Show
// ---------------------------------------------------------------------------

export interface ShowResult {
  score: number;
  ribbon: Ribbon;
  remark: string;
  corn: number;
  improved: boolean;
  firstRibbon: boolean;
  milestones: string[];
}

export function enterShow(s: GameState, categoryId: string, chickenId: string): ShowResult | null {
  const cat = SHOW_BY_ID[categoryId];
  const chicken = chickenById(s, chickenId);
  if (!cat || !chicken) return null;
  const view = viewOf(chicken);
  const score = cat.score({ phenotype: view.phenotype, traits: view.traits, rarity: view.rarity, generation: chicken.generation, breedCount: Object.keys(chicken.ancestry).length });
  const ribbon = ribbonFor(score);
  const previous = s.ribbons[categoryId];
  const improved = !previous || score > previous.score;
  const ribbonRank = (r: Ribbon) => ({ none: 0, bronze: 1, silver: 2, gold: 3 })[r];
  const prevRank = previous ? ribbonRank(previous.ribbon) : -1;
  let corn = 0;
  if (ribbonRank(ribbon) > prevRank) corn += RIBBON_REWARD[ribbon];
  else if (improved && ribbon !== 'none') corn += REWARDS.showImproved;
  s.stats.showEntries += 1;
  if (improved) s.ribbons[categoryId] = { ribbon, score, chickenId, chickenName: chicken.name, at: Date.now() };
  s.corn += corn;
  if (corn > 0) pushLog(s, { kind: 'ribbon', refId: categoryId, chickenId, at: Date.now(), corn });
  const report = emptyReport();
  const milestones = checkMilestones(s, null, report);
  s.corn += report.corn;
  return { score, ribbon, remark: score >= 65 ? cat.praise : cat.shrug, corn: corn + report.corn, improved, firstRibbon: prevRank <= 0 && ribbon !== 'none', milestones };
}
