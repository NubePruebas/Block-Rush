import type { SkinId } from './engine';
import { leerBest } from './engine';

export interface SkinInfo {
  id: SkinId;
  nombre: string;
  desbloqueo: number;
  desc: string;
}

export const SKINS: SkinInfo[] = [
  { id: 'neon', nombre: 'Neón', desbloqueo: 0, desc: 'Estilo arcade por defecto' },
  { id: 'madera', nombre: 'Madera', desbloqueo: 15, desc: 'Best score ≥ 15' },
  { id: 'hielo', nombre: 'Hielo', desbloqueo: 30, desc: 'Best score ≥ 30' },
];

export function skinDesbloqueada(id: SkinId, best = leerBest()): boolean {
  const info = SKINS.find((s) => s.id === id);
  if (!info) return false;
  return best >= info.desbloqueo;
}

export function skinsDisponibles(best = leerBest()): SkinInfo[] {
  return SKINS.filter((s) => best >= s.desbloqueo);
}
