import { h, svgBox } from '../dom';
import { openModal, traitChip, timeAgo } from '../components';
import { BREEDS, BREED_BY_ID, type BreedDef } from '../../data/breeds';
import { TRAITS, TRAIT_BY_ID, type TraitCategory } from '../../data/traits';
import { MILESTONES } from '../../data/milestones';
import { genotypeFromSpec } from '../../genetics/loci';
import { computePhenotype } from '../../genetics/phenotype';
import { chickenSvg, eggSvg } from '../chickenSvg';
import { RARITY_LABEL } from '../../genetics/traits';
import { chickenById, upgradeLevel } from '../../state/game';
import type { Ctx } from '../ctx';
import { CURRENCY_ICON } from '../../data/economy';
import { showTraitInfo } from '../chickenDetail';
import { SHOW_BY_ID } from '../../data/shows';
import { ABILITIES, ABILITY_BY_ID, CARRIER_GENES } from '../../genetics/abilities';
import { abilityBadgeRow, showAbilityInfo } from '../abilityBadges';
import { chickenArt } from '../components';
import { viewOf, type Chicken } from '../../chickens/chicken';
import { abilitiesOfChicken } from '../../state/farm';
import { LORE, MISSIONS } from '../../farm/missions';
import { sfx } from '../../audio/sfx';

const CAT_ORDER: TraitCategory[] = ['colour', 'pattern', 'feathers', 'head', 'body', 'legs', 'egg', 'combo', 'personality', 'utility'];
const CAT_LABEL: Record<TraitCategory, string> = { colour: 'Colours', pattern: 'Patterns', feathers: 'Feathers', head: 'Heads & combs', body: 'Bodies & tails', legs: 'Legs & feet', egg: 'Eggs', combo: 'Rare combinations', personality: 'Personalities', utility: 'Hardiness' };

const breedArtCache = new Map<string, string>();
export function breedArt(b: BreedDef): string {
  let svg = breedArtCache.get(b.id);
  if (!svg) {
    const p = computePhenotype(genotypeFromSpec(b.genotype), 7);
    svg = chickenSvg(p, 7, { uid: `breed-${b.id}` });
    breedArtCache.set(b.id, svg);
  }
  return svg;
}

export function renderFowldex(ctx: Ctx): HTMLElement {
  const tabs = h(
    'div',
    { class: 'subtabs', role: 'tablist' },
    ...(['flock', 'abilities', 'breeds', 'traits', 'milestones'] as const).map((t) => h('button', { class: ctx.ui.almanacTab === t ? 'active' : '', role: 'tab', onclick: () => { sfx.tap(); ctx.ui.almanacTab = t; ctx.rerender(); } }, { flock: 'Flock', abilities: 'Abilities', breeds: 'Breeds', traits: 'Traits', milestones: 'Milestones' }[t])),
  );
  const body = ctx.ui.almanacTab === 'flock' ? flockTab(ctx) : ctx.ui.almanacTab === 'abilities' ? abilitiesTab(ctx) : ctx.ui.almanacTab === 'breeds' ? breedsTab(ctx) : ctx.ui.almanacTab === 'traits' ? traitsTab(ctx) : milestonesTab(ctx);
  return h('div', null, h('div', { class: 'screen-title' }, h('h2', null, 'Fowldex')), h('p', { class: 'lede' }, 'Every chicken you have made, everything they can do, and silhouettes of everything you have not found yet.'), tabs, body);
}

// ---------------------------------------------------------------------------
// Flock: numbered entries for every chicken that ever joined
// ---------------------------------------------------------------------------

