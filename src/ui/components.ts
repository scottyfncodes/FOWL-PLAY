import { h, svgBox, type Child } from './dom';
import { chickenSvg, eggSvg } from './chickenSvg';
import { ancestryLabel, viewOf, type Chicken, type ChickenView } from '../chickens/chicken';
import { TRAIT_BY_ID, type TraitDef } from '../data/traits';
import { RARITY_LABEL } from '../genetics/traits';
import { sfx } from '../audio/sfx';
import { abilitiesOf } from '../genetics/abilities';
import { abilityBadgeRow } from './abilityBadges';

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

let modalRoot: HTMLElement | null = null;
const modalStack: HTMLElement[] = [];

export function openModal(title: Child, body: (close: () => void) => Child, opts: { onClose?: () => void; wide?: boolean } = {}): () => void {
  if (!modalRoot) {
    modalRoot = h('div', { id: 'modals' });
    document.body.appendChild(modalRoot);
  }
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    root.remove();
    const i = modalStack.indexOf(root);
    if (i >= 0) modalStack.splice(i, 1);
    if (modalStack.length === 0) document.body.style.overflow = '';
    opts.onClose?.();
  };
  const root = h(
    'div',
    { class: 'modal-root', role: 'dialog', 'aria-modal': 'true' },
    h('div', { class: 'modal-backdrop', onclick: close }),
    h(
      'div',
      { class: 'modal', style: opts.wide ? { maxWidth: '820px' } : undefined },
      h('div', { class: 'grab' }),
      h('div', { class: 'modal-head' }, h('h3', null, title), h('button', { class: 'icon-btn close', 'aria-label': 'Close', onclick: close }, '✕')),
      body(close),
    ),
  );
  modalRoot.appendChild(root);
  modalStack.push(root);
  document.body.style.overflow = 'hidden';
  return close;
}

export function closeAllModals() {
  for (const m of [...modalStack]) m.remove();
  modalStack.length = 0;
  document.body.style.overflow = '';
}

export function confirmModal(title: string, message: Child, confirmLabel: string, onConfirm: () => void, danger = false) {
  openModal(title, (close) =>
    h(
      'div',
      null,
      h('p', { class: 'lede' }, message),
      h(
        'div',
        { class: 'btn-row' },
        h('button', { class: 'btn', onclick: close }, 'Cancel'),
        h('button', { class: `btn ${danger ? 'primary' : 'primary'}`, onclick: () => { close(); onConfirm(); } }, confirmLabel),
      ),
    ),
  );
}

// ---------------------------------------------------------------------------
// Toasts
// ---------------------------------------------------------------------------

let toastRoot: HTMLElement | null = null;
export function toast(message: Child, tone: 'default' | 'gold' | 'purple' = 'default') {
  if (!toastRoot) {
    toastRoot = h('div', { class: 'toasts', 'aria-live': 'polite' });
    document.body.appendChild(toastRoot);
  }
  const t = h('div', { class: `toast ${tone === 'default' ? '' : tone}` }, message);
  toastRoot.appendChild(t);
  setTimeout(() => t.remove(), 3800);
}

// ---------------------------------------------------------------------------
// Chicken bits
// ---------------------------------------------------------------------------

export function chickenArt(view: ChickenView, className = 'art', extra: { shadow?: boolean } = {}): HTMLElement {
  return svgBox(chickenSvg(view.phenotype, view.chicken.seed, { uid: view.chicken.id, shadow: extra.shadow }), className);
}

export function eggArt(view: ChickenView, className = 'egg'): HTMLElement {
  return svgBox(eggSvg(view.phenotype.eggColor, view.phenotype.eggSpeckled, view.phenotype.eggSize, { uid: `egg-${view.chicken.id}` }), className);
}

export function traitChip(id: string, opts: { isNew?: boolean; onClick?: () => void; big?: boolean; showOdds?: number } = {}): HTMLElement {
  const def = TRAIT_BY_ID[id];
  if (!def) return h('span', { class: 'chip unknown' }, '?');
  const cls = ['chip', def.rarity !== 'common' ? def.rarity : '', opts.isNew ? 'new' : '', opts.big ? 'big' : '', opts.onClick ? 'btn-chip' : ''].join(' ');
  const inner: Child[] = [h('span', { class: 'e' }, def.emoji), def.name];
  if (opts.showOdds !== undefined) inner.push(h('span', { class: 'odds' }, `${Math.round(opts.showOdds * 100)}%`));
  if (opts.isNew) inner.push(h('span', { class: 'e' }, '✨'));
  if (opts.onClick) return h('button', { class: cls, onclick: opts.onClick, type: 'button' }, ...inner);
  return h('span', { class: cls }, ...inner);
}

export function traitChips(ids: string[], opts: { newSet?: ReadonlySet<string>; onClick?: (id: string) => void; big?: boolean } = {}): HTMLElement {
  return h(
    'div',
    { class: 'chips' },
    ids.map((id) => traitChip(id, { isNew: opts.newSet?.has(id), onClick: opts.onClick ? () => opts.onClick!(id) : undefined, big: opts.big })),
  );
}

/** Ordered subset of traits worth showing on a compact card. */
export function notableTraits(view: ChickenView, max = 3): string[] {
  const score = (id: string) => {
    const t = TRAIT_BY_ID[id];
    if (!t) return -1;
    const r = { common: 0, uncommon: 2, rare: 4, exotic: 6, legendary: 8 }[t.rarity];
    const cat = t.category === 'combo' ? 3 : t.category === 'personality' ? -2 : t.category === 'utility' ? -1 : t.category === 'egg' ? 0.5 : 1;
    return r + cat;
  };
  return [...view.traits]
    .filter((id) => !id.startsWith('per.'))
    .sort((a, b) => score(b) - score(a))
    .slice(0, max);
}

export function rarityTag(view: ChickenView): HTMLElement {
  return h('span', { class: `tag ${view.rarity.tier}` }, RARITY_LABEL[view.rarity.tier]);
}

export function chickenCard(chicken: Chicken, opts: { onClick?: (c: Chicken) => void; selected?: boolean; isNew?: boolean; showRarity?: boolean; extra?: Child; maxTraits?: number } = {}): HTMLElement {
  const view = viewOf(chicken);
  const card = h(
    'button',
    { class: `chicken-card ${opts.selected ? 'selected' : ''} ${opts.isNew ? 'new' : ''}`, type: 'button', dataset: { chickenId: chicken.id }, onclick: () => { sfx.tap(); opts.onClick?.(chicken); } },
    h('div', { class: 'corner' }, h('span', { class: 'tag gen' }, `Gen ${chicken.generation}`), opts.showRarity !== false && view.rarity.tier !== 'common' ? rarityTag(view) : null),
    chickenArt(view),
    h('div', { class: 'name' }, chicken.name, chicken.favorite ? h('span', { class: 'fav' }, '⭐') : null),
    h('div', { class: 'sub' }, ancestryLabel(chicken)),
    abilityBadgeRow(abilitiesOf(view.phenotype), { max: 5 }),
    h('div', { class: 'tags' }, notableTraits(view, opts.maxTraits ?? 2).map((id) => traitChip(id))),
    opts.extra ?? null,
  );
  return card;
}

export function traitDefOf(id: string): TraitDef | undefined {
  return TRAIT_BY_ID[id];
}

export function timeAgo(ts: number): string {
  const d = Date.now() - ts;
  const m = Math.floor(d / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const hrs = Math.floor(m / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
