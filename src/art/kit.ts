// Shared drawing helpers for the cute sticker-style characters.
export type Ctx = CanvasRenderingContext2D;

export interface Pose {
  t: number; // global time (s)
  walk: number; // walk phase (s)
  state: 'walk' | 'idle' | 'attack' | 'kb' | 'dead' | 'burrow' | 'portrait';
  atk: number; // attack progress 0..1 (0 windup -> 1 end)
  hurt: boolean;
  frozen?: boolean;
}

export const OUT = '#3b2412';

export function blob(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, bumps = 0.06, seed = 1) {
  ctx.beginPath();
  const n = 28;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const w = 1 + bumps * Math.sin(a * 3 + seed) + bumps * 0.6 * Math.sin(a * 5 + seed * 2);
    const x = cx + Math.cos(a) * rx * w;
    const y = cy + Math.sin(a) * ry * w;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export function fillStroke(ctx: Ctx, fill: string | CanvasGradient, lw = 3, stroke = OUT) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

export function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
}

/** Big shiny cartoon eye. look = horizontal pupil offset (-1..1). */
export function eye(ctx: Ctx, x: number, y: number, r: number, opts: { look?: number; closed?: boolean; angry?: boolean; sad?: boolean; color?: string } = {}) {
  if (opts.closed) {
    ctx.beginPath();
    ctx.lineWidth = Math.max(2, r * 0.45);
    ctx.lineCap = 'round';
    ctx.strokeStyle = OUT;
    ctx.arc(x, y - r * 0.2, r * 0.8, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    return;
  }
  ellipse(ctx, x, y, r, r * 1.15);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, r * 0.25);
  ctx.strokeStyle = OUT;
  ctx.stroke();
  const lk = (opts.look ?? 0.3) * r * 0.35;
  ellipse(ctx, x + lk, y + r * 0.1, r * 0.62, r * 0.75);
  ctx.fillStyle = opts.color ?? '#2a1a0e';
  ctx.fill();
  ellipse(ctx, x + lk - r * 0.22, y - r * 0.2, r * 0.24, r * 0.26);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ellipse(ctx, x + lk + r * 0.2, y + r * 0.3, r * 0.1, r * 0.1);
  ctx.fill();
  if (opts.angry || opts.sad) {
    ctx.beginPath();
    ctx.lineWidth = Math.max(2, r * 0.4);
    ctx.lineCap = 'round';
    ctx.strokeStyle = OUT;
    const s = opts.angry ? 1 : -1;
    ctx.moveTo(x - r * 1.0, y - r * 1.2 - s * r * 0.35);
    ctx.lineTo(x + r * 0.9, y - r * 1.2 + s * r * 0.35);
    ctx.stroke();
  }
}

export function blush(ctx: Ctx, x: number, y: number, r: number, color = 'rgba(255,110,120,0.55)') {
  ellipse(ctx, x, y, r, r * 0.6);
  ctx.fillStyle = color;
  ctx.fill();
}

export function mouth(ctx: Ctx, x: number, y: number, w: number, kind: 'smile' | 'open' | 'o' | 'grr' | 'flat' | 'cat' | 'sad' = 'smile') {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(2, w * 0.18);
  ctx.beginPath();
  switch (kind) {
    case 'smile':
      ctx.arc(x, y - w * 0.3, w * 0.5, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
      break;
    case 'open':
      ctx.moveTo(x - w * 0.5, y - w * 0.1);
      ctx.quadraticCurveTo(x, y + w * 0.9, x + w * 0.5, y - w * 0.1);
      ctx.closePath();
      ctx.fillStyle = '#c0392b';
      ctx.fill();
      ctx.stroke();
      ellipse(ctx, x, y + w * 0.28, w * 0.2, w * 0.12);
      ctx.fillStyle = '#ff8a8a';
      ctx.fill();
      break;
    case 'o':
      ellipse(ctx, x, y, w * 0.22, w * 0.3);
      ctx.fillStyle = '#7a2a1a';
      ctx.fill();
      ctx.stroke();
      break;
    case 'grr':
      ctx.moveTo(x - w * 0.5, y);
      ctx.lineTo(x - w * 0.25, y - w * 0.15);
      ctx.lineTo(x, y);
      ctx.lineTo(x + w * 0.25, y - w * 0.15);
      ctx.lineTo(x + w * 0.5, y);
      ctx.stroke();
      break;
    case 'flat':
      ctx.moveTo(x - w * 0.4, y);
      ctx.lineTo(x + w * 0.4, y);
      ctx.stroke();
      break;
    case 'cat':
      ctx.arc(x - w * 0.22, y - w * 0.1, w * 0.22, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.moveTo(x + w * 0.44, y - w * 0.1);
      ctx.arc(x + w * 0.22, y - w * 0.1, w * 0.22, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
      break;
    case 'sad':
      ctx.arc(x, y + w * 0.3, w * 0.4, 1.2 * Math.PI, 1.8 * Math.PI);
      ctx.stroke();
      break;
  }
}

/** Little stubby feet that alternate while walking. */
export function feet(ctx: Ctx, x: number, y: number, spread: number, r: number, phase: number, moving: boolean, color = '#7a4a22') {
  const a = moving ? Math.sin(phase) : 0;
  for (const s of [-1, 1]) {
    const lift = moving ? Math.max(0, Math.sin(phase + (s > 0 ? 0 : Math.PI))) * r * 0.9 : 0;
    ellipse(ctx, x + s * spread + a * s * r * 0.4, y - lift, r * 1.15, r * 0.7);
    fillStroke(ctx, color, Math.max(1.5, r * 0.35));
  }
}

export function arm(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, w: number, color: string) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = w + 3;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.stroke();
}

export function star(ctx: Ctx, x: number, y: number, r: number, points = 5, inner = 0.5) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * inner;
    const px = x + Math.cos(a) * rr,
      py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export function radial(ctx: Ctx, x: number, y: number, r: number, c1: string, c2: string) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.1);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  return g;
}

/** Standard body bounce. Returns {bob, squash, lean}. */
export function motion(p: Pose, speed = 10) {
  const moving = p.state === 'walk' || p.state === 'burrow';
  const bob = moving ? Math.abs(Math.sin(p.walk * speed)) * 4 : Math.sin(p.t * 3) * 1.2;
  let squash = moving ? 1 + Math.sin(p.walk * speed * 2) * 0.04 : 1 + Math.sin(p.t * 3) * 0.02;
  let lean = 0;
  if (p.state === 'attack') {
    // windup leans back, strike lunges forward
    const a = p.atk;
    lean = a < 0.5 ? -a * 0.25 : (1 - a) * 0.45;
    squash = a < 0.5 ? 1 - a * 0.12 : 1 + (1 - a) * 0.1;
  }
  return { bob, squash, lean, moving };
}
