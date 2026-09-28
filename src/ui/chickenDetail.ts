import { append, h } from './dom';
import { chickenArt, eggArt, openModal, rarityTag, traitChip, confirmModal, toast } from './components';
import { ancestryLabel, ancestryList, viewOf, type Chicken } from '../chickens/chicken';
import { TRAIT_BY_ID, type TraitCategory } from '../data/traits';
import { RARITY_LABEL } from '../genetics/traits';
import type { Ctx } from './ctx';
import { bringBack, chickenById, renameChicken, sendToMeadow, toggleFavorite, upgradeLevel } from '../state/game';
import { ancestryTree } from './ancestryTree';
import { LOCUS_BY_ID } from '../genetics/loci';
import { sfx } from '../audio/sfx';
import { SHOW_CATEGORIES } from '../data/shows';
import { abilitiesOfChicken } from '../state/farm';
import { abilityBadgeRow, carrierChips, showAbilityInfo } from './abilityBadges';
import { MISSIONS } from '../farm/missions';

const CATEGORY_ORDER: TraitCategory[] = ['combo', 'colour', 'pattern', 'feathers', 'head', 'body', 'legs', 'egg', 'utility'];
const CATEGORY_LABEL: Record<TraitCategory, string> = {
  combo: 'Special combinations',
  colour: 'Colour',
  pattern: 'Pattern',
  feathers: 'Feathers',
  head: 'Head',
  body: 'Body',
  legs: 'Legs & feet',
  egg: 'Eggs',
  personality: 'Personality',
  utility: 'Hardiness',
};

const EGG_WORDS: Record<string, string> = { white: 'white', cream: 'cream', tinted: 'tinted', brown: 'brown', darkBrown: 'dark brown', chocolate: 'chocolate', blue: 'blue', green: 'green', olive: 'olive', plum: 'plum-bloomed' };
const LAY_WORDS: Record<string, string> = { occasional: 'now and then', steady: 'most days', prolific: 'nearly every day' };

export function showTraitInfo(id: string) {
  const def = TRAIT_BY_ID[id];
  if (!def) return;
  openModal(
    h('span', null, `${def.emoji} ${def.name}`),
    () =>
      h(
        'div',
        null,
        h('p', { class: `label rarity-text ${def.rarity}` }, `${RARITY_LABEL[def.rarity]} · ${CATEGORY_LABEL[def.category]}`),
        h('p', { class: 'lede', style: { marginTop: '8px' } }, def.description),
        h('div', { class: 'notice' }, h('b', null, 'Inheritance: '), def.hint),
      ),
  );
}

export function showChickenDetail(ctx: Ctx, id: string) {
  const chicken = chickenById(ctx.state, id);
  if (!chicken) return;
  openModal('', (closeFn) => detailBody(ctx, chicken, closeFn));
}

