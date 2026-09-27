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
};
