import { GROUND_Y, type Entity, type LevelDef, type Prop } from './types';

/**
 * THE FARM. One long side-on playground, left to right:
 * coop yard → hedge & garden gate → garden → pond → barn → fox field → farmhouse.
 * Every problem is a mechanism the flock opens for good once one chicken
 * manages it, so the next problem is always reachable by walking.
 */

const G = GROUND_Y;
let cornN = 0;
const corn = (x: number, y = G - 6): Entity => ({ kind: 'corn', id: `corn${++cornN}`, x, y, taken: false });
const ground = (x: number, w: number, decor: 'grass' | 'wood' | 'dirt' | 'underground' = 'grass', y = G, h = 100): Entity => ({ kind: 'solid', x, y, w, h, decor });

const E: Entity[] = [];
const P: Prop[] = [];

// ---------------------------------------------------------------------------
// A. Coop yard (0–760)
// ---------------------------------------------------------------------------
E.push(ground(0, 1400));
E.push({ kind: 'zone', id: 'exit', x: 0, y: 380, w: 62, h: 120, exit: true });
E.push({ kind: 'zone', id: 'z-breakfast', x: 200, y: 380, w: 80, h: 120, discover: 'breakfast' });
P.push({ type: 'coop', x: 40, y: G });
P.push({ type: 'sign', x: 250, y: G, text: 'YARD' });
P.push({ type: 'cloud', x: 120, y: 90 }, { type: 'cloud', x: 700, y: 60, variant: 1 }, { type: 'cloud', x: 1500, y: 110 }, { type: 'cloud', x: 2300, y: 70, variant: 1 }, { type: 'cloud', x: 3100, y: 100 }, { type: 'cloud', x: 3900, y: 50, variant: 1 });
E.push({ kind: 'solid', x: 300, y: G - 40, w: 60, h: 40, decor: 'crate' });
E.push({ kind: 'target', id: 'sack', x: 330, y: G - 76, w: 30, h: 36, label: 'Peck the sack', pecks: 3, done: false, sets: ['breakfast'], mission: { id: 'breakfast', method: 'peck' }, look: 'sack' });
E.push(corn(420), corn(470), corn(520));
E.push({ kind: 'solid', x: 560, y: G - 44, w: 8, h: 44, decor: 'fence' });
E.push(corn(600, G - 60));
P.push({ type: 'flowers', x: 720, y: G });
E.push({ kind: 'zone', id: 'z-gate', x: 620, y: 300, w: 70, h: 200, discover: 'gardenGate' });

