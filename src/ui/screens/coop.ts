import { h } from '../dom';
import { chickenCard } from '../components';
import { viewOf, type Chicken } from '../../chickens/chicken';
import { coopCapacity, coopChickens, coopLoad, meadowChickens, upgradeLevel } from '../../state/game';
import type { Ctx } from '../ctx';

const RARITY_RANK = { common: 0, uncommon: 1, rare: 2, exotic: 3, legendary: 4 };

export function renderCoop(ctx: Ctx): HTMLElement {
  const s = ctx.state;
  const coop = coopChickens(s);
  const meadow = meadowChickens(s);
  const sorted = [...coop].sort((a, b) => {
    if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
    switch (ctx.ui.coopSort) {
      case 'rarity':
        return RARITY_RANK[viewOf(b).rarity.tier] - RARITY_RANK[viewOf(a).rarity.tier] || viewOf(b).rarity.score - viewOf(a).rarity.score;
      case 'generation':
        return b.generation - a.generation || b.born - a.born;
      case 'name':
        return a.name.localeCompare(b.name);
      default:
        return b.born - a.born;
    }
  });

  const sortSelect = h(
    'select',
    { class: 'sort-select', 'aria-label': 'Sort chickens', onchange: (e: Event) => { ctx.ui.coopSort = (e.target as HTMLSelectElement).value as typeof ctx.ui.coopSort; ctx.rerender(); } },
    ...(['newest', 'rarity', 'generation', 'name'] as const).map((k) => h('option', { value: k, selected: ctx.ui.coopSort === k }, { newest: 'Newest first', rarity: 'Rarest first', generation: 'Deepest lineage', name: 'By name' }[k])),
  );

  const eggsWaiting = s.eggs.length;
  const highlight = ctx.ui.highlightId;
  ctx.ui.highlightId = null;

  const onCard = (c: Chicken) => ctx.showChicken(c.id);

  const el = h(
    'div',
    { class: upgradeLevel(s, 'nameplates') > 0 ? 'nameplate' : '' },
    upgradeLevel(s, 'bunting') > 0 ? h('div', { class: 'bunting' }) : null,
    h('div', { class: 'screen-title' }, h('h2', null, 'The Coop'), h('span', { class: 'meta' }, `${coopLoad(s)} / ${coopCapacity(s)} roosts`)),
    h('p', { class: 'lede' }, coop.length < 3 ? 'Tap a chicken to see what it can do. Breed two to see what their chicks can do.' : 'Every chicken here is a possible parent and a possible hero. Tap one to inspect it, breed it, or take it out.'),
    eggsWaiting > 0 ? h('div', { class: 'banner', role: 'status' }, '🥚', h('span', { class: 'grow' }, `${eggsWaiting} egg${eggsWaiting > 1 ? 's' : ''} waiting in the incubator`), h('button', { class: 'btn sm primary', onclick: () => ctx.navigate('breed') }, 'Hatch')) : null,
    h('div', { class: 'filter-row' }, sortSelect, h('span', { class: 'small muted' }, `${coop.length} in the coop${meadow.length ? `, ${meadow.length} in the meadow` : ''}`)),
    h(
      'div',
      { class: 'grid' },
      sorted.map((c) => chickenCard(c, { onClick: onCard, isNew: c.id === highlight })),
    ),
    coop.length === 0 ? h('div', { class: 'empty' }, h('div', { class: 'big-e' }, '🐔'), 'The coop is empty. Visit the Hatchery.') : null,
    meadow.length > 0
      ? h(
          'div',
          null,
          h('div', { class: 'section-h' }, `The Meadow (${meadow.length})`, h('button', { class: 'btn sm ghost', onclick: () => { ctx.ui.showMeadow = !ctx.ui.showMeadow; ctx.rerender(); } }, ctx.ui.showMeadow ? 'Hide' : 'Show')),
          ctx.ui.showMeadow ? h('div', { class: 'grid' }, meadow.map((c) => chickenCard(c, { onClick: onCard }))) : h('p', { class: 'small muted' }, 'Retired chickens live here. They still count for the almanac and family trees.'),
        )
      : null,
  );
  if (highlight) {
    requestAnimationFrame(() => {
      const card = el.querySelector<HTMLElement>(`[data-chicken-id="${highlight}"]`);
      card?.classList.add('highlight');
      card?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  }
  return el;
}
