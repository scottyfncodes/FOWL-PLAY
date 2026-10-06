import { h } from '../ui/dom';
import type { Ctx } from '../ui/ctx';
import { chickenById } from '../state/game';
import { abilitiesOfChicken, applyFarmEvent, currentMission, emptyOutingReport, finishOuting, lookOf, missionClues, startOuting, type OutingReport } from '../state/farm';
import { viewOf } from '../chickens/chicken';
import { World } from './sim';
import { FARM_LEVEL } from './level';
import { FarmRenderer, computeCamera, type Camera, type ChickenDrawState } from './render';
import { spritesFor, type FrameName } from './sprites';
import type { Input, WorldEvent } from './types';
import { LORE, MISSION_BY_ID, MISSIONS } from './missions';
import { chickenArt, toast } from '../ui/components';
import { sfx } from '../audio/sfx';
import { CURRENCY_ICON } from '../data/economy';
import { ABILITY_BY_ID } from '../genetics/abilities';
import { CLUE_TEXT } from './clues';

const STEP = 1 / 60;

/**
 * The outing: full-screen canvas, touch controls, thought bubbles and the
 * mission cards. Everything the simulation reports comes through here and
 * is written to the save immediately, so a refresh mid-outing loses nothing
 * important.
 */
export function openFarm(ctx: Ctx, chickenId: string) {
  const chicken = chickenById(ctx.state, chickenId);
  if (!chicken || chicken.status !== 'coop') return;
  if (!ctx.store.commit((s) => startOuting(s, chickenId))) return;
  const view = viewOf(chicken);
  const abilities = abilitiesOfChicken(chicken);
  const s0 = ctx.state;
  const solved = MISSIONS.filter((m) => s0.farm.missions[m.id]?.solvedAt).map((m) => m.id);
  const world = new World(FARM_LEVEL, {
    abilities,
    look: lookOf(chicken),
    flags: s0.farm.flags,
    solved,
    cornTaken: s0.farm.cornTaken,
    eggsTaken: s0.farm.eggsTaken,
    lore: Object.keys(s0.farm.lore),
  });
  const sprites = spritesFor(view);
  const report: OutingReport = emptyOutingReport();

  // ---- DOM ------------------------------------------------------------------
  const canvas = h('canvas', { class: 'farm-canvas' });
  const renderer = new FarmRenderer(canvas);
  const missionChip = h('button', { class: 'farm-chip mission', type: 'button', onclick: () => openBoard() }, '');
  const cornChip = h('div', { class: 'farm-chip corn' }, `${CURRENCY_ICON} ${ctx.state.corn}`);
  const pauseBtn = h('button', { class: 'farm-chip icon', type: 'button', 'aria-label': 'Pause', onclick: () => openPause() }, '⏸');
  const nameChip = h('div', { class: 'farm-chip name' }, chicken.name);
  const bubble = h('div', { class: 'thought', hidden: true });
  const hint = h('div', { class: 'action-hint', hidden: true });
  const banner = h('div', { class: 'farm-banner', hidden: true });
  const flash = h('div', { class: 'farm-flash' });

  const stickKnob = h('div', { class: 'stick-knob' });
  const stickUp = h('div', { class: 'stick-dir u' }, h('b', null, '▲'), h('i', null, 'climb'));
  const stickDown = h('div', { class: 'stick-dir d' }, h('i', null, 'hide'), h('b', null, '▼'));
  const stickBase = h('div', { class: 'stick-base' }, h('div', { class: 'stick-dir l' }, h('b', null, '◀')), h('div', { class: 'stick-dir r' }, h('b', null, '▶')), stickUp, stickDown, stickKnob);
  const padLeft = h('div', { class: 'pad-left stick-zone' }, stickBase);
  const jumpBtn = h('div', { class: 'pad-btn jump' }, h('span', null, 'JUMP'));
  const peckBtn = h('div', { class: 'pad-btn peck' }, h('span', null, 'PECK'));
  const controls = h('div', { class: 'farm-controls' }, padLeft, h('div', { class: 'pad-right' }, peckBtn, jumpBtn));
  const overlay = h('div', { class: 'farm-overlay' });
  const root = h(
    'div',
    { class: 'farm-root', role: 'application', 'aria-label': 'The farm' },
    canvas,
    flash,
    h('div', { class: 'farm-hud' }, h('div', { class: 'farm-hud-row' }, missionChip, h('div', { class: 'grow' }), nameChip, cornChip, pauseBtn), banner),
    bubble,
    hint,
    controls,
    overlay,
  );
  document.body.appendChild(root);
  document.body.classList.add('farm-open');
  // Debug / e2e hook: the live world.
  const dbg = (window as unknown as { __fowl?: Record<string, unknown> }).__fowl;
  if (dbg) dbg.farm = { world, chicken: world.chicken };

  // ---- input -----------------------------------------------------------------
  // Three sources feed one Input: keyboard, the touch stick and buttons, and a gamepad.
  // Presses (jump, peck) are queued so a tap shorter than a frame is never lost.
  const keys = new Set<string>();
  let jumpQueued = false;
  let actionQueued = false;
  const touch = { left: false, right: false, up: false, down: false, jump: false };
  const buzz = (ms: number) => {
    try {
      navigator.vibrate?.(ms);
    } catch {
      /* not supported */
    }
  };

  const KEYMAP: Record<string, string> = { arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right', arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down', ' ': 'jump', z: 'jump', k: 'jump', e: 'action', x: 'action', j: 'action', enter: 'action', escape: 'pause', p: 'pause' };
  const onKey = (e: KeyboardEvent, down: boolean) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const m = KEYMAP[e.key.toLowerCase()];
    if (!m) return;
    e.preventDefault();
    if (e.repeat) return;
    if (down) {
      if (m === 'pause') {
        if (paused) {
          // Escape / P closes the pause card, but not a mission-complete card that needs a choice.
          if (overlay.querySelector('.farm-card:not(.complete)')) setOverlay(null);
        } else openPause();
        return;
      }
      if (paused) return;
      if (m === 'jump' && !keys.has('jump')) jumpQueued = true;
      if (m === 'action' && !keys.has('action')) actionQueued = true;
      keys.add(m);
    } else keys.delete(m);
  };
  const keyDown = (e: KeyboardEvent) => onKey(e, true);
  const keyUp = (e: KeyboardEvent) => onKey(e, false);

  // Touch stick. It floats: put a thumb down anywhere in the left zone and the stick
  // centres under it, so there is no aiming at a small target. Push sideways to walk,
  // up to climb, down to hide. Diagonals work (walk while climbing).
  const STICK_R = 46;
  let stickId: number | null = null;
  let stickCx = 0;
  let stickCy = 0;
  const placeStick = (x: number | null, y: number | null) => {
    if (x === null || y === null) {
      stickBase.style.removeProperty('left');
      stickBase.style.removeProperty('top');
      stickBase.classList.remove('active');
    } else {
      stickBase.style.left = `${x}px`;
      stickBase.style.top = `${y}px`;
      stickBase.classList.add('active');
    }
  };
  const updateStick = (e: PointerEvent) => {
    let dx = e.clientX - stickCx;
    let dy = e.clientY - stickCy;
    const d = Math.hypot(dx, dy);
    if (d > STICK_R) {
      dx = (dx / d) * STICK_R;
      dy = (dy / d) * STICK_R;
    }
    stickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
    const was = { ...touch };
    touch.left = dx < -STICK_R * 0.3;
    touch.right = dx > STICK_R * 0.3;
    touch.up = dy < -STICK_R * 0.5;
    touch.down = dy > STICK_R * 0.5;
    stickBase.classList.toggle('l-on', touch.left);
    stickBase.classList.toggle('r-on', touch.right);
    stickBase.classList.toggle('u-on', touch.up);
    stickBase.classList.toggle('d-on', touch.down);
    if ((touch.up && !was.up) || (touch.down && !was.down)) buzz(6);
  };
  const releaseStick = () => {
    stickId = null;
    touch.left = touch.right = touch.up = touch.down = false;
    stickKnob.style.transform = '';
    stickBase.classList.remove('l-on', 'r-on', 'u-on', 'd-on');
    placeStick(null, null);
  };
  padLeft.addEventListener('pointerdown', (e) => {
    if (stickId !== null) return;
    e.preventDefault();
    stickId = e.pointerId;
    padLeft.setPointerCapture(e.pointerId);
    const z = padLeft.getBoundingClientRect();
    const m = STICK_R + 12;
    const x = Math.max(m, Math.min(z.width - m, e.clientX - z.left));
    const y = Math.max(m, Math.min(z.height - m, e.clientY - z.top));
    placeStick(x, y);
    stickCx = z.left + x;
    stickCy = z.top + y;
    updateStick(e);
  });
  padLeft.addEventListener('pointermove', (e) => {
    if (e.pointerId === stickId) updateStick(e);
  });
  const stickEnd = (e: PointerEvent) => {
    if (e.pointerId === stickId) releaseStick();
  };
  padLeft.addEventListener('pointerup', stickEnd);
  padLeft.addEventListener('pointercancel', stickEnd);
  padLeft.addEventListener('lostpointercapture', stickEnd);

  // Buttons: each tracks its own finger, so holding jump while tapping peck works.
  const holdButton = (el: HTMLElement, onDown: () => void, onUp: () => void) => {
    let id: number | null = null;
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (id !== null) return;
      id = e.pointerId;
      el.setPointerCapture(e.pointerId);
      el.classList.add('on');
      buzz(10);
      onDown();
    });
    const end = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = null;
      el.classList.remove('on');
      onUp();
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('lostpointercapture', end);
  };
  holdButton(jumpBtn, () => { touch.jump = true; jumpQueued = true; }, () => { touch.jump = false; });
  holdButton(peckBtn, () => { actionQueued = true; }, () => {});
  for (const el of [padLeft, jumpBtn, peckBtn]) el.addEventListener('contextmenu', (e) => e.preventDefault());

  // Gamepad (standard mapping): left stick or d-pad to move, A to jump, X or B to peck, Start to pause.
  const pad = { jump: false, action: false, start: false };
  const readGamepad = () => {
    const out = { left: false, right: false, up: false, down: false, jump: false };
    const gp = navigator.getGamepads ? Array.from(navigator.getGamepads()).find((g) => g && g.connected) : null;
    if (!gp) return out;
    const btn = (i: number) => !!gp.buttons[i]?.pressed;
    const ax = gp.axes[0] ?? 0;
    const ay = gp.axes[1] ?? 0;
    out.left = ax < -0.35 || btn(14);
    out.right = ax > 0.35 || btn(15);
    out.up = ay < -0.55 || btn(12);
    out.down = ay > 0.55 || btn(13);
    out.jump = btn(0);
    const action = btn(1) || btn(2);
    const start = btn(9);
    if (out.jump && !pad.jump) jumpQueued = true;
    if (action && !pad.action) actionQueued = true;
    if (start && !pad.start) {
      if (paused) {
        if (overlay.querySelector('.farm-card:not(.complete)')) setOverlay(null);
      } else openPause();
    }
    pad.jump = out.jump;
    pad.action = action;
    pad.start = start;
    return out;
  };

  const releaseAll = () => {
    keys.clear();
    releaseStick();
    touch.jump = false;
    jumpBtn.classList.remove('on');
    peckBtn.classList.remove('on');
  };
  const onBlur = () => releaseAll();
  // Backgrounding the app (home button, notification, lock) pauses rather than leaving the chicken running.
  const onVisibility = () => {
    if (document.hidden) {
      releaseAll();
      if (!paused) openPause();
    }
  };
  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  window.addEventListener('blur', onBlur);
  document.addEventListener('visibilitychange', onVisibility);

  const readInput = (): Input => {
    const gp = readGamepad();
    const input: Input = {
      left: keys.has('left') || touch.left || gp.left,
      right: keys.has('right') || touch.right || gp.right,
      up: keys.has('up') || touch.up || gp.up,
      down: keys.has('down') || touch.down || gp.down,
      jump: keys.has('jump') || touch.jump || gp.jump,
      jumpPressed: jumpQueued,
      action: actionQueued,
    };
    jumpQueued = false;
    actionQueued = false;
    return input;
  };

  // ---- presentation state -----------------------------------------------------
  const draw: ChickenDrawState = { frame: 'stand', rot: 0, squashX: 1, squashY: 1, alpha: 1 };
  let flapUntil = 0;
  let landAt = -1;
  let jumpAt = -1;
  let cam: Camera | null = null;
  let paused = false;
  let closed = false;
  let bubbleTimer: ReturnType<typeof setTimeout> | null = null;
  let bannerTimer: ReturnType<typeof setTimeout> | null = null;
  let lastHint: string | null = null;
  let acc = 0;
  let last = performance.now();
  let raf = 0;

  const resize = () => {
    const w = root.clientWidth;
    const hgt = root.clientHeight;
    renderer.resize(w, hgt);
    cam = null;
  };
  window.addEventListener('resize', resize);
  resize();

  const showThought = (text: string, long = false) => {
    bubble.textContent = text;
    bubble.hidden = false;
    bubble.classList.remove('pop');
    void bubble.offsetWidth;
    bubble.classList.add('pop');
    if (bubbleTimer) clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => { bubble.hidden = true; }, long ? 6500 : 3800);
  };
  const showBanner = (kicker: string, title: string, body: string, ms = 5200) => {
    banner.replaceChildren(h('div', { class: 'k' }, kicker), h('div', { class: 't' }, title), ...(body ? [h('div', { class: 'd' }, body)] : []));
    banner.hidden = false;
    banner.classList.remove('pop');
    void banner.offsetWidth;
    banner.classList.add('pop');
    if (bannerTimer) clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => { banner.hidden = true; }, ms);
  };
  const flashScreen = (cls: string) => {
    flash.className = `farm-flash ${cls}`;
    void flash.offsetWidth;
    flash.classList.add('go');
    setTimeout(() => flash.classList.remove('go'), 500);
  };
  const updateMissionChip = () => {
    const m = currentMission(ctx.state);
    const known = m && ctx.state.farm.missions[m.id];
    missionChip.textContent = !m ? '🎯 All problems solved' : known ? `🎯 ${m.name}` : '🎯 Explore →';
  };
  updateMissionChip();

  // ---- events -----------------------------------------------------------------
  const handle = (events: WorldEvent[]) => {
    if (events.length === 0) return;
    const c = world.chicken;
    let commitNeeded = false;
    const stateEvents: WorldEvent[] = [];
    for (const ev of events) {
      switch (ev.type) {
        case 'sfx':
          farmSfx(ev.name);
          if (ev.name === 'land') {
            landAt = world.time;
            renderer.burst(c.x, c.y, 'dust', 5);
          }
          if (ev.name === 'jump') jumpAt = world.time;
          if (ev.name === 'flap') {
            flapUntil = world.time + 0.25;
            renderer.burst(c.x, c.y - c.h * 0.5, 'feathers', 3);
          }
          if (ev.name === 'dig') renderer.burst(c.x, c.y, 'dirt', 14);
          if (ev.name === 'crow') renderer.burst(c.x + c.facing * 20, c.y - c.h, 'notes', 3);
          if (ev.name === 'unlock') renderer.burst(c.x, c.y - c.h / 2, 'sparkle', 6);
          if (ev.name === 'crack') renderer.burst(c.x + c.facing * 20, c.y - 10, 'dirt', 10);
          break;
        case 'thought':
          showThought(ev.text);
          break;
        case 'clue':
          showThought(ev.text, true);
          stateEvents.push(ev);
          commitNeeded = true;
          break;
        case 'lore': {
          const l = LORE[ev.id];
          if (l) toast(`📝 Field note: ${l.title}`, 'purple');
          stateEvents.push(ev);
          commitNeeded = true;
          break;
        }
        case 'corn':
          renderer.floatText(c.x, c.y - c.h - 10, `+${ev.amount}`, '#8f5b16');
          renderer.burst(c.x, c.y - c.h / 2, 'corn', 4);
          stateEvents.push(ev);
          commitNeeded = true;
          break;
        case 'egg':
          stateEvents.push(ev);
          commitNeeded = true;
          break;
        case 'missionDiscovered': {
          const def = MISSION_BY_ID[ev.mission];
          const known = !!ctx.state.farm.missions[ev.mission];
          if (def && !known) {
            showBanner('A PROBLEM', def.name, def.problem, 7000);
            sfx.discovery();
          }
          stateEvents.push(ev);
          commitNeeded = true;
          break;
        }
        case 'missionSolved':
          stateEvents.push(ev);
          commitNeeded = true;
          break;
        case 'caught':
          flashScreen('red');
          renderer.burst(c.x, c.y - c.h / 2, 'feathers', 12);
          farmSfx('caught');
          break;
        case 'flounder':
          renderer.burst(c.x, c.y, 'splash', 14);
          break;
        case 'checkpoint':
          renderer.floatText(c.x, c.y - c.h - 14, 'nest remembered');
          break;
        case 'exit':
          close('coop');
          return;
      }
    }
    if (commitNeeded) {
      const before = { corn: ctx.state.corn, eggs: report.eggs.length, solved: report.solved.length };
      ctx.store.commit((s) => {
        for (const ev of stateEvents) applyFarmEvent(s, ev, chicken, report);
      });
      cornChip.textContent = `${CURRENCY_ICON} ${ctx.state.corn}`;
      if (ctx.state.corn !== before.corn) {
        cornChip.classList.remove('bump');
        void cornChip.offsetWidth;
        cornChip.classList.add('bump');
      }
      for (let i = before.eggs; i < report.eggs.length; i++) {
        const egg = report.eggs[i]!;
        showBanner('FOUND', 'A mystery egg', `Nobody knows whose it is. It is in your incubator now, next to ${egg.child.name}'s future.`, 6000);
        sfx.rare();
      }
      if (report.eggsLeft > 0 && stateEvents.some((e) => e.type === 'egg')) {
        showThought('An egg! But the incubator is full. Hatch something and come back for it.', true);
        for (const ev of stateEvents) if (ev.type === 'egg') world.eggsTaken.delete(ev.id);
        for (const e of world.entities) if (e.kind === 'egg' && !ctx.state.farm.eggsTaken.includes(e.id)) e.taken = false;
      }
      for (let i = before.solved; i < report.solved.length; i++) {
        const { mission, method } = report.solved[i]!;
        openMissionComplete(mission.id, method);
      }
      updateMissionChip();
    }
  };

  // ---- loop ----------------------------------------------------------------------
  const frame = (now: number) => {
    if (closed) return;
    raf = requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25;
    if (!paused) {
      acc += dt;
      let steps = 0;
      while (acc >= STEP && steps < 6) {
        const input = readInput();
        handle(world.step(input, STEP));
        acc -= STEP;
        steps++;
        if (closed) return;
      }
      // Action hint
      const ah = world.actionHint();
      if (ah !== lastHint) {
        lastHint = ah;
        hint.hidden = !ah;
        hint.textContent = ah ?? '';
        peckBtn.classList.toggle('lit', !!ah);
      }
      const sh = world.stickHints();
      stickUp.classList.toggle('avail', sh.up);
      stickDown.classList.toggle('avail', sh.down);
    }
    // Presentation
    const c = world.chicken;
    const t = world.time;
    let frameName: FrameName = 'stand';
    switch (c.anim) {
      case 'run': frameName = Math.floor(c.odometer / 14) % 2 === 0 ? 'walk1' : 'walk2'; break;
      case 'jump': frameName = t < flapUntil ? 'flap' : 'jump'; break;
      case 'fall': frameName = t < flapUntil ? 'flap' : 'jump'; break;
      case 'glide': frameName = 'glide'; break;
      case 'swim': frameName = 'swim'; break;
      case 'climb': frameName = Math.floor((c.y / 12)) % 2 === 0 ? 'climb1' : 'climb2'; break;
      case 'peck': frameName = 'peck'; break;
      case 'crow': frameName = 'crow'; break;
      case 'dig': frameName = 'peck'; break;
      case 'hide': frameName = 'hide'; break;
      case 'caught': frameName = 'flap'; break;
      case 'flounder': frameName = 'flap'; break;
      case 'frozen': frameName = 'stand'; break;
      default: frameName = 'stand';
    }
    draw.frame = frameName;
    let rot = 0;
    if (c.anim === 'jump') rot = -0.18;
    else if (c.anim === 'fall') rot = 0.14;
    else if (c.anim === 'glide') rot = 0.04 + Math.sin(t * 6) * 0.03;
    else if (c.anim === 'caught') rot = Math.sin(t * 40) * 0.3;
    else if (c.anim === 'flounder') rot = Math.sin(t * 25) * 0.25;
    else if (c.anim === 'run') rot = Math.sin(c.odometer / 7) * 0.05;
    else if (c.anim === 'swim') rot = Math.sin(t * 5) * 0.06;
    draw.rot = rot;
    let sx = 1;
    let sy = 1;
    if (c.anim === 'stand') {
      sy = 1 + Math.sin(t * 3) * 0.015;
      sx = 1 - Math.sin(t * 3) * 0.01;
    }
    if (landAt >= 0 && t - landAt < 0.16) {
      const k = 1 - (t - landAt) / 0.16;
      sx = 1 + 0.2 * k;
      sy = 1 - 0.22 * k;
    } else if (jumpAt >= 0 && t - jumpAt < 0.14) {
      const k = 1 - (t - jumpAt) / 0.14;
      sx = 1 - 0.12 * k;
      sy = 1 + 0.16 * k;
    }
    if (c.anim === 'hide') {
      sy = 0.8;
      sx = 1.1;
    }
    draw.squashX = sx;
    draw.squashY = sy;
    draw.alpha = c.hidden ? 0.55 : 1;
    cam = computeCamera(world, root.clientWidth, root.clientHeight, cam, dt);
    renderer.draw(world, cam, sprites, draw, paused ? 0 : dt);
  };
  raf = requestAnimationFrame(frame);

  // ---- overlays: pause, board, mission complete -------------------------------
  const setOverlay = (content: HTMLElement | null) => {
    overlay.replaceChildren(...(content ? [content] : []));
    overlay.classList.toggle('show', !!content);
    paused = !!content;
    releaseAll();
    if (!content) last = performance.now();
  };

  const openPause = () => {
    const m = currentMission(ctx.state);
    setOverlay(
      h(
        'div',
        { class: 'farm-card' },
        h('div', { class: 'kicker' }, 'Paused'),
        h('h2', null, chicken.name),
        h('p', { class: 'small muted' }, m ? `Current problem: ${m.name}` : 'Every problem on the farm is solved.'),
        h('div', { class: 'farm-card-actions' }, h('button', { class: 'btn primary big', onclick: () => setOverlay(null) }, '▶ Keep going'), h('button', { class: 'btn', onclick: () => openBoard() }, '📋 The problem'), h('button', { class: 'btn', onclick: () => close('switch') }, '🐔 Switch chicken'), h('button', { class: 'btn ghost', onclick: () => close('coop') }, '🏠 Back to the coop')),
        h('p', { class: 'small muted controls-help' }, controlsHelp()),
      ),
    );
  };

  const openBoard = () => {
    const s = ctx.state;
    const m = currentMission(s);
    const near = nearestMission(world.chicken.x, s);
    const show = near ?? m;
    const clues = show ? missionClues(s, show.id) : [];
    setOverlay(
      h(
        'div',
        { class: 'farm-card' },
        h('div', { class: 'kicker' }, show && s.farm.missions[show.id]?.solvedAt ? 'Solved' : 'The problem'),
        h('h2', null, show ? show.name : 'Nothing yet'),
        h('p', { class: 'lede' }, show ? (s.farm.missions[show.id] ? show.problem : 'Something is out there. Go and look.') : 'Head right. The farm will explain itself.'),
        clues.length ? h('div', { class: 'section-h' }, 'What we know') : null,
        clues.length ? h('ul', { class: 'clue-list' }, clues.map((id) => h('li', null, CLUE_TEXT[`${show!.id}:${id}`] ?? id))) : null,
        h('div', { class: 'farm-card-actions' }, h('button', { class: 'btn primary big', onclick: () => setOverlay(null) }, '▶ Keep going'), h('button', { class: 'btn ghost', onclick: () => close('switch') }, '🐔 Try a different chicken')),
      ),
    );
  };

  const openMissionComplete = (missionId: string, method: string) => {
    const def = MISSION_BY_ID[missionId];
    if (!def) return;
    const sol = def.solutions.find((x) => x.method === method);
    const isLast = missionId === 'doorbell';
    sfx.rare();
    renderer.burst(world.chicken.x, world.chicken.y - world.chicken.h, 'sparkle', 12);
    setOverlay(
      h(
        'div',
        { class: 'farm-card complete' },
        h('div', { class: 'kicker' }, 'Mission complete'),
        h('h2', null, def.done),
        chickenArt(view, 'art small'),
        h('p', { class: 'lede' }, `${chicken.name}: ${sol ? sol.label.toLowerCase() : 'found a way'}.`),
        h('p', { class: 'small' }, `+${def.reward} ${CURRENCY_ICON} corn`),
        isLast ? h('p', { class: 'small muted' }, 'That was the last problem on the farm, for now. The Woods are being surveyed.') : h('p', { class: 'small muted' }, def.afterword),
        h('div', { class: 'farm-card-actions' }, isLast ? null : h('button', { class: 'btn primary big', onclick: () => setOverlay(null) }, '▶ Keep exploring'), h('button', { class: isLast ? 'btn primary big' : 'btn', onclick: () => close('coop') }, '🏠 Back to the coop')),
      ),
    );
  };

  // ---- close -------------------------------------------------------------------
  const close = (why: 'coop' | 'switch') => {
    if (closed) return;
    closed = true;
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', keyDown);
    window.removeEventListener('keyup', keyUp);
    window.removeEventListener('blur', onBlur);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('resize', resize);
    ctx.store.commit((s) => finishOuting(s, world));
    root.remove();
    document.body.classList.remove('farm-open');
    if (dbg) delete dbg.farm;
    if (why === 'switch') {
      ctx.navigate('farm');
      ctx.chooseOuting();
    } else {
      ctx.navigate('farm');
      if (report.corn > 0 || report.solved.length > 0) toast(`${chicken.name} is back in the coop. ${report.corn > 0 ? `+${report.corn} ${CURRENCY_ICON}` : ''}`);
    }
  };
}