// The hedge and garden gate (760–850)
E.push({ kind: 'dig', id: 'hedgeSoil', x: 585, y: G - 4, w: 50, h: 8, to: { x: 880, y: G }, route: { mission: 'gardenGate', method: 'dig' }, clue: { mission: 'gardenGate', id: 'soil', text: 'The soil is soft here, all along the hedge. A chicken with digging claws could get under it.' } });
E.push({ kind: 'solid', id: 'barrow', x: 645, y: G - 50, w: 60, h: 50, decor: 'wood' });
E.push({ kind: 'zone', id: 'z-barrow', x: 645, y: G - 120, w: 60, h: 70, clue: { mission: 'gardenGate', id: 'barrow', text: 'From the wheelbarrow the top is nearly in reach. A springier chicken would clear it.' }, clueUnless: 'jump>=4' });
E.push({ kind: 'climb', id: 'hedgePost', x: 750, y: 340, w: 20, h: 160, decor: 'post', route: { mission: 'gardenGate', method: 'climb' }, clue: { mission: 'gardenGate', id: 'post', text: 'A rough old post. The right kind of feet could climb that.' } });
E.push({ kind: 'zone', id: 'z-latch', x: 740, y: 340, w: 30, h: 160, clue: { mission: 'gardenGate', id: 'latch', text: 'There is a latch at the top of the gate. Miles up. Longer legs or a bigger jump.' }, clueUnless: 'reach>=4' });
E.push({ kind: 'gap', id: 'hedgeGap', x: 770, y: G - 26, w: 76, h: 26, maxWeight: 0, route: { mission: 'gardenGate', method: 'gap' }, clue: { mission: 'gardenGate', id: 'gap', text: 'There is a gap under the hedge. Not for a chicken this size. Something tiny could squeeze through.' } });
E.push({ kind: 'door', id: 'gardenGateDoor', x: 770, y: 340, w: 16, h: 134, flag: 'gardenGate', decor: 'fence' });
E.push({ kind: 'target', id: 'gateLatch', x: 760, y: 340, w: 16, h: 22, label: 'Peck the latch', pecks: 2, done: false, sets: ['gardenGate'], mission: { id: 'gardenGate', method: 'latch' }, look: 'latch' });
E.push({ kind: 'solid', id: 'hedge', x: 786, y: 340, w: 60, h: 134, decor: 'hedge' });
E.push({ kind: 'zone', id: 'z-hedgeTop', x: 770, y: 290, w: 76, h: 50, route: { mission: 'gardenGate', method: 'glide', ifAbility: 'glide' } });
E.push({ kind: 'zone', id: 'z-hedgeTop2', x: 770, y: 290, w: 76, h: 50, route: { mission: 'gardenGate', method: 'jump' } });
E.push({ kind: 'target', id: 'gateBolt', x: 850, y: G - 24, w: 16, h: 24, label: 'Peck the bolt', pecks: 2, done: false, sets: ['gardenGate'], mission: { id: 'gardenGate' }, look: 'bolt' });

// ---------------------------------------------------------------------------
// C. The garden (860–1560)
// ---------------------------------------------------------------------------
E.push({ kind: 'checkpoint', id: 'cp-garden', x: 900, y: G });
P.push({ type: 'sign', x: 880, y: G, text: 'GARDEN' });
P.push({ type: 'bed', x: 920, y: G, w: 120 }, { type: 'bed', x: 1180, y: G, w: 160 }, { type: 'bed', x: 1400, y: G, w: 110 });
P.push({ type: 'scarecrow', x: 1060, y: G });
E.push({ kind: 'zone', id: 'z-scare', x: 1030, y: 380, w: 60, h: 120, scary: true });
E.push(corn(960), corn(1000, G - 14), corn(1120));
E.push({ kind: 'zone', id: 'z-crows', x: 1080, y: 300, w: 60, h: 200, discover: 'crows' });
E.push({ kind: 'crows', id: 'crows', x: 1180, y: G - 30, w: 160, h: 30, count: 5, airTime: 0, fled: false, mission: 'crows', sets: ['crowsGone'] });
E.push(corn(1250, G - 12), corn(1300, G - 12));
E.push(corn(1380));
// Secret burrow under the third bed: only a curious chicken notices it.
E.push({ kind: 'hidden', id: 'burrow', x: 1430, y: G - 20, w: 50, h: 20, flag: 'burrowSeen', radius: 90, text: 'Something has been digging under this bed. A burrow.' });
E.push({ kind: 'dig', id: 'burrowIn', x: 1430, y: G - 4, w: 50, h: 8, to: { x: 1440, y: 560 }, hiddenFlag: 'burrowSeen', clue: { mission: 'crows', id: 'burrow', text: 'A burrow. A digger could follow it down.' } });
E.push(ground(1400, 160, 'dirt', G, 10));
E.push(ground(1400, 160, 'underground', 560, 40));
E.push(ground(1540, 20, 'underground', 510, 50));
E.push({ kind: 'egg', id: 'egg-burrow', x: 1515, y: 560, taken: false });
E.push({ kind: 'dig', id: 'burrowOut', x: 1420, y: 556, w: 50, h: 8, to: { x: 1380, y: G } });
E.push({ kind: 'zone', id: 'z-pond', x: 1460, y: 300, w: 60, h: 200, discover: 'pond' });
E.push({ kind: 'checkpoint', id: 'cp-pond', x: 1480, y: G });
E.push({ kind: 'solid', id: 'dock', x: 1500, y: G - 60, w: 60, h: 60, decor: 'wood' });
E.push(corn(1530, G - 70));

