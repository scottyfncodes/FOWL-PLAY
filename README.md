# FOWL PLAY 🐔🧬

**Breed the chicken. Become the chicken. Solve the problem.**

A problem appears on the farm. You work out what kind of chicken could solve it. You breed that chicken, hatch it, and then you actually play as it, using its body to get the job done.

**Play it:** https://scottyfncodes.github.io/FOWL-PLAY/

Add it to your iPhone Home Screen from Safari's share sheet: it runs as a standalone app, portrait or landscape.

## The loop

1. Take a chicken out onto **the Farm** (a side-on playground: coop yard, hedge and gate, garden, pond, barn, fox field, farmhouse).
2. Walk into a problem. A bolted gate. A pond. A barn door. A fox. A doorbell.
3. Poke at it. The chicken thinks out loud about what it can't do ("Too big for the gap. Something tiny could squeeze through.") and the clue goes on the problem board.
4. Back in the **Coop**, breed towards that chicken. The breeding pen shows honest odds; the hatch reveals what the chick can do, and which hidden genes its parents must have been carrying.
5. Pick the chick, head out, and do it yourself: squeeze, climb, dig, glide, swim, shove, peck, outrun, hide.
6. Every problem opens something for the whole flock, so the next problem is always a walk away.

Every problem has several kinds of chicken that solve it. The garden gate alone yields to a tiny chicken, a springy one, a glider, a digger, a climber, or long legs that reach the latch.

## What's in the box

- **A genetics engine** with ~60 loci: Mendelian inheritance with dominant, recessive, blended, additive and epistatic behaviour, plus rare mutations. Locus names are borrowed from real poultry genetics for flavour; the rules are a toy.
- **Farm abilities derived from the body**, not from a stat sheet: size, strength, pace, jump, reach, glide, swim, beak, grip, dig, crow, nerve and habit. Most are combinations. Big wings don't glide on a heavy body; webbed feet don't swim under fluff; digging claws don't work in feathered boots. Learning those rules is the game, and they are written up as *field notes* when you fail at them.
- **Hidden genes** that a chicken can carry without showing. When a chick expresses one, both parents are marked as proven carriers in the Fowldex.
- **71 real chicken breeds**, each with a game genotype and farm genes. Starters and the welcome picks quietly carry the genes the first problem needs.
- **The Fowldex**: numbered entries for every chicken you have owned (abilities, hidden genes, parents, missions solved), an ability catalogue with silhouettes for undiscovered ones, field notes, breeds, traits and milestones.
- **Procedural chicken illustrations** drawn from the phenotype, reused as the playable sprite so the chicken you play is the chicken on the card.
- A **Hatchery** for fresh genes, a **Chicken Show**, upgrades, ancestry trees, mystery eggs hidden on the farm, and a versioned save with backup and import/export.

## Development

```bash
npm install
npm run dev        # local dev server
npm test           # genetics, abilities, save, farm simulation and outing tests (vitest)
npm run build      # type-check + production build into dist/
npm run e2e        # Playwright end-to-end tests against the built site (iPhone + desktop)
```

`tools/farmtest.mjs` plays through the first mission at iPhone size taking screenshots; `tools/playtest.mjs` walks the breeding side; `tools/gallery.ts` renders every breed; `tools/icons.mjs` regenerates the app icons from `public/icons/icon.svg`.

## Deployment

Pushes to `main` run tests, build with the `/FOWL-PLAY/` base path and deploy to GitHub Pages via `.github/workflows/deploy.yml`.

## Layout

```
src/
  core/        seeded RNG, ids
  data/        breeds, ability genes per breed, traits, names, shows, milestones, economy
  genetics/    loci, phenotype, traits/rarity, abilities, breeding, resemblance
  chickens/    chicken model, naming
  farm/        the playable farm: level data, missions, DOM-free simulation, renderer, sprites, play screen
  state/       game rules, outing rules, store
  save/        storage, sanitising, migrations
  ui/          screens (farm board, coop, breed, fowldex, hatchery), components, illustrator, hatch sequence
  audio/       tiny synthesised sound effects
```

The farm simulation (`src/farm/sim.ts`) is pure and fixed-step: the same chicken and the same inputs always produce the same outing, so every route through every problem is covered by headless tests.
