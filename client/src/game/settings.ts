import type { Dificultad, SkinId } from './engine';
import { setSonidoActivo } from './audio';

const KEY = 'blockrush_settings_v1';

export interface Settings {
  dificultad: Dificultad;
  skin: SkinId;
  sonido: boolean;
  vibracion: boolean;
  anuncios: boolean;
}

const DEFAULTS: Settings = {
  dificultad: 'normal',
  skin: 'neon',
  sonido: true,
  vibracion: true,
  anuncios: true,
};

export function leerSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const data = JSON.parse(raw) as Partial<Settings>;
    const s: Settings = { ...DEFAULTS, ...data };
    setSonidoActivo(s.sonido);
    return s;
  } catch {
    return { ...DEFAULTS };
  }
}

export function guardarSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    setSonidoActivo(s.sonido);
  } catch {
    /* ignore */
  }
}