// ---------------------------------------------------------------------------
// D. The pond (1560–1920)
// ---------------------------------------------------------------------------
P.push({ type: 'pondBed', x: 1560, y: G, w: 360 });
E.push(ground(1560, 120, 'dirt', 520, 80));
E.push(ground(1680, 120, 'dirt', 560, 40));
E.push(ground(1800, 120, 'dirt', 520, 80));
E.push({ kind: 'water', id: 'shallow1', x: 1560, y: 490, w: 120, h: 30, deep: false, shore: { x: 1540, y: G }, shore2: { x: 1540, y: G }, route: { mission: 'pond', method: 'wade' }, clue: { mission: 'pond', id: 'shallow', text: 'Deeper than it looks, even at the edge. Longer legs could wade it.' } });
E.push({ kind: 'water', id: 'deep', x: 1680, y: 490, w: 120, h: 70, deep: true, shore: { x: 1540, y: G }, shore2: { x: 1940, y: G }, route: { mission: 'pond', method: 'swim' }, clue: { mission: 'pond', id: 'deep', text: 'The middle is deep. Feathers soaked through instantly. A swimmer could cross it; a glider could cross above it.' } });
E.push({ kind: 'water', id: 'shallow2', x: 1800, y: 490, w: 120, h: 30, deep: false, shore: { x: 1940, y: G }, shore2: { x: 1940, y: G }, route: { mission: 'pond', method: 'wade' } });
E.push({ kind: 'solid', id: 'stone', x: 1720, y: 482, w: 40, h: 78, decor: 'stone' });
E.push({ kind: 'zone', id: 'z-overDeep', x: 1700, y: 300, w: 80, h: 160, route: { mission: 'pond', method: 'glide', ifAbility: 'glide' } });
E.push({ kind: 'zone', id: 'z-overDeep2', x: 1700, y: 300, w: 80, h: 160, route: { mission: 'pond', method: 'leap' } });
E.push({ kind: 'solid', id: 'plank', x: 1556, y: 486, w: 368, h: 10, decor: 'plank', oneWay: true, ifFlag: 'pondPlank' });
E.push(ground(1920, 120));
E.push({ kind: 'target', id: 'rope', x: 1944, y: 446, w: 16, h: 34, label: 'Peck the rope', pecks: 3, done: false, sets: ['pondPlank'], mission: { id: 'pond' }, look: 'rope' });
E.push({ kind: 'checkpoint', id: 'cp-farbank', x: 1980, y: G });

