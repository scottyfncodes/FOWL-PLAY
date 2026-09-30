import { h } from './dom';
import { sfx } from '../audio/sfx';
import { renameChicken, suggestName } from '../state/game';
import type { Ctx } from './ctx';

/**
 * A chicken's name with an optional inline editor. Chickens arrive with a
 * generated name; tapping ✏️ lets the player type their own (or roll another)
 * without leaving the screen. Leaving it alone keeps the generated name.
 */
export function nameEditor(
  ctx: Ctx,
  chickenId: string,
  opts: { tag?: 'h2' | 'h3'; prompt?: string; onRenamed?: (name: string) => void } = {},
): HTMLElement {
  const root = h('div', { class: 'name-editor' });
  const current = () => ctx.state.chickens.find((c) => c.id === chickenId)?.name ?? '';

  const showName = () => {
    root.replaceChildren(
      h(opts.tag ?? 'h3', { class: 'name' }, current()),
      h('button', { class: 'btn sm ghost name-edit', type: 'button', 'aria-label': 'Rename', title: 'Give it a name', onclick: () => { sfx.tap(); showForm(); } }, opts.prompt ? `✏️ ${opts.prompt}` : '✏️'),
    );
  };

  const showForm = () => {
    const input = h('input', { class: 'text', value: current(), maxlength: '32', 'aria-label': 'Chicken name', autocomplete: 'off', enterkeyhint: 'done' }) as HTMLInputElement;
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        showName();
      }
    });
    const save = (e: Event) => {
      e.preventDefault();
      const ok = ctx.store.commit((s) => renameChicken(s, chickenId, input.value));
      if (!ok) {
        sfx.nope();
        input.focus();
        return;
      }
      sfx.select();
      showName();
      opts.onRenamed?.(current());
    };
    root.replaceChildren(
      h(
        'form',
        { class: 'name-form', onsubmit: save },
        input,
        h('button', { class: 'btn sm', type: 'button', 'aria-label': 'Suggest a name', title: 'Suggest another name', onclick: () => { sfx.tap(); input.value = suggestName(ctx.state); input.focus(); } }, '🎲'),
        h('button', { class: 'btn sm primary', type: 'submit' }, 'Save'),
      ),
    );
    setTimeout(() => { input.focus(); input.select(); }, 30);
  };

  showName();
  return root;
}
