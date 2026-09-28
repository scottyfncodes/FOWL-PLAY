import { sanitizeChicken, type Chicken } from '../chickens/chicken';
import { SAVE_VERSION, freshFarm, type Egg, type FarmState, type GameState, type HatcheryOffer, type MissionProgress } from '../state/types';

export const SAVE_KEY = 'fowlplay.save';
export const BACKUP_KEY = 'fowlplay.save.backup';

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const strList = (v: unknown, max = 500): string[] => (Array.isArray(v) ? (v.filter((x) => typeof x === 'string') as string[]).slice(0, max) : []);

interface Envelope {
  app: 'fowl-play';
  version: number;
  savedAt: number;
  state: unknown;
}

/**
 * Migrations run in order from the save's version up to SAVE_VERSION.
 * Each entry migrates from index+1 to index+2 (i.e. MIGRATIONS[0] is v1→v2).
 * Add a new function here whenever SAVE_VERSION is bumped.
 */
export const MIGRATIONS: ((state: Record<string, unknown>) => Record<string, unknown>)[] = [
  // v1 → v2: the farm arrives. Existing chickens get Fowldex numbers in hatch order.
  (state) => {
    const chickens = Array.isArray(state.chickens) ? [...(state.chickens as Record<string, unknown>[])] : [];
    const ordered = chickens.filter(isObj).sort((a, b) => num(a.born, 0) - num(b.born, 0));
    let no = 1;
    for (const c of ordered) {
      if (!c.no) c.no = no;
      no++;
    }
    const farm = isObj(state.farm) ? state.farm : {};
    return { ...state, farm: { ...farm, nextNo: Math.max(no, num(farm.nextNo, 1)) } };
  },
];

export function migrate(raw: Record<string, unknown>, fromVersion: number): Record<string, unknown> {
  let state = raw;
  for (let v = fromVersion; v < SAVE_VERSION; v++) {
    const step = MIGRATIONS[v - 1];
    if (!step) throw new Error(`No migration from save version ${v}`);
    state = step(state);
  }
  return state;
}


function sanitizeEgg(input: unknown, known: Set<string>): Egg | null {
  if (!isObj(input)) return null;
  const child = sanitizeChicken(input.child);
  if (!child || typeof input.id !== 'string') return null;
  const parents = Array.isArray(input.parents) && input.parents.length === 2 ? (input.parents.map(String) as [string, string]) : child.parents;
  if (!parents) return null;
  const parentNames = Array.isArray(input.parentNames) && input.parentNames.length === 2 ? (input.parentNames.map(String) as [string, string]) : (['?', '?'] as [string, string]);
  if (known.has(child.id)) return null; // never duplicate a chicken that already hatched
  return { id: input.id, parents, parentNames, seed: num(input.seed, 0), createdAt: num(input.createdAt, Date.now()), child };
}

function sanitizeOffer(input: unknown): HatcheryOffer | null {
  if (!isObj(input)) return null;
  const chicken = sanitizeChicken(input.chicken);
  if (!chicken || typeof input.id !== 'string' || typeof input.breedId !== 'string') return null;
  return { id: input.id, breedId: input.breedId, chicken, price: Math.max(0, Math.floor(num(input.price, 50))) };
}

function recordOf<T>(input: unknown, each: (v: unknown) => T | null): Record<string, T> {
  const out: Record<string, T> = {};
  if (!isObj(input)) return out;
  for (const [k, v] of Object.entries(input)) {
    const r = each(v);
    if (r !== null) out[k] = r;
  }
  return out;
}

