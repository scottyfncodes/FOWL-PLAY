/**
 * Locus definitions for FOWL PLAY's simplified, game-friendly genetics.
 *
 * This is NOT a model of real poultry genetics. Many locus and allele names are
 * borrowed from real chicken genetics for flavor (E, Bl, Cr, Pti, h, F, Na…),
 * but the inheritance rules are deliberately simplified so a player can learn
 * them by experimenting.
 *
 * Every chicken carries exactly two alleles at every locus. Offspring receive
 * one allele from each parent at each locus, chosen at random, with a small
 * chance of mutation into one of the locus' `mutations`.
 */

export interface AlleleDef {
  id: string;
  label: string;
}

export interface MutationDef {
  allele: string;
  /** Relative weight among this locus' mutations. */
  weight: number;
}

export interface LocusDef {
  id: LocusId;
  name: string;
  category: 'color' | 'pattern' | 'feather' | 'head' | 'body' | 'legs' | 'egg' | 'personality' | 'utility';
  alleles: AlleleDef[];
  /** Wild-type allele used when a breed doesn't specify this locus. */
  wild: string;
  /** Possible spontaneous mutations at this locus. Empty = never mutates. */
  mutations: MutationDef[];
  /** Relative mutation rate multiplier (1 = baseline). */
  mutability?: number;
}

export type LocusId =
  | 'base'
  | 'dilute'
  | 'lavender'
  | 'chocolate'
  | 'recWhite'
  | 'domWhite'
  | 'silver'
  | 'mahogany'
  | 'buffDilute'
  | 'sheen'
  | 'barring'
  | 'pattern'
  | 'mottle'
  | 'crest'
  | 'crestSize'
  | 'beard'
  | 'legFeather1'
  | 'legFeather2'
  | 'vulture'
  | 'peaComb'
  | 'roseComb'
  | 'duplexComb'
  | 'silkie'
  | 'frizzle'
  | 'nakedNeck'
  | 'rumpless'
  | 'longTail'
  | 'endlessTail'
  | 'squirrelTail'
  | 'size1'
  | 'size2'
  | 'size3'
  | 'posture'
  | 'fluff1'
  | 'fluff2'
  | 'skin'
  | 'dermal'
  | 'fibro'
  | 'polydactyl'
  | 'earTufts'
  | 'blueEgg'
  | 'brown1'
  | 'brown2'
  | 'brown3'
  | 'speckle'
  | 'bloom'
  | 'eggSize'
  | 'laying'
  | 'temper'
  | 'social'
  | 'flair'
  | 'growth';

const L = (
  id: LocusId,
  name: string,
  category: LocusDef['category'],
  alleles: [string, string][],
  wild: string,
  mutations: [string, number][] = [],
  mutability = 1,
): LocusDef => ({
  id,
  name,
  category,
  alleles: alleles.map(([aid, label]) => ({ id: aid, label })),
  wild,
  mutations: mutations.map(([allele, weight]) => ({ allele, weight })),
  mutability,
});

