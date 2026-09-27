import { h, svgBox } from './dom';
import { chickenSvg } from './chickenSvg';
import { ancestryLabel, viewOf, type Chicken } from '../chickens/chicken';
import type { GameState } from '../state/types';
import { chickenById } from '../state/game';

/**
 * A compact, mobile-friendly ancestry tree: the chicken at the bottom, parents
 * above it, grandparents above them. Unknown ancestors show as a breed label.
 */
export function ancestryTree(state: GameState, chicken: Chicken, depth: number, onPick: (c: Chicken) => void): HTMLElement {
  const node = (c: Chicken | null, label: string, me = false) => {
    if (!c) {
      return h('div', { class: 'tree-node' }, h('div', { class: 'art unknown' }, '🥚'), h('div', { class: 'n' }, label));
    }
    const v = viewOf(c);
    return h(
      'div',
      { class: `tree-node ${me ? 'me' : ''}` },
      h(
        'button',
        { type: 'button', onclick: () => (me ? undefined : onPick(c)) },
        svgBox(chickenSvg(v.phenotype, c.seed, { uid: `tree-${c.id}`, shadow: false }), 'art'),
        h('div', { class: 'n' }, c.name),
        h('div', { class: 'b' }, ancestryLabel(c)),
      ),
    );
  };

  const rows: HTMLElement[] = [];
  const build = (c: Chicken, level: number): HTMLElement => {
    const parents = c.parents ? c.parents.map((id) => chickenById(state, id)) : [];
    const kids: HTMLElement[] = [];
    if (level < depth && c.parents) {
      const pRow = h('div', { class: 'tree-row' }, parents.map((p, i) => (p ? build(p, level + 1) : node(null, `Unknown ${i === 0 ? 'parent' : 'parent'}`))));
      kids.push(pRow, h('div', { class: 'tree-connector' }, '╲ ╱'));
    }
    kids.push(node(c, c.name, level === 0));
    return h('div', { class: 'tree-col', style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' } }, ...kids);
  };
  rows.push(build(chicken, 0));
  return h('div', { class: 'tree' }, ...rows);
}
