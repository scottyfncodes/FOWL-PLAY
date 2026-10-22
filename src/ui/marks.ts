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

/** A show rosette: tails, a pleated ring, and a plain centre. Colour comes from the ribbon tier. */
const ROSETTE = svg(
  '<path d="M9.5 14.5L7 21.5l2.6-1.2 1.4 2.2 1-7.5" fill="var(--rosette)"/><path d="M14.5 14.5l2.5 7-2.6-1.2-1.4 2.2-1-7.5" fill="var(--rosette)"/>' +
    '<circle cx="12" cy="9.5" r="7" fill="var(--rosette)"/><circle cx="12" cy="9.5" r="3.6" fill="var(--card)"/>',
  26,
);

export const markTick = () => h('span', { class: 'mark tick', html: TICK });
export const markLock = () => h('span', { class: 'mark lock', html: LOCK });
export const PAUSE_ICON = PAUSE;

/** Rosette for a ribbon won; an empty slot for no ribbon. */
export function rosette(ribbon: Ribbon) {
  if (ribbon === 'none') return h('span', { class: 'ribbon none' });
  return h('span', { class: `ribbon ${ribbon}`, role: 'img', 'aria-label': `${ribbon} ribbon`, html: ROSETTE });
}
