import { portrait, silhouette } from '../art/index';
import type { App, Scene } from '../core/app';
import { audio } from '../core/audio';
import { clamp, drawButton, panel, rr, STYLES, text, type Rect } from '../core/ui';
import { ENEMIES } from '../game/enemies';
import { MUSIC } from '../game/music';
import { wrapText } from './battle';

const TRAIT: Record<string, [string, string]> = { bug: ['むし', '#6ccf4a'], bird: ['とり', '#3d97f0'], beast: ['けもの', '#c8783a'], boss: ['ボス', '#e8312f'] };

export class ZukanScene implements Scene {
  name = 'zukan';
  t = 0;
  sel: string | null = null;
  scroll = 0;
  maxScroll = 0;
  constructor(private app: App) {}
  enter() {
    audio.playMusic('map', MUSIC.map);
  }
  onBack() {
    if (this.sel) this.sel = null;
    else this.app.go('map');
    return true;
  }
  update(dt: number) {
    this.t += dt;
  }
  onDrag(_dx: number, dy: number) {
    this.scroll = clamp(this.scroll - dy, 0, this.maxScroll);
  }
  onWheel(dy: number) {
    this.scroll = clamp(this.scroll + dy, 0, this.maxScroll);
  }
  render(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const save = this.app.save;
    const ui = this.app.ui;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#e8ffd6');
    g.addColorStop(1, '#b8e89a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const topH = clamp(h * 0.1, 50, 68);
    const cols = clamp(Math.floor((w - 16) / 100), 3, 8);
    const cw = (w - 16 - (cols - 1) * 8) / cols;
    const ch = cw * 1.2;
    const rows = Math.ceil(ENEMIES.length / cols);
    this.maxScroll = Math.max(0, rows * (ch + 8) + 16 - (h - topH));
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, topH, w, h - topH);
    ctx.clip();
    ENEMIES.forEach((e, i) => {
      const r: Rect = { x: 8 + (i % cols) * (cw + 8), y: topH + 8 + Math.floor(i / cols) * (ch + 8) - this.scroll, w: cw, h: ch };
      if (r.y > h || r.y + r.h < topH) return;
      const seen = !!save.seen[e.id];
      ctx.fillStyle = e.boss ? '#ffb0a0' : '#fffaf0';
      rr(ctx, r.x, r.y, r.w, r.h, 12);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#5a8a3a';
      ctx.stroke();
      if (seen) portrait(ctx, e.id, r.x + r.w / 2, r.y + r.h * 0.42, r.w * 0.75, this.t + i, 1);
      else silhouette(ctx, e.id, r.x + r.w / 2, r.y + r.h * 0.42, r.w * 0.75, 1, '#2a3a2a', 0.5);
      text(ctx, seen ? e.name : '？？？', r.x + r.w / 2, r.y + r.h - 14, clamp(r.w * 0.14, 10, 15), { color: '#3a3a2a', stroke: 'none', maxW: r.w - 8 });
      const top = Math.max(r.y, topH);
      if (seen && r.y + r.h - top > 10) ui.add({ id: 'z' + e.id, r: { x: r.x, y: top, w: r.w, h: r.y + r.h - top }, onTap: () => (this.sel = e.id) });
    });
    ctx.restore();
    const hg = ctx.createLinearGradient(0, 0, 0, topH);
    hg.addColorStop(0, '#8fe36b');
    hg.addColorStop(1, '#4cbf3a');
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, w, topH);
    const bH = Math.max(44, topH - 12);
    const back = { x: 6, y: (topH - bH) / 2, w: topH * 1.5, h: bH };
    const ob = drawButton(ctx, back, STYLES.cream, ui.isPressed('back'));
    text(ctx, '◀ もどる', back.x + back.w / 2, back.y + ob + (back.h - 6) / 2, back.h * 0.34, { color: '#5a3a12', stroke: 'none' });
    ui.add({ id: 'back', r: back, onTap: () => this.app.go('map') });
    const n = ENEMIES.filter((e) => save.seen[e.id]).length;
    text(ctx, `てき ずかん ${n}/${ENEMIES.length}`, Math.max(w / 2, back.x + back.w + 110), topH / 2, topH * 0.38, { stroke: '#2a7a1e', maxW: w - back.w - 30 });
    if (this.sel) {
      const e = ENEMIES.find((x) => x.id === this.sel)!;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, w, h);
      ui.add({ id: 'zbg', r: { x: 0, y: 0, w, h }, sound: false, onTap: () => (this.sel = null) });
      const pw = Math.min(380, w - 30),
        ph = Math.min(360, h - 30);
      const px = (w - pw) / 2,
        py = (h - ph) / 2;
      panel(ctx, { x: px, y: py, w: pw, h: ph }, '#fffaf0', '#5a8a3a');
      portrait(ctx, e.id, w / 2, py + ph * 0.3, ph * 0.38, this.t * 2, 1, Math.sin(this.t) > 0.5 ? 'attack' : 'walk');
      text(ctx, e.name, w / 2, py + ph * 0.58, 24, { color: '#ffd23a' });
      (e.traits ?? []).forEach((tr, i, arr) => {
        const [label, col] = TRAIT[tr];
        const tx = w / 2 + (i - (arr.length - 1) / 2) * 70;
        ctx.fillStyle = col;
        rr(ctx, tx - 30, py + ph * 0.66, 60, 24, 12);
        ctx.fill();
        text(ctx, label, tx, py + ph * 0.66 + 12, 14);
      });
      wrapText(ctx, e.desc, w / 2, py + ph * 0.86, pw - 30, 15, '#3a3a2a');
    }
  }
}