// ---------------------------------------------------------------------------
// E. The barn (1960–2760)
// ---------------------------------------------------------------------------
E.push({ kind: 'zone', id: 'z-barn', x: 2000, y: 300, w: 60, h: 200, discover: 'barnDoor' });
P.push({ type: 'sign', x: 1990, y: G, text: 'BARN' });
P.push({ type: 'tree', x: 2002, y: G, h: 170, variant: 0 });
E.push({ kind: 'climb', id: 'barnTree', x: 1990, y: 330, w: 24, h: 170, decor: 'trunk', route: { mission: 'barnDoor', method: 'climb' }, clue: { mission: 'barnDoor', id: 'tree', text: 'The old tree leans right up to the loft window. A climber could get up it.' } });
E.push({ kind: 'solid', id: 'branch', x: 1960, y: 330, w: 116, h: 10, decor: 'branch', oneWay: true });
E.push(corn(2050, 320));
E.push({ kind: 'climb', id: 'barnWall', x: 2080, y: 300, w: 20, h: 200, decor: 'wall', route: { mission: 'barnDoor', method: 'climb' }, clue: { mission: 'barnDoor', id: 'wall', text: 'Rough boards all the way up to the loft window. Climbable, for some.' } });
E.push({ kind: 'zone', id: 'z-barnLatch', x: 2040, y: 300, w: 60, h: 200, clue: { mission: 'barnDoor', id: 'latch', text: 'The latch is absurdly high. Whoever fitted it did not consult a chicken.' }, clueUnless: 'reach>=6' });
E.push({ kind: 'target', id: 'barnLatch', x: 2086, y: 296, w: 14, h: 22, label: 'Peck the latch', pecks: 2, done: false, sets: ['barnDoor'], mission: { id: 'barnDoor', method: 'latch' }, look: 'latch' });
P.push({ type: 'barnFront', x: 2100, y: G, w: 624 });
E.push({ kind: 'solid', x: 2100, y: 200, w: 24, h: 100, decor: 'barn' });
E.push({ kind: 'solid', x: 2100, y: 350, w: 24, h: 30, decor: 'barn' });
E.push({ kind: 'door', id: 'barnDoorEnt', x: 2100, y: 380, w: 24, h: 74, flag: 'barnDoor', decor: 'wood' });
E.push({ kind: 'board', id: 'barnBoard', x: 2100, y: 454, w: 24, h: 20, hp: 3, maxHp: 3, strength: 3, beak: 2, broken: false, sets: ['barnBoard'], route: { mission: 'barnDoor', method: 'board' }, clue: { mission: 'barnDoor', id: 'board', text: 'The bottom board flexes. A stronger shove, or a harder beak, would go through it.' } });
E.push({ kind: 'gap', id: 'catFlap', x: 2100, y: G - 26, w: 24, h: 26, maxWeight: 0, openFlag: 'barnBoard', openMaxWeight: 5, route: { mission: 'barnDoor', method: 'flap' }, clue: { mission: 'barnDoor', id: 'flap', text: 'A cat flap. Sized for a cat, or a very small chicken.' } });
E.push({ kind: 'solid', x: 2080, y: 190, w: 664, h: 12, decor: 'roof' });
E.push({ kind: 'solid', id: 'loft', x: 2124, y: 350, w: 400, h: 10, decor: 'wood', oneWay: true });
E.push({ kind: 'egg', id: 'egg-loft', x: 2200, y: 350, taken: false });
P.push({ type: 'hay', x: 2170, y: 350 });
E.push({ kind: 'climb', id: 'ladder', x: 2500, y: 350, w: 20, h: 150, decor: 'ladder' });
E.push({ kind: 'solid', id: 'bale1', x: 2560, y: G - 40, w: 60, h: 40, decor: 'wood' });
E.push({ kind: 'solid', id: 'bale2', x: 2620, y: G - 80, w: 60, h: 80, decor: 'wood' });
E.push(corn(2650, G - 90));
// Hidden tunnel under the front wall (curious chickens notice it).
E.push({ kind: 'hidden', id: 'oldTunnel', x: 2030, y: G - 20, w: 50, h: 20, flag: 'oldTunnel', radius: 100, text: 'Loose boards, and a smell of old digging. A tunnel under the wall!' });
E.push({ kind: 'solid', x: 2040, y: G, w: 40, h: 10, decor: 'grass', unlessFlag: 'oldTunnel' });
E.push({ kind: 'solid', x: 2080, y: G, w: 40, h: 10, decor: 'dirt' });
E.push({ kind: 'solid', x: 2120, y: G, w: 40, h: 10, decor: 'wood', unlessFlag: 'oldTunnel' });
E.push(ground(2040, 120, 'underground', 556, 44));
E.push(ground(2160, 564, 'wood'));
E.push(ground(2724, 106));
E.push({ kind: 'zone', id: 'z-tunnel', x: 2080, y: 510, w: 40, h: 40, route: { mission: 'barnDoor', method: 'hidden' } });
// Interior
E.push({ kind: 'target', id: 'barnBolt', x: 2130, y: G - 24, w: 16, h: 24, label: 'Peck the bolt', pecks: 2, done: false, sets: ['barnDoor'], mission: { id: 'barnDoor' }, look: 'bolt' });
E.push({ kind: 'zone', id: 'z-chute', x: 2160, y: 360, w: 60, h: 140, discover: 'grainChute' });
E.push({ kind: 'crate', id: 'barnCrate', x: 2260, y: G - 44, w: 44, h: 44, weight: 2, vx: 0, vy: 0, onGround: true, clue: { mission: 'grainChute', id: 'crate', text: 'The crate will not budge. It needs a stronger shove.' } });
E.push({ kind: 'plate', id: 'plate', x: 2400, y: G - 6, w: 70, h: 6, needWeight: 5, pressed: false, sets: ['barnBack', 'chute'], mission: { id: 'grainChute', method: 'heavy' }, clue: { mission: 'grainChute', id: 'plate', text: 'A pressure plate. It wants something heavy on it. Heavier than this chicken, anyway.' } });
E.push({ kind: 'solid', x: 2700, y: 200, w: 24, h: 180, decor: 'barn' });
E.push({ kind: 'door', id: 'barnBackDoor', x: 2700, y: 380, w: 24, h: 120, flag: 'barnBack', decor: 'wood' });
E.push({ kind: 'checkpoint', id: 'cp-barn', x: 2200, y: G });

