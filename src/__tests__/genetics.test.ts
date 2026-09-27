import { describe, expect, it } from 'vitest';
import { BREEDS, BREED_BY_ID } from '../data/breeds';
import { TRAITS, TRAIT_BY_ID } from '../data/traits';
import { LOCI, genotypeFromSpec, sanitizeGenotype, wildGenotype } from '../genetics/loci';
import { computePhenotype } from '../genetics/phenotype';
import { rarityOf, traitsOf } from '../genetics/traits';
import { breedChickens, inheritGenotype, previewPairing } from '../genetics/breeding';
import { createChickenFromBreed, viewOf } from '../chickens/chicken';
import { createRng } from '../core/rng';
import { matchesSignature, resemblingBreeds } from '../genetics/resemblance';

const rng = () => createRng(42);
const make = (id: string, seed = 1) => createChickenFromBreed(BREED_BY_ID[id]!, createRng(seed), id, 'starter');

describe('breed data', () => {
  it('has at least 50 real breeds with unique ids and names', () => {
    expect(BREEDS.length).toBeGreaterThanOrEqual(50);
    const ids = new Set(BREEDS.map((b) => b.id));
    const names = new Set(BREEDS.map((b) => b.name.toLowerCase()));
    expect(ids.size).toBe(BREEDS.length);
    expect(names.size).toBe(BREEDS.length);
  });
  it('every breed genotype spec is valid and expresses its own signature', () => {
    for (const breed of BREEDS) {
      for (let variant = 0; variant < 4; variant++) {
        const g = genotypeFromSpec(breed.genotype, (n) => variant % n);
        const traits = traitsOf(computePhenotype(g, variant));
        expect(matchesSignature(traits, breed), `${breed.name} variant ${variant} should match its own signature: ${traits.join(',')}`).toBe(true);
      }
    }
  });
  it('every breed has description text, origin and egg colour', () => {
    for (const b of BREEDS) {
      expect(b.description.length).toBeGreaterThan(40);
      expect(b.origin.length).toBeGreaterThan(2);
      expect(b.eggs.length).toBeGreaterThan(2);
      expect(b.notable.length).toBeGreaterThan(0);
    }
  });
  it('signatures only reference known traits', () => {
    for (const b of BREEDS) for (const entry of b.signature) for (const alt of entry.replace(/^!/, '').split('|')) expect(TRAIT_BY_ID[alt], `${b.id} signature ${alt}`).toBeDefined();
  });
});

describe('loci', () => {
  it('wild genotype is valid and unique ids', () => {
    const ids = new Set(LOCI.map((l) => l.id));
    expect(ids.size).toBe(LOCI.length);
    const g = wildGenotype();
    for (const l of LOCI) expect(l.alleles.some((a) => a.id === l.wild)).toBe(true);
    expect(Object.keys(g).length).toBe(LOCI.length);
    for (const l of LOCI) for (const m of l.mutations) expect(l.alleles.some((a) => a.id === m.allele), `${l.id} mutation ${m.allele}`).toBe(true);
  });
  it('sanitizeGenotype repairs garbage', () => {
    const g = sanitizeGenotype({ base: ['E', 'nonsense'], dilute: ['Bl', 'Bl'], junk: 1 });
    expect(g.base).toEqual(['eb', 'eb']);
    expect(g.dilute).toEqual(['Bl', 'Bl']);
    expect(sanitizeGenotype(null).base).toEqual(['eb', 'eb']);
  });
  it('rejects invalid specs', () => {
    expect(() => genotypeFromSpec({ base: 'E/Q' })).toThrow();
  });
});

