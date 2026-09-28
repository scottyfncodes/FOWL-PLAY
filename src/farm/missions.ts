import type { Abilities } from '../genetics/abilities';

/**
 * Every problem on the farm. A mission is discovered when a chicken first
 * reaches it, and solved when a chicken operates its mechanism (a bolt, a
 * rope, a bell). Solutions are listed here for the Fowldex and the tests:
 * the world itself only checks physics, so anything that works, works.
 */
export interface SolutionDef {
  /** Route id recorded when the mission is solved this way. */
  method: string;
  /** Short label for the Fowldex ("Squeezed through the gap"). */
  label: string;
  /** The kind of chicken that can do it; used by the solvability tests. */
  needs: (a: Abilities) => boolean;
}

export interface MissionDef {
  id: string;
  order: number;
  name: string;
  /** Deadpan headline printed when it is solved. */
  done: string;
  /** The tangible problem, as first encountered. */
  problem: string;
  /** Shown on the board after solving. */
  afterword: string;
  reward: number;
  solutions: SolutionDef[];
  /** Ids of world flags this mission opens. */
  opens: string[];
  /** Optional side mission: not required for the main chain. */
  optional?: boolean;
}

export const MISSIONS: MissionDef[] = [
  {
    id: 'breakfast',
    order: 0,
    name: 'Breakfast',
    done: 'Breakfast served.',
    problem: 'Somebody left the feed sack on the crate again. It needs opening, and nobody with thumbs is around.',
    afterword: 'The sack is open. Everyone ate. Nobody said thank you.',
    reward: 15,
    solutions: [{ method: 'peck', label: 'Hopped up and pecked it open', needs: () => true }],
    opens: [],
  },
  {
    id: 'gardenGate',
    order: 1,
    name: 'The Garden Gate',
    done: 'Gate opened.',
    problem: 'The garden is behind a hedge and a bolted gate. There is a gap at the bottom, a wheelbarrow, a rough post, soft soil, and a latch far too high for a chicken. What kind of chicken gets in?',
    afterword: 'The gate stands open for the whole flock now.',
    reward: 40,
    solutions: [
      { method: 'gap', label: 'Squeezed through the gap under the hedge', needs: (a) => a.tiny },
      { method: 'jump', label: 'Jumped the hedge from the wheelbarrow', needs: (a) => a.jump >= 4 },
      { method: 'glide', label: 'Flapped over the top', needs: (a) => a.glide },
      { method: 'dig', label: 'Dug under it', needs: (a) => a.dig },
      { method: 'climb', label: 'Climbed the post', needs: (a) => a.climb },
      { method: 'latch', label: 'Reached the latch', needs: (a) => a.jump + (a.longLegs ? 1 : 0) >= 4 },
    ],
    opens: ['gardenGate'],
  },
  {
    id: 'crows',
    order: 2,
    name: 'Crows in the Beds',
    done: 'Crows dispersed.',
    problem: 'A gang of crows is eating the garden seed. They lift off when a chicken comes close and land again the moment it leaves.',
    afterword: 'The crows have moved to the neighbours. The neighbours can deal with it.',
    reward: 35,
    solutions: [
      { method: 'crow', label: 'Crowed them off', needs: (a) => a.crow >= 2 },
      { method: 'aggressive', label: 'Picked a fight and won', needs: (a) => a.aggressive },
      { method: 'chase', label: 'Chased them down', needs: (a) => a.brave && a.speed >= 3 },
    ],
    opens: [],
    optional: true,
  },
  {
    id: 'pond',
    order: 3,
    name: 'The Pond',
    done: 'Plank dropped.',
    problem: 'The pond sits between the garden and the barn. A plank is propped on the far bank, tied up with a rope. Get over there and cut it loose.',
    afterword: 'The plank lies across the pond. Dry feet for everyone.',
    reward: 50,
    solutions: [
      { method: 'swim', label: 'Swam across', needs: (a) => a.swim },
      { method: 'wade', label: 'Waded the shallows and hopped the stone', needs: (a) => a.wade },
      { method: 'glide', label: 'Glided over from the bank', needs: (a) => a.glide },
      { method: 'leap', label: 'Leapt from stone to stone', needs: (a) => a.jump >= 5 && a.speed >= 4 },
    ],
    opens: ['pondPlank'],
  },
  {
    id: 'barnDoor',
    order: 4,
    name: 'The Barn Door',
    done: 'Barn opened.',
    problem: 'The barn is shut. There is a weak board at the bottom of the door, a cat flap, a latch absurdly high up, a loft window, and a tree that leans towards it.',
    afterword: 'The barn door is bolted open. It smells of hay and secrets.',
    reward: 60,
    solutions: [
      { method: 'board', label: 'Broke through the weak board', needs: (a) => a.strength >= 3 || a.beak >= 2 },
      { method: 'flap', label: 'Used the cat flap', needs: (a) => a.tiny },
      { method: 'latch', label: 'Reached the latch', needs: (a) => a.jump + (a.longLegs ? 1 : 0) >= 6 },
      { method: 'climb', label: 'Climbed in through the loft window', needs: (a) => a.climb },
      { method: 'hidden', label: 'Found the old tunnel under the wall', needs: (a) => a.curious },
    ],
    opens: ['barnDoor'],
  },
  {
    id: 'grainChute',
    order: 5,
    name: 'The Grain Chute',
    done: 'Chute opened.',
    problem: 'Inside the barn, a pressure plate works the grain chute and the back door. It wants a lot of weight on it. There is a crate.',
    afterword: 'Grain everywhere. The back door swings open onto the field.',
    reward: 60,
    solutions: [
      { method: 'heavy', label: 'Stood on the plate', needs: (a) => a.weight >= 5 },
      { method: 'crate', label: 'Shoved the crate onto the plate', needs: (a) => a.strength >= 2 },
    ],
    opens: ['barnBack'],
  },
  {
    id: 'foxField',
    order: 6,
    name: 'The Fox Field',
    done: 'Field crossed.',
    problem: 'Between the barn and the farmhouse is a field. A fox lives in it. The gate on the far side is bolted from this side, which was thoughtless.',
    afterword: 'The fox has given up and gone to sleep. The field gate stays open.',
    reward: 80,
    solutions: [
      { method: 'pipe', label: 'Took the drainpipe under the field', needs: (a) => a.tiny },
      { method: 'sneak', label: 'Slipped past unnoticed', needs: (a) => a.sneaky },
      { method: 'outrun', label: 'Outran the fox', needs: (a) => a.speed >= 5 },
      { method: 'brave', label: 'Stared the fox down', needs: (a) => a.brave && a.strength >= 3 },
      { method: 'timing', label: 'Hid in the bushes and waited for its back to turn', needs: () => true },
    ],
    opens: ['fieldGate'],
  },
  {
    id: 'doorbell',
    order: 7,
    name: 'The Doorbell',
    done: 'Doorbell pressed.',
    problem: 'The farmhouse has a doorbell. It is very high up, as doorbells are. Ring it.',
    afterword: 'The farmer answered the door and found a chicken. The next part of the map is being surveyed.',
    reward: 120,
    solutions: [
      { method: 'reach', label: 'Jumped up and pressed it', needs: (a) => a.jump + (a.longLegs ? 1 : 0) >= 5 },
      { method: 'crate', label: 'Pushed a crate under it', needs: (a) => a.strength >= 2 && a.jump >= 3 },
      { method: 'climb', label: 'Climbed the trellis', needs: (a) => a.climb },
      { method: 'glide', label: 'Glided onto the porch roof from the oak', needs: (a) => a.glide && a.climb },
      { method: 'crow', label: 'Crowed until the farmer came out', needs: (a) => a.crow >= 3 },
    ],
    opens: [],
  },
];

