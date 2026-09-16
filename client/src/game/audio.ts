/** Sonidos con Web Audio API (sin archivos). */

let ctx: AudioContext | null = null;
let enabled = true;

export function setSonidoActivo(on: boolean): void {
  enabled = on;
}

function ac(): AudioContext | null {
  if (!enabled) return null;
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function beep(freq: number, dur: number, type: OscillatorType, gain = 0.08, when = 0) {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + when;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g);
  g.connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

export function unlockAudio(): void {
  const a = ac();
  if (!a) return;
  void a.resume();
}

export function sfxDrop(): void {
  beep(220, 0.06, 'triangle', 0.06);
}

export function sfxPerfect(combo: number): void {
  beep(440 + Math.min(combo, 6) * 40, 0.08, 'square', 0.07);
  beep(660 + Math.min(combo, 6) * 30, 0.1, 'sine', 0.05, 0.05);
}

export function sfxGameOver(): void {
  beep(180, 0.15, 'sawtooth', 0.07);
  beep(120, 0.22, 'triangle', 0.06, 0.1);
}

export function sfxUi(): void {
  beep(520, 0.04, 'sine', 0.04);
}

export function sfxLogro(): void {
  beep(523, 0.08, 'sine', 0.06);
  beep(659, 0.1, 'sine', 0.05, 0.08);
  beep(784, 0.12, 'sine', 0.05, 0.16);
}
