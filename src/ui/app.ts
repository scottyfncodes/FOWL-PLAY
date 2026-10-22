import { h } from './dom';
import type { Store } from '../state/store';
import type { Ctx, Tab, UiState } from './ctx';
import { renderCoop } from './screens/coop';
import { renderBreed } from './screens/breed';
import { renderHatchery } from './screens/hatchery';
import { renderFowldex } from './screens/almanac';
import { renderFarm, openOutingPicker } from './screens/farm';
import { showChickenDetail } from './chickenDetail';
import { openHatchOverlay } from './hatch';
import { renderWelcome } from './welcome';
import { openSettings } from './settings';
import { closeAllModals, toast } from './components';
import { markCorn } from './marks';
import { TRAIT_BY_ID } from '../data/traits';
import { BREED_BY_ID } from '../data/breeds';
import { MILESTONE_BY_ID } from '../data/milestones';
import { ABILITY_BY_ID } from '../genetics/abilities';
import { sfx, setSoundEnabled } from '../audio/sfx';
import { applyTheme } from './theme';
import type { DiscoveryReport } from '../state/game';
import type { Chicken } from '../chickens/chicken';
import { openFarm } from '../farm/play';

const TABS: { id: Tab; label: string }[] = [
  { id: 'farm', label: 'Farm' },
  { id: 'coop', label: 'Coop' },
  { id: 'breed', label: 'Breed' },
  { id: 'fowldex', label: 'Fowldex' },
  { id: 'hatchery', label: 'Hatchery' },
];

const ICON = (paths: string) => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
// Hand-drawn tab icons: a wheat stalk, the coop, a Punnett square, the field guide and an egg.
const TAB_ICONS: Record<Tab, string> = {
  farm: ICON('<path d="M12 21V8"/><path d="M12 8c-2-1-3-3-3-5 2 1 3 3 3 5zM12 8c2-1 3-3 3-5-2 1-3 3-3 5z"/><path d="M12 13c-2.2-.6-3.6-2.2-4-4.4 2.2.6 3.6 2.2 4 4.4zM12 13c2.2-.6 3.6-2.2 4-4.4-2.2.6-3.6 2.2-4 4.4z"/><path d="M12 18c-2.2-.6-3.6-2.2-4-4.4 2.2.6 3.6 2.2 4 4.4zM12 18c2.2-.6 3.6-2.2 4-4.4-2.2.6-3.6 2.2-4 4.4z"/>'),
  coop: ICON('<path d="M3 11l9-7 9 7"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-4a2 2 0 0 1 4 0v4"/><path d="M8 20v2M16 20v2"/>'),
  breed: ICON('<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 4v16M4 12h16"/>'),
  fowldex: ICON('<path d="M12 6.5C10 5 7 4.5 3.5 5v13.5C7 18 10 18.5 12 20c2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5z"/><path d="M12 6.5V20"/>'),
  hatchery: ICON('<path d="M12 3c3.6 0 6.5 5.2 6.5 10a6.5 6.5 0 0 1-13 0C5.5 8.2 8.4 3 12 3z"/>'),
};
const SETTINGS_ICON = ICON('<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2.2" fill="var(--card)"/><circle cx="15" cy="17" r="2.2" fill="var(--card)"/>');


export class App implements Ctx {
  ui: UiState = { tab: 'farm', parentA: null, parentB: null, coopSort: 'newest', showMeadow: false, almanacTab: 'flock', hatcheryTab: 'hatchery', highlightId: null, outingChickenId: null };
  private root: HTMLElement;
  private main: HTMLElement;
  private cornEl: HTMLElement;
  private navEl: HTMLElement;
  private lastCorn: number;
  private scrollMemory: Partial<Record<Tab, number>> = {};

  constructor(public store: Store, mount: HTMLElement) {
    this.root = mount;
    this.lastCorn = store.state.corn;
    setSoundEnabled(store.state.settings.sound);
    applyTheme(store.state.theme);
    const hashTab = location.hash.replace('#', '') as Tab;
    if (TABS.some((t) => t.id === hashTab)) this.ui.tab = hashTab;
    this.cornEl = h('div', { class: 'corn-pill', title: 'Corn' }, markCorn(), h('span', null, String(store.state.corn)));
    this.main = h('main', { class: 'screen' });
    this.navEl = h('nav', { class: 'nav', 'aria-label': 'Main' });
    this.root.replaceChildren(
      h('header', { class: 'header' }, h('div', { class: 'brand' }, h('h1', null, 'Fowl Play'), h('small', null, 'breed it · become it')), h('div', { class: 'header-right' }, this.cornEl, h('button', { class: 'icon-btn', 'aria-label': 'Settings', onclick: () => this.openSettings(), html: SETTINGS_ICON }))),
      this.main,
      this.navEl,
    );
    store.subscribe(() => this.rerender());
    window.addEventListener('hashchange', () => {
      const t = location.hash.replace('#', '') as Tab;
      if (TABS.some((x) => x.id === t) && t !== this.ui.tab) { this.ui.tab = t; this.rerender(); }
    });
    if (store.loadNote) setTimeout(() => toast(store.loadNote!), 400);
    this.rerender();
    if (store.state.onboarding === 'pickSecond' || store.state.onboarding === 'welcome') {
      document.body.appendChild(renderWelcome(this));
    }
  }

