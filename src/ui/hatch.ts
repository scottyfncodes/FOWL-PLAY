import { h, svgBox } from './dom';
import { chickenSvg, eggSvg } from './chickenSvg';
import { ancestryLabel, viewOf, type Chicken } from '../chickens/chicken';
import { chickenById, hatch, type DiscoveryReport } from '../state/game';
import type { Ctx } from './ctx';
import { sfx } from '../audio/sfx';
import { traitChip, notableTraits } from './components';
import { TRAIT_BY_ID } from '../data/traits';
import { BREED_BY_ID } from '../data/breeds';
import { MILESTONE_BY_ID } from '../data/milestones';
import { RARITY_LABEL } from '../genetics/traits';
import { LOCUS_BY_ID } from '../genetics/loci';
import { CURRENCY_ICON } from '../data/economy';
import type { Egg } from '../state/types';

/**
 * The hatch sequence: tap the egg three times (or wait), it cracks, the chick
 * pops out, then the reveal card slides up listing everything interesting.
 */
export function openHatchOverlay(ctx: Ctx, eggId: string) {
  const egg = ctx.state.eggs.find((e) => e.id === eggId);
  if (!egg) return;
  const parentA = chickenById(ctx.state, egg.parents[0]);
  const eggView = parentA ? viewOf(parentA) : viewOf(egg.child);

  const root = h('div', { class: 'hatch-root', role: 'dialog', 'aria-modal': 'true' });
  const stage = h('div', { class: 'hatch-stage' });
  root.appendChild(stage);
  document.body.appendChild(root);
  document.body.style.overflow = 'hidden';

  const eggEl = svgBox(eggSvg(eggView.phenotype.eggColor, eggView.phenotype.eggSpeckled, 'large', { uid: 'hatch-egg' }), 'egg-big');
  const crack = h('div', { class: 'crack', html: crackSvg(1) });
  eggEl.appendChild(crack);
  const prompt = h('div', { class: 'prompt' }, 'Tap the egg');
  const hint = h('div', { class: 'tap-hint' }, 'Something is moving in there.');
  stage.append(h('div', { class: 'parents' }, `${egg.parentNames[0]} × ${egg.parentNames[1]}`), eggEl, prompt, hint);

  let taps = 0;
  let done = false;
  const step = () => {
    if (done) return;
    taps++;
    eggEl.classList.remove('wobble', 'wobble-2', 'wobble-3');
    void eggEl.offsetWidth; // restart animation
    if (taps === 1) {
      eggEl.classList.add('wobble');
      sfx.wobble();
      prompt.textContent = 'It wobbled!';
      hint.textContent = 'Tap again.';
    } else if (taps === 2) {
      eggEl.classList.add('wobble-2');
      crack.innerHTML = crackSvg(2);
      crack.classList.add('show');
      sfx.crack();
      prompt.textContent = 'A crack!';
      hint.textContent = 'One more.';
    } else {
      done = true;
      eggEl.classList.add('wobble-3');
      crack.innerHTML = crackSvg(3);
      sfx.crack();
      prompt.textContent = '…';
      hint.textContent = '';
      setTimeout(() => burst(), 450);
    }
  };
  eggEl.addEventListener('click', step);
  eggEl.setAttribute('role', 'button');
  eggEl.setAttribute('tabindex', '0');
  eggEl.setAttribute('aria-label', 'Tap the egg to hatch it');
  // Gentle auto-advance so nobody gets stuck.
  const auto = setInterval(() => { if (!done) step(); else clearInterval(auto); }, 2600);

  const burst = () => {
    clearInterval(auto);
    eggEl.classList.add('burst');
    for (let i = 0; i < 14; i++) {
      const s = h('span', { class: 'sparkle', style: { left: '50%', top: '45%', '--dx': `${(Math.random() - 0.5) * 320}px`, '--dy': `${(Math.random() - 0.7) * 320}px` } as unknown as Record<string, string> }, ['✨', '🌟', '💫', '🐣'][i % 4]!);
      stage.appendChild(s);
    }
    setTimeout(() => reveal(egg), 350);
  };

  const reveal = (theEgg: Egg) => {
    const result = ctx.store.commit((s) => hatch(s, theEgg.id));
    if (!result) {
      closeOverlay();
      return;
    }
    const { chicken, report } = result;
    const view = viewOf(chicken);
    const isRare = view.rarity.tier === 'exotic' || view.rarity.tier === 'legendary';
    if (isRare || report.newTraits.some((t) => ['rare', 'exotic', 'legendary'].includes(TRAIT_BY_ID[t]?.rarity ?? 'common'))) sfx.rare();
    else sfx.hatch();

    stage.replaceChildren(
      svgBox(chickenSvg(view.phenotype, chicken.seed, { uid: `hatch-${chicken.id}` }), 'chick-pop'),
      revealCard(ctx, chicken, report, closeOverlay),
    );
  };

  const closeOverlay = () => {
    root.remove();
    document.body.style.overflow = '';
    ctx.rerender();
  };
}