export const LOCI: LocusDef[] = [
  // ---- Colour -----------------------------------------------------------
  L('base', 'Base colour', 'color', [['E', 'Extended black'], ['eWh', 'Wheaten'], ['eb', 'Partridge'], ['e+', 'Duckwing']], 'eb', [['E', 2], ['eWh', 2], ['eb', 2], ['e+', 2]]),
  L('dilute', 'Blue dilution', 'color', [['Bl', 'Blue'], ['bl+', 'Not diluted']], 'bl+', [['Bl', 1]], 1.5),
  L('lavender', 'Lavender', 'color', [['lav+', 'Not lavender'], ['lav', 'Lavender']], 'lav+', [['lav', 1]], 1.2),
  L('chocolate', 'Chocolate', 'color', [['choc+', 'Not chocolate'], ['choc', 'Chocolate']], 'choc+', [['choc', 1]], 0.8),
  L('recWhite', 'Recessive white', 'color', [['c+', 'Coloured'], ['c', 'White (recessive)']], 'c+', [['c', 1]]),
  L('domWhite', 'Dominant white', 'color', [['I', 'White (dominant)'], ['i+', 'Coloured']], 'i+', [['I', 1]], 0.7),
  L('silver', 'Silver / gold', 'color', [['S', 'Silver'], ['s+', 'Gold']], 's+', [['S', 1], ['s+', 1]]),
  L('mahogany', 'Mahogany', 'color', [['Mh', 'Mahogany'], ['mh+', 'Plain gold']], 'mh+', [['Mh', 1]]),
  L('buffDilute', 'Buff dilution', 'color', [['Di', 'Buff'], ['di+', 'Not buff']], 'di+', [['Di', 1]]),
  L('sheen', 'Beetle sheen', 'color', [['Sh', 'Green sheen'], ['sh+', 'Matte']], 'sh+', [['Sh', 1]]),
  // ---- Pattern ----------------------------------------------------------
  L('barring', 'Barring', 'pattern', [['B', 'Barred'], ['b+', 'Not barred']], 'b+', [['B', 1]]),
  L('pattern', 'Feather pattern', 'pattern', [['Co', 'Columbian'], ['Lg', 'Laced'], ['Pg', 'Pencilled'], ['Sp', 'Spangled'], ['wt', 'Plain']], 'wt', [['Lg', 2], ['Sp', 2], ['Pg', 2], ['Co', 1]], 1.4),
  L('mottle', 'Mottling', 'pattern', [['mo+', 'Not mottled'], ['mo', 'Mottled']], 'mo+', [['mo', 1]]),
  // ---- Feathers ---------------------------------------------------------
  L('silkie', 'Silkie feathering', 'feather', [['h+', 'Normal feathers'], ['h', 'Silkie feathers']], 'h+', [['h', 1]], 0.8),
  L('frizzle', 'Frizzle', 'feather', [['F', 'Frizzled'], ['f+', 'Smooth']], 'f+', [['F', 1]], 1.2),
  L('nakedNeck', 'Naked neck', 'feather', [['Na', 'Naked neck'], ['na+', 'Feathered neck']], 'na+', [['Na', 1]], 0.8),
  L('fluff1', 'Fluff A', 'feather', [['Fl', 'Fluffy'], ['fl', 'Tight']], 'fl', [['Fl', 1], ['fl', 1]]),
  L('fluff2', 'Fluff B', 'feather', [['Fl', 'Fluffy'], ['fl', 'Tight']], 'fl', [['Fl', 1], ['fl', 1]]),
  // ---- Head -------------------------------------------------------------
  L('crest', 'Crest', 'head', [['Cr', 'Crested'], ['cr+', 'No crest']], 'cr+', [['Cr', 1]], 1.2),
  L('crestSize', 'Crest size', 'head', [['big', 'Big crest'], ['sm', 'Small crest']], 'sm', [['big', 1]]),
  L('beard', 'Beard & muffs', 'head', [['Mb', 'Bearded'], ['mb+', 'Clean-faced']], 'mb+', [['Mb', 1]]),
  L('peaComb', 'Pea comb', 'head', [['P', 'Pea'], ['p+', 'Not pea']], 'p+', [['P', 1]]),
  L('roseComb', 'Rose comb', 'head', [['R', 'Rose'], ['r+', 'Not rose']], 'r+', [['R', 1]]),
  L('duplexComb', 'Duplex comb', 'head', [['D', 'Duplex'], ['d+', 'Not duplex']], 'd+', [['D', 1]], 0.8),
  L('earTufts', 'Ear tufts', 'head', [['Et', 'Tufted'], ['et+', 'No tufts']], 'et+', [['Et', 1]], 0.7),
  // ---- Body -------------------------------------------------------------
  L('size1', 'Size A', 'body', [['L', 'Large'], ['s', 'Small']], 's', [['L', 1], ['s', 1]]),
  L('size2', 'Size B', 'body', [['L', 'Large'], ['s', 'Small']], 's', [['L', 1], ['s', 1]]),
  L('size3', 'Size C', 'body', [['L', 'Large'], ['s', 'Small']], 's', [['L', 1], ['s', 1]]),
  L('posture', 'Posture', 'body', [['up', 'Upright'], ['st', 'Standard'], ['rd', 'Round']], 'st', [['up', 1], ['rd', 1]]),
  L('rumpless', 'Rumpless', 'body', [['Rp', 'Rumpless'], ['rp+', 'Tailed']], 'rp+', [['Rp', 1]], 0.6),
  L('longTail', 'Long tail', 'body', [['lt+', 'Normal tail'], ['lt', 'Long tail']], 'lt+', [['lt', 1]]),
  L('endlessTail', 'Endless tail', 'body', [['nm+', 'Moults'], ['nm', 'Never moults']], 'nm+', [['nm', 1]], 0.4),
  L('squirrelTail', 'Squirrel tail', 'body', [['Sq', 'Squirrel tail'], ['sq+', 'Normal carriage']], 'sq+', [['Sq', 1]], 0.8),
  // ---- Legs & skin ------------------------------------------------------
  L('legFeather1', 'Leg feathering A', 'legs', [['Pti', 'Feathered'], ['pti+', 'Clean']], 'pti+', [['Pti', 1]]),
  L('legFeather2', 'Leg feathering B', 'legs', [['Pti', 'Feathered'], ['pti+', 'Clean']], 'pti+', [['Pti', 1]]),
  L('vulture', 'Vulture hocks', 'legs', [['v+', 'Normal hocks'], ['v', 'Vulture hocks']], 'v+', [['v', 1]], 0.8),
  L('skin', 'Skin colour', 'legs', [['W', 'White skin'], ['w', 'Yellow skin']], 'w', [['W', 1], ['w', 1]]),
  L('dermal', 'Dermal pigment', 'legs', [['Id', 'Light legs'], ['id', 'Dark legs']], 'Id', [['id', 1]]),
  L('fibro', 'Fibromelanosis', 'legs', [['Fm', 'Black skin'], ['fm+', 'Normal skin']], 'fm+', [['Fm', 1]], 0.6),
  L('polydactyl', 'Extra toe', 'legs', [['Po', 'Five toes'], ['po+', 'Four toes']], 'po+', [['Po', 1]], 0.8),
  // ---- Eggs -------------------------------------------------------------
  L('blueEgg', 'Blue egg', 'egg', [['O', 'Blue shell'], ['o+', 'White shell']], 'o+', [['O', 1]]),
  L('brown1', 'Brown egg A', 'egg', [['Br', 'Brown'], ['br', 'Pale']], 'br', [['Br', 1], ['br', 1]]),
  L('brown2', 'Brown egg B', 'egg', [['Br', 'Brown'], ['br', 'Pale']], 'br', [['Br', 1], ['br', 1]]),
  L('brown3', 'Brown egg C', 'egg', [['Br', 'Brown'], ['br', 'Pale']], 'br', [['Br', 1], ['br', 1]]),
  L('speckle', 'Speckling', 'egg', [['sp+', 'Plain shell'], ['sp', 'Speckled']], 'sp+', [['sp', 1]]),
  L('bloom', 'Shell bloom', 'egg', [['pk+', 'Normal bloom'], ['pk', 'Plum bloom']], 'pk+', [['pk', 1]], 0.5),
  L('eggSize', 'Egg size', 'egg', [['EL', 'Large eggs'], ['es', 'Small eggs']], 'es', [['EL', 1]]),
  L('laying', 'Laying', 'egg', [['hi', 'Prolific'], ['mid', 'Steady'], ['lo', 'Occasional']], 'mid', [['hi', 1], ['lo', 1]]),
  // ---- Personality ------------------------------------------------------
  L('temper', 'Temperament', 'personality', [['energetic', 'Energetic'], ['curious', 'Curious'], ['calm', 'Calm']], 'curious', [['energetic', 1], ['calm', 1], ['curious', 1]], 0.6),
  L('social', 'Sociability', 'personality', [['friendly', 'Friendly'], ['social', 'Social'], ['aloof', 'Aloof'], ['stubborn', 'Stubborn']], 'social', [['friendly', 1], ['aloof', 1], ['stubborn', 1]], 0.6),
  L('flair', 'Flair', 'personality', [['dramatic', 'Dramatic'], ['judgmental', 'Judgmental'], ['dignified', 'Dignified'], ['none', 'Unremarkable']], 'none', [['dramatic', 2], ['judgmental', 2], ['dignified', 1]], 0.8),
  // ---- Utility ----------------------------------------------------------
  L('growth', 'Growth', 'utility', [['fast', 'Fast grower'], ['slow', 'Slow grower']], 'fast', [['slow', 1], ['fast', 1]]),
];