function flockTab(ctx: Ctx): HTMLElement {
  const s = ctx.state;
  const all = [...s.chickens].sort((a, b) => a.no - b.no);
  const byId = new Map(all.map((c) => [c.id, c]));
  const solvedBy = new Map<string, string[]>();
  for (const m of MISSIONS) {
    const p = s.farm.missions[m.id];
    if (p?.solvedAt && p.chickenId) solvedBy.set(p.chickenId, [...(solvedBy.get(p.chickenId) ?? []), m.done]);
  }
  const entry = (c: Chicken) => {
    const v = viewOf(c);
    const a = abilitiesOfChicken(c);
    const parents = c.parents ? c.parents.map((id) => byId.get(id)) : null;
    const carriers = c.knownGenes.map((g) => CARRIER_GENES.find((x) => x.abilityId === g)?.name ?? g);
    const unproven = CARRIER_GENES.filter((g) => !c.knownGenes.includes(g.abilityId)).length;
    const done = solvedBy.get(c.id) ?? [];
    return h(
      'button',
      { class: `dex-entry ${c.status === 'meadow' ? 'meadow' : ''}`, type: 'button', onclick: () => ctx.showChicken(c.id) },
      h('div', { class: 'no' }, `#${String(c.no).padStart(3, '0')}`),
      chickenArt(v, 'art'),
      h(
        'div',
        { class: 'body' },
        h('div', { class: 'name' }, c.name.toUpperCase(), c.favorite ? ' ⭐' : ''),
        h('div', { class: 'sub' }, `Generation ${c.generation}${c.status === 'meadow' ? ' · in the meadow' : ''}`),
        h('div', { class: 'dex-line' }, h('span', { class: 'label' }, 'Can'), abilityBadgeRow(a, { max: 8, empty: 'nothing special. Yet.' })),
        h('div', { class: 'dex-line' }, h('span', { class: 'label' }, 'Hidden'), h('span', { class: 'small' }, carriers.length ? `carries ${carriers.join(', ')}${unproven ? ' · ???' : ''}` : '???')),
        parents ? h('div', { class: 'dex-line' }, h('span', { class: 'label' }, 'Parents'), h('span', { class: 'small' }, parents.map((p) => (p ? `#${String(p.no).padStart(3, '0')} ${p.name}` : 'a departed chicken')).join(' × '))) : h('div', { class: 'dex-line' }, h('span', { class: 'label' }, 'Origin'), h('span', { class: 'small' }, c.origin === 'found' ? 'Hatched from a mystery egg' : c.origin === 'hatchery' ? 'Adopted' : c.origin === 'starter' ? 'Your first chicken' : 'Chosen on day one')),
        done.length ? h('div', { class: 'dex-line' }, h('span', { class: 'label' }, 'Solved'), h('span', { class: 'small' }, done.join(' '))) : null,
      ),
    );
  };
  const placeholders = [0, 1, 2].map((i) => h('div', { class: 'dex-entry locked' }, h('div', { class: 'no' }, `#${String(s.farm.nextNo + i).padStart(3, '0')}`), h('div', { class: 'art silhouette' }, '🐔'), h('div', { class: 'body' }, h('div', { class: 'name' }, '???'), h('div', { class: 'sub' }, 'Not yet hatched'))));
  return h(
    'div',
    null,
    h('div', { class: 'small', style: { display: 'flex', justifyContent: 'space-between' } }, h('b', null, `${all.length} chickens recorded`), h('span', { class: 'muted' }, `${all.filter((c) => c.knownGenes.length).length} with proven hidden genes`)),
    h('div', { class: 'dex-list' }, ...all.map(entry), ...placeholders),
  );
}

// ---------------------------------------------------------------------------
// Abilities & field notes
// ---------------------------------------------------------------------------

function abilitiesTab(ctx: Ctx): HTMLElement {
  const s = ctx.state;
  const found = ABILITIES.filter((a) => s.farm.discoveredAbilities[a.id]);
  const loreIds = Object.keys(LORE);
  const knownLore = loreIds.filter((id) => s.farm.lore[id]);
  return h(
    'div',
    null,
    h('div', { class: 'small', style: { display: 'flex', justifyContent: 'space-between' } }, h('b', null, `${found.length} of ${ABILITIES.length} abilities seen in your flock`), h('span', { class: 'muted' }, `${Math.round((found.length / ABILITIES.length) * 100)}%`)),
    h('div', { class: 'progress' }, h('div', { style: { width: `${(found.length / ABILITIES.length) * 100}%` } })),
    h(
      'div',
      { class: 'ability-grid' },
      ABILITIES.map((a) => {
        const d = s.farm.discoveredAbilities[a.id];
        const who = d ? chickenById(s, d.chickenId) : null;
        if (!d) return h('button', { class: 'ability-card locked', type: 'button', onclick: () => showAbilityInfo({ ...a, name: 'Unknown ability', does: 'Nobody in your flock can do this yet. Breed towards it, or adopt someone who can.', breeding: '' }, false) }, h('div', { class: 'e' }, '?'), h('div', { class: 'n' }, '· · ·'), h('div', { class: 'd' }, a.flaw ? 'A flaw' : 'Undiscovered'));
        return h('button', { class: `ability-card ${a.flaw ? 'flaw' : ''}`, type: 'button', onclick: () => showAbilityInfo(a) }, h('div', { class: 'e' }, a.emoji), h('div', { class: 'n' }, a.name), h('div', { class: 'd' }, a.does), who ? h('div', { class: 'w' }, `first seen: ${who.name}`) : null);
      }),
    ),
    h('div', { class: 'section-h' }, 'Field notes', h('span', null, `${knownLore.length}/${loreIds.length}`)),
    h('p', { class: 'small muted' }, 'Things the flock has learned the hard way. They are true of every chicken.'),
    ...loreIds.map((id) => {
      const l = LORE[id]!;
      const known = !!s.farm.lore[id];
      return h('div', { class: `milestone ${known ? 'done' : 'todo'}` }, h('div', { class: 'e' }, known ? '📝' : '🔒'), h('div', null, h('div', { class: 't' }, known ? l.title : '· · ·'), h('div', { class: 'd' }, known ? l.text : 'Find out by trying something that does not work.')));
    }),
  );
}