describe('phenotype rules', () => {
  it('blue dilution is blended: one copy blue, two copies splash', () => {
    const black = computePhenotype(genotypeFromSpec({ base: 'E/E' }), 1);
    const blue = computePhenotype(genotypeFromSpec({ base: 'E/E', dilute: 'Bl/bl+' }), 1);
    const splash = computePhenotype(genotypeFromSpec({ base: 'E/E', dilute: 'Bl/Bl' }), 1);
    expect(black.primary).toBe('black');
    expect(blue.primary).toBe('blue');
    expect(splash.primary).toBe('splash');
  });
  it('recessive white needs two copies; dominant white needs one', () => {
    expect(computePhenotype(genotypeFromSpec({ base: 'E/E', recWhite: 'c/c+' }), 1).primary).toBe('black');
    expect(computePhenotype(genotypeFromSpec({ base: 'E/E', recWhite: 'c/c' }), 1).primary).toBe('white');
    expect(computePhenotype(genotypeFromSpec({ base: 'E/E', domWhite: 'I/i+' }), 1).primary).toBe('white');
  });
  it('comb epistasis: pea + rose = walnut', () => {
    expect(computePhenotype(genotypeFromSpec({}), 1).comb).toBe('single');
    expect(computePhenotype(genotypeFromSpec({ peaComb: 'P/p+' }), 1).comb).toBe('pea');
    expect(computePhenotype(genotypeFromSpec({ roseComb: 'R/r+' }), 1).comb).toBe('rose');
    expect(computePhenotype(genotypeFromSpec({ peaComb: 'P/p+', roseComb: 'R/r+' }), 1).comb).toBe('walnut');
    expect(computePhenotype(genotypeFromSpec({ duplexComb: 'D/d+' }), 1).comb).toBe('vshaped');
  });
  it('silkie is recessive and combines with frizzle into sizzle', () => {
    expect(computePhenotype(genotypeFromSpec({ silkie: 'h/h+' }), 1).featherType).toBe('normal');
    expect(computePhenotype(genotypeFromSpec({ silkie: 'h/h' }), 1).featherType).toBe('silkie');
    expect(computePhenotype(genotypeFromSpec({ silkie: 'h/h', frizzle: 'F/f+' }), 1).featherType).toBe('sizzle');
    expect(computePhenotype(genotypeFromSpec({ frizzle: 'F/F' }), 1).featherType).toBe('frazzle');
  });
  it('egg colour: blue + brown = green/olive', () => {
    expect(computePhenotype(genotypeFromSpec({ blueEgg: 'O/o+' }), 1).eggColor).toBe('blue');
    expect(computePhenotype(genotypeFromSpec({ blueEgg: 'O/o+', brown1: 'Br/Br' }), 1).eggColor).toBe('green');
    expect(computePhenotype(genotypeFromSpec({ blueEgg: 'O/o+', brown1: 'Br/Br', brown2: 'Br/Br', brown3: 'Br/br' }), 1).eggColor).toBe('olive');
    expect(computePhenotype(genotypeFromSpec({ brown1: 'Br/Br', brown2: 'Br/Br', brown3: 'Br/Br' }), 1).eggColor).toBe('chocolate');
  });
  it('size is additive across three loci', () => {
    expect(computePhenotype(genotypeFromSpec({}), 1).size).toBe('bantam');
    expect(computePhenotype(genotypeFromSpec({ size1: 'L/L', size2: 'L/L', size3: 'L/L' }), 1).size).toBe('colossal');
    expect(computePhenotype(genotypeFromSpec({ size1: 'L/L', size2: 'L/L' }), 1).size).toBe('large');
  });
  it('is deterministic for the same genotype and seed', () => {
    const g = genotypeFromSpec({ base: 'E/E', domWhite: 'I/i+', flair: 'dramatic/none' });
    expect(computePhenotype(g, 7)).toEqual(computePhenotype(g, 7));
  });
  it('never produces undefined or NaN fields', () => {
    for (const breed of BREEDS) {
      const p = computePhenotype(genotypeFromSpec(breed.genotype), 3);
      for (const [k, v] of Object.entries(p)) {
        expect(v, `${breed.id}.${k}`).not.toBeUndefined();
        if (typeof v === 'number') expect(Number.isNaN(v)).toBe(false);
      }
    }
  });
});

describe('traits & rarity', () => {
  it('trait ids are unique', () => {
    expect(new Set(TRAITS.map((t) => t.id)).size).toBe(TRAITS.length);
  });
  it('Ayam Cemani expresses The Void', () => {
    const traits = traitsOf(computePhenotype(genotypeFromSpec(BREED_BY_ID.cemani!.genotype), 1));
    expect(traits).toContain('combo.void');
    expect(rarityOf(traits).tier).toBe('legendary');
  });
  it("Belgian d'Uccle expresses mille fleur; add lavender for porcelain", () => {
    const spec = BREED_BY_ID.duccle!.genotype;
    expect(traitsOf(computePhenotype(genotypeFromSpec(spec), 1))).toContain('pat.milleFleur');
    expect(traitsOf(computePhenotype(genotypeFromSpec({ ...spec, lavender: 'lav/lav' }), 1))).toContain('pat.porcelain');
  });
  it('a plain barnyard bird is common', () => {
    const traits = traitsOf(computePhenotype(genotypeFromSpec(BREED_BY_ID.rir!.genotype), 1));
    expect(['common', 'uncommon']).toContain(rarityOf(traits).tier);
  });
});

