/* Headless "player" that adopts and breeds semi-randomly, printing balance stats. */
import { startNewGame, pickSecondChicken, breed, hatch, buyOffer, coopChickens, refreshHatchery, sendToMeadow, buyUpgrade, upgradeCost } from '../src/state/game';
import { createRng } from '../src/core/rng';
import { viewOf } from '../src/chickens/chicken';
import { TRAIT_BY_ID } from '../src/data/traits';

const rng = createRng(Number(process.argv[2] ?? 1));
const s = startNewGame(rng.int(1, 1e9));
pickSecondChicken(s, rng.pick(s.hatchery.offers).id);
const events: string[] = [];
let hatches = 0;
const target = Number(process.argv[3] ?? 60);
const rarityCount: Record<string, number> = {};
let mutations = 0;
while (hatches < target) {
  // shopping
  const cheap = s.hatchery.offers.filter((o) => o.price <= s.corn && !s.discoveredBreeds[o.breedId]);
  if (cheap.length && coopChickens(s).length + s.eggs.length < 8 + (s.upgrades.coop ?? 0) * 4 && rng.chance(0.6)) {
    const r = buyOffer(s, rng.pick(cheap).id);
    if (r.ok) events.push(`h${hatches}: bought ${r.result.chicken.name} (${Object.keys(r.result.chicken.ancestry)[0]}) new traits ${r.result.report.newTraits.length}`);
  }
  const cost = upgradeCost(s, 'coop');
  if (cost !== null && s.corn > cost + 60) buyUpgrade(s, 'coop');
  // make room: retire common gen1 chickens
  const coop = coopChickens(s);
  if (coop.length + s.eggs.length >= 8 + (s.upgrades.coop ?? 0) * 4) {
    const victim = [...coop].sort((a, b) => viewOf(a).rarity.score - viewOf(b).rarity.score)[0]!;
    sendToMeadow(s, victim.id);
  }
  // breed: favour rare + newest
  const pool = coopChickens(s);
  if (pool.length < 2) { refreshHatchery(s, false); s.corn += 50; continue; }
  const sorted = [...pool].sort((a, b) => viewOf(b).rarity.score + b.generation * 2 - (viewOf(a).rarity.score + a.generation * 2));
  const a = rng.chance(0.7) ? sorted[0]! : rng.pick(pool);
  let b = rng.pick(pool.filter((c) => c.id !== a.id));
  if (rng.chance(0.5) && sorted[1] && sorted[1].id !== a.id) b = sorted[1];
  const egg = breed(s, a, b, rng.int(1, 1e9));
  if (!egg) { s.eggs.forEach((e) => hatch(s, e.id)); continue; }
  const r = hatch(s, egg.id)!;
  hatches++;
  const v = viewOf(r.chicken);
  rarityCount[v.rarity.tier] = (rarityCount[v.rarity.tier] ?? 0) + 1;
  if (r.report.mutated) mutations++;
  const notable = r.report.newTraits.filter((t) => TRAIT_BY_ID[t]!.rarity !== 'common').map((t) => `${TRAIT_BY_ID[t]!.name}[${TRAIT_BY_ID[t]!.rarity[0]}]`);
  if (notable.length || r.report.newBreeds.length || r.report.mutated) events.push(`h${hatches} gen${r.chicken.generation} ${v.rarity.tier}: ${notable.join(', ')}${r.report.newBreeds.length ? ' BREEDS:' + r.report.newBreeds.map((x) => x.id + '/' + x.how[0]).join(',') : ''}${r.report.mutated ? ' MUT:' + r.chicken.mutations.join(',') : ''}`);
}
console.log(events.join('\n'));
console.log('---');
console.log('hatches', hatches, 'corn', s.corn, 'chickens', s.chickens.length, 'breeds', Object.keys(s.discoveredBreeds).length, 'traits', Object.keys(s.discoveredTraits).length, 'milestones', Object.keys(s.milestones).length, 'mutations', mutations, 'rarity', JSON.stringify(rarityCount), 'maxGen', Math.max(...s.chickens.map((c) => c.generation)));