// ---------------------------------------------------------------------------
// F. The fox field (2760–3560)
// ---------------------------------------------------------------------------
E.push({ kind: 'checkpoint', id: 'cp-field', x: 2770, y: G });
E.push({ kind: 'zone', id: 'z-field', x: 2760, y: 300, w: 60, h: 200, discover: 'foxField' });
P.push({ type: 'sign', x: 2790, y: G, text: 'FIELD' });
P.push({ type: 'den', x: 3470, y: G });
E.push({ kind: 'bush', id: 'bush1', x: 2950, y: G - 40, w: 56, h: 40 });
E.push({ kind: 'bush', id: 'bush2', x: 3170, y: G - 40, w: 56, h: 40 });
E.push({ kind: 'bush', id: 'bush3', x: 3380, y: G - 40, w: 56, h: 40 });
E.push({ kind: 'zone', id: 'z-bushHint', x: 2900, y: 380, w: 60, h: 120, clue: { mission: 'foxField', id: 'bushes', text: 'Bushes. Crouch in one and the fox looks straight past. It only sees what is in front of it.' } });
E.push({ kind: 'fox', id: 'fox', x: 3150, y: G, minX: 2900, maxX: 3420, facing: -1, state: 'patrol', timer: 0, turn: 0, sight: 210, patrolSpeed: 75, chaseSpeed: 265, sleepFlag: 'fieldGate', mission: 'foxField' });
E.push(corn(3020), corn(3300));
// The drainpipe: carved out of the ground for tiny chickens.
E.push(ground(2830, 668, 'underground', 546, 54));
E.push(ground(2858, 612, 'dirt', G, 20));
E.push(ground(3498, 902));
E.push({ kind: 'gap', id: 'pipe', x: 2858, y: 520, w: 612, h: 26, maxWeight: 0, pipe: true, route: { mission: 'foxField', method: 'pipe' }, clue: { mission: 'foxField', id: 'pipe', text: 'A drainpipe runs under the whole field. Barely wide enough for a very small chicken.' } });
E.push({ kind: 'zone', id: 'z-pipeIn', x: 2830, y: 380, w: 28, h: 120, clue: { mission: 'foxField', id: 'pipeHole', text: 'A hole down to a drainpipe. It runs under the field. Only something tiny would fit.' }, clueUnless: 'tiny' });
E.push(corn(3100, 540), corn(3350, 540));
P.push({ type: 'rocks', x: 3440, y: G });
E.push({ kind: 'door', id: 'fieldGateDoor', x: 3540, y: 340, w: 16, h: 160, flag: 'fieldGate', decor: 'fence' });
E.push({ kind: 'target', id: 'fieldBolt', x: 3526, y: G - 24, w: 14, h: 24, label: 'Peck the bolt', pecks: 1, done: false, sets: ['fieldGate'], mission: { id: 'foxField' }, look: 'bolt' });

