import { h } from '../dom';
import { chickenArt, chickenCard, openModal, toast } from '../components';
import { viewOf } from '../../chickens/chicken';
import { RIBBON_LABEL, SHOW_BY_ID, SHOW_CATEGORIES, type Ribbon } from '../../data/shows';
import { chickenById, coopChickens, enterShow } from '../../state/game';
import type { Ctx } from '../ctx';
import { sfx } from '../../audio/sfx';
import { CURRENCY_ICON } from '../../data/economy';
import { MILESTONE_BY_ID } from '../../data/milestones';

const RIBBON_EMOJI: Record<Ribbon, string> = { none: '·', bronze: '🥉', silver: '🥈', gold: '🥇' };

export function renderShow(ctx: Ctx): HTMLElement {
  const s = ctx.state;
  return h(
    'div',
    null,
    h('div', { class: 'screen-title' }, h('h2', null, 'The Chicken Show'), h('span', { class: 'meta' }, `${Object.values(s.ribbons).filter((r) => r.ribbon !== 'none').length} ribbons`)),
    h('p', { class: 'lede' }, 'Nine very silly categories, one very serious judge. Enter any chicken; beat your own best to earn corn.'),
    ...SHOW_CATEGORIES.map((cat) => {
      const best = s.ribbons[cat.id];
      return h(
        'button',
        { class: 'show-cat', type: 'button', onclick: () => pickEntrant(ctx, cat.id) },
        h('div', { class: 'e' }, cat.emoji),
        h('div', null, h('div', { class: 't' }, cat.name), h('div', { class: 'd' }, cat.blurb)),
        h('div', { class: 'best' }, best ? [h('div', { class: 'ribbon' }, RIBBON_EMOJI[best.ribbon]), h('div', null, `${best.chickenName} · ${best.score}`)] : h('div', { class: 'muted' }, 'No entries yet')),
      );
    }),
  );
}

function pickEntrant(ctx: Ctx, categoryId: string) {
  const cat = SHOW_BY_ID[categoryId];
  if (!cat) return;
  const list = coopChickens(ctx.state);
  openModal(`${cat.emoji} ${cat.name}`, (close) =>
    h(
      'div',
      null,
      h('p', { class: 'lede' }, `${cat.blurb} Who are you entering?`),
      list.length === 0 ? h('div', { class: 'empty' }, 'Nobody in the coop to enter.') : null,
      h('div', { class: 'grid' }, list.map((c) => chickenCard(c, { onClick: () => { close(); judge(ctx, categoryId, c.id); } }))),
    ),
    { wide: true },
  );
}

export function judge(ctx: Ctx, categoryId: string, chickenId: string) {
  const cat = SHOW_BY_ID[categoryId];
  const chicken = chickenById(ctx.state, chickenId);
  if (!cat || !chicken) return;
  const result = ctx.store.commit((s) => enterShow(s, categoryId, chickenId));
  if (!result) {
    toast('The judge declined to comment.');
    return;
  }
  const view = viewOf(chicken);
  if (result.ribbon === 'gold') sfx.rare();
  else if (result.ribbon !== 'none') sfx.discovery();
  else sfx.tap();
  const meter = h('div', { class: 'score-meter' }, h('div', { style: { width: '0%' } }));
  openModal(`${cat.emoji} ${cat.name}`, () =>
    h(
      'div',
      { class: 'podium' },
      chickenArt(view),
      h('div', { class: 'label' }, chicken.name),
      h('div', { class: 'score' }, `${result.score}`),
      meter,
      h('div', null, h('span', { class: 'ribbon' }, RIBBON_EMOJI[result.ribbon]), ' ', h('b', null, RIBBON_LABEL[result.ribbon])),
      h('p', { class: 'remark' }, `“${result.remark}”`),
      result.corn > 0 ? h('p', { class: 'small', style: { marginTop: '8px', fontWeight: '700' } }, `+${result.corn} ${CURRENCY_ICON} corn`) : h('p', { class: 'small muted', style: { marginTop: '8px' } }, result.improved && result.score > 0 ? 'A new personal best, but no ribbon this time.' : result.score === 0 ? 'The judge wrote nothing down at all.' : 'Not a new best. The judge remembers.'),
      result.milestones.length ? h('p', { class: 'small', style: { marginTop: '6px' } }, `🏅 Milestone: ${result.milestones.map((m) => MILESTONE_BY_ID[m]?.name ?? m).join(', ')}`) : null,
    ),
  );
  requestAnimationFrame(() => setTimeout(() => { (meter.firstChild as HTMLElement).style.width = `${result.score}%`; }, 50));
}
