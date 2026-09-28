import { h } from '../dom';
import { chickenArt, openModal, traitChip, notableTraits } from '../components';
import { viewOf, type Chicken } from '../../chickens/chicken';
import type { Ctx } from '../ctx';
import { MAIN_MISSIONS, MISSIONS, MISSION_BY_ID, type MissionDef } from '../../farm/missions';
import { abilitiesOfChicken, currentMission, missionClues, outingCandidates, solvedMainCount } from '../../state/farm';
import { chickenById } from '../../state/game';
import { CLUE_TEXT } from '../../farm/clues';
import { abilityBadgeRow, showAbilityInfo } from '../abilityBadges';
import { CURRENCY_ICON } from '../../data/economy';
import { sfx } from '../../audio/sfx';
import { timeAgo } from '../components';

const AREA_ICON: Record<string, string> = { breakfast: '🥣', gardenGate: '🚪', crows: '🐦‍⬛', pond: '🌊', barnDoor: '🏚️', grainChute: '⚖️', foxField: '🦊', doorbell: '🔔' };

export function renderFarm(ctx: Ctx): HTMLElement {
  const s = ctx.state;
  const current = currentMission(s);
  const progress = s.farm.missions[current?.id ?? ''];
  const solvedCount = solvedMainCount(s);
  const flock = outingCandidates(s);
  const last = chickenById(s, s.farm.lastChickenId);

  const map = h(
    'div',
    { class: 'farm-map' },
    MISSIONS.map((m) => {
      const p = s.farm.missions[m.id];
      const state = p?.solvedAt ? 'done' : p ? 'open' : 'locked';
      const isCurrent = current?.id === m.id;
      return h(
        'button',
        { class: `map-stop ${state} ${isCurrent ? 'current' : ''} ${m.optional ? 'optional' : ''}`, type: 'button', onclick: () => showMission(ctx, m), 'aria-label': p ? m.name : 'Unknown problem' },
        h('span', { class: 'ico' }, state === 'locked' ? '?' : AREA_ICON[m.id] ?? '•'),
        h('span', { class: 'lbl' }, state === 'locked' ? '· · ·' : m.name),
        state === 'done' ? h('span', { class: 'tick' }, '✓') : null,
      );
    }),
  );

  let problemCard: HTMLElement;
  if (!current) {
    problemCard = h(
      'div',
      { class: 'card problem-card done-all' },
      h('div', { class: 'kicker' }, 'The farm'),
      h('h3', null, 'Every problem solved.'),
      h('p', { class: 'lede' }, 'The farmer has met a chicken at the door and is thinking about it. The Woods are being surveyed for the next update. Until then, the farm is yours to wander.'),
    );
  } else if (!progress) {
    problemCard = h(
      'div',
      { class: 'card problem-card' },
      h('div', { class: 'kicker' }, solvedCount === 0 ? 'Where to begin' : 'Next'),
      h('h3', null, solvedCount === 0 ? 'Something needs doing out there.' : 'Keep going right.'),
      h('p', { class: 'lede' }, solvedCount === 0 ? 'Take a chicken out. Walk right. The farm has problems, and every problem has a chicken.' : `Past ${MAIN_MISSIONS[solvedCount - 1]?.name.toLowerCase() ?? 'the last one'} there is more farm. Nobody has looked yet.`),
    );
  } else {
    const clues = missionClues(s, current.id);
    problemCard = h(
      'div',
      { class: 'card problem-card' },
      h('div', { class: 'kicker' }, `Problem ${solvedCount + 1} of ${MAIN_MISSIONS.length}`),
      h('h3', null, `${AREA_ICON[current.id] ?? ''} ${current.name}`),
      h('p', { class: 'lede' }, current.problem),
      clues.length ? h('div', { class: 'label', style: { marginTop: '10px' } }, 'What we know') : h('p', { class: 'small muted', style: { marginTop: '10px' } }, 'Nobody has poked at it properly yet. Clues turn up when a chicken tries something.'),
      clues.length ? h('ul', { class: 'clue-list' }, clues.map((id) => h('li', null, CLUE_TEXT[`${current.id}:${id}`] ?? id))) : null,
      progress.attempts > 1 ? h('p', { class: 'small muted' }, `${progress.attempts} outings so far.`) : null,
      h('p', { class: 'think' }, 'What kind of chicken could do this?'),
    );
  }

  const headOut = h(
    'div',
    { class: 'head-out' },
    h('button', { class: 'btn primary big block', disabled: flock.length === 0, onclick: () => { sfx.select(); ctx.chooseOuting(); } }, '🌾 Head out'),
    last && last.status === 'coop' ? h('button', { class: 'btn block', onclick: () => { sfx.select(); ctx.playAs(last.id); } }, `▶ Go again as ${last.name}`) : null,
    flock.length === 0 ? h('p', { class: 'small muted' }, 'The coop is empty. Adopt or hatch a chicken first.') : null,
  );

  const solvedList = MISSIONS.filter((m) => s.farm.missions[m.id]?.solvedAt).sort((a, b) => (s.farm.missions[b.id]!.solvedAt ?? 0) - (s.farm.missions[a.id]!.solvedAt ?? 0));

  return h(
    'div',
    null,
    h('div', { class: 'screen-title' }, h('h2', null, 'The Farm'), h('span', { class: 'meta' }, `${solvedCount} / ${MAIN_MISSIONS.length} solved`)),
    h('p', { class: 'lede' }, 'A problem appears. You work out what chicken could solve it. You breed that chicken. Then you become it.'),
    map,
    problemCard,
    headOut,
    solvedList.length ? h('div', { class: 'section-h' }, 'Mission log') : null,
    ...solvedList.map((m) => {
      const p = s.farm.missions[m.id]!;
      const sol = m.solutions.find((x) => x.method === p.method);
      const who = chickenById(s, p.chickenId);
      return h(
        'button',
        { class: 'log-mission', type: 'button', onclick: () => showMission(ctx, m) },
        h('div', { class: 'e' }, AREA_ICON[m.id] ?? '✓'),
        h('div', { class: 'grow' }, h('div', { class: 't' }, `MISSION COMPLETE: ${m.done}`), h('div', { class: 'd' }, `${p.chickenName ?? who?.name ?? 'A chicken'} · ${sol?.label ?? 'found a way'} · ${timeAgo(p.solvedAt ?? 0)}`)),
        h('div', { class: 'r' }, `+${m.reward} ${CURRENCY_ICON}`),
      );
    }),
  );
}

