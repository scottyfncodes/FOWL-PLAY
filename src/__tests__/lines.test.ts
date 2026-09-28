import { describe, expect, it } from 'vitest';
import { BREED_BY_ID } from '../data/breeds';
import { createChickenFromBreed, viewOf } from '../chickens/chicken';
import { createRng } from '../core/rng';
import { inheritGenotype } from '../genetics/breeding';
import { computePhenotype } from '../genetics/phenotype';
import { abilitiesOf, abilityBadges, type Abilities } from '../genetics/abilities';
import { genotypeFromSpec, LOCI, type Genotype } from '../genetics/loci';
import { MISSION_BY_ID } from '../farm/missions';
import { STARTER_BREEDS, SECOND_PICK_BREEDS } from '../state/game';

const make = (id: string, seed = 1) => createChickenFromBreed(BREED_BY_ID[id]!, createRng(seed), id, 'starter');

/** Sample offspring abilities of a pairing, no mutations, seeded. */
function offspring(a: Genotype, b: Genotype, n: number, seed = 5): Abilities[] {
  const rng = createRng(seed);
  const out: Abilities[] = [];
  for (let i = 0; i < n; i++) {
    const { genotype } = inheritGenotype(a, b, rng, 0);
    out.push(abilitiesOf(computePhenotype(genotype, rng.int(0, 1 << 30))));
  }
  return out;
}

const gate = MISSION_BY_ID.gardenGate!;
const canOpenGate = (a: Abilities) => gate.solutions.some((s) => s.needs(a));

describe('the first breeding loop', () => {
  it('every starter × pick pairing has a real chance of a gate-opening chick in one generation', () => {
    for (const s of STARTER_BREEDS) {
      for (const p of SECOND_PICK_BREEDS) {
        const kids = offspring(make(s).genotype, make(p).genotype, 400);
        const share = kids.filter(canOpenGate).length / kids.length;
        expect(share, `${s} × ${p}: ${Math.round(share * 100)}%`).toBeGreaterThanOrEqual(0.15);
        expect(share, `${s} × ${p} should not be trivial`).toBeLessThan(0.9);
      }
    }
  });
  it('the gate is opened by different routes from different pairings', () => {
    const routes = new Set<string>();
    for (const s of STARTER_BREEDS) {
      for (const p of SECOND_PICK_BREEDS) {
        for (const a of offspring(make(s).genotype, make(p).genotype, 200)) {
          for (const sol of gate.solutions) if (sol.needs(a)) routes.add(sol.method);
        }
      }
    }
    expect(routes.size).toBeGreaterThanOrEqual(3);
    expect(routes.has('jump')).toBe(true);
  });
});

describe('designed breeding lines', () => {
  it('two ordinary swim carriers (Orpington × Sussex) can produce a swimmer', () => {
    const kids = offspring(make('orpington').genotype, make('sussex').genotype, 800);
    expect(kids.some((a) => a.swim)).toBe(true);
    expect(kids.filter((a) => a.swim).length / kids.length).toBeLessThan(0.3);
  });
  it('big wings on a Polish only glide once bred onto a small body', () => {
    expect(abilitiesOf(viewOf(make('polish')).phenotype).glide).toBe(false);
    const kids = offspring(make('polish').genotype, make('serama').genotype, 400);
    expect(kids.some((a) => a.glide)).toBe(true);
  });
  it('a Silkie cannot climb but its chicks with a Plymouth Rock can', () => {
    expect(abilitiesOf(viewOf(make('silkie')).phenotype).climb).toBe(false);
    const kids = offspring(make('silkie').genotype, make('plymouthrock').genotype, 300);
    expect(kids.some((a) => a.climb)).toBe(true);
  });
  it('a fox-outrunning chicken takes stacking: Araucana line plus long legs', () => {
    expect(abilitiesOf(viewOf(make('araucana')).phenotype).speed).toBe(4);
    const kids = offspring(make('araucana').genotype, make('moderngame').genotype, 300);
    expect(kids.some((a) => a.speed >= 5)).toBe(true);
  });
  it('a plate-pressing giant needs a giant parent', () => {
    const kids = offspring(make('orpington').genotype, make('sussex').genotype, 200);
    expect(kids.every((a) => a.weight < 5)).toBe(true);
    const big = offspring(make('orpington').genotype, make('brahma').genotype, 200);
    expect(big.some((a) => a.weight >= 5)).toBe(true);
  });
});