function crackSvg(stage: number): string {
  const paths = [
    'M52 40 l6 10 l-5 8 l7 9',
    'M52 40 l6 10 l-5 8 l7 9 l-6 10 l8 8 M40 62 l10 4 l6 -6',
    'M52 40 l6 10 l-5 8 l7 9 l-6 10 l8 8 l-4 9 M40 62 l10 4 l6 -6 l8 6 M30 80 l14 2 l8 -8 l10 6 l10 -4',
  ];
  return `<svg viewBox="0 0 100 120" style="position:absolute;inset:0;width:100%;height:100%"><g transform="translate(50 60) scale(1.1) translate(-50 -60)"><path d="${paths[stage - 1]}" fill="none" stroke="#2b2118" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`;
}

const TRAIT_KICKERS = ['Nobody quite knows what happened here.', 'The genes have been busy.', 'Write this one down.', 'Well. That is new.', 'A first for your coop.'];

export function revealCard(ctx: Ctx, chicken: Chicken, report: DiscoveryReport, onDone: () => void, opts: { kicker?: string; doneLabel?: string } = {}): HTMLElement {
  const view = viewOf(chicken);
  const newSet = new Set(report.newTraits);
  const ordered = [...notableTraits(view, 6), ...view.traits.filter((t) => newSet.has(t))].filter((t, i, arr) => arr.indexOf(t) === i && !t.startsWith('per.'));
  const chips = ordered.map((t, i) => {
    const c = traitChip(t, { isNew: newSet.has(t) });
    c.style.animationDelay = `${0.15 + i * 0.08}s`;
    return c;
  });
  const discoveries: HTMLElement[] = [];
  let delay = 0.5;
  const addDisc = (cls: string, kicker: string, title: string, desc: string) => {
    const d = h('div', { class: `discovery ${cls}` }, h('div', { class: 'k' }, kicker), h('div', { class: 't' }, title), h('div', { class: 'd' }, desc));
    d.style.animationDelay = `${delay}s`;
    delay += 0.15;
    discoveries.push(d);
  };
  const commonNew: string[] = [];
  for (const t of report.newTraits) {
    const def = TRAIT_BY_ID[t];
    if (!def) continue;
    if (def.rarity === 'common') {
      commonNew.push(`${def.emoji} ${def.name}`);
      continue;
    }
    const rare = def.rarity === 'rare' || def.rarity === 'exotic';
    addDisc(def.rarity === 'legendary' ? 'legendary-d' : rare ? 'rare-d' : '', `✨ New trait discovered · ${RARITY_LABEL[def.rarity]}`, `${def.emoji} ${def.name}`, rare || def.rarity === 'legendary' ? TRAIT_KICKERS[(t.length + chicken.seed) % TRAIT_KICKERS.length]! + ' ' + def.description : def.description);
  }
  for (const b of report.newBreeds) {
    const def = BREED_BY_ID[b.id];
    if (!def) continue;
    addDisc('', b.how === 'resemblance' ? '📖 Almanac: look-alike bred' : '📖 New breed in the Almanac', def.name, b.how === 'resemblance' ? `${chicken.name} looks enough like a ${def.name} that the Almanac counts it.` : def.description);
  }
  for (const m of report.milestones) {
    const def = MILESTONE_BY_ID[m];
    if (def) addDisc('', '🏅 Milestone', `${def.emoji} ${def.name}`, def.description);
  }
  if (report.mutated) addDisc('rare-d', '🧬 Mutation', 'Something changed on its own', `A spontaneous change at: ${chicken.mutations.map((m) => LOCUS_BY_ID[m]?.name.toLowerCase() ?? m).join(', ')}. This was not inherited from either parent.`);

  const card = h(
    'div',
    { class: 'reveal' },
    h('div', { class: 'kicker' }, opts.kicker ?? 'New chicken'),
    h('h2', null, chicken.name),
    h('div', { class: 'sub' }, `${ancestryLabel(chicken)} · Generation ${chicken.generation} · `, h('span', { class: `rarity-text ${view.rarity.tier}` }, RARITY_LABEL[view.rarity.tier])),
    h('div', { class: 'sub personality' }, view.phenotype.personality.map((x) => x[0]!.toUpperCase() + x.slice(1)).join(' · ')),
    h('div', { class: 'chips' }, chips),
    ...discoveries,
    commonNew.length ? h('p', { class: 'small muted', style: { marginTop: '10px' } }, `Also new to the Almanac: ${commonNew.join(', ')}.`) : null,
    report.corn > 0 ? h('p', { class: 'small', style: { marginTop: '10px', fontWeight: '700' } }, `+${report.corn} ${CURRENCY_ICON} corn earned`) : null,
    h(
      'div',
      { class: 'actions' },
      h('button', { class: 'btn primary big', onclick: () => { sfx.select(); onDone(); ctx.ui.highlightId = chicken.id; ctx.navigate('coop'); } }, opts.doneLabel ?? '🏠 Add to coop'),
      h('button', { class: 'btn', onclick: () => { sfx.select(); onDone(); ctx.breedWith(chicken.id); } }, '🧬 Breed this one next'),
      h('button', { class: 'btn ghost', onclick: () => { onDone(); ctx.showChicken(chicken.id); } }, 'Inspect'),
    ),
  );
  return card;
}