export const LOCUS_BY_ID: Record<LocusId, LocusDef> = Object.fromEntries(LOCI.map((l) => [l.id, l])) as Record<LocusId, LocusDef>;

export const LOCUS_IDS: LocusId[] = LOCI.map((l) => l.id);

export type Genotype = Record<LocusId, [string, string]>;

export function isValidAllele(locus: LocusId, allele: string): boolean {
  const def = LOCUS_BY_ID[locus];
  return !!def && def.alleles.some((a) => a.id === allele);
}

/** Number of copies of `allele` at a locus (0, 1 or 2). */
export function copies(g: Genotype, locus: LocusId, allele: string): number {
  const pair = g[locus];
  if (!pair) return 0;
  return (pair[0] === allele ? 1 : 0) + (pair[1] === allele ? 1 : 0);
}

export function has(g: Genotype, locus: LocusId, allele: string): boolean {
  return copies(g, locus, allele) > 0;
}

export function wildGenotype(): Genotype {
  const g = {} as Genotype;
  for (const l of LOCI) g[l.id] = [l.wild, l.wild];
  return g;
}

/**
 * Build a genotype from a compact spec like `{ base: 'E/E', dilute: 'Bl/bl+' }`.
 * A value may list alternatives separated by `|`; `pick` chooses among them.
 * Unspecified loci take their wild-type allele.
 */