describe('ability combination rules', () => {
  const pheno = (spec: Parameters<typeof genotypeFromSpec>[0]) => abilitiesOf(computePhenotype(genotypeFromSpec(spec), 1));
  const small = { size1: 's/s', size2: 's/s', size3: 's/s' } as const;
  it('big wings need a light body, smooth feathers and a tail', () => {
    expect(pheno({ ...small, wing: 'Wg/wg+' }).glide).toBe(true);
    expect(pheno({ wing: 'Wg/wg+', size1: 'L/L', size2: 'L/s' }).glide).toBe(false);
    expect(pheno({ ...small, wing: 'Wg/wg+', frizzle: 'F/f+' }).glide).toBe(false);
    expect(pheno({ ...small, wing: 'Wg/wg+', silkie: 'h/h' }).glide).toBe(false);
    expect(pheno({ ...small, wing: 'Wg/wg+', rumpless: 'Rp/rp+' }).glide).toBe(false);
  });
  it('webbed feet swim only with feathers that shed water', () => {
    expect(pheno({ web: 'wb/wb' }).swim).toBe(true);
    expect(pheno({ web: 'wb/wb', fluff1: 'Fl/Fl', fluff2: 'Fl/fl' }).swim).toBe(false);
    expect(pheno({ web: 'wb/wb+' }).swim).toBe(false);
  });
  it('digging needs two genes and clean legs', () => {
    expect(pheno({ dig: 'dg/dg' }).dig).toBe(true);
    expect(pheno({ dig: 'dg/dg', legFeather1: 'Pti/Pti' }).dig).toBe(false);
    expect(pheno({ dig: 'dg/dg+' }).dig).toBe(false);
  });
  it('climbing: two grip genes, or one plus a fifth toe, and never through silkie fluff', () => {
    expect(pheno({ grip: 'gr/gr' }).climb).toBe(true);
    expect(pheno({ grip: 'gr/gr+', polydactyl: 'Po/po+' }).climb).toBe(true);
    expect(pheno({ grip: 'gr/gr+' }).climb).toBe(false);
    expect(pheno({ grip: 'gr/gr', silkie: 'h/h' }).climb).toBe(false);
  });
  it('jump and reach stack from springy legs, long legs and gliding wings', () => {
    expect(pheno({}).jump).toBe(2);
    expect(pheno({ spring: 'Jp/jp+' }).jump).toBe(2);
    expect(pheno({ spring: 'Jp/Jp' }).jump).toBe(4);
    expect(pheno({ legLen: 'lg/lg' }).jump).toBe(3);
    expect(pheno({ legLen: 'lg/lg' }).reach).toBe(4);
    expect(pheno({ ...small, wing: 'Wg/Wg', spring: 'Jp/Jp', legLen: 'lg/lg' }).jump).toBe(6);
    expect(pheno({ size1: 'L/L', size2: 'L/L', size3: 'L/s' }).jump).toBe(1);
  });
  it('pace: quick and slow genes, long legs help, giants and clouds slow down', () => {
    expect(pheno({}).speed).toBe(2);
    expect(pheno({ speed: 'qk/qk' }).speed).toBe(4);
    expect(pheno({ speed: 'qk/qk', legLen: 'lg/lg' }).speed).toBe(5);
    expect(pheno({ speed: 'sl/sl' }).speed).toBe(0);
    expect(pheno({ size1: 'L/L', size2: 'L/L', size3: 'L/s' }).speed).toBe(1);
  });
  it('strength grows with size and brawn; crow with the gene and a noisy habit', () => {
    expect(pheno({ size1: 'L/L', size2: 'L/L', size3: 'L/L', brawn: 'Bw/Bw' }).strength).toBe(5);
    expect(pheno({ ...small }).strength).toBe(0);
    expect(pheno({ crow: 'Cw/Cw', habit: 'noisy/plain' }).crow).toBe(3);
    expect(pheno({ crow: 'Cw/cw+' }).crow).toBe(1);
  });
  it('badges list strengths first and hide ordinary values', () => {
    const plain = abilityBadges(pheno({}));
    expect(plain.map((b) => b.id)).not.toContain('strong');
    const hero = abilityBadges(pheno({ ...small, wing: 'Wg/Wg', web: 'wb/wb', speed: 'qk/qk' }));
    expect(hero.map((b) => b.id)).toEqual(expect.arrayContaining(['tiny', 'glide', 'swim', 'fast']));
  });
  it('mutations can create every ability allele from wild type', () => {
    const wild = genotypeFromSpec({});
    const seen = new Set<string>();
    const rng = createRng(99);
    for (let i = 0; i < 400; i++) {
      const { genotype, mutations } = inheritGenotype(wild, wild, rng, 0.5);
      for (const l of mutations) seen.add(`${l}:${genotype[l].join('/')}`);
    }
    for (const locus of LOCI.filter((l) => l.category === 'ability')) {
      expect([...seen].some((k) => k.startsWith(`${locus.id}:`)), `${locus.id} never mutated`).toBe(true);
    }
  });
});
