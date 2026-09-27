import { h } from '../dom';
import { chickenArt, confirmModal, toast, traitChip, notableTraits } from '../components';
import { viewOf } from '../../chickens/chicken';
import { BREED_BY_ID } from '../../data/breeds';
import { COOP_THEMES, CURRENCY_ICON, HATCHERY_FREE_REFRESH_EVERY, HATCHERY_REFRESH_COST, UPGRADES } from '../../data/economy';
import { buyOffer, buyUpgrade, ownsTheme, refreshHatchery, selectTheme, upgradeCost, upgradeLevel, coopIsFull } from '../../state/game';
import type { Ctx } from '../ctx';
import { sfx } from '../../audio/sfx';
import { applyTheme } from '../theme';

export function renderHatchery(ctx: Ctx): HTMLElement {
  const s = ctx.state;
  const discovered = new Set(Object.keys(s.discoveredBreeds));
  const untilFree = HATCHERY_FREE_REFRESH_EVERY - s.hatchery.hatchesSinceRefresh;

  const offers = s.hatchery.offers.map((offer) => {
    const v = viewOf(offer.chicken);
    const b = BREED_BY_ID[offer.breedId];
    const known = discovered.has(offer.breedId);
    const canAfford = s.corn >= offer.price;
    return h(
      'div',
      { class: 'chicken-card offer' },
      h('div', { class: 'corner' }, h('span', { class: 'tag gen' }, known ? 'Known breed' : 'New breed'), h('span', { class: 'tier' }, '★'.repeat(b?.tier ?? 1))),
      h('button', { type: 'button', class: 'btn ghost', style: { padding: 0, minHeight: 0, width: '100%' }, onclick: () => showOffer() }, chickenArt(v)),
      h('div', { class: 'name' }, offer.chicken.name),
      h('div', { class: 'sub' }, b?.name ?? 'Mystery'),
      h('div', { class: 'tags' }, notableTraits(v, 3).map((t) => traitChip(t))),
      h('div', { class: 'btn-row', style: { marginTop: '8px' } }, h('button', { class: `btn sm ${canAfford ? 'primary' : ''}`, disabled: !canAfford, onclick: () => adopt() }, `Adopt · ${offer.price} ${CURRENCY_ICON}`)),
    );
    function showOffer() {
      confirmModal(`${offer.chicken.name} the ${b?.name ?? ''}`, h('span', null, b?.description ?? '', h('br'), h('br'), h('b', null, 'Eggs: '), b?.eggs ?? '', h('br'), h('b', null, 'Origin: '), b?.origin ?? ''), `Adopt for ${offer.price} ${CURRENCY_ICON}`, adopt);
    }
    function adopt() {
      const r = ctx.store.commit((st) => buyOffer(st, offer.id));
      if (!r.ok) {
        toast(r.reason);
        sfx.nope();
        return;
      }
      sfx.hatch();
      toast(`${r.result.chicken.name} has joined the coop!`);
      ctx.announce(r.result.report, r.result.chicken);
    }
  });

  const upgrades = UPGRADES.map((u) => {
    const cost = upgradeCost(s, u.id);
    const level = upgradeLevel(s, u.id);
    const maxed = cost === null;
    return h(
      'div',
      { class: 'upgrade' },
      h('div', { class: 'e' }, u.emoji),
      h('div', null, h('div', { class: 't' }, u.name, level > 0 && u.costs.length > 1 ? h('span', { class: 'muted small' }, ` · level ${level}`) : level > 0 ? h('span', { class: 'muted small' }, ' · owned') : null), h('div', { class: 'd' }, u.description)),
      h('button', { class: `btn sm buy ${!maxed && s.corn >= cost ? 'primary' : ''}`, disabled: maxed || s.corn < cost, onclick: () => {
        const r = ctx.store.commit((st) => buyUpgrade(st, u.id));
        if (r.ok) { sfx.corn(); toast(`${u.name} purchased.`); } else { toast(r.reason); sfx.nope(); }
      } }, maxed ? 'Maxed' : `${cost} ${CURRENCY_ICON}`),
    );
  });

  const themes = COOP_THEMES.map((t) =>
    h('button', { class: `btn sm ${s.theme === t.id ? 'active' : ''}`, onclick: () => {
      const r = ctx.store.commit((st) => selectTheme(st, t.id));
      if (r.ok) { applyTheme(ctx.state.theme); sfx.select(); } else { toast(r.reason); sfx.nope(); }
    } }, `${t.emoji} ${t.name}`, ownsTheme(s, t.id) ? '' : ` · ${t.cost} ${CURRENCY_ICON}`),
  );

  return h(
    'div',
    null,
    h('div', { class: 'screen-title' }, h('h2', null, 'The Hatchery'), h('span', { class: 'meta' }, `${s.corn} ${CURRENCY_ICON}`)),
    h('p', { class: 'lede' }, 'New breeds arrive here. Every adoption is a fresh set of genes to experiment with, and a new page in the Almanac.'),
    coopIsFull(s) ? h('div', { class: 'banner' }, '🏠', h('span', { class: 'grow' }, 'The coop is full. Retire a chicken to the meadow, or extend the coop below.')) : null,
    h('div', { class: 'grid' }, offers),
    h('div', { class: 'btn-row', style: { marginTop: '10px' } }, h('button', { class: 'btn', onclick: () => {
      const r = ctx.store.commit((st) => refreshHatchery(st, true));
      if (r.ok) { sfx.select(); } else { toast(r.reason); sfx.nope(); }
    } }, `🔔 Call for new arrivals · ${HATCHERY_REFRESH_COST} ${CURRENCY_ICON}`)),
    h('p', { class: 'small muted', style: { textAlign: 'center', marginTop: '6px' } }, `Free new arrivals after ${untilFree} more hatch${untilFree === 1 ? '' : 'es'}.`),
    h('div', { class: 'section-h' }, 'Improvements'),
    ...upgrades,
    h('div', { class: 'section-h' }, 'Notebook style'),
    h('div', { class: 'theme-row' }, themes),
  );
}
