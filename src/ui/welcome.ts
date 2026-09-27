import { h } from './dom';
import { chickenArt, traitChip, notableTraits } from './components';
import { viewOf } from '../chickens/chicken';
import { BREED_BY_ID } from '../data/breeds';
import { chickenById, pickSecondChicken } from '../state/game';
import type { Ctx } from './ctx';
import { sfx } from '../audio/sfx';

/** First-run flow: meet your chicken, choose a second one, land in the breeding pen. */
export function renderWelcome(ctx: Ctx): HTMLElement {
  const root = h('div', { class: 'welcome-root' });
  const starter = chickenById(ctx.state, ctx.state.starterId);
  if (!starter) {
    ctx.store.commit((s) => { s.onboarding = 'done'; });
    root.remove();
    return root;
  }
  const view = viewOf(starter);
  const breed = BREED_BY_ID[Object.keys(starter.ancestry)[0] ?? ''];

  const page1 = h(
    'div',
    { class: 'welcome' },
    h('h1', null, 'Fowl Play'),
    h('p', { class: 'tag-line' }, 'A weird little chicken-breeding discovery game.'),
    chickenArt(view, 'hero-art'),
    h('p', { class: 'meet' }, `This is ${starter.name}.`),
    h('p', { class: 'lede' }, `${/^[AEIOU]/.test(breed?.name ?? '') ? 'An' : 'A'} ${breed?.name ?? 'chicken'}. ${breed?.description ?? ''}`),
    h('div', { class: 'chips' }, notableTraits(view, 4).map((t) => traitChip(t))),
    h('p', { class: 'lede' }, `${starter.name} needs a friend. Ideally a very different one.`),
    h('button', { class: 'btn primary big', onclick: () => { sfx.select(); root.replaceChildren(page2); } }, 'Pick a second chicken'),
  );

  const page2 = h(
    'div',
    { class: 'welcome' },
    h('h1', null, 'Choose a friend'),
    h('p', { class: 'tag-line' }, 'One is free. The others will wait for you in the Hatchery.'),
    h(
      'div',
      { class: 'pick-grid' },
      ctx.state.hatchery.offers.map((offer) => {
        const v = viewOf(offer.chicken);
        const b = BREED_BY_ID[offer.breedId];
        return h(
          'button',
          { class: 'pick', type: 'button', onclick: () => choose(offer.id) },
          chickenArt(v),
          h('div', { class: 'n' }, offer.chicken.name),
          h('div', { class: 'b' }, b?.name ?? ''),
          h('div', { class: 'chips' }, notableTraits(v, 3).map((t) => traitChip(t))),
          h('span', { class: 'btn primary sm' }, 'Choose'),
        );
      }),
    ),
    h('p', { class: 'small muted' }, 'Tip: the more different the parents, the stranger the chicks.'),
  );

  const choose = (offerId: string) => {
    sfx.hatch();
    const report = ctx.store.commit((s) => pickSecondChicken(s, offerId));
    const second = ctx.state.chickens.find((c) => c.origin === 'gift');
    ctx.ui.parentA = starter.id;
    ctx.ui.parentB = second?.id ?? null;
    root.remove();
    ctx.navigate('breed');
    if (report) ctx.announce(report, second ?? null);
  };

  root.appendChild(page1);
  return root;
}