export function showMission(ctx: Ctx, m: MissionDef) {
  const s = ctx.state;
  const p = s.farm.missions[m.id];
  const clues = missionClues(s, m.id);
  const who = p?.chickenId ? chickenById(s, p.chickenId) : null;
  openModal(p ? `${AREA_ICON[m.id] ?? ''} ${m.name}` : 'Not found yet', (close) =>
    h(
      'div',
      null,
      !p
        ? h('p', { class: 'lede' }, 'Nobody has got this far. Take a chicken out and keep going right.')
        : h('p', { class: 'lede' }, m.problem),
      p?.solvedAt
        ? h(
            'div',
            { class: 'notice' },
            h('b', null, `MISSION COMPLETE: ${m.done} `),
            `${p.chickenName ?? 'A chicken'}: ${m.solutions.find((x) => x.method === p.method)?.label.toLowerCase() ?? 'found a way'}. ${m.afterword}`,
          )
        : null,
      clues.length ? h('div', { class: 'section-h' }, 'What we know') : null,
      clues.length ? h('ul', { class: 'clue-list' }, clues.map((id) => h('li', null, CLUE_TEXT[`${m.id}:${id}`] ?? id))) : null,
      p?.solvedAt
        ? h('div', null, h('div', { class: 'section-h' }, 'Ways in'), h('p', { class: 'small muted' }, 'Now that it is done, here is everything that would have worked:'), h('ul', { class: 'clue-list' }, m.solutions.map((x) => h('li', { class: x.method === p.method ? 'used' : '' }, x.label, x.method === p.method ? ' ✓' : ''))))
        : null,
      who ? h('button', { class: 'btn sm', style: { marginTop: '8px' }, onclick: () => { close(); ctx.showChicken(who.id); } }, `See ${who.name}`) : null,
      p && !p.solvedAt ? h('div', { class: 'btn-row', style: { marginTop: '12px' } }, h('button', { class: 'btn primary', onclick: () => { close(); ctx.chooseOuting(); } }, '🌾 Head out')) : null,
    ),
  );
}

/** Pick the chicken for the job. Shows what each one can do, not what the job needs. */
export function openOutingPicker(ctx: Ctx) {
  const s = ctx.state;
  const list = [...outingCandidates(s)].sort((a, b) => (a.id === s.farm.lastChickenId ? -1 : b.id === s.farm.lastChickenId ? 1 : 0) || (a.favorite === b.favorite ? b.born - a.born : a.favorite ? -1 : 1));
  const current = currentMission(s);
  openModal('Who goes out?', (close) =>
    h(
      'div',
      null,
      h('p', { class: 'lede' }, current && s.farm.missions[current.id] ? `The problem: ${current.name.toLowerCase()}. Pick the chicken for the job.` : 'Pick a chicken. It will be the one out there, so choose one you like.'),
      list.length === 0 ? h('div', { class: 'empty' }, 'Nobody is in the coop.') : null,
      h('div', { class: 'pick-list' }, list.map((c) => outingRow(ctx, c, close))),
    ),
    { wide: true },
  );
}

function outingRow(ctx: Ctx, c: Chicken, close: () => void): HTMLElement {
  const view = viewOf(c);
  const a = abilitiesOfChicken(c);
  return h(
    'div',
    { class: 'outing-row' },
    h('button', { class: 'outing-art', type: 'button', 'aria-label': `Inspect ${c.name}`, onclick: () => ctx.showChicken(c.id) }, chickenArt(view)),
    h(
      'div',
      { class: 'grow' },
      h('div', { class: 'name' }, `#${String(c.no).padStart(3, '0')} ${c.name}`, c.favorite ? ' ⭐' : ''),
      h('div', { class: 'sub' }, `Gen ${c.generation}`),
      abilityBadgeRow(a, { max: 7, onClick: (def) => showAbilityInfo(def), empty: 'An ordinary chicken. Ordinary is sometimes enough.' }),
      h('div', { class: 'tags' }, notableTraits(view, 2).map((t) => traitChip(t))),
    ),
    h('button', { class: 'btn primary', onclick: () => { sfx.select(); close(); ctx.playAs(c.id); } }, 'Go'),
  );
}

export { MISSION_BY_ID };