export { ABILITY_BY_ID };

function breedsTab(ctx: Ctx): HTMLElement {
  const s = ctx.state;
  const found = Object.keys(s.discoveredBreeds).length;
  const sorted = [...BREEDS].sort((a, b) => (s.discoveredBreeds[a.id] ? 0 : 1) - (s.discoveredBreeds[b.id] ? 0 : 1) || a.tier - b.tier || a.name.localeCompare(b.name));
  return h(
    'div',
    null,
    h('div', { class: 'small', style: { display: 'flex', justifyContent: 'space-between' } }, h('b', null, `${found} of ${BREEDS.length} breeds recorded`), h('span', { class: 'muted' }, `${Math.round((found / BREEDS.length) * 100)}%`)),
    h('div', { class: 'progress' }, h('div', { style: { width: `${(found / BREEDS.length) * 100}%` } })),
    h(
      'div',
      { class: 'grid' },
      sorted.map((b, i) => {
        const disc = s.discoveredBreeds[b.id];
        return h(
          'button',
          { class: `breed-card ${disc ? '' : 'locked'}`, type: 'button', onclick: () => showBreed(ctx, b) },
          svgBox(breedArt(b), 'art'),
          h('div', { class: 'n' }, disc ? b.name : '???'),
          h('div', { class: 'o' }, disc ? b.origin : `${'★'.repeat(b.tier)} · plate ${i + 1}`),
        );
      }),
    ),
  );
}

export function showBreed(ctx: Ctx, b: BreedDef) {
  const s = ctx.state;
  const disc = s.discoveredBreeds[b.id];
  const p = computePhenotype(genotypeFromSpec(b.genotype), 7);
  const notes = upgradeLevel(s, 'fieldNotes') > 0;
  const finder = disc ? chickenById(s, disc.chickenId) : null;
  openModal(disc ? b.name : 'Undiscovered breed', () =>
    h(
      'div',
      null,
      h('div', { class: `detail-hero ${disc ? '' : 'locked-hero'}` }, h('div', { class: `breed-card ${disc ? '' : 'locked'}`, style: { padding: 0, border: 0, boxShadow: 'none' } }, svgBox(breedArt(b), 'art')), h('div', { class: 'facts' }, disc ? [h('div', null, h('b', null, 'Origin: '), b.origin), h('div', { class: 'detail-egg' }, svgBox(eggSvg(p.eggColor, p.eggSpeckled, p.eggSize, { uid: `beg-${b.id}` }), 'egg'), h('span', null, h('b', null, 'Eggs: '), b.eggs)), h('div', null, h('b', null, 'Rarity: '), '★'.repeat(b.tier))] : [h('div', null, h('b', null, 'Rarity: '), '★'.repeat(b.tier)), h('div', { class: 'muted' }, 'Origin unknown until recorded.')])),
      disc ? h('p', { class: 'lede', style: { marginTop: '12px' } }, b.description) : h('p', { class: 'lede', style: { marginTop: '12px' } }, 'Only a silhouette so far. Adopt one from the Hatchery, or breed a chicken that looks the part and the Almanac will count it.'),
      h('div', { class: 'section-h' }, 'Notable traits'),
      disc || notes ? h('div', { class: 'chips' }, b.notable.map((n) => h('span', { class: 'chip' }, n))) : h('p', { class: 'small muted' }, 'Buy Field Notes in the Hatchery to see hints for undiscovered breeds.'),
      disc && b.signature.length ? h('div', null, h('div', { class: 'section-h' }, 'Look-alike signature'), h('div', { class: 'chips' }, b.signature.map((sig) => h('span', { class: 'chip' }, sig.startsWith('!') ? `no ${TRAIT_BY_ID[sig.slice(1)]?.name ?? sig.slice(1)}` : sig.split('|').map((x) => TRAIT_BY_ID[x]?.name ?? x).join(' or '))))) : null,
      disc ? h('p', { class: 'small muted', style: { marginTop: '12px' } }, disc.how === 'resemblance' ? `Recorded ${timeAgo(disc.at)} when ${finder?.name ?? 'a chicken'} hatched looking just like one.` : `Recorded ${timeAgo(disc.at)}${finder ? ` with ${finder.name}` : ''}.`) : null,
      finder ? h('button', { class: 'btn sm', style: { marginTop: '8px' }, onclick: () => ctx.showChicken(finder.id) }, `See ${finder.name}`) : null,
    ),
  );
}

