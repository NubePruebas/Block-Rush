/** Tabla de récords local (este navegador). */

export const RECORDS_KEY = 'blockrush_records_v1';
export const NAME_KEY = 'blockrush_last_name';
export const MAX_RECORDS = 10;

export interface RecordEntry {
  nombre: string;
  score: number;
  fecha: number;
}

export function leerRecords(): RecordEntry[] {
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as RecordEntry[];
    if (!Array.isArray(data)) return [];
    return data
      .filter((r) => r && typeof r.score === 'number' && typeof r.nombre === 'string')
      .sort((a, b) => b.score - a.score || a.fecha - b.fecha)
      .slice(0, MAX_RECORDS);
  } catch {
    return [];
  }
}

export function guardarRecords(lista: RecordEntry[]): void {
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(lista.slice(0, MAX_RECORDS)));
  } catch {
    /* ignore */
  }
}

export function leerNombreGuardado(): string {
  try {
    return localStorage.getItem(NAME_KEY) || '';
  } catch {
    return '';
  }
}

export function guardarNombre(nombre: string): void {
  try {
    localStorage.setItem(NAME_KEY, nombre.trim().slice(0, 12));
  } catch {
    /* ignore */
  }
}

/** ¿Entra en el top 10? (score > 0) */
export function calificaParaTabla(score: number, lista = leerRecords()): boolean {
  if (score <= 0) return false;
  if (lista.length < MAX_RECORDS) return true;
  const peor = lista[lista.length - 1]?.score ?? 0;
  return score > peor;
}

export function agregarRecord(nombre: string, score: number): RecordEntry[] {
  const limpio = nombre.trim().slice(0, 12) || 'Jugador';
  guardarNombre(limpio);
  const lista = leerRecords();
  lista.push({ nombre: limpio, score, fecha: Date.now() });
  lista.sort((a, b) => b.score - a.score || a.fecha - b.fecha);
  const top = lista.slice(0, MAX_RECORDS);
  guardarRecords(top);
  return top;
}

export function formatearFecha(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return '';
  }
}
