/** Tiny synthesised sound effects. Everything is optional and silent until the player interacts. */
let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

function getCtx(): AudioContext | null {
  if (!enabled) return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, duration: number, type: OscillatorType = 'sine', gain = 0.08) {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime + start);
  g.gain.setValueAtTime(0.0001, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(gain, c.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + duration);
  osc.connect(g).connect(c.destination);
  osc.start(c.currentTime + start);
  osc.stop(c.currentTime + start + duration + 0.02);
}

function noise(start: number, duration: number, gain = 0.06) {
  const c = getCtx();
  if (!c) return;
  const buffer = c.createBuffer(1, Math.floor(c.sampleRate * duration), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const g = c.createGain();
  g.gain.value = gain;
  const filter = c.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 1200;
  src.connect(filter).connect(g).connect(c.destination);
  src.start(c.currentTime + start);
}

export const sfx = {
  tap: () => tone(660, 0, 0.06, 'triangle', 0.04),
  select: () => {
    tone(520, 0, 0.07, 'triangle', 0.05);
    tone(780, 0.06, 0.08, 'triangle', 0.05);
  },
  wobble: () => tone(140, 0, 0.12, 'sine', 0.1),
  crack: () => {
    noise(0, 0.12, 0.08);
    tone(220, 0, 0.08, 'square', 0.03);
  },
  hatch: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.07, 0.25, 'triangle', 0.07));
    noise(0, 0.2, 0.05);
  },
  discovery: () => {
    [880, 1109, 1319, 1760].forEach((f, i) => tone(f, i * 0.06, 0.3, 'sine', 0.06));
  },
  rare: () => {
    [440, 554, 659, 880, 1109, 1319].forEach((f, i) => tone(f, i * 0.08, 0.5, 'triangle', 0.07));
    [880, 1319].forEach((f, i) => tone(f, 0.5 + i * 0.1, 0.6, 'sine', 0.05));
  },
  corn: () => {
    tone(988, 0, 0.08, 'square', 0.03);
    tone(1319, 0.07, 0.1, 'square', 0.03);
  },
  nope: () => tone(180, 0, 0.15, 'sawtooth', 0.04),
  /** Farm sounds, keyed by the simulation's sfx names. */
  farm: (name: 'jump' | 'flap' | 'peck' | 'crack' | 'splash' | 'crow' | 'land' | 'corn' | 'push' | 'dig' | 'fox' | 'caw' | 'bell' | 'unlock' | 'caught') => {
    switch (name) {
      case 'jump':
        tone(330, 0, 0.05, 'triangle', 0.04);
        tone(520, 0.04, 0.08, 'triangle', 0.04);
        break;
      case 'flap':
        noise(0, 0.12, 0.05);
        tone(240, 0, 0.1, 'sine', 0.03);
        break;
      case 'peck':
        tone(900, 0, 0.03, 'square', 0.03);
        noise(0, 0.03, 0.04);
        break;
      case 'crack':
        noise(0, 0.18, 0.1);
        tone(160, 0, 0.12, 'square', 0.04);
        break;
      case 'splash':
        noise(0, 0.3, 0.07);
        tone(200, 0, 0.2, 'sine', 0.03);
        break;
      case 'crow':
        [392, 440, 392, 330].forEach((f, i) => tone(f, i * 0.12, 0.16, 'sawtooth', 0.035));
        tone(294, 0.5, 0.45, 'sawtooth', 0.03);
        break;
      case 'land':
        tone(110, 0, 0.06, 'sine', 0.05);
        break;
      case 'corn':
        tone(988, 0, 0.06, 'square', 0.025);
        tone(1319, 0.05, 0.08, 'square', 0.025);
        break;
      case 'push':
        noise(0, 0.05, 0.015);
        break;
      case 'dig':
        for (let i = 0; i < 5; i++) noise(i * 0.12, 0.08, 0.06);
        break;
      case 'fox':
        tone(120, 0, 0.25, 'sawtooth', 0.05);
        tone(90, 0.2, 0.3, 'sawtooth', 0.04);
        break;
      case 'caw':
        [700, 620].forEach((f, i) => tone(f, i * 0.09, 0.1, 'square', 0.03));
        break;
      case 'bell':
        tone(1760, 0, 0.6, 'sine', 0.06);
        tone(2637, 0.02, 0.5, 'sine', 0.03);
        break;
      case 'unlock':
        [660, 880, 1320].forEach((f, i) => tone(f, i * 0.07, 0.2, 'triangle', 0.05));
        break;
      case 'caught':
        [440, 370, 311, 262].forEach((f, i) => tone(f, i * 0.1, 0.16, 'sawtooth', 0.04));
        break;
    }
  },
};
