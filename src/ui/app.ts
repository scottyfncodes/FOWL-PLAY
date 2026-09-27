import { h } from './dom';
import type { Store } from '../state/store';
import type { Ctx, Tab, UiState } from './ctx';
import { renderCoop } from './screens/coop';
import { renderBreed } from './screens/breed';
import { renderHatchery } from './screens/hatchery';
import { renderAlmanac } from './screens/almanac';
import { renderShow } from './screens/show';
import { showChickenDetail } from './chickenDetail';
import { openHatchOverlay } from './hatch';
import { renderWelcome } from './welcome';
import { openSettings } from './settings';
import { closeAllModals, toast } from './components';
import { CURRENCY_ICON } from '../data/economy';
import { TRAIT_BY_ID } from '../data/traits';
import { BREED_BY_ID } from '../data/breeds';
import { MILESTONE_BY_ID } from '../data/milestones';
import { sfx, setSoundEnabled } from '../audio/sfx';
import { applyTheme } from './theme';
import type { DiscoveryReport } from '../state/game';
import type { Chicken } from '../chickens/chicken';

const TABS: { id: Tab; label: string; ico: string }[] = [
  { id: 'coop', label: 'Coop', ico: '🐔' },
  { id: 'breed', label: 'Breed', ico: '🧬' },
  { id: 'hatchery', label: 'Hatchery', ico: '🏡' },
  { id: 'almanac', label: 'Almanac', ico: '📖' },
  { id: 'show', label: 'Show', ico: '🎀' },
];

export class App implements Ctx {
  ui: UiState = { tab: 'coop', parentA: null, parentB: null, coopSort: 'newest', showMeadow: false, almanacTab: 'breeds', highlightId: null };
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
    this.cornEl = h('div', { class: 'corn-pill', title: 'Corn' }, CURRENCY_ICON, h('span', null, String(store.state.corn)));
    this.main = h('main', { class: 'screen' });
    this.navEl = h('nav', { class: 'nav', 'aria-label': 'Main' });
    this.root.replaceChildren(
      h('header', { class: 'header' }, h('div', { class: 'brand' }, h('h1', null, 'Fowl Play'), h('small', null, 'field notes')), h('div', { class: 'header-right' }, this.cornEl, h('button', { class: 'icon-btn', 'aria-label': 'Settings', onclick: () => this.openSettings() }, '⚙️'))),
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
        case 'almanac': screen = renderAlmanac(this); break;
        case 'show': screen = renderShow(this); break;
        default: screen = renderCoop(this);
      }
    } catch (err) {
      console.error(err);
      screen = h('div', { class: 'empty' }, 'Something went wrong drawing this screen. ', h('button', { class: 'btn sm', onclick: () => this.navigate('coop') }, 'Back to the coop'));
    }
    this.main.replaceChildren(screen);
    requestAnimationFrame(() => window.scrollTo({ top: y }));
    this.navEl.replaceChildren(
      ...TABS.map((t) =>
        h('button', { class: t.id === this.ui.tab ? 'active' : '', 'aria-current': t.id === this.ui.tab ? 'page' : undefined, onclick: () => { sfx.tap(); this.navigate(t.id); } }, h('span', { class: 'ico', 'aria-hidden': 'true' }, t.ico), t.label, t.id === 'breed' && s.eggs.length > 0 ? h('span', { class: 'badge' }, String(s.eggs.length)) : null),
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

  openSettings() {
    openSettings(this);
  }

  toastCorn(amount: number) {
    if (amount > 0) toast(`+${amount} ${CURRENCY_ICON} corn`);
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
      toast(`✨ New trait${traitDefs.length > 1 ? 's' : ''}: ${top.map((d) => `${d.emoji} ${d.name}`).join(', ')}${rest > 0 ? ` and ${rest} more` : ''}`, tone);
    }
    for (const b of report.newBreeds) {
      any = true;
      toast(`📖 ${BREED_BY_ID[b.id]?.name ?? 'Breed'} added to the Almanac${b.how === 'resemblance' ? ` (${who} looks the part)` : ''}`, 'gold');
    }
    if (report.milestones.length > 0) {
      any = true;
      toast(`🏅 ${report.milestones.map((m) => MILESTONE_BY_ID[m]?.name ?? m).join(' · ')}`, 'gold');
    }
    if (any) sfx.discovery();
    if (report.corn > 0) this.toastCorn(report.corn);
  }
}
