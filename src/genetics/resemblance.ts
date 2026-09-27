import { BREEDS, type BreedDef } from '../data/breeds';

/**
 * Does this trait list satisfy every signature entry?
 * Alternatives are split by `|`; an entry starting with `!` must be absent.
 */
export function matchesSignature(traits: readonly string[], breed: BreedDef): boolean {
  return breed.signature.every((entry) => {
    if (entry.startsWith('!')) return !traits.includes(entry.slice(1));
    return entry.split('|').some((alt) => traits.includes(alt));
  });
}

/** Breeds this chicken looks like, by signature. */
export function resemblingBreeds(traits: readonly string[]): BreedDef[] {
  return BREEDS.filter((b) => matchesSignature(traits, b));
}