describe('breeding', () => {
  it('offspring get one allele from each parent (no mutation)', () => {
    const a = genotypeFromSpec({ base: 'E/E', dilute: 'Bl/Bl' });
    const b = genotypeFromSpec({ base: 'eb/eb', dilute: 'bl+/bl+' });
    for (let i = 0; i < 20; i++) {
      const { genotype, mutations } = inheritGenotype(a, b, createRng(i), 0);
      expect(mutations).toEqual([]);
      expect(genotype.base.sort()).toEqual(['E', 'eb']);
      expect(genotype.dilute.sort()).toEqual(['Bl', 'bl+']);
    }
  });
  it('blue × blue gives roughly 1:2:1 black:blue:splash', () => {
    const a = genotypeFromSpec({ base: 'E/E', dilute: 'Bl/bl+' });
    const counts = { black: 0, blue: 0, splash: 0 } as Record<string, number>;
    for (let i = 0; i < 2000; i++) {
      const { genotype } = inheritGenotype(a, a, createRng(i), 0);
      const p = computePhenotype(genotype, i);
      counts[p.primary] = (counts[p.primary] ?? 0) + 1;
    }
    expect(counts.black!).toBeGreaterThan(380);
    expect(counts.blue!).toBeGreaterThan(850);
    expect(counts.splash!).toBeGreaterThan(380);
  });
  it('two silkie carriers hatch a silkie about a quarter of the time', () => {
    const carrier = genotypeFromSpec({ silkie: 'h/h+' });
    let silkies = 0;
    for (let i = 0; i < 2000; i++) {
      const { genotype } = inheritGenotype(carrier, carrier, createRng(i), 0);
      if (computePhenotype(genotype, i).featherType === 'silkie') silkies++;
    }
    expect(silkies).toBeGreaterThan(400);
    expect(silkies).toBeLessThan(600);
  });
  it('breedChickens sets generation, parents, ancestry and is seed-deterministic', () => {
    const a = make('brahma');
    const b = make('polish', 2);
    const r1 = breedChickens(a, b, 1234, 'Gertrude');
    const r2 = breedChickens(a, b, 1234, 'Gertrude');
    expect(r1.child.genotype).toEqual(r2.child.genotype);
    expect(r1.child.generation).toBe(2);
    expect(r1.child.parents).toEqual([a.id, b.id]);
    expect(r1.child.ancestry.brahma).toBeCloseTo(0.5);
    expect(r1.child.ancestry.polish).toBeCloseTo(0.5);
    expect(r1.child.id).not.toBe(r2.child.id);
    const c = breedChickens(r1.child, make('silkie', 3), 99, 'Nugget').child;
    expect(c.generation).toBe(3);
    expect(c.ancestry.silkie).toBeCloseTo(0.5);
    expect(c.ancestry.brahma).toBeCloseTo(0.25);
  });
  it('mutations happen at a low rate and only to valid alleles', () => {
    const a = make('leghorn');
    const b = make('sebright', 5);
    let total = 0;
    for (let i = 0; i < 300; i++) {
      const r = breedChickens(a, b, i, 'x');
      total += r.mutations.length;
      for (const locus of LOCI) {
        for (const allele of r.child.genotype[locus.id]) expect(locus.alleles.some((x) => x.id === allele)).toBe(true);
      }
    }
    expect(total).toBeGreaterThan(5);
    expect(total / 300).toBeLessThan(1.5);
  });
  it('preview reports certain crest for Polish × Orpington', () => {
    const preview = previewPairing(make('polish'), make('orpington', 2), new Set());
    const certainIds = preview.certain.map((c) => c.traitId);
    expect(certainIds.some((id) => id.startsWith('head.crest') || id === 'head.bigCrest' || id === 'head.giantCrest')).toBe(true);
    expect(preview.unknownCount).toBeGreaterThan(0);
  });
  it('viewOf gives a consistent view with a rarity tier', () => {
    const v = viewOf(make('silkie'));
    expect(v.traits).toContain('fea.silkie');
    expect(['rare', 'exotic', 'legendary']).toContain(v.rarity.tier);
    expect(rng().next()).toBeLessThan(1);
  });
});

describe('resemblance', () => {
  it('a pure breed representative matches few other breeds', () => {
    
    const collisions: string[] = [];
    for (const b of BREEDS) {
      const traits = traitsOf(computePhenotype(genotypeFromSpec(b.genotype), 3));
      for (const other of resemblingBreeds(traits)) if (other.id !== b.id) collisions.push(`${b.name} looks like ${other.name}`);
    }
    expect(collisions, collisions.join('\n')).toEqual([]);
  });
});
