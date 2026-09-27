import { h } from '../dom';
import { chickenArt, chickenCard, eggArt, openModal, toast, traitChip } from '../components';
import { ancestryLabel, viewOf, type Chicken } from '../../chickens/chicken';
import { breed, canBreed, chickenById, coopChickens, discoveredTraitSet, incubatorCapacity } from '../../state/game';
import { previewPairing, type BreedingPreview } from '../../genetics/breeding';
import type { Ctx } from '../ctx';
import { sfx } from '../../audio/sfx';
import { showTraitInfo } from '../chickenDetail';

const previewCache = new Map<string, BreedingPreview>();

export function renderBreed(ctx: Ctx): HTMLElement {
  const s = ctx.state;
  const a = chickenById(s, ctx.ui.parentA);
  const b = chickenById(s, ctx.ui.parentB);
  if (a && a.status !== 'coop') ctx.ui.parentA = null;
  if (b && b.status !== 'coop') ctx.ui.parentB = null;
  const A = a?.status === 'coop' ? a : null;
  const B = b?.status === 'coop' ? b : null;

  const slot = (which: 'A' | 'B', c: Chicken | null) => {
    const pick = () => openPicker(ctx, which);
    if (!c) {
      return h('button', { class: 'parent-slot', type: 'button', onclick: pick }, h('div', { class: 'plus' }, '+'), h('div', { class: 'hint' }, which === 'A' ? 'Choose parent one' : 'Choose parent two'));
    }
    const v = viewOf(c);
    return h(
      'div',
      { class: 'parent-slot filled' },
      h('button', { class: 'btn sm ghost swap', 'aria-label': 'Change parent', onclick: pick }, '↻'),
      h('button', { type: 'button', class: 'btn ghost', style: { padding: 0, minHeight: 0, width: '100%' }, onclick: () => ctx.showChicken(c.id) }, chickenArt(v)),
      h('div', { class: 'name' }, c.name),
      h('div', { class: 'sub' }, ancestryLabel(c)),
    );
  };

  const block = canBreed(s, A, B);
  let preview: HTMLElement | null = null;
  if (A && B && A.id !== B.id) {
    const key = `${A.id}:${B.id}`;
    let p = previewCache.get(key);
    if (!p) {
      p = previewPairing(A, B, discoveredTraitSet(s));
      previewCache.set(key, p);
    }
    // Unknown count depends on discoveries, so recompute cheaply from cached odds.
    const discovered = discoveredTraitSet(s);
    const unknown = [...p.certain, ...p.likely, ...p.possible].filter((o) => !discovered.has(o.traitId)).length;
    const chipsFor = (list: typeof p.certain, max: number) =>
      list.slice(0, max).map((o) => {
        const c = traitChip(o.traitId, { showOdds: discovered.has(o.traitId) ? o.chance : undefined, onClick: discovered.has(o.traitId) ? () => showTraitInfo(o.traitId) : undefined });
        if (!discovered.has(o.traitId)) {
          c.replaceChildren(h('span', { class: 'e' }, '❓'), 'Unknown', h('span', { class: 'odds' }, `${Math.round(o.chance * 100)}%`));
          c.className = 'chip unknown';
        }
        return c;
      });
    preview = h(
      'div',
      { class: 'card preview' },
      h('div', { class: 'pair-title' }, `${ancestryLabel(A)} × ${ancestryLabel(B)}`),
      p.certain.length ? h('div', { class: 'row' }, h('span', { class: 'label' }, 'Certain'), h('div', { class: 'chips' }, chipsFor(p.certain, 8))) : null,
      p.likely.length ? h('div', { class: 'row' }, h('span', { class: 'label' }, 'Likely'), h('div', { class: 'chips' }, chipsFor(p.likely, 8))) : null,
      p.possible.length ? h('div', { class: 'row' }, h('span', { class: 'label' }, 'Possible'), h('div', { class: 'chips' }, chipsFor(p.possible, 10))) : null,
      h('p', { class: 'small muted', style: { marginTop: '10px' } }, unknown > 0 ? `${unknown} outcome${unknown > 1 ? 's' : ''} you have never seen. Only one way to find out.` : 'You have seen everything this pairing can obviously do. Mutations are always possible.'),
    );
  }

  const onBreed = () => {
    if (!A || !B) return;
    const egg = ctx.store.commit((st) => breed(st, A, B));
    if (!egg) {
      const why = canBreed(ctx.state, A, B);
      toast(why.ok ? 'Could not breed.' : why.reason);
      sfx.nope();
      return;
    }
    sfx.select();
    requestAnimationFrame(() => {
      const eggEl = document.querySelector<HTMLElement>(`[data-egg-id="${egg.id}"]`);
      eggEl?.classList.add('highlight');
      eggEl?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  };

  const cap = incubatorCapacity(s);
  const slots: HTMLElement[] = s.eggs.map((egg) => {
    const parentA = chickenById(s, egg.parents[0]);
    const eggView = parentA ? viewOf(parentA) : viewOf(egg.child);
    return h(
      'div',
      { class: 'egg-slot', dataset: { eggId: egg.id } },
      eggArt(eggView),
      h('div', { class: 'egg-name' }, `${egg.parentNames[0]} × ${egg.parentNames[1]}`),
      h('button', { class: 'btn primary sm', onclick: () => ctx.openHatch(egg.id) }, '🐣 Hatch'),
    );
  });
  for (let i = s.eggs.length; i < cap; i++) slots.push(h('div', { class: 'egg-slot empty-slot' }, 'empty nest'));

  const firstTime = s.onboarding === 'firstBreed';
  return h(
    'div',
    null,
    h('div', { class: 'screen-title' }, h('h2', null, 'Breeding Pen'), h('span', { class: 'meta' }, `${coopChickens(s).length} chickens available`)),
    h('p', { class: 'lede' }, 'Pick two parents. The preview shows what the genes could do; the egg shows what they did.'),
    firstTime && (!A || !B) ? h('div', { class: 'hint-callout' }, 'Tap a slot to choose a parent') : null,
    h('div', { class: 'pen' }, slot('A', A), h('div', { class: 'times' }, '×'), slot('B', B)),
    preview,
    h(
      'div',
      { class: 'breed-cta' },
      h('button', { class: `btn primary big ${firstTime && block.ok ? 'pulse' : ''}`, disabled: !block.ok, onclick: onBreed }, '🥚 Breed'),
      !block.ok && (A || B) ? h('p', { class: 'why' }, block.reason) : null,
    ),
    h('div', { class: 'section-h' }, 'Incubator', h('span', null, `${s.eggs.length}/${cap}`)),
    h('div', { class: 'incubator' }, slots),
  );
}

function openPicker(ctx: Ctx, which: 'A' | 'B') {
  const other = which === 'A' ? ctx.ui.parentB : ctx.ui.parentA;
  const list = coopChickens(ctx.state).filter((c) => c.id !== other);
  openModal(which === 'A' ? 'Parent one' : 'Parent two', (close) =>
    h(
      'div',
      null,
      list.length === 0 ? h('div', { class: 'empty' }, 'No other chickens in the coop. Visit the Hatchery.') : null,
      h(
        'div',
        { class: 'grid' },
        list.map((c) =>
          chickenCard(c, {
            selected: (which === 'A' ? ctx.ui.parentA : ctx.ui.parentB) === c.id,
            onClick: () => {
              if (which === 'A') ctx.ui.parentA = c.id;
              else ctx.ui.parentB = c.id;
              sfx.select();
              close();
              ctx.rerender();
            },
          }),
        ),
      ),
    ),
    { wide: true },
  );
}
