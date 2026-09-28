import { FARM_LEVEL } from './level';

/**
 * Every clue text the farm can produce, keyed by `mission:clueId`, so the
 * problem board can list what the flock has learned so far.
 */
export const CLUE_TEXT: Record<string, string> = {
  'foxField:caught': 'The fox is faster than most chickens. Faster, sneakier or braver would help. Or a smaller way round.',
  'doorbell:crowNotLoud': 'Crowing at the door does nothing. A much louder chicken might get a reaction.',
  'crows:crowsReturn': 'The crows lift off and settle straight back. Something louder, or meaner, might convince them.',
};

for (const e of FARM_LEVEL.entities) {
  if ('clue' in e && e.clue) CLUE_TEXT[`${e.clue.mission}:${e.clue.id}`] = e.clue.text;
}
