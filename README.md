# FOWL PLAY

A weird little chicken-breeding discovery game.

Breed chickens. Hatch weird chickens. Discover traits. Fill the almanac.
Wonder what the hell you'll hatch next.

**Play it:** https://scottyfncodes.github.io/FOWL-PLAY/

Add it to your iPhone Home Screen from Safari's share sheet: it runs as a standalone app.

## What's in the box

- **71 real chicken breeds** with short field-guide notes, origin and egg colour, each given a game genotype that reproduces its signature look.
- **A real genetics engine**: ~50 loci, two alleles each, Mendelian inheritance with dominant, recessive, blended (blue → splash), additive (body size, leg feathering, brown eggs), epistatic (pea + rose = walnut comb; blue eggs + brown = olive) and rare mutation behaviour.
- **Procedural chicken illustrations** drawn from the phenotype, so every chicken looks like its genes.
- **Hatch reveal** with trait discovery, look-alike breed unlocks, mutations and milestones.
- **Chicken Almanac** (breeds, traits, milestones), **Chicken Show**, **Hatchery** with upgrades, ancestry trees, and a versioned save system with backup and import/export.

The genetics are a game-friendly toy: locus names are borrowed from real poultry genetics for flavour, but nothing here is a claim about real chickens.

## Development

```bash
npm install
npm run dev        # local dev server
npm test           # engine + save unit tests (vitest)
npm run build      # type-check + production build into dist/
npm run e2e        # Playwright end-to-end tests against the built site
```

`tools/gallery.ts` renders every breed to an HTML sheet, and `tools/playtest.mjs` walks through a full game at iPhone size taking screenshots.

## Deployment

Pushes to `main` run tests, build with the `/FOWL-PLAY/` base path and deploy to GitHub Pages via `.github/workflows/deploy.yml`.

## Layout

```
src/
  core/        seeded RNG, ids
  data/        breeds, traits, names, shows, milestones, economy
  genetics/    loci, phenotype, traits/rarity, breeding, resemblance
  chickens/    chicken model, naming
  state/       game rules, store
  save/        storage, sanitising, migrations
  ui/          screens, components, chicken illustrator, hatch sequence
  audio/       tiny synthesised sound effects
```