function traitsTab(ctx: Ctx): HTMLElement {
  const s = ctx.state;
  const found = Object.keys(s.discoveredTraits).length;
  const notes = upgradeLevel(s, 'fieldNotes') > 0;
  const groups = CAT_ORDER.map((cat) => {
    const list = TRAITS.filter((t) => t.category === cat);
    const foundHere = list.filter((t) => s.discoveredTraits[t.id]).length;
    return h(
      'div',
      { class: 'trait-cat' },
      h('div', { class: 'section-h' }, CAT_LABEL[cat], h('span', null, `${foundHere}/${list.length}`)),
      h(
        'div',
        { class: 'chips' },
        list.map((t) => {
          if (s.discoveredTraits[t.id]) return traitChip(t.id, { onClick: () => showTraitInfo(t.id) });
          return h('button', { class: `chip locked btn-chip ${t.rarity !== 'common' ? t.rarity : ''}`, type: 'button', 'aria-label': `Undiscovered ${RARITY_LABEL[t.rarity]} trait`, onclick: () => showLocked(t.id, notes) }, h('span', { class: 'e' }, '?'), notes ? t.name : t.rarity === 'common' ? '· · ·' : RARITY_LABEL[t.rarity]);
        }),
      ),
    );
  });
  return h(
    'div',
    null,
    h('div', { class: 'small', style: { display: 'flex', justifyContent: 'space-between' } }, h('b', null, `${found} of ${TRAITS.length} traits recorded`), h('span', { class: 'muted' }, `${Math.round((found / TRAITS.length) * 100)}%`)),
    h('div', { class: 'progress' }, h('div', { style: { width: `${(found / TRAITS.length) * 100}%` } })),
    ...groups,
  );
}

function showLocked(id: string, notes: boolean) {
  const t = TRAIT_BY_ID[id];
  if (!t) return;
  openModal(notes ? `? ${t.name}` : 'Undiscovered trait', () =>
    h(
      'div',
      null,
      h('p', { class: `label rarity-text ${t.rarity}` }, `${RARITY_LABEL[t.rarity]} · ${CAT_LABEL[t.category]}`),
      h('p', { class: 'lede', style: { marginTop: '8px' } }, notes ? 'Not yet seen in your coop.' : 'You have not hatched or adopted a chicken with this trait yet.'),
      notes ? h('div', { class: 'notice' }, h('b', null, 'Field notes: '), t.hint) : h('p', { class: 'small muted' }, 'Buy Field Notes in the Hatchery to see inheritance hints for undiscovered traits.'),
    ),
  );
}

function milestonesTab(ctx: Ctx): HTMLElement {
  const s = ctx.state;
  const done = MILESTONES.filter((m) => s.milestones[m.id]);
  const log = [...s.log].reverse().slice(0, 30);
  const describe = (e: (typeof log)[number]) => {
    const who = chickenById(s, e.chickenId ?? '')?.name;
    switch (e.kind) {
      case 'trait':
        return `${who ?? 'Someone'} revealed ${TRAIT_BY_ID[e.refId]?.name ?? 'a trait'}`;
      case 'breed':
        return `${BREED_BY_ID[e.refId]?.name ?? 'A breed'} recorded in the Almanac`;
      case 'resemblance':
        return `${who ?? 'A chick'} hatched looking like a ${BREED_BY_ID[e.refId]?.name ?? 'breed'}`;
      case 'milestone':
        return `Milestone: ${MILESTONES.find((m) => m.id === e.refId)?.name ?? e.refId}`;
      case 'ribbon':
        return `${who ?? 'Someone'} won a ribbon for ${SHOW_BY_ID[e.refId]?.name ?? 'a show'}`;
      case 'mutation':
        return `${who ?? 'A chick'} hatched with a mutation`;
      default:
        return e.refId;
    }
  };
  return h(
    'div',
    null,
    h('div', { class: 'small', style: { display: 'flex', justifyContent: 'space-between' } }, h('b', null, `${done.length} of ${MILESTONES.length} milestones`)),
    h('div', { class: 'progress' }, h('div', { style: { width: `${(done.length / MILESTONES.length) * 100}%` } })),
    ...MILESTONES.map((m) => {
      const at = s.milestones[m.id];
      return h('div', { class: `milestone ${at ? 'done' : 'todo'}` }, h('div', { class: 'e' }, at ? m.emoji : '🔒'), h('div', null, h('div', { class: 't' }, m.name), h('div', { class: 'd' }, m.description)), h('div', { class: 'r' }, at ? `✓ ${timeAgo(at)}` : `+${m.reward} ${CURRENCY_ICON}`));
    }),
    log.length ? h('div', { class: 'section-h' }, 'Recent discoveries') : null,
    ...log.map((e) => h('div', { class: 'log-item' }, h('span', { class: 'when' }, timeAgo(e.at)), h('span', null, describe(e)), e.corn ? h('span', { class: 'muted', style: { marginLeft: 'auto' } }, `+${e.corn} ${CURRENCY_ICON}`) : null)),
  );
}
