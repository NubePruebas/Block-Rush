/** Motor Block Rush: dificultad, combo, daily, pausa. */

export const WORLD_W = 400;
export const WORLD_H = 640;
export const BLOCK_H = 28;
export const START_W = 200;
export const STORAGE_KEY = 'blockrush_best_v2';
export const BEST_DAILY_KEY = 'blockrush_best_daily_v1';

export type Fase = 'start' | 'playing' | 'paused' | 'over';
export type Dificultad = 'facil' | 'normal' | 'dificil';
export type ModoJuego = 'clasico' | 'diario';
export type SkinId = 'neon' | 'madera' | 'hielo';

export interface Bloque {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

export interface BloqueMovil extends Bloque {
  dir: 1 | -1;
  speed: number;
}

export interface Scrap extends Bloque {
  vy: number;
  vr: number;
  rot: number;
  alpha: number;
}

export interface Mundo {
  fase: Fase;
  score: number;
  best: number;
  bestDiario: number;
  torre: Bloque[];
  actual: BloqueMovil | null;
  scraps: Scrap[];
  cameraY: number;
  flash: number;
  perfectFlash: number;
  lastDropAt: number;
  dificultad: Dificultad;
  modo: ModoJuego;
  skin: SkinId;
  combo: number;
  maxCombo: number;
  perfectosPartida: number;
  rng: () => number;
  diaClave: string;
}

export interface ResultadoSoltar {
  ok: boolean;
  miss: boolean;
  perfect: boolean;
  puntos: number;
  combo: number;
}

export const SKIN_PALETTES: Record<SkinId, readonly string[]> = {
  neon: ['#ff6b4a', '#ff8f3c', '#ffd166', '#3dffa8', '#4cc9f0', '#f72585', '#b8f2e6', '#f4a261'],
  madera: ['#c4a484', '#a67c52', '#8b5e3c', '#d4a574', '#6b4226', '#e8c39e', '#9c6644', '#b08968'],
  hielo: ['#a8dadc', '#48cae4', '#90e0ef', '#caf0f8', '#00b4d8', '#ade8f4', '#7bdff2', '#e0fbfc'],
};

const DIFF: Record<Dificultad, { base: number; grow: number; max: number }> = {
  facil: { base: 1.8, grow: 0.12, max: 5.2 },
  normal: { base: 2.4, grow: 0.18, max: 7.2 },
  dificil: { base: 3.2, grow: 0.26, max: 9.0 },
};

/** RNG determinista (mulberry32). */
export function crearRng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function claveDia(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function seedDesdeDia(clave: string): number {
  let h = 2166136261;
  for (let i = 0; i < clave.length; i++) {
    h ^= clave.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function colorDe(skin: SkinId, i: number): string {
  const p = SKIN_PALETTES[skin];
  return p[i % p.length]!;
}

function velocidad(score: number, dif: Dificultad): number {
  const d = DIFF[dif];
  return Math.min(d.max, d.base + score * d.grow);
}

export function leerBest(): number {
  try {
    return Number(localStorage.getItem(STORAGE_KEY) || 0) || 0;
  } catch {
    return 0;
  }
}

export function guardarBest(n: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(n));
  } catch {
    /* ignore */
  }
}

export function leerBestDiario(dia: string): number {
  try {
    const raw = localStorage.getItem(BEST_DAILY_KEY);
    if (!raw) return 0;
    const data = JSON.parse(raw) as { dia?: string; best?: number };
    if (data.dia !== dia) return 0;
    return Number(data.best) || 0;
  } catch {
    return 0;
  }
}

export function guardarBestDiario(dia: string, n: number): void {
  try {
    localStorage.setItem(BEST_DAILY_KEY, JSON.stringify({ dia, best: n }));
  } catch {
    /* ignore */
  }
}

export function crearMundo(skin: SkinId = 'neon'): Mundo {
  const dia = claveDia();
  return {
    fase: 'start',
    score: 0,
    best: leerBest(),
    bestDiario: leerBestDiario(dia),
    torre: [
      { x: 100, y: 500, w: 200, h: BLOCK_H, color: colorDe(skin, 0) },
      { x: 110, y: 472, w: 180, h: BLOCK_H, color: colorDe(skin, 1) },
      { x: 125, y: 444, w: 150, h: BLOCK_H, color: colorDe(skin, 2) },
    ],
    actual: null,
    scraps: [],
    cameraY: 120,
    flash: 0,
    perfectFlash: 0,
    lastDropAt: 0,
    dificultad: 'normal',
    modo: 'clasico',
    skin,
    combo: 0,
    maxCombo: 0,
    perfectosPartida: 0,
    rng: Math.random,
    diaClave: dia,
  };
}

function spawnActual(m: Mundo): void {
  const prev = m.torre[m.torre.length - 1]!;
  const dir: 1 | -1 = m.rng() > 0.5 ? 1 : -1;
  m.actual = {
    x: dir > 0 ? -prev.w : WORLD_W,
    y: prev.y - BLOCK_H,
    w: prev.w,
    h: BLOCK_H,
    dir,
    speed: velocidad(m.score, m.dificultad),
    color: colorDe(m.skin, m.torre.length),
  };
}

export function empezarPartida(
  m: Mundo,
  opts: { dificultad: Dificultad; modo: ModoJuego; skin: SkinId },
): void {
  m.dificultad = opts.dificultad;
  m.modo = opts.modo;
  m.skin = opts.skin;
  m.diaClave = claveDia();
  m.rng = opts.modo === 'diario' ? crearRng(seedDesdeDia(m.diaClave)) : Math.random;
  m.fase = 'playing';
  m.score = 0;
  m.combo = 0;
  m.maxCombo = 0;
  m.perfectosPartida = 0;
  m.flash = 0;
  m.perfectFlash = 0;
  m.scraps = [];
  m.cameraY = 0;
  m.best = leerBest();
  m.bestDiario = leerBestDiario(m.diaClave);
  m.torre = [
    {
      x: (WORLD_W - START_W) / 2,
      y: WORLD_H - 90,
      w: START_W,
      h: BLOCK_H,
      color: colorDe(m.skin, 0),
    },
  ];
  spawnActual(m);
}

export function pausar(m: Mundo): void {
  if (m.fase === 'playing') m.fase = 'paused';
}

export function reanudar(m: Mundo): void {
  if (m.fase === 'paused') m.fase = 'playing';
}

export function tick(m: Mundo, dtMs: number): void {
  const dt = Math.min(32, Math.max(0, dtMs));
  const step = dt / 16.67;

  if (m.fase === 'playing' && m.actual) {
    const a = m.actual;
    a.x += a.dir * a.speed * step;
    if (a.x <= 0) {
      a.x = 0;
      a.dir = 1;
    } else if (a.x + a.w >= WORLD_W) {
      a.x = WORLD_W - a.w;
      a.dir = -1;
    }

    const target = a.y - WORLD_H * 0.38;
    m.cameraY += (target - m.cameraY) * Math.min(1, 0.12 * step);
  }

  for (const s of m.scraps) {
    s.vy += 0.45 * step;
    s.y += s.vy * step;
    s.rot += s.vr * step;
    s.alpha -= 0.018 * step;
  }
  m.scraps = m.scraps.filter((s) => s.alpha > 0 && s.y < WORLD_H + 240);

  if (m.flash > 0) m.flash = Math.max(0, m.flash - 0.05 * step);
  if (m.perfectFlash > 0) m.perfectFlash = Math.max(0, m.perfectFlash - 0.04 * step);
}

function finPartida(m: Mundo): void {
  m.fase = 'over';
  m.actual = null;
  if (m.modo === 'diario') {
    if (m.score > m.bestDiario) {
      m.bestDiario = m.score;
      guardarBestDiario(m.diaClave, m.bestDiario);
    }
  }
  if (m.score > m.best) {
    m.best = m.score;
    guardarBest(m.best);
  }
}

export function soltar(m: Mundo, now = performance.now()): ResultadoSoltar {
  const fail: ResultadoSoltar = { ok: false, miss: false, perfect: false, puntos: 0, combo: m.combo };
  if (m.fase !== 'playing' || !m.actual) return fail;
  if (now - m.lastDropAt < 160) return fail;
  m.lastDropAt = now;

  const cur = m.actual;
  const prev = m.torre[m.torre.length - 1]!;
  const left = Math.max(cur.x, prev.x);
  const right = Math.min(cur.x + cur.w, prev.x + prev.w);
  const overlap = right - left;

  if (overlap <= 2) {
    m.scraps.push({
      x: cur.x,
      y: cur.y,
      w: cur.w,
      h: cur.h,
      color: cur.color,
      vy: 1.5,
      vr: (m.rng() - 0.5) * 0.12,
      rot: 0,
      alpha: 1,
    });
    m.combo = 0;
    finPartida(m);
    return { ok: true, miss: true, perfect: false, puntos: 0, combo: 0 };
  }

  const perfect = Math.abs(overlap - prev.w) < 3 && Math.abs(cur.x - prev.x) < 3;
  let puntos = 1;

  if (perfect) {
    m.perfectFlash = 1;
    cur.x = prev.x;
    cur.w = prev.w;
    m.combo += 1;
    m.perfectosPartida += 1;
    m.maxCombo = Math.max(m.maxCombo, m.combo);
    // bonus: +1 por cada perfect en racha (máx +3)
    const bonus = Math.min(3, m.combo);
    puntos = 1 + bonus;
  } else {
    m.combo = 0;
    if (cur.x < left) {
      m.scraps.push({
        x: cur.x,
        y: cur.y,
        w: left - cur.x,
        h: cur.h,
        color: cur.color,
        vy: 1.2,
        vr: -0.08,
        rot: 0,
        alpha: 1,
      });
    }
    if (cur.x + cur.w > right) {
      m.scraps.push({
        x: right,
        y: cur.y,
        w: cur.x + cur.w - right,
        h: cur.h,
        color: cur.color,
        vy: 1.2,
        vr: 0.08,
        rot: 0,
        alpha: 1,
      });
    }
    cur.x = left;
    cur.w = overlap;
  }

  m.torre.push({
    x: cur.x,
    y: cur.y,
    w: cur.w,
    h: cur.h,
    color: cur.color,
  });
  m.score += puntos;
  m.flash = 0.7;
  spawnActual(m);
  return { ok: true, miss: false, perfect, puntos, combo: m.combo };
}

export function mensajeOver(score: number, best: number): string {
  if (score === 0) return '¡Casi! Intenta otra vez.';
  if (score >= best && score >= 10) return '¡Nuevo récord!';
  if (score >= 15) return 'Torre impresionante.';
  return 'Buena racha. ¿Puedes más?';
}

export function etiquetaDificultad(d: Dificultad): string {
  if (d === 'facil') return 'Fácil';
  if (d === 'dificil') return 'Difícil';
  return 'Normal';
}