function sanitizeFarm(input: unknown, chickenCount: number): FarmState {
  const f = freshFarm();
  if (!isObj(input)) {
    f.nextNo = chickenCount + 1;
    return f;
  }
  f.missions = recordOf(input.missions, (v): MissionProgress | null =>
    isObj(v)
      ? {
          discoveredAt: num(v.discoveredAt, 0),
          solvedAt: typeof v.solvedAt === 'number' ? v.solvedAt : null,
          chickenId: typeof v.chickenId === 'string' ? v.chickenId : null,
          chickenName: typeof v.chickenName === 'string' ? v.chickenName : null,
          method: typeof v.method === 'string' ? v.method : null,
          attempts: Math.max(0, Math.floor(num(v.attempts, 0))),
        }
      : null,
  );
  f.clues = recordOf(input.clues, (v) => (Array.isArray(v) ? strList(v, 40) : null));
  f.discoveredAbilities = recordOf(input.discoveredAbilities, (v) => (isObj(v) ? { at: num(v.at, 0), chickenId: String(v.chickenId ?? '') } : null));
  f.lore = recordOf(input.lore, (v) => (typeof v === 'number' ? v : null));
  f.cornTaken = strList(input.cornTaken, 2000);
  f.eggsTaken = strList(input.eggsTaken, 200);
  f.lastChickenId = typeof input.lastChickenId === 'string' ? input.lastChickenId : null;
  f.outings = Math.max(0, Math.floor(num(input.outings, 0)));
  f.nextNo = Math.max(chickenCount + 1, Math.floor(num(input.nextNo, 1)));
  return f;
}

/** Turn an untrusted object into a fully valid GameState, dropping anything broken. */
export function sanitizeState(input: unknown, fresh: () => GameState): GameState {
  const base = fresh();
  if (!isObj(input)) return base;
  const chickens: Chicken[] = [];
  const seen = new Set<string>();
  if (Array.isArray(input.chickens)) {
    for (const c of input.chickens) {
      const s = sanitizeChicken(c);
      if (s && !seen.has(s.id)) {
        seen.add(s.id);
        chickens.push(s);
      }
    }
  }
  const eggs: Egg[] = [];
  if (Array.isArray(input.eggs)) {
    for (const e of input.eggs) {
      const s = sanitizeEgg(e, seen);
      if (s) {
        seen.add(s.child.id);
        eggs.push(s);
      }
    }
  }
  const hatchery = isObj(input.hatchery) ? input.hatchery : {};
  const offers = Array.isArray(hatchery.offers) ? hatchery.offers.map(sanitizeOffer).filter((o): o is HatcheryOffer => o !== null) : [];
  const stats = isObj(input.stats) ? input.stats : {};
  const settings = isObj(input.settings) ? input.settings : {};
  const farm = sanitizeFarm(input.farm, chickens.length + eggs.length);
  // Any chicken without a Fowldex number gets the next one, oldest first.
  for (const c of [...chickens].sort((a, b) => a.born - b.born)) {
    if (!c.no) c.no = farm.nextNo++;
  }
  const onboarding = (['welcome', 'pickSecond', 'firstBreed', 'done'] as const).includes(input.onboarding as GameState['onboarding']) ? (input.onboarding as GameState['onboarding']) : chickens.length > 0 ? 'done' : 'welcome';
  return {
    version: SAVE_VERSION,
    createdAt: num(input.createdAt, base.createdAt),
    corn: Math.max(0, Math.floor(num(input.corn, base.corn))),
    chickens,
    eggs,
    discoveredTraits: recordOf(input.discoveredTraits, (v) => (isObj(v) ? { at: num(v.at, 0), chickenId: String(v.chickenId ?? '') } : null)),
    discoveredBreeds: recordOf(input.discoveredBreeds, (v) => (isObj(v) ? { at: num(v.at, 0), how: v.how === 'resemblance' ? 'resemblance' : 'owned', chickenId: String(v.chickenId ?? '') } : null)),
    milestones: recordOf(input.milestones, (v) => (typeof v === 'number' ? v : null)),
    upgrades: recordOf(input.upgrades, (v) => (typeof v === 'number' && v >= 0 ? Math.floor(v) : null)),
    theme: typeof input.theme === 'string' ? input.theme : 'paper',
    ribbons: recordOf(input.ribbons, (v) =>
      isObj(v) && typeof v.ribbon === 'string'
        ? { ribbon: v.ribbon as GameState['ribbons'][string]['ribbon'], score: num(v.score, 0), chickenId: String(v.chickenId ?? ''), chickenName: String(v.chickenName ?? ''), at: num(v.at, 0) }
        : null,
    ),
    hatchery: { offers, hatchesSinceRefresh: Math.max(0, Math.floor(num(hatchery.hatchesSinceRefresh, 0))) },
    stats: {
      hatches: Math.max(0, Math.floor(num(stats.hatches, 0))),
      breedings: Math.max(0, Math.floor(num(stats.breedings, 0))),
      purchases: Math.max(0, Math.floor(num(stats.purchases, 0))),
      showEntries: Math.max(0, Math.floor(num(stats.showEntries, 0))),
    },
    history: Array.isArray(input.history)
      ? input.history
          .filter(isObj)
          .map((h) => ({
            at: num(h.at, 0),
            parents: (Array.isArray(h.parents) ? h.parents.map(String) : ['?', '?']) as [string, string],
            parentNames: (Array.isArray(h.parentNames) ? h.parentNames.map(String) : ['?', '?']) as [string, string],
            childId: String(h.childId ?? ''),
            childName: String(h.childName ?? ''),
            seed: num(h.seed, 0),
          }))
          .slice(-200)
      : [],
    log: Array.isArray(input.log)
      ? input.log
          .filter(isObj)
          .map((e) => ({ kind: String(e.kind) as GameState['log'][number]['kind'], refId: String(e.refId ?? ''), chickenId: typeof e.chickenId === 'string' ? e.chickenId : null, at: num(e.at, 0), corn: num(e.corn, 0) }))
          .slice(-100)
      : [],
    onboarding,
    settings: { sound: settings.sound !== false },
    starterId: typeof input.starterId === 'string' ? input.starterId : null,
    farm,
  };
}

