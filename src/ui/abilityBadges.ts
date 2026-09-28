import { h, type Child } from './dom';
import { ABILITY_BY_ID, abilityBadges, type Abilities, type AbilityDef } from '../genetics/abilities';
import { openModal } from './components';
import type { Chicken } from '../chickens/chicken';
import { CARRIER_GENES } from '../genetics/abilities';

/** Small pictorial badges for what a chicken can do. Levels shown as a number. */
export function abilityBadgeRow(a: Abilities, opts: { max?: number; big?: boolean; onClick?: (def: AbilityDef) => void; empty?: Child } = {}): HTMLElement {
  const badges = abilityBadges(a);
  const shown = opts.max ? badges.slice(0, opts.max) : badges;
  const rest = badges.length - shown.length;
  const row = h('div', { class: `abilities ${opts.big ? 'big' : ''}` });
  for (const b of shown) {
    const inner: Child[] = [h('span', { class: 'e', 'aria-hidden': 'true' }, b.def.emoji), opts.big ? h('span', { class: 'n' }, b.def.name) : null, b.level > 1 ? h('span', { class: 'lv' }, String(b.level)) : null];
    const cls = `ability ${b.def.flaw ? 'flaw' : ''}`;
    row.appendChild(
      opts.onClick
        ? h('button', { class: cls, type: 'button', title: b.def.name, 'aria-label': `${b.def.name}${b.level > 1 ? ` ${b.level}` : ''}`, onclick: () => opts.onClick!(b.def) }, ...inner)
        : h('span', { class: cls, title: b.def.name, 'aria-label': `${b.def.name}${b.level > 1 ? ` ${b.level}` : ''}` }, ...inner),
    );
  }
  if (rest > 0) row.appendChild(h('span', { class: 'ability more' }, `+${rest}`));
  if (badges.length === 0 && opts.empty) row.appendChild(h('span', { class: 'small muted' }, opts.empty));
  return row;
}

export function showAbilityInfo(def: AbilityDef, discovered = true) {
  openModal(
    h('span', null, `${def.emoji} ${def.name}`),
    () =>
      h(
        'div',
        null,
        h('p', { class: 'label' }, def.flaw ? 'A flaw, mostly' : 'Farm ability'),
        h('p', { class: 'lede', style: { marginTop: '8px' } }, def.does),
        discovered ? h('div', { class: 'notice' }, h('b', null, 'Breeding: '), def.breeding) : h('p', { class: 'small muted' }, 'Hatch or adopt a chicken with this ability and the Fowldex will note how it is inherited.'),
      ),
  );
}

/** Genes a chicken is proven to carry (by its chicks), as chips. */
export function carrierChips(chicken: Chicken): HTMLElement | null {
  if (chicken.knownGenes.length === 0) return null;
  return h(
    'div',
    { class: 'chips' },
    chicken.knownGenes.map((id) => {
      const def = ABILITY_BY_ID[id];
      const gene = CARRIER_GENES.find((g) => g.abilityId === id);
      return h('span', { class: 'chip carrier', title: `Proven to carry ${gene?.name ?? id}` }, h('span', { class: 'e' }, def?.emoji ?? '🧬'), `carries ${gene?.name ?? def?.name ?? id}`);
    }),
  );
}
