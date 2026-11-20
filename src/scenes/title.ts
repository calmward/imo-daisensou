import { drawChar } from '../art/index';
import { drawBackground } from '../art/scenery';
import type { App, Scene } from '../core/app';
import { audio } from '../core/audio';
import { clamp, drawButton, panel, STYLES, text } from '../core/ui';
import { ALLIES } from '../game/allies';
import { MUSIC } from '../game/music';

interface Walker {
  id: string;
  x: number;
  side: 0 | 1;
  speed: number;
  lane: number;
}

export class TitleScene implements Scene {
  name = 'title';
  t = 0;
  walkers: Walker[] = [];
  spawnT = 0;
  constructor(private app: App) {}

  enter() {
    audio.playMusic('title', MUSIC.title);
  }

  update(dt: number) {
    this.t += dt;
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnT = 0.9 + Math.random() * 0.8;
      const owned = ALLIES.filter((a) => this.app.save.units[a.id]);
      const pool = owned.length > 2 ? owned : ALLIES.slice(0, 6);
      const a = pool[Math.floor(Math.random() * pool.length)];
      this.walkers.push({ id: a.id, x: -80, side: 0, speed: 60 + Math.random() * 50, lane: Math.random() });
      if (Math.random() < 0.35) {
        const e = ['ari', 'nezumi', 'kemushi', 'karasu'][Math.floor(Math.random() * 4)];
        this.walkers.push({ id: e, x: 3000, side: 1, speed: 50 + Math.random() * 30, lane: Math.random() });
      }
    }
    for (const w of this.walkers) w.x += (w.side === 0 ? 1 : -1) * w.speed * dt;
    this.walkers = this.walkers.filter((w) => w.x > -200 && w.x < 3200);
  }

  render(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const scale = clamp(h / 600, 0.6, 1.4);
    const groundY = h * 0.78;
    drawBackground(ctx, w, h, groundY, this.t * 20, scale, 0, this.t);
    const vw = w / scale;
    const sorted = [...this.walkers].sort((a, b) => a.lane - b.lane);
    for (const wk of sorted) {
      const x = wk.side === 1 ? (wk.x - 3000 + vw + 100) * scale : wk.x * scale;
      drawChar(ctx, wk.id, x, groundY + (wk.lane * 30 - 4) * scale, scale * 1.1, { t: this.t + wk.lane * 9, walk: this.t + wk.lane * 9, state: 'walk', atk: 0, hurt: false }, wk.side);
    }
    // logo
    const ls = clamp(Math.min(w, h * 1.4) * 0.13, 36, 110);
    const ly = h * 0.24;
    ctx.save();
    ctx.translate(w / 2, ly);
    ctx.rotate(Math.sin(this.t * 1.5) * 0.02);
    const bob = Math.sin(this.t * 2.2) * 4;
    text(ctx, 'いも大戦争', 4, bob + 6, ls, { color: '#5a1a2a', stroke: '#5a1a2a', lw: ls * 0.3 });
    const g = ctx.createLinearGradient(0, -ls / 2, 0, ls / 2);
    g.addColorStop(0, '#ffe680');
    g.addColorStop(0.5, '#ffb340');
    g.addColorStop(1, '#e6648a');
    ctx.font = `900 ${ls}px sans-serif`;
    text(ctx, 'いも大戦争', 0, bob, ls, { color: '#fff', stroke: '#7a1a3a', lw: ls * 0.26 });
    ctx.restore();
    // subtitle
    text(ctx, '〜 いもたちの だいぼうけん 〜', w / 2, ly + ls * 0.85, ls * 0.25, { color: '#fff', stroke: '#7a4a22' });
    drawChar(ctx, 'satsu', w / 2 - ls * 3, ly + ls * 0.5, ls / 55, { t: this.t, walk: this.t, state: 'idle', atk: 0, hurt: false });
    drawChar(ctx, 'jaga', w / 2 + ls * 3, ly + ls * 0.5, ls / 55, { t: this.t + 1, walk: this.t, state: 'idle', atk: 0, hurt: false });
    // start button
    const bw = Math.min(320, w * 0.7),
      bh = clamp(h * 0.12, 56, 86);
    const r = { x: (w - bw) / 2, y: h * 0.5, w: bw, h: bh };
    const ui = this.app.ui;
    const pulse = 1 + Math.sin(this.t * 4) * 0.03;
    ctx.save();
    ctx.translate(w / 2, r.y + bh / 2);
    ctx.scale(pulse, pulse);
    ctx.translate(-w / 2, -(r.y + bh / 2));
    const off = drawButton(ctx, r, STYLES.orange, ui.isPressed('start'), 20);
    text(ctx, 'あそぶ！', w / 2, r.y + off + (bh - 6) / 2, bh * 0.45);
    ctx.restore();
    ui.add({ id: 'start', r, onTap: () => {
      audio.unlock();
      this.app.go('map');
    } });
    text(ctx, 'v' + (import.meta.env?.VITE_VERSION ?? '1.0'), w - 8, h - 10, 11, { align: 'right', color: '#fff', stroke: 'rgba(0,0,0,0.4)' });
    // settings
    const sr = { x: 10, y: h - 58, w: 120, h: 48 };
    const so = drawButton(ctx, sr, STYLES.cream, ui.isPressed('settings'), 14);
    text(ctx, '⚙ せってい', sr.x + sr.w / 2, sr.y + so + 21, 16, { color: '#5a3a12', stroke: 'none' });
    ui.add({ id: 'settings', r: sr, onTap: () => { this.settings = true; this.confirm = 0; } });
    if (this.settings) this.drawSettings(ctx, w, h);
  }

  settings = false;
  confirm = 0;
  private drawSettings(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const ui = this.app.ui;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, w, h);
    ui.add({ id: 'setbg', r: { x: 0, y: 0, w, h }, sound: false, onTap: () => (this.settings = false) });
    const pw = Math.min(340, w - 30),
      ph = Math.min(300, h - 30);
    const px = (w - pw) / 2,
      py = (h - ph) / 2;
    panel(ctx, { x: px, y: py, w: pw, h: ph });
    ui.add({ id: 'setpanel', r: { x: px, y: py, w: pw, h: ph }, sound: false });
    text(ctx, 'せってい', w / 2, py + 30, 24, { color: '#ffd23a' });
    const bh = Math.min(54, ph * 0.18);
    const items: [string, string, keyof typeof STYLES, () => void][] = [
      ['snd', audio.muted ? 'おと: オフ' : 'おと: オン', 'green', () => { audio.setMuted(!audio.muted); this.app.save.muted = audio.muted; this.app.persist(); }],
      ['reset', ['データを けす', 'ほんとうに けす？', 'さいごの かくにん！'][this.confirm], 'red', () => {
        if (this.confirm < 2) this.confirm++;
        else {
          this.app.resetSave();
          this.settings = false;
          this.confirm = 0;
        }
      }],
      ['close', 'とじる', 'cream', () => (this.settings = false)],
    ];
    items.forEach(([id, label, st, fn], i) => {
      const r = { x: px + pw * 0.12, y: py + 60 + i * (bh + 12), w: pw * 0.76, h: bh };
      const off = drawButton(ctx, r, STYLES[st], ui.isPressed(id));
      text(ctx, label, r.x + r.w / 2, r.y + off + (bh - 6) / 2, bh * 0.36, { color: st === 'cream' ? '#5a3a12' : '#fff', stroke: st === 'cream' ? 'none' : undefined });
      ui.add({ id, r, onTap: fn });
    });
  }
}
