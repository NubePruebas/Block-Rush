import type { Dificultad, ModoJuego } from './engine';

export interface RankingEntry {
  nombre: string;
  score: number;
  dificultad: Dificultad;
  modo: ModoJuego;
  fecha: number;
}

export async function fetchRanking(): Promise<RankingEntry[]> {
  try {
    const r = await fetch('/api/ranking');
    if (!r.ok) return [];
    const data = (await r.json()) as { ranking?: RankingEntry[] };
    return Array.isArray(data.ranking) ? data.ranking : [];
  } catch {
    return [];
  }
}

export async function postRanking(entry: {
  nombre: string;
  score: number;
  dificultad: Dificultad;
  modo: ModoJuego;
}): Promise<RankingEntry[]> {
  try {
    const r = await fetch('/api/ranking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    if (!r.ok) return [];
    const data = (await r.json()) as { ranking?: RankingEntry[] };
    return Array.isArray(data.ranking) ? data.ranking : [];
  } catch {
    return [];
  }
}

export async function trackEvent(evento: string, meta?: Record<string, string | number>): Promise<void> {
  try {
    await fetch('/api/stats/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evento, meta, en: Date.now() }),
    });
  } catch {
    /* ignore */
  }
}

export async function compartirScore(texto: string): Promise<'copied' | 'shared' | 'failed'> {
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Block Rush', text: texto });
      return 'shared';
    }
  } catch {
    /* fallthrough */
  }
  try {
    await navigator.clipboard.writeText(texto);
    return 'copied';
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = texto;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return 'copied';
    } catch {
      return 'failed';
    }
  }
}
