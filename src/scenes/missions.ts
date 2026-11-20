import type { App, Scene } from '../core/app';
import { audio } from '../core/audio';
import { clamp, drawButton, panel, rr, STYLES, text } from '../core/ui';
import { claim, isDone, MISSIONS } from '../game/missions';
import { MUSIC } from '../game/music';
import { drawGoldIcon } from './battle';

export class MissionScene implements Scene {
  name = 'missions';
  t = 0;
  scroll = 0;
  maxScroll = 0;
  pop: { s: string; t: number } | null = null;
  constructor(private app: App) {}
  enter() {
    audio.playMusic('map', MUSIC.map);
  }
  onBack() {
    this.app.go('map');
    return true;
  }
  update(dt: number) {
    this.t += dt;
    if (this.pop && (this.pop.t += dt) > 1.2) this.pop = null;
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
    g.addColorStop(0, '#d6f0ff');
    g.addColorStop(1, '#a6d8ff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const topH = clamp(h * 0.1, 50, 68);
    const list = [...MISSIONS].sort((a, b) => {
      const ra = save.claimed.includes(a.id) ? 2 : isDone(save, a) ? 0 : 1;
      const rb = save.claimed.includes(b.id) ? 2 : isDone(save, b) ? 0 : 1;
      return ra - rb;
    });
    const rh = clamp(h * 0.12, 58, 76);
    const lw = Math.min(640, w - 16);
    const lx = (w - lw) / 2;
    this.maxScroll = Math.max(0, list.length * (rh + 8) + 16 - (h - topH));
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, topH, w, h - topH);
    ctx.clip();
    list.forEach((mi, i) => {
      const y = topH + 10 + i * (rh + 8) - this.scroll;
      if (y > h || y + rh < topH) return;
      const done = isDone(save, mi);
      const got = save.claimed.includes(mi.id);
      panel(ctx, { x: lx, y, w: lw, h: rh }, got ? '#e8e8e8' : done ? '#fff6c8' : '#fffaf0', got ? '#aaa' : done ? '#ffb000' : '#5a8ab0', 12);
      const fs = clamp(rh * 0.24, 12, 18);
      const btnW = Math.min(100, lw * 0.24);
      const rx = lx + lw - btnW - 18 - Math.min(70, lw * 0.18);
      text(ctx, mi.label, lx + 14, y + rh * 0.32, fs, { align: 'left', color: got ? '#888' : '#3a3a6a', stroke: 'none', maxW: rx - lx - 20 });
      const [a, b] = mi.progress(save);
      const bw = rx - lx - 80;
      ctx.fillStyle = '#d8e4ee';
      rr(ctx, lx + 14, y + rh * 0.6, bw, rh * 0.16, rh * 0.08);
      ctx.fill();
      ctx.fillStyle = done ? '#ffb000' : '#5ab0ff';
      rr(ctx, lx + 14, y + rh * 0.6, Math.max(rh * 0.16, bw * (a / b)), rh * 0.16, rh * 0.08);
      ctx.fill();
      text(ctx, `${a}/${b}`, lx + 22 + bw, y + rh * 0.68, fs * 0.75, { align: 'left', color: '#3a3a6a', stroke: 'none' });
      // reward
      drawGoldIcon(ctx, rx + 8, y + rh * 0.35, fs * 0.35);
      text(ctx, `${mi.gold}`, rx + 18, y + rh * 0.35, fs * 0.8, { align: 'left', color: '#c87a00', stroke: 'none' });
      if (mi.tickets) text(ctx, `🎟${mi.tickets}`, rx + 8, y + rh * 0.7, fs * 0.8, { align: 'left', color: '#d0407a', stroke: 'none' });
      const br = { x: lx + lw - btnW - 10, y: y + rh * 0.18, w: btnW, h: rh * 0.64 };
      if (got) text(ctx, 'もらった', br.x + br.w / 2, y + rh / 2, fs * 0.8, { color: '#999', stroke: 'none' });
      else {
        const off = drawButton(ctx, br, done ? STYLES.orange : { ...STYLES.gray, disabled: true }, ui.isPressed('m' + mi.id), 12);
        text(ctx, done ? 'もらう！' : 'まだ', br.x + br.w / 2, br.y + off + (br.h - 6) / 2, br.h * 0.36, { color: '#fff' });
        if (done)
          ui.add({ id: 'm' + mi.id, r: br, sound: false, onTap: () => {
            if (claim(save, mi)) {
              audio.sfx('fanfare');
              this.pop = { s: 'ごほうび ゲット！', t: 0 };
              this.app.persist();
            }
          } });
      }
    });
    ctx.restore();
    // header
    const hg = ctx.createLinearGradient(0, 0, 0, topH);
    hg.addColorStop(0, '#7cc8ff');
    hg.addColorStop(1, '#3d97f0');
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, w, topH);
    const back = { x: 8, y: 8, w: topH * 1.5, h: topH - 16 };
    const ob = drawButton(ctx, back, STYLES.cream, ui.isPressed('back'));
    text(ctx, '◀ もどる', back.x + back.w / 2, back.y + ob + (back.h - 6) / 2, back.h * 0.34, { color: '#5a3a12', stroke: 'none' });
    ui.add({ id: 'back', r: back, onTap: () => this.app.go('map') });
    text(ctx, 'ミッション', Math.max(w / 2, back.x + back.w + topH * 1.5), topH / 2, topH * 0.42, { stroke: '#1d5aa3' });
    text(ctx, `🎟${save.tickets}`, w - 12, topH / 2, topH * 0.3, { align: 'right', stroke: '#1d5aa3' });
    if (this.pop) {
      const k = this.pop.t / 1.2;
      ctx.save();
      ctx.globalAlpha = 1 - k;
      text(ctx, this.pop.s, w / 2, h * 0.45 - k * 40, clamp(w * 0.07, 24, 44), { color: '#ffe14d' });
      ctx.restore();
    }
  }
}
