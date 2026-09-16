import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(__dirname, '..', 'data');
const RANKING_FILE = path.join(DATA_DIR, 'ranking.json');
const STATS_FILE = path.join(DATA_DIR, 'stats.json');

export type Dificultad = 'facil' | 'normal' | 'dificil';
export type ModoJuego = 'clasico' | 'diario';

export interface RankingEntry {
  nombre: string;
  score: number;
  dificultad: Dificultad;
  modo: ModoJuego;
  fecha: number;
}

export interface Stats {
  partidas: number;
  eventos: Record<string, number>;
  ultimaVisita: number;
}

const MAX = 50;
const DIFFS: Dificultad[] = ['facil', 'normal', 'dificil'];
const MODOS: ModoJuego[] = ['clasico', 'diario'];

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function cargarRanking(): RankingEntry[] {
  try {
    ensureDir();
    if (!fs.existsSync(RANKING_FILE)) return [];
    const raw = JSON.parse(fs.readFileSync(RANKING_FILE, 'utf8')) as RankingEntry[];
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(
        (e) =>
          e &&
          typeof e.nombre === 'string' &&
          typeof e.score === 'number' &&
          DIFFS.includes(e.dificultad) &&
          MODOS.includes(e.modo),
      )
      .sort((a, b) => b.score - a.score || a.fecha - b.fecha)
      .slice(0, MAX);
  } catch {
    return [];
  }
}

export function guardarRanking(lista: RankingEntry[]): void {
  ensureDir();
  fs.writeFileSync(RANKING_FILE, JSON.stringify(lista.slice(0, MAX), null, 2), 'utf8');
}

export function limpiarNombre(n: unknown): string {
  if (typeof n !== 'string') return 'Jugador';
  return n.replace(/[^\wáéíóúÁÉÍÓÚñÑüÜ\s.-]/gi, '').trim().slice(0, 12) || 'Jugador';
}

export function validarScore(score: unknown): number | null {
  if (typeof score !== 'number' || !Number.isFinite(score)) return null;
  const n = Math.floor(score);
  if (n < 1 || n > 500) return null;
  return n;
}

export function agregarAlRanking(entry: RankingEntry): RankingEntry[] {
  const lista = cargarRanking();
  lista.push(entry);
  lista.sort((a, b) => b.score - a.score || a.fecha - b.fecha);
  const top = lista.slice(0, MAX);
  guardarRanking(top);
  return top;
}

export function cargarStats(): Stats {
  try {
    ensureDir();
    if (!fs.existsSync(STATS_FILE)) {
      return { partidas: 0, eventos: {}, ultimaVisita: 0 };
    }
    return JSON.parse(fs.readFileSync(STATS_FILE, 'utf8')) as Stats;
  } catch {
    return { partidas: 0, eventos: {}, ultimaVisita: 0 };
  }
}

export function registrarEvento(evento: string): Stats {
  const s = cargarStats();
  s.eventos[evento] = (s.eventos[evento] || 0) + 1;
  if (evento === 'partida_inicio' || evento === 'partida_fin') {
    if (evento === 'partida_fin') s.partidas += 1;
  }
  s.ultimaVisita = Date.now();
  ensureDir();
  fs.writeFileSync(STATS_FILE, JSON.stringify(s, null, 2), 'utf8');
  return s;
}

/** Rate limit muy simple por IP. */
const hits = new Map<string, { n: number; t: number }>();

export function rateOk(ip: string, max = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const cur = hits.get(ip);
  if (!cur || now - cur.t > windowMs) {
    hits.set(ip, { n: 1, t: now });
    return true;
  }
  if (cur.n >= max) return false;
  cur.n += 1;
  return true;
}
