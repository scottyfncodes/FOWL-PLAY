import { h } from './dom';
import type { Ribbon } from '../data/shows';

/**
 * A few drawn marks in the same hand as the nav icons (1.8 stroke, round ends).
 * Kept small on purpose: they stand for states (done, locked, ribbon won),
 * never for things a word already names.
 */
const svg = (paths: string, size = 24) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

const TICK = svg('<circle cx="12" cy="12" r="9"/><path d="M8 12.4l2.8 2.8L16.2 9.6"/>');
const LOCK = svg('<rect x="5.5" y="10.5" width="13" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>');
const PAUSE = svg('<path d="M9 6.5v11M15 6.5v11"/>', 20);

/** An ear of corn, the farm's currency: cob, a few kernel rows, two husk leaves. Sized to the text around it. */
const CORN = `<svg viewBox="0 0 24 24" width="1.15em" height="1.15em" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">` +
  '<path d="M12 2.5c2.5 0 3.8 3.4 3.8 7.6 0 3.6-1.4 6.9-3.8 6.9s-3.8-3.3-3.8-6.9c0-4.2 1.3-7.6 3.8-7.6z" fill="var(--corn)"/>' +
  '<path d="M12 3.5v12.5M9.6 7.5h4.8M9.3 11h5.4"/>' +
  '<path d="M8.4 12.5C6.6 14 6 17.4 7 21c2.3-.6 4-2.2 5-4.4"/><path d="M15.6 12.5c1.8 1.5 2.4 4.9 1.4 8.5-2.3-.6-4-2.2-5-4.4"/></svg>';

/** A show rosette: tails, a pleated ring, and a plain centre. Colour comes from the ribbon tier. */
const ROSETTE = svg(
  '<path d="M9.5 14.5L7 21.5l2.6-1.2 1.4 2.2 1-7.5" fill="var(--rosette)"/><path d="M14.5 14.5l2.5 7-2.6-1.2-1.4 2.2-1-7.5" fill="var(--rosette)"/>' +
    '<circle cx="12" cy="9.5" r="7" fill="var(--rosette)"/><circle cx="12" cy="9.5" r="3.6" fill="var(--card)"/>',
  26,
);

export const markTick = () => h('span', { class: 'mark tick', html: TICK });
export const markLock = () => h('span', { class: 'mark lock', html: LOCK });
export const PAUSE_ICON = PAUSE;

/** The corn mark, inline with a number ("+30", the corn pill). Screen readers hear "corn". */
export const markCorn = () => h('span', { class: 'mark-corn', role: 'img', 'aria-label': 'corn', html: CORN });

/** Rosette for a ribbon won; an empty slot for no ribbon. */
export function rosette(ribbon: Ribbon) {
  if (ribbon === 'none') return h('span', { class: 'ribbon none' });
  return h('span', { class: `ribbon ${ribbon}`, role: 'img', 'aria-label': `${ribbon} ribbon`, html: ROSETTE });
}
