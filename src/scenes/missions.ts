import { portrait } from '../art/index';
import type { App, Scene } from '../core/app';
import { audio } from '../core/audio';
import { clamp, drawButton, font, panel, rr, STYLES, text } from '../core/ui';
import { claim, claimDailyMission, dailyMissions, isDone, MISSIONS, rollDay } from '../game/missions';
import { MUSIC } from '../game/music';
import { drawGoldIcon } from './battle';

/** shrink the font evenly (never squash horizontally) so long labels stay readable */
function fitText(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, maxW: number, color: string) {
  let sz = size;
  ctx.font = font(sz);
  while (sz > 9 && ctx.measureText(s).width > maxW) {
    sz -= 0.5;
    ctx.font = font(sz);
  }
  text(ctx, s, x, y, sz, { align: 'left', color, stroke: 'none' });
}

const ICONS: Record<string, string> = { c: 'jaga', k: 'ari', u: 'potesala', l: 'satsu', evo: 'king', r: '🏰', g: '🎰', s: '⭐', w: '🏆' };

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
    rollDay(save);
    const dailies = dailyMissions(save);
    const list = [...MISSIONS].sort((a, b) => {
      const ra = save.claimed.includes(a.id) ? 2 : isDone(save, a) ? 0 : 1;
      const rb = save.claimed.includes(b.id) ? 2 : isDone(save, b) ? 0 : 1;
      return ra - rb;
    });
    const rh = clamp(h * 0.12, 58, 76);
    let lw = Math.min(640, w - 16);
    let lx = (w - lw) / 2;
    const dailyH = 30 + dailies.length * (rh + 8) + 30;
    this.maxScroll = Math.max(0, dailyH + list.length * (rh + 8) + 16 - (h - topH));
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, topH, w, h - topH);
    ctx.clip();
    // ---- today's missions ----
    const ty = topH + 8 - this.scroll;
    text(ctx, '☀ きょうの ミッション（まいにち かわるよ）', lx + 6, ty + 14, clamp(rh * 0.24, 13, 18), { align: 'left', color: '#d06a00', stroke: '#fff', maxW: lw - 12 });
    dailies.forEach((d, i) => {
      const y = ty + 30 + i * (rh + 8);
      const cur = Math.min(d.target, save.today.counts[d.key] ?? 0);
      const done = cur >= d.target;
      const got = save.today.claimed.includes(d.id);
      panel(ctx, { x: lx, y, w: lw, h: rh }, got ? '#e8e8e8' : done ? '#fff6c8' : '#fff0f6', got ? '#aaa' : '#ff8a1f', 12);
      const fs = clamp(rh * 0.24, 12, 18);
      const btnW = Math.min(100, lw * 0.24);
      fitText(ctx, d.label, lx + 14, y + rh * 0.32, fs, lw - btnW - 110, '#5a3a12');
      const bw = lw - btnW - 170;
      ctx.fillStyle = '#eed8e0';
      rr(ctx, lx + 14, y + rh * 0.6, bw, rh * 0.16, rh * 0.08);
      ctx.fill();
      ctx.fillStyle = '#ff8a1f';
      rr(ctx, lx + 14, y + rh * 0.6, Math.max(rh * 0.16, (bw * cur) / d.target), rh * 0.16, rh * 0.08);
      ctx.fill();
      text(ctx, `${cur}/${d.target}`, lx + 20 + bw, y + rh * 0.68, fs * 0.75, { align: 'left', color: '#5a3a12', stroke: 'none' });
      text(ctx, `🎟${d.tickets}`, lx + lw - btnW - 20, y + rh / 2, fs * 0.9, { align: 'right', color: '#d0407a', stroke: 'none' });
      const br = { x: lx + lw - btnW - 10, y: y + (rh - Math.max(44, rh * 0.64)) / 2, w: btnW, h: Math.max(44, rh * 0.64) };
      if (got) text(ctx, 'もらった', br.x + br.w / 2, y + rh / 2, fs * 0.8, { color: '#999', stroke: 'none' });
      else {
        const off = drawButton(ctx, br, done ? STYLES.orange : { ...STYLES.gray, disabled: true }, ui.isPressed('d' + d.id), 12);
        text(ctx, done ? 'もらう！' : 'まだ', br.x + br.w / 2, br.y + off + (br.h - 6) / 2, br.h * 0.36);
        if (done && br.y > topH)
          ui.add({ id: 'd' + d.id, r: br, sound: false, onTap: () => {
            if (claimDailyMission(save, d)) {
              audio.sfx('fanfare');
              this.pop = { s: 'ごほうび ゲット！', t: 0 };
              this.app.persist();
            }
          } });
      }
    });
    const listTop = ty + dailyH;
    text(ctx, '🏆 ずっと ミッション', lx + 6, listTop - 14, clamp(rh * 0.24, 13, 18), { align: 'left', color: '#1d5aa3', stroke: '#fff' });
    list.forEach((mi, i) => {
      const y = listTop + i * (rh + 8);
      if (y > h || y + rh < topH) return;
      const done = isDone(save, mi);
      const got = save.claimed.includes(mi.id);
      const wig = done && !got ? Math.sin(this.t * 10 + i) * 1.5 : 0;
      ctx.save();
      ctx.translate(wig, 0);
      panel(ctx, { x: lx, y, w: lw, h: rh }, got ? '#e8e8e8' : done ? '#fff6c8' : '#fffaf0', got ? '#aaa' : done ? '#ffb000' : '#5a8ab0', 12);
      const fs = clamp(rh * 0.24, 12, 18);
      // category icon
      const icon = ICONS[mi.id.replace(/[0-9a-z]*$/, '')] ?? ICONS[mi.id[0]];
      const ix = lx + rh * 0.5;
      if (icon && icon.length > 2) portrait(ctx, icon, ix, y + rh / 2, rh * 0.8, got ? 0 : this.t + i, icon === 'ari' ? 1 : 0);
      else text(ctx, icon ?? '⭐', ix, y + rh / 2, rh * 0.45, { stroke: 'none' });
      const lx0 = lx;
      lx = lx + rh * 0.9;
      const lwSaved = lw;
      lw = lw - rh * 0.9;
      const btnW = Math.min(100, lw * 0.24);
      const rx = lx + lw - btnW - 18 - Math.min(70, lw * 0.18);
      fitText(ctx, mi.label, lx + 14, y + rh * 0.32, fs, rx - lx - 20, got ? '#888' : '#3a3a6a');
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
      drawGoldIcon(ctx, rx + 8, y + rh * 0.35, fs * 0.5);
      text(ctx, `${mi.gold}`, rx + 22, y + rh * 0.35, fs * 0.8, { align: 'left', color: '#c87a00', stroke: 'none' });
      if (mi.tickets) text(ctx, `🎟${mi.tickets}`, rx + 8, y + rh * 0.7, fs * 0.8, { align: 'left', color: '#d0407a', stroke: 'none' });
      const br = { x: lx + lw - btnW - 10, y: y + (rh - Math.max(44, rh * 0.64)) / 2, w: btnW, h: Math.max(44, rh * 0.64) };
      if (got) text(ctx, 'もらった', br.x + br.w / 2, y + rh / 2, fs * 0.8, { color: '#999', stroke: 'none' });
      else {
        const off = drawButton(ctx, br, done ? STYLES.orange : { ...STYLES.gray, disabled: true }, ui.isPressed('m' + mi.id), 12);
        text(ctx, done ? 'もらう！' : 'まだ', br.x + br.w / 2, br.y + off + (br.h - 6) / 2, br.h * 0.36, { color: '#fff' });
        if (done && br.y > topH)
          ui.add({ id: 'm' + mi.id, r: br, sound: false, onTap: () => {
            if (claim(save, mi)) {
              audio.sfx('fanfare');
              this.pop = { s: 'ごほうび ゲット！', t: 0 };
              this.app.persist();
            }
          } });
      }
      lx = lx0;
      lw = lwSaved;
      ctx.restore();
    });
    ctx.restore();
    // header
    const hg = ctx.createLinearGradient(0, 0, 0, topH);
    hg.addColorStop(0, '#7cc8ff');
    hg.addColorStop(1, '#3d97f0');
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, w, topH);
    const back = { x: 6, y: (topH - Math.max(44, topH - 12)) / 2, w: topH * 1.5, h: Math.max(44, topH - 12) };
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
