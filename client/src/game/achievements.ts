/** Logros locales. */

export const ACH_KEY = 'blockrush_achievements_v1';

export interface Achievement {
  id: string;
  titulo: string;
  desc: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'primero', titulo: 'Primer piso', desc: 'Consigue al menos 1 punto' },
  { id: 'diez', titulo: 'Torre de 10', desc: 'Llega a 10 puntos en una partida' },
  { id: 'veinte', titulo: 'Arquitecto', desc: 'Llega a 20 puntos' },
  { id: 'combo3', titulo: 'Racha x3', desc: 'Haz 3 perfectos seguidos' },
  { id: 'combo5', titulo: 'Impecable', desc: 'Haz 5 perfectos seguidos' },
  { id: 'diario', titulo: 'Del día', desc: 'Juega el desafío diario' },
  { id: 'dificil', titulo: 'Valiente', desc: 'Juega en dificultad Difícil' },
  { id: 'piel_madera', titulo: 'Carpintero', desc: 'Desbloquea la skin Madera' },
  { id: 'piel_hielo', titulo: 'Glaciar', desc: 'Desbloquea la skin Hielo' },
];

export function leerLogros(): Set<string> {
  try {
    const raw = localStorage.getItem(ACH_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function guardarLogros(set: Set<string>): void {
  try {
    localStorage.setItem(ACH_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

export interface ContextoLogro {
  score: number;
  best: number;
  maxCombo: number;
  modoDiario: boolean;
  dificil: boolean;
}

/** Devuelve ids recién desbloqueados. */
export function evaluarLogros(ctx: ContextoLogro): string[] {
  const have = leerLogros();
  const nuevos: string[] = [];
  const tryAdd = (id: string, ok: boolean) => {
    if (ok && !have.has(id)) {
      have.add(id);
      nuevos.push(id);
    }
  };

  tryAdd('primero', ctx.score >= 1);
  tryAdd('diez', ctx.score >= 10);
  tryAdd('veinte', ctx.score >= 20);
  tryAdd('combo3', ctx.maxCombo >= 3);
  tryAdd('combo5', ctx.maxCombo >= 5);
  tryAdd('diario', ctx.modoDiario);
  tryAdd('dificil', ctx.dificil);
  tryAdd('piel_madera', ctx.best >= 15);
  tryAdd('piel_hielo', ctx.best >= 30);

  if (nuevos.length) guardarLogros(have);
  return nuevos;
}

export function tituloLogro(id: string): string {
  return ACHIEVEMENTS.find((a) => a.id === id)?.titulo ?? id;
}