  get state() {
    return this.store.state;
  }

  navigate(tab: Tab) {
    this.scrollMemory[this.ui.tab] = window.scrollY;
    this.ui.tab = tab;
    closeAllModals();
    history.replaceState(null, '', `#${tab}`);
    this.rerender();
    window.scrollTo({ top: tab === 'coop' && this.ui.highlightId ? window.scrollY : 0 });
  }

  rerender() {
    const s = this.state;
    const y = window.scrollY;
    let screen: HTMLElement;
    try {
      switch (this.ui.tab) {
        case 'breed': screen = renderBreed(this); break;
        case 'hatchery': screen = renderHatchery(this); break;
        case 'fowldex': screen = renderFowldex(this); break;
        case 'coop': screen = renderCoop(this); break;
        default: screen = renderFarm(this);
      }
    } catch (err) {
      console.error(err);
      screen = h('div', { class: 'empty' }, 'Something went wrong drawing this screen. ', h('button', { class: 'btn sm', onclick: () => this.navigate('coop') }, 'Back to the coop'));
    }
    this.main.replaceChildren(screen);
    requestAnimationFrame(() => window.scrollTo({ top: y }));
    this.navEl.replaceChildren(
      ...TABS.map((t) =>
        h('button', { class: t.id === this.ui.tab ? 'active' : '', 'aria-current': t.id === this.ui.tab ? 'page' : undefined, onclick: () => { sfx.tap(); this.navigate(t.id); } }, h('span', { class: 'ico', 'aria-hidden': 'true', html: TAB_ICONS[t.id] }), t.label, t.id === 'breed' && s.eggs.length > 0 ? h('span', { class: 'badge' }, String(s.eggs.length)) : null),
      ),
    );
    const cornSpan = this.cornEl.lastElementChild as HTMLElement;
    cornSpan.textContent = String(s.corn);
    if (s.corn !== this.lastCorn) {
      this.cornEl.classList.remove('bump');
      void this.cornEl.offsetWidth;
      this.cornEl.classList.add('bump');
      this.lastCorn = s.corn;
    }
  }

  showChicken(id: string) {
    showChickenDetail(this, id);
  }

  openHatch(eggId: string) {
    openHatchOverlay(this, eggId);
  }

  breedWith(chickenId: string) {
    if (this.ui.parentA && this.ui.parentA !== chickenId && this.ui.parentB !== chickenId) this.ui.parentB = chickenId;
    else if (this.ui.parentA === chickenId) {
      // already parent A; nothing to do
    } else {
      this.ui.parentA = chickenId;
    }
    if (this.ui.parentA === this.ui.parentB) this.ui.parentB = null;
    this.navigate('breed');
  }

  playAs(chickenId: string) {
    closeAllModals();
    openFarm(this, chickenId);
  }

  chooseOuting() {
    openOutingPicker(this);
  }

  openSettings() {
    openSettings(this);
  }

  toastCorn(amount: number) {
    if (amount > 0) toast(`+${amount} corn`);
  }

  announce(report: DiscoveryReport, chicken?: Chicken | null) {
    const who = chicken?.name ?? 'A chicken';
    let any = false;
    const traitDefs = report.newTraits.map((t) => TRAIT_BY_ID[t]).filter((d): d is NonNullable<typeof d> => !!d);
    if (traitDefs.length > 0) {
      any = true;
      const rank = { common: 0, uncommon: 1, rare: 2, exotic: 3, legendary: 4 };
      const top = [...traitDefs].sort((a, b) => rank[b.rarity] - rank[a.rarity]).slice(0, 3);
      const rest = traitDefs.length - top.length;
      const tone = top.some((d) => d.rarity === 'legendary') ? 'gold' : top.some((d) => d.rarity === 'rare' || d.rarity === 'exotic') ? 'purple' : 'default';
      toast(`New trait${traitDefs.length > 1 ? 's' : ''}: ${top.map((d) => d.name).join(', ')}${rest > 0 ? ` and ${rest} more` : ''}`, tone);
    }
    if (report.newAbilities.length > 0) {
      any = true;
      toast(`New ability in the flock: ${report.newAbilities.map((a) => ABILITY_BY_ID[a]?.name ?? a).join(', ')}`, 'purple');
    }
    for (const b of report.newBreeds) {
      any = true;
      toast(`${BREED_BY_ID[b.id]?.name ?? 'Breed'} added to the Fowldex${b.how === 'resemblance' ? ` (${who} looks the part)` : ''}`, 'gold');
    }
    if (report.milestones.length > 0) {
      any = true;
      toast(`Milestone: ${report.milestones.map((m) => MILESTONE_BY_ID[m]?.name ?? m).join(' · ')}`, 'gold');
    }
    if (any) sfx.discovery();
    if (report.corn > 0) this.toastCorn(report.corn);
  }
}
