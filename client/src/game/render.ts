import type { Bloque, Mundo } from './engine';
import { WORLD_H, WORLD_W } from './engine';

function shade(hex: string, amt: number): string {
  const n = hex.replace('#', '');
  const num = parseInt(n.length === 3 ? n.split('').map((c) => c + c).join('') : n, 16);
  let r = (num >> 16) + amt;
  let g = ((num >> 8) & 0xff) + amt;
  let b = (num & 0xff) + amt;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `rgb(${r},${g},${b})`;
}

function sx(x: number, w: number) {
  return (x / WORLD_W) * w;
}
function sy(y: number, h: number) {
  return (y / WORLD_H) * h;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawBlock(
  ctx: CanvasRenderingContext2D,
  b: Bloque,
  cam: number,
  cssW: number,
  cssH: number,
  opts: { alpha?: number; rot?: number } = {},
) {
  const x = sx(b.x, cssW);
  const y = sy(b.y - cam, cssH);
  const w = sx(b.w, cssW);
  const h = sy(b.h, cssH);
  const alpha = opts.alpha ?? 1;
  const rot = opts.rot ?? 0;

  ctx.save();
  ctx.globalAlpha = alpha;
  if (rot) {
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(rot);
    ctx.translate(-(x + w / 2), -(y + h / 2));
  }

  const r = Math.min(6, h * 0.25);
  roundRect(ctx, x, y, w, h, r);
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, shade(b.color, 28));
  grad.addColorStop(0.45, b.color);
  grad.addColorStop(1, shade(b.color, -22));
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  roundRect(ctx, x + 2, y + 2, Math.max(0, w - 4), Math.max(3, h * 0.28), r * 0.6);
  ctx.fill();

  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, r);
  ctx.stroke();
  ctx.restore();
}

export function pintarMundo(
  ctx: CanvasRenderingContext2D,
  m: Mundo,
  cssW: number,
  cssH: number,
) {
  const g = ctx.createLinearGradient(0, 0, 0, cssH);
  g.addColorStop(0, '#152238');
  g.addColorStop(1, '#0a101c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, cssW, cssH);

  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const y = sy(i * 80 - (m.cameraY % 80), cssH);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(cssW, y);
    ctx.stroke();
  }

  const base = m.torre[0];
  if (base) {
    const pad = 18;
    const x = sx(base.x - pad, cssW);
    const y = sy(base.y + base.h - m.cameraY, cssH);
    const w = sx(base.w + pad * 2, cssW);
    const h = sy(18, cssH);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    roundRect(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.fillStyle = 'rgba(61,255,168,0.35)';
    roundRect(ctx, x + 8, y + 4, Math.max(0, w - 16), 4, 2);
    ctx.fill();
  }

  for (const b of m.torre) {
    const y = sy(b.y - m.cameraY, cssH);
    if (y > cssH + 40 || y + sy(b.h, cssH) < -40) continue;
    drawBlock(ctx, b, m.cameraY, cssW, cssH);
  }

  for (const s of m.scraps) {
    drawBlock(ctx, s, m.cameraY, cssW, cssH, { alpha: Math.max(0, s.alpha), rot: s.rot });
  }

  if (m.actual && (m.fase === 'playing' || m.fase === 'paused')) {
    drawBlock(ctx, m.actual, m.cameraY, cssW, cssH);
    const prev = m.torre[m.torre.length - 1];
    if (prev) {
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(sx(prev.x, cssW), sy(prev.y - m.cameraY, cssH) - 2, sx(prev.w, cssW), 2);
    }
  }

  if (m.fase === 'paused') {
    ctx.fillStyle = 'rgba(8, 14, 26, 0.45)';
    ctx.fillRect(0, 0, cssW, cssH);
  }

  if (m.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${m.flash * 0.12})`;
    ctx.fillRect(0, 0, cssW, cssH);
  }
  if (m.perfectFlash > 0) {
    ctx.strokeStyle = `rgba(61,255,168,${m.perfectFlash})`;
    ctx.lineWidth = 3;
    ctx.strokeRect(8, 8, cssW - 16, cssH - 16);
  }
}