export interface LoadResult {
  state: GameState | null;
  /** Human-readable note about what happened (e.g. "restored from backup"). */
  note: string | null;
}

function parseEnvelope(text: string | null): { envelope: Envelope; raw: Record<string, unknown> } | null {
  if (!text) return null;
  const parsed: unknown = JSON.parse(text);
  if (!isObj(parsed) || parsed.app !== 'fowl-play' || !isObj(parsed.state)) return null;
  const version = num(parsed.version, 1);
  return { envelope: { app: 'fowl-play', version, savedAt: num(parsed.savedAt, 0), state: parsed.state }, raw: parsed.state };
}

export function decodeSave(text: string | null, fresh: () => GameState): GameState | null {
  const parsed = parseEnvelope(text);
  if (!parsed) return null;
  if (parsed.envelope.version > SAVE_VERSION) throw new Error('Save is from a newer version of Fowl Play');
  const migrated = migrate(parsed.raw, parsed.envelope.version);
  return sanitizeState(migrated, fresh);
}

export function loadState(storage: Storage, fresh: () => GameState): LoadResult {
  try {
    const state = decodeSave(storage.getItem(SAVE_KEY), fresh);
    if (state) return { state, note: null };
  } catch (err) {
    console.warn('Primary save unreadable, trying backup', err);
  }
  try {
    const state = decodeSave(storage.getItem(BACKUP_KEY), fresh);
    if (state) return { state, note: 'Your last save was damaged, so the backup copy was restored.' };
  } catch (err) {
    console.warn('Backup save unreadable', err);
  }
  return { state: null, note: null };
}

export function encodeSave(state: GameState): string {
  const envelope: Envelope = { app: 'fowl-play', version: SAVE_VERSION, savedAt: Date.now(), state };
  return JSON.stringify(envelope);
}

export function saveState(storage: Storage, state: GameState): boolean {
  try {
    const text = encodeSave(state);
    const previous = storage.getItem(SAVE_KEY);
    if (previous && previous !== text) storage.setItem(BACKUP_KEY, previous);
    storage.setItem(SAVE_KEY, text);
    return true;
  } catch (err) {
    console.error('Could not save', err);
    return false;
  }
}

export function clearSave(storage: Storage): void {
  storage.removeItem(SAVE_KEY);
  storage.removeItem(BACKUP_KEY);
}
