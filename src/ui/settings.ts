import { h } from './dom';
import { confirmModal, openModal, toast } from './components';
import type { Ctx } from './ctx';
import { decodeSave, encodeSave } from '../save/storage';
import { freshState } from '../state/game';
import { setSoundEnabled } from '../audio/sfx';
import { BREEDS } from '../data/breeds';
import { TRAITS } from '../data/traits';

export function openSettings(ctx: Ctx) {
  openModal('Settings', (close) => {
    const soundToggle = h('button', { class: 'btn sm', onclick: () => { ctx.store.commit((s) => { s.settings.sound = !s.settings.sound; }); setSoundEnabled(ctx.state.settings.sound); soundToggle.textContent = ctx.state.settings.sound ? 'On' : 'Off'; } }, ctx.state.settings.sound ? 'On' : 'Off');
    const exportBox = h('textarea', { class: 'save-box', readonly: true, 'aria-label': 'Save data' }) as HTMLTextAreaElement;
    const importBox = h('textarea', { class: 'save-box', placeholder: 'Paste a Fowl Play save here', 'aria-label': 'Paste save data' }) as HTMLTextAreaElement;
    const s = ctx.state;
    return h(
      'div',
      null,
      h('div', { class: 'setting-row' }, h('div', null, h('b', null, 'Sound effects'), h('div', { class: 'small muted' }, 'Little blips and hatch fanfares.')), soundToggle),
      h('div', { class: 'setting-row' }, h('div', null, h('b', null, 'Your coop'), h('div', { class: 'small muted' }, `${s.chickens.length} chickens · ${s.stats.hatches} hatched · ${Object.keys(s.discoveredBreeds).length}/${BREEDS.length} breeds · ${Object.keys(s.discoveredTraits).length}/${TRAITS.length} traits`))),
      h('div', { class: 'section-h' }, 'Back up your save'),
      h('p', { class: 'small muted' }, 'Progress is saved automatically in this browser. Copy the text below to move it to another device.'),
      h('div', { class: 'btn-row', style: { margin: '8px 0' } }, h('button', { class: 'btn sm', onclick: () => { exportBox.value = encodeSave(ctx.state); exportBox.select(); void navigator.clipboard?.writeText(exportBox.value).then(() => toast('Save copied to clipboard.')).catch(() => {}); } }, 'Show & copy save')),
      exportBox,
      h('div', { class: 'section-h' }, 'Restore a save'),
      importBox,
      h('div', { class: 'btn-row', style: { margin: '8px 0' } }, h('button', { class: 'btn sm', onclick: () => {
        try {
          const state = decodeSave(importBox.value.trim(), freshState);
          if (!state) throw new Error('not a save');
          confirmModal('Replace your current coop?', 'This will replace everything in this browser with the pasted save.', 'Restore', () => { ctx.store.replace(state); close(); toast('Save restored.'); });
        } catch {
          toast('That does not look like a Fowl Play save.');
        }
      } }, 'Restore from text')),
      h('div', { class: 'section-h' }, 'Danger zone'),
      h('button', { class: 'btn sm', onclick: () => confirmModal('Start over?', 'This deletes every chicken, discovery and ribbon in this browser. There is no undo.', 'Delete everything', () => { ctx.store.reset(); ctx.ui.parentA = null; ctx.ui.parentB = null; close(); ctx.navigate('coop'); }, true) }, 'Reset game'),
      h('div', { class: 'section-h' }, 'About'),
      h('p', { class: 'small muted' }, 'Fowl Play uses a simplified, game-friendly genetics model. What a chicken can do on the farm follows from that model, and only from it. Locus and allele names are borrowed from real poultry genetics for flavour, but the rules here are a toy: please do not use them to plan an actual breeding programme. Breed notes are short summaries and may simplify.'),
    );
  });
}
