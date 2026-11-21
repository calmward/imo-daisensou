import { ALLY_ART } from './allies';
import { ENEMY_ART } from './enemies';
import { faceMode, resetEyes, star, type Ctx, type Pose } from './kit';

export function hasArt(id: string) {
  return !!(ALLY_ART[id] || ENEMY_ART[id]);
}

/** Draw a character with feet at (x,y). side 1 = enemy (mirrored to face left). */
export function drawChar(ctx: Ctx, id: string, x: number, y: number, scale: number, pose: Pose, side: 0 | 1 = 0, evo: boolean | number = 0) {
  const lvl = evo === true ? 1 : evo === false ? 0 : evo;
  const fn = ALLY_ART[id] ?? ENEMY_ART[id];
  if (!fn) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(side === 1 ? -scale : scale, scale);
  if (lvl) evoAura(ctx, pose.t, TALL[id] ?? 1, lvl);
  // squash & stretch: wind up (pull back), then lunge forward on the hit
  if (pose.state === 'attack') {
    const a = pose.atk;
    if (a < 0.5) {
      const k = a / 0.5;
      ctx.translate(-5 * k, 0);
      ctx.scale(1 - 0.12 * k, 1 + 0.1 * k);
    } else if (a < 0.8) {
      const k = 1 - (a - 0.5) / 0.3;
      ctx.translate(12 * k, 0);
      ctx.scale(1 + 0.2 * k, 1 - 0.12 * k);
    }
  }
  faceMode.mode = pose.state === 'dead' ? 'dead' : pose.state === 'kb' ? 'kb' : '';
  resetEyes();
  fn(ctx, pose);
  faceMode.mode = '';
  if (pose.state === 'kb' || pose.state === 'dead') sweat(ctx, pose.t, TALL[id] ?? 1);
  if (lvl) evoSparkles(ctx, pose.t, TALL[id] ?? 1);
  ctx.restore();
}

function sweat(ctx: Ctx, t: number, tall: number) {
  const h = 64 * tall;
  ctx.fillStyle = '#9be8ff';
  ctx.strokeStyle = '#3b6a9a';
  ctx.lineWidth = 1.5;
  for (const [dx, dy, ph] of [[-h * 0.45, -h * 0.85, 0], [h * 0.42, -h * 0.95, 1.7]]) {
    const yy = dy + ((t * 30 + ph * 10) % 8);
    ctx.beginPath();
    ctx.moveTo(dx, yy - 7);
    ctx.quadraticCurveTo(dx + 5, yy, dx, yy + 3);
    ctx.quadraticCurveTo(dx - 5, yy, dx, yy - 7);
    ctx.fill();
    ctx.stroke();
  }
}

/** Golden glow behind evolved ("スーパー") potatoes. */
function evoAura(ctx: Ctx, t: number, tall: number, lvl = 1) {
  const h = 70 * tall;
  const g = ctx.createRadialGradient(0, -h * 0.45, 4, 0, -h * 0.45, h * 0.75);
  if (lvl >= 2) {
    // ハイパー: shifting rainbow glow
    const hue = (t * 120) % 360;
    g.addColorStop(0, `hsla(${hue},100%,75%,0.6)`);
    g.addColorStop(0.6, `hsla(${(hue + 120) % 360},100%,70%,0.3)`);
    g.addColorStop(1, `hsla(${(hue + 240) % 360},100%,70%,0)`);
  } else {
    g.addColorStop(0, 'rgba(255,240,120,0.55)');
    g.addColorStop(1, 'rgba(255,200,40,0)');
  }
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
export function portrait(ctx: Ctx, id: string, cx: number, cy: number, size: number, t: number, side: 0 | 1 = 0, state: Pose['state'] = 'idle', evo: boolean | number = 0) {
  const tall = TALL[id] ?? 1;
  const sc = size / 78 / tall;
  drawChar(ctx, id, cx, cy + size * 0.42, sc, { t, walk: t, state, atk: 0, hurt: false }, side, evo);
}

let scratch: HTMLCanvasElement | null = null;
/**
 * Draw something tinted (hit flash / freeze / silhouette) without ctx.filter, which is very slow on phones.
 * `draw` paints around the origin; box = half-size of the area (in current ctx units) that may contain it.
 */
export function drawTinted(ctx: Ctx, box: number, color: string, amount: number, draw: (c: Ctx) => void) {
  const m = ctx.getTransform();
  const px = Math.max(0.5, Math.hypot(m.a, m.b));
  const size = Math.min(1024, Math.ceil(box * 2 * px));
  if (!scratch) scratch = document.createElement('canvas');
  if (scratch.width < size || scratch.height < size) {
    scratch.width = Math.max(scratch.width, size);
    scratch.height = Math.max(scratch.height, size);
  }
  const c = scratch.getContext('2d')!;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = 1;
  c.clearRect(0, 0, size, size);
  c.setTransform(px, 0, 0, px, size / 2, size / 2);
  draw(c);
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = 'source-atop';
  c.globalAlpha = amount;
  c.fillStyle = color;
  c.fillRect(0, 0, size, size);
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = 1;
  ctx.drawImage(scratch, 0, 0, size, size, -size / 2 / px, -size / 2 / px, size / px, size / px);
}

/** Dark "who's that?" silhouette of a character portrait. */
export function silhouette(ctx: Ctx, id: string, cx: number, cy: number, size: number, side: 0 | 1 = 0, color = '#000', alpha = 1) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.globalAlpha *= alpha;
  drawTinted(ctx, size * 0.75, color, 1, (c) => portrait(c, id, 0, 0, size, 0, side));
  ctx.restore();
}
