// Immediate-mode UI helpers drawn on the canvas.

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const FONT = '"Hiragino Maru Gothic ProN","Rounded Mplus 1c","M PLUS Rounded 1c","Noto Sans JP","Noto Sans CJK JP",sans-serif';

export function font(size: number, weight = 900): string {
  return `${weight} ${Math.round(size)}px ${FONT}`;
}

export function inRect(r: Rect, x: number, y: number): boolean {
  return x >= r.x && y >= r.y && x <= r.x + r.w && y <= r.y + r.h;
}

export function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Outlined text — readable on any background, kid-friendly look. */
export function text(
  ctx: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  size: number,
  opts: { color?: string; stroke?: string; align?: CanvasTextAlign; base?: CanvasTextBaseline; maxW?: number; lw?: number; weight?: number } = {},
) {
  ctx.font = font(size, opts.weight ?? 900);
  ctx.textAlign = opts.align ?? 'center';
  ctx.textBaseline = opts.base ?? 'middle';
  let sx = 1;
  if (opts.maxW) {
    const m = ctx.measureText(s).width;
    if (m > opts.maxW) sx = opts.maxW / m;
  }
  ctx.save();
  ctx.translate(x, y);
  if (sx !== 1) ctx.scale(sx, 1);
  if (opts.stroke !== 'none') {
    ctx.lineJoin = 'round';
    ctx.lineWidth = opts.lw ?? Math.max(2, size * 0.22);
    ctx.strokeStyle = opts.stroke ?? '#3b2412';
    ctx.strokeText(s, 0, 0);
  }
  ctx.fillStyle = opts.color ?? '#fff';
  ctx.fillText(s, 0, 0);
  ctx.restore();
}

export interface Region {
  id: string;
  r: Rect;
  onTap?: () => void;
  onDown?: () => void;
  sound?: boolean;
}

/** Collects tappable regions each frame. */
export class UI {
  regions: Region[] = [];
  private building: Region[] = [];
  pressedId: string | null = null;
  pointerX = -1;
  pointerY = -1;
  blocked = false; // modal overlays set this so lower layers ignore taps

  begin() {
    this.building = [];
  }
  end() {
    this.regions = this.building;
  }
  add(reg: Region) {
    this.building.push(reg);
  }
  /** Top-most region at point. */
  hit(x: number, y: number): Region | null {
    for (let i = this.regions.length - 1; i >= 0; i--) {
      if (inRect(this.regions[i].r, x, y)) return this.regions[i];
    }
    return null;
  }
  isPressed(id: string) {
    return this.pressedId === id;
  }
}

export type BtnStyle = { fill: string; fill2?: string; edge?: string; text?: string; disabled?: boolean };

export const STYLES: Record<string, BtnStyle> = {
  orange: { fill: '#ffb340', fill2: '#ff8a1f', edge: '#a34e00' },
  green: { fill: '#8fe36b', fill2: '#4cbf3a', edge: '#2a7a1e' },
  blue: { fill: '#7cc8ff', fill2: '#3d97f0', edge: '#1d5aa3' },
  pink: { fill: '#ff9ccf', fill2: '#ff5fa8', edge: '#a3205f' },
  purple: { fill: '#c49bff', fill2: '#9160f0', edge: '#4f2a9a' },
  gray: { fill: '#d6d0c8', fill2: '#b1a99e', edge: '#6b6158' },
  red: { fill: '#ff8b7a', fill2: '#f0503a', edge: '#9a2414' },
  cream: { fill: '#fff6dd', fill2: '#ffe6a8', edge: '#a37a2b', text: '#5a3a12' },
};

/** Draws a chunky "candy" button. pressed shifts it down. */
export function drawButton(ctx: CanvasRenderingContext2D, r: Rect, style: BtnStyle, pressed: boolean, radius?: number) {
  const rad = radius ?? Math.min(r.h * 0.3, 18);
  const depth = Math.max(3, Math.min(7, r.h * 0.08));
  const off = pressed ? depth * 0.7 : 0;
  const dis = style.disabled;
  // shadow / base
  ctx.fillStyle = dis ? '#7d7670' : style.edge ?? '#333';
  rr(ctx, r.x, r.y + depth, r.w, r.h - depth, rad);
  ctx.fill();
  const g = ctx.createLinearGradient(0, r.y + off, 0, r.y + off + r.h - depth);
  g.addColorStop(0, dis ? '#cfcac4' : style.fill);
  g.addColorStop(1, dis ? '#aaa39c' : style.fill2 ?? style.fill);
  ctx.fillStyle = g;
  rr(ctx, r.x, r.y + off, r.w, r.h - depth, rad);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = dis ? '#7d7670' : style.edge ?? '#333';
  ctx.stroke();
  // gloss
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  rr(ctx, r.x + 4, r.y + off + 3, r.w - 8, (r.h - depth) * 0.38, rad * 0.7);
  ctx.fill();
  return off;
}

export function panel(ctx: CanvasRenderingContext2D, r: Rect, fill = '#fff6dd', edge = '#8a5a22', radius = 18) {
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  rr(ctx, r.x + 3, r.y + 5, r.w, r.h, radius);
  ctx.fill();
  ctx.fillStyle = fill;
  rr(ctx, r.x, r.y, r.w, r.h, radius);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = edge;
  ctx.stroke();
}

export function clamp(v: number, a: number, b: number) {
  return v < a ? a : v > b ? b : v;
}
export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
export function easeOutBack(t: number) {
  const c1 = 1.70158,
    c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
export function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}
