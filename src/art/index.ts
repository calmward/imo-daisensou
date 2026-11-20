import { ALLY_ART } from './allies';
import { ENEMY_ART } from './enemies';
import type { Ctx, Pose } from './kit';

export function hasArt(id: string) {
  return !!(ALLY_ART[id] || ENEMY_ART[id]);
}

/** Draw a character with feet at (x,y). side 1 = enemy (mirrored to face left). */
export function drawChar(ctx: Ctx, id: string, x: number, y: number, scale: number, pose: Pose, side: 0 | 1 = 0) {
  const fn = ALLY_ART[id] ?? ENEMY_ART[id];
  if (!fn) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(side === 1 ? -scale : scale, scale);
  fn(ctx, pose);
  ctx.restore();
}

const TALL: Record<string, number> = { naga: 1.25, king: 1.2, daigaku: 1.25, murasaki: 1.2, fry: 1.1, kenpi: 0.95, okarasu: 1.1, daiou: 1.25, hebi: 0.9, kuma: 1.1 };

/** Idle portrait centred in a box of the given size. */
export function portrait(ctx: Ctx, id: string, cx: number, cy: number, size: number, t: number, side: 0 | 1 = 0, state: Pose['state'] = 'idle') {
  const tall = TALL[id] ?? 1;
  const sc = size / 78 / tall;
  drawChar(ctx, id, cx, cy + size * 0.42, sc, { t, walk: t, state, atk: 0, hurt: false }, side);
}
