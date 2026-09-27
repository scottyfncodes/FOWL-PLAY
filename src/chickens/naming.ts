import { FOOD_NAMES, PLAIN_NAMES, PUN_NAMES, TITLED_NAMES } from '../data/names';
import type { Rng } from '../core/rng';

/** Generate a name, avoiding ones already in use where possible. */
export function generateName(rng: Rng, taken: ReadonlySet<string>): string {
  for (let attempt = 0; attempt < 30; attempt++) {
    const roll = rng.next();
    let pool: readonly string[];
    if (roll < 0.58) pool = PLAIN_NAMES;
    else if (roll < 0.78) pool = FOOD_NAMES;
    else if (roll < 0.9) pool = TITLED_NAMES;
    else pool = PUN_NAMES;
    const name = rng.pick(pool);
    if (!taken.has(name)) return name;
  }
  // Everything is taken; add a suffix.
  const base = rng.pick(PLAIN_NAMES);
  for (let n = 2; n < 1000; n++) {
    const candidate = `${base} ${toRoman(n)}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base} ${rng.int(1000, 9999)}`;
}

function toRoman(n: number): string {
  const table: [number, string][] = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  let v = n;
  for (const [val, sym] of table) {
    while (v >= val) {
      out += sym;
      v -= val;
    }
  }
  return out;
}