export function genotypeFromSpec(spec: Partial<Record<LocusId, string>>, pick: (n: number) => number = () => 0): Genotype {
  const g = wildGenotype();
  for (const [locus, value] of Object.entries(spec) as [LocusId, string][]) {
    if (!value) continue;
    const options = value.split('|').map((s) => s.trim());
    const chosen = options[Math.min(options.length - 1, Math.max(0, pick(options.length)))] ?? options[0] ?? '';
    const [a, b] = chosen.split('/');
    if (!a || !b || !isValidAllele(locus, a) || !isValidAllele(locus, b)) {
      throw new Error(`Invalid genotype spec ${locus}=${chosen}`);
    }
    g[locus] = [a, b];
  }
  return g;
}

/** Normalise a possibly-corrupt genotype into a valid one, filling gaps with wild type. */
export function sanitizeGenotype(input: unknown): Genotype {
  const g = wildGenotype();
  if (!input || typeof input !== 'object') return g;
  const obj = input as Record<string, unknown>;
  for (const l of LOCI) {
    const pair = obj[l.id];
    if (Array.isArray(pair) && pair.length === 2) {
      const [a, b] = pair as unknown[];
      if (typeof a === 'string' && typeof b === 'string' && isValidAllele(l.id, a) && isValidAllele(l.id, b)) {
        g[l.id] = [a, b];
      }
    }
  }
  return g;
}
