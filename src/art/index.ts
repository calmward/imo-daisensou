import { ALLY_ART } from './allies';
import { ENEMY_ART } from './enemies';
import { star, type Ctx, type Pose } from './kit';

export function hasArt(id: string) {
  return !!(ALLY_ART[id] || ENEMY_ART[id]);
}

/** Draw a character with feet at (x,y). side 1 = enemy (mirrored to face left). */
export function drawChar(ctx: Ctx, id: string, x: number, y: number, scale: number, pose: Pose, side: 0 | 1 = 0, evo = false) {
  const fn = ALLY_ART[id] ?? ENEMY_ART[id];
  if (!fn) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(side === 1 ? -scale : scale, scale);
  if (evo) evoAura(ctx, pose.t, TALL[id] ?? 1);
  fn(ctx, pose);
  if (evo) evoSparkles(ctx, pose.t, TALL[id] ?? 1);
  ctx.restore();
}

/** Golden glow behind evolved ("スーパー") potatoes. */
function evoAura(ctx: Ctx, t: number, tall: number) {
  const h = 70 * tall;
  const g = ctx.createRadialGradient(0, -h * 0.45, 4, 0, -h * 0.45, h * 0.75);
  g.addColorStop(0, 'rgba(255,240,120,0.55)');
  g.addColorStop(1, 'rgba(255,200,40,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.45, h * 0.62 + Math.sin(t * 4) * 3, h * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();
}

function evoSparkles(ctx: Ctx, t: number, tall: number) {
  const h = 70 * tall;
  // little golden crown-star badge
  ctx.save();
  ctx.translate(-h * 0.3, -h * 0.95 - Math.sin(t * 3) * 2);
  star(ctx, 0, 0, 8, 5, 0.45);
  ctx.fillStyle = '#ffe14d';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#a36a00';
  ctx.stroke();
  ctx.restore();
  for (let i = 0; i < 3; i++) {
    const a = t * 2 + i * 2.1;
    const k = (t * 0.8 + i / 3) % 1;
    ctx.globalAlpha = 1 - k;
    star(ctx, Math.cos(a) * h * 0.45, -h * 0.2 - k * h * 0.7, 4, 4, 0.4);
    ctx.fillStyle = '#fff6a0';
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

const TALL: Record<string, number> = { naga: 1.25, king: 1.2, daigaku: 1.25, murasaki: 1.2, fry: 1.1, kenpi: 0.95, okarasu: 1.1, daiou: 1.25, hebi: 0.9, kuma: 1.1 };

/** Idle portrait centred in a box of the given size. */
export function portrait(ctx: Ctx, id: string, cx: number, cy: number, size: number, t: number, side: 0 | 1 = 0, state: Pose['state'] = 'idle', evo = false) {
  const tall = TALL[id] ?? 1;
  const sc = size / 78 / tall;
  drawChar(ctx, id, cx, cy + size * 0.42, sc, { t, walk: t, state, atk: 0, hurt: false }, side, evo);
}