export const MISSION_BY_ID: Record<string, MissionDef> = Object.fromEntries(MISSIONS.map((m) => [m.id, m]));

export const MAIN_MISSIONS = MISSIONS.filter((m) => !m.optional);

/** Field notes learned by failing at things. */
export const LORE: Record<string, { title: string; text: string }> = {
  heavyWings: { title: 'Big wings are not enough', text: 'A big-winged chicken flapped hard and dropped like a sack of feed. Wings need a light body under them.' },
  frizzleNoGlide: { title: 'Curly feathers do not fly', text: 'Frizzled feathers let the air straight through. No lift at all.' },
  rumplessNoGlide: { title: 'No tail, no steering', text: 'A rumpless chicken tried to glide and went sideways. Tails matter.' },
  fluffySink: { title: 'Fluff soaks through', text: 'Webbed feet, fluffy feathers: the feet paddled, the feathers sank. Swimmers need sleek plumage.' },
  bootsNoDig: { title: 'Boots get in the way', text: 'Digging claws under feathered feet just make mud. Clean legs only.' },
  silkieNoClimb: { title: 'Silkie fluff snags', text: 'Gripping toes under silkie plumage: every attempt to climb ended in a tangle. The toes are there, though, and they can be passed on.' },
  silkieGrounded: { title: 'Silkie feathers are not wings', text: 'Silkie plumage is beautiful and completely useless in the air.' },
  slowGiant: { title: 'Giants are slow', text: 'Sheer size costs pace. A fox knows this.' },
  skittishFreeze: { title: 'Skittish chickens freeze', text: 'The moment the fox looked up, this chicken stopped dead. Nerve is a trait too.' },
};