// ---------------------------------------------------------------------------
// G. The farmhouse (3560–4400)
// ---------------------------------------------------------------------------
E.push({ kind: 'checkpoint', id: 'cp-house', x: 3580, y: G });
E.push({ kind: 'zone', id: 'z-bell', x: 3600, y: 300, w: 60, h: 200, discover: 'doorbell' });
P.push({ type: 'sign', x: 3620, y: G, text: 'HOUSE' });
P.push({ type: 'tree', x: 3713, y: G, h: 180, variant: 1 });
E.push({ kind: 'climb', id: 'oak', x: 3700, y: 320, w: 26, h: 180, decor: 'trunk', clue: { mission: 'doorbell', id: 'oak', text: 'The oak overhangs the porch roof. Up there, a glider could float straight across.' } });
E.push({ kind: 'solid', id: 'oakBranch', x: 3660, y: 320, w: 130, h: 10, decor: 'branch', oneWay: true });
E.push(corn(3770, 310));
P.push({ type: 'well', x: 3840, y: G });
E.push(corn(3860));
E.push({ kind: 'solid', x: 3900, y: G - 20, w: 30, h: 20, decor: 'stone' });
E.push({ kind: 'solid', x: 3930, y: G - 40, w: 30, h: 40, decor: 'stone' });
E.push({ kind: 'solid', id: 'porch', x: 3960, y: G - 40, w: 340, h: 40, decor: 'porch' });
E.push({ kind: 'solid', id: 'porchRoof', x: 3950, y: 300, w: 340, h: 12, decor: 'roof', oneWay: true });
E.push({ kind: 'zone', id: 'z-porchRoof', x: 3950, y: 250, w: 340, h: 50, route: { mission: 'doorbell', method: 'glide', ifAbility: 'glide' } });
P.push({ type: 'house', x: 3960, y: G, w: 440 });
E.push({ kind: 'crate', id: 'porchCrate', x: 4000, y: G - 84, w: 44, h: 44, weight: 2, vx: 0, vy: 0, onGround: true, clue: { mission: 'doorbell', id: 'crate', text: 'A crate on the porch. Shoved under the bell it would make a step, for a chicken strong enough to shove it.' } });
E.push({ kind: 'zone', id: 'z-crateRoute', x: 4240, y: 400, w: 60, h: 16, route: { mission: 'doorbell', method: 'crate' }, onGroundOnly: true });
E.push({ kind: 'climb', id: 'trellis', x: 4270, y: 300, w: 20, h: 160, decor: 'trellis', route: { mission: 'doorbell', method: 'climb' }, clue: { mission: 'doorbell', id: 'trellis', text: 'A trellis of roses runs up beside the door. Climbable, if you have the toes for it.' } });
E.push({ kind: 'zone', id: 'z-bellHint', x: 4200, y: 360, w: 100, h: 100, clue: { mission: 'doorbell', id: 'bell', text: 'The doorbell is up there. Way, way up there.' }, clueUnless: 'reach>=5' });
E.push({ kind: 'zone', id: 'z-bellCrow', x: 4160, y: 300, w: 140, h: 160, bellCrow: { mission: 'doorbell' } });
E.push({ kind: 'target', id: 'bell', x: 4290, y: 276, w: 12, h: 22, label: 'Press the bell', pecks: 1, done: false, sets: ['bellRung'], mission: { id: 'doorbell', method: 'reach' }, look: 'bell' });
E.push({ kind: 'solid', x: 4300, y: 200, w: 100, h: 260, decor: 'house' });

export const FARM_LEVEL: LevelDef = {
  id: 'farm',
  name: 'The Farm',
  width: 4400,
  spawn: { x: 170, y: G },
  entities: E,
  props: P,
};

/** Rough x positions of each mission, for the map on the Farm board. */
export const MISSION_X: Record<string, number> = {
  breakfast: 330,
  gardenGate: 800,
  crows: 1260,
  pond: 1740,
  barnDoor: 2110,
  grainChute: 2430,
  foxField: 3150,
  doorbell: 4290,
};
