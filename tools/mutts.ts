/* Render random many-generation mutts to check the illustrator handles trait combinations. */
import { writeFileSync } from 'node:fs';
import { BREEDS } from '../src/data/breeds';
import { createChickenFromBreed, viewOf, ancestryLabel } from '../src/chickens/chicken';
import { breedChickens } from '../src/genetics/breeding';
import { createRng } from '../src/core/rng';
import { chickenSvg } from '../src/ui/chickenSvg';
import { TRAIT_BY_ID } from '../src/data/traits';

const rng = createRng(Number(process.argv[3] ?? 5));
let pool = BREEDS.map((b) => createChickenFromBreed(b, rng, b.id, 'hatchery'));
for (let gen = 0; gen < 6; gen++) {
  const next = [];
  for (let i = 0; i < 48; i++) {
    const a = rng.pick(pool);
    const b = rng.pick(pool);
    if (a.id === b.id) continue;
    next.push(breedChickens(a, b, rng.int(1, 1e9), `m${gen}-${i}`).child);
  }
  pool = [...next, ...rng.shuffle(pool).slice(0, 10)];
}
const picks = rng.shuffle(pool).slice(0, 48);
let html = '<html><body style="background:#f4ead6;font-family:sans-serif;margin:0;padding:8px"><div style="display:grid;grid-template-columns:repeat(8,1fr);gap:6px">';
for (const c of picks) {
  const v = viewOf(c);
  const notable = v.traits.filter((t) => TRAIT_BY_ID[t]!.rarity !== 'common' && !t.startsWith('per.')).map((t) => TRAIT_BY_ID[t]!.name).slice(0, 5).join(', ');
  html += `<div style="background:#fff;border-radius:8px;padding:4px;text-align:center"><div style="width:150px;height:150px;margin:auto">${chickenSvg(v.phenotype, c.seed, { uid: c.id })}</div><div style="font-size:10px">${v.rarity.tier} · ${ancestryLabel(c)}</div><div style="font-size:9px;color:#666">${notable}</div></div>`;
}
html += '</div></body></html>';
writeFileSync(process.argv[2] ?? 'mutts.html', html);