function detailBody(ctx: Ctx, chicken: Chicken, close: () => void): HTMLElement {
  const view = viewOf(chicken);
  const p = view.phenotype;
  const state = ctx.state;
  const container = h('div', null);

  const rerender = () => {
    const fresh = chickenById(ctx.state, chicken.id);
    if (!fresh) {
      close();
      return;
    }
    container.replaceChildren(detailBody(ctx, fresh, close));
  };

  const nameRow = h(
    'div',
    { class: 'name-row' },
    h('h3', null, chicken.name),
    h('button', { class: 'btn sm ghost', 'aria-label': 'Rename', onclick: () => rename() }, '✏️'),
    h('button', { class: 'btn sm ghost', 'aria-label': 'Favourite', onclick: () => { ctx.store.commit((s) => toggleFavorite(s, chicken.id)); sfx.tap(); rerender(); } }, chicken.favorite ? '⭐' : '☆'),
  );

  const rename = () => {
    const input = h('input', { class: 'text', value: chicken.name, maxlength: '32', 'aria-label': 'New name' }) as HTMLInputElement;
    openModal('Rename', (closeRename) =>
      h(
        'form',
        {
          onsubmit: (e: Event) => {
            e.preventDefault();
            if (ctx.store.commit((s) => renameChicken(s, chicken.id, input.value))) {
              closeRename();
              rerender();
            }
          },
        },
        input,
        h('div', { class: 'btn-row', style: { marginTop: '10px' } }, h('button', { class: 'btn', type: 'button', onclick: closeRename }, 'Cancel'), h('button', { class: 'btn primary', type: 'submit' }, 'Save')),
      ),
    );
    setTimeout(() => input.focus(), 50);
  };

  const parents = chicken.parents ? chicken.parents.map((pid) => chickenById(state, pid)) : [];
  const parentLine = chicken.parents
    ? h(
        'span',
        null,
        'Hatched from ',
        ...parents.flatMap((pc, i) => [
          i > 0 ? ' × ' : '',
          pc ? h('button', { class: 'btn sm ghost', style: { padding: '0 2px', minHeight: '0', textDecoration: 'underline' }, onclick: () => showChickenDetail(ctx, pc.id) }, pc.name) : 'a departed chicken',
        ]),
      )
    : chicken.origin === 'starter'
      ? 'Your very first chicken.'
      : chicken.origin === 'gift'
        ? 'Chosen on day one.'
        : 'Adopted from the Hatchery.';

  const ancestry = ancestryList(chicken);
  const ancestryText = ancestry.length > 1 ? ancestry.map((a) => `${Math.round(a.share * 100)}% ${a.name}`).join(', ') : `Purebred ${ancestry[0]?.name ?? ''}`;

  const grouped = new Map<TraitCategory, string[]>();
  for (const t of view.traits) {
    const def = TRAIT_BY_ID[t];
    if (!def || def.category === 'personality') continue;
    if (!grouped.has(def.category)) grouped.set(def.category, []);
    grouped.get(def.category)!.push(t);
  }

  const inCoop = chicken.status === 'coop';
  const pedigreeDepth = upgradeLevel(state, 'pedigree') > 0 ? 3 : 2;
  const abilities = abilitiesOfChicken(chicken);
  const solvedHere = MISSIONS.filter((m) => state.farm.missions[m.id]?.chickenId === chicken.id && state.farm.missions[m.id]?.solvedAt);
  const carriers = carrierChips(chicken);

  append(container, [
    h(
      'div',
      { class: 'detail-hero' },
      chickenArt(view),
      h(
        'div',
        null,
        nameRow,
        h(
          'div',
          { class: 'facts' },
          h('div', null, h('b', null, ancestryLabel(chicken)), ` · Generation ${chicken.generation}`),
          h('div', null, rarityTag(view), ' ', h('span', { class: 'muted small' }, `rarity ${view.rarity.score}`)),
          h('div', { class: 'personality' }, p.personality.map((x) => x[0]!.toUpperCase() + x.slice(1)).join(' · ')),
        ),
      ),
    ),
    h('p', { class: 'small', style: { marginTop: '10px' } }, parentLine),
    h('p', { class: 'small muted' }, ancestryText),
    chicken.mutations.length > 0 ? h('p', { class: 'mutation-note' }, `🧬 Spontaneous mutation at conception: ${chicken.mutations.map((m) => LOCUS_BY_ID[m]?.name.toLowerCase() ?? m).join(', ')}`) : null,
    h('div', { class: 'section-h' }, 'On the farm'),
    abilityBadgeRow(abilities, { big: true, onClick: (def) => showAbilityInfo(def), empty: 'No special abilities. Every chicken can walk, jump a little, peck and hide.' }),
    carriers ? h('div', { style: { marginTop: '8px' } }, h('span', { class: 'label' }, 'Proven hidden genes'), carriers) : h('p', { class: 'small muted', style: { marginTop: '6px' } }, 'Hidden genes: ??? — breed it and see what the chicks show.'),
    solvedHere.length ? h('p', { class: 'small', style: { marginTop: '6px' } }, `🏅 ${solvedHere.map((m) => `MISSION COMPLETE: ${m.done}`).join(' ')}`) : null,
    inCoop ? h('div', { class: 'btn-row', style: { marginTop: '8px' } }, h('button', { class: 'btn primary', onclick: () => { close(); ctx.playAs(chicken.id); } }, '🌾 Take to the farm')) : null,
    h('div', { class: 'detail-egg', style: { marginTop: '10px' } }, eggArt(view), h('div', { class: 'small' }, `Lays ${p.eggSize} ${EGG_WORDS[p.eggColor] ?? p.eggColor}${p.eggSpeckled ? ', speckled' : ''} eggs, ${LAY_WORDS[p.laying]}.`)),
    ...CATEGORY_ORDER.filter((c) => grouped.has(c)).map((c) =>
      h('div', { class: 'trait-group' }, h('span', { class: 'label' }, CATEGORY_LABEL[c]), h('div', { class: 'chips' }, grouped.get(c)!.map((t) => traitChip(t, { onClick: () => showTraitInfo(t) })))),
    ),
    chicken.parents ? h('div', { class: 'section-h' }, 'Lineage') : null,
    chicken.parents ? ancestryTree(state, chicken, pedigreeDepth, (c) => showChickenDetail(ctx, c.id)) : null,
    h('div', { class: 'section-h' }, 'Actions'),
    h(
      'div',
      { class: 'btn-row' },
      inCoop ? h('button', { class: 'btn primary', onclick: () => { close(); ctx.breedWith(chicken.id); } }, '🧬 Breed with…') : null,
      inCoop ? h('button', { class: 'btn', onclick: () => { close(); enterShowPicker(ctx, chicken); } }, '🎀 Enter a show') : null,
    ),
    h(
      'div',
      { class: 'btn-row', style: { marginTop: '8px' } },
      inCoop
        ? h('button', { class: 'btn', onclick: () => confirmModal('Send to the meadow?', `${chicken.name} will retire to the meadow. They keep their place in the almanac and family trees, and you can bring them back whenever there is room.`, 'Send to meadow', () => { ctx.store.commit((s) => sendToMeadow(s, chicken.id)); toast(`${chicken.name} wandered off to the meadow. 🌾`); close(); }) }, '🌾 Send to meadow')
        : h('button', { class: 'btn primary', onclick: () => { const r = ctx.store.commit((s) => bringBack(s, chicken.id)); if (r.ok) { toast(`${chicken.name} is back in the coop.`); close(); } else { toast(r.reason); sfx.nope(); } } }, '🏠 Bring back to coop'),
    ),
  ]);
  return container;
}

export function enterShowPicker(ctx: Ctx, chicken: Chicken) {
  openModal('Choose a category', (close) =>
    h(
      'div',
      null,
      h('p', { class: 'lede' }, `Which category should ${chicken.name} enter?`),
      SHOW_CATEGORIES.map((cat) =>
        h('button', { class: 'show-cat', onclick: () => { close(); ctx.ui.hatcheryTab = 'show'; ctx.navigate('hatchery'); import('./screens/show').then((m) => m.judge(ctx, cat.id, chicken.id)); } }, h('div', { class: 'e' }, cat.emoji), h('div', null, h('div', { class: 't' }, cat.name), h('div', { class: 'd' }, cat.blurb))),
      ),
    ),
  );
}