function nearestMission(x: number, s: { farm: { missions: Record<string, unknown> } }) {
  let best: (typeof MISSIONS)[number] | null = null;
  let bestD = Infinity;
  for (const m of MISSIONS) {
    if (!s.farm.missions[m.id]) continue;
    const mx = MISSION_X_LOOKUP[m.id] ?? 0;
    const d = Math.abs(mx - x);
    if (d < bestD) {
      bestD = d;
      best = m;
    }
  }
  return bestD < 700 ? best : null;
}

const MISSION_X_LOOKUP: Record<string, number> = { breakfast: 330, gardenGate: 800, crows: 1260, pond: 1740, barnDoor: 2110, grainChute: 2430, foxField: 3150, doorbell: 4290 };

function controlsHelp(): string {
  const touchFirst = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  return touchFirst
    ? 'Thumb anywhere on the left to walk: push up to climb a post, down to hide in a bush. Hold JUMP to flap or glide. PECK lights up when there is something to peck.'
    : 'Move: ← → or A D · Jump: space (hold to flap or glide) · Peck: E or X · Climb: ↑ against a post · Hide: ↓ in a bush · Pause: Esc or P · Gamepads work too.';
}

function farmSfx(name: Parameters<typeof sfx.farm>[0]) {
  sfx.farm(name);
}

export { ABILITY_BY_ID };
