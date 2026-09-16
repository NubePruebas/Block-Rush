export function vibrar(ms: number | number[]): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(ms);
    }
  } catch {
    /* ignore */
  }
}

export function vibPerfect(): void {
  vibrar(18);
}

export function vibMiss(): void {
  vibrar([40, 30, 60]);
}

export function vibDrop(): void {
  vibrar(10);
}
