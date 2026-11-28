import { portrait } from '../art/index';
import { ellipse } from '../art/kit';
import type { App, Scene } from '../core/app';
import { audio } from '../core/audio';
import { clamp, drawButton, panel, rr, STYLES, text } from '../core/ui';
import { ENEMY_MAP } from '../game/enemies';
import { MUSIC } from '../game/music';
import { TOWER_ID, TOWER_TITLES, towerReward, towerStage } from '../game/tower';
import { drawGoldIcon, MOD_LABEL } from './battle';

/** いもの とう: pick the next floor and climb. */
export class TowerScene implements Scene {
  name = 'tower';
  t = 0;
  /** floor shown in the info panel (defaults to the next unclimbed floor) */
  sel: number;
  /** lowest floor in view (scroll with ▲▼ to replay older floors) */
  low: number;
  constructor(private app: App) {
    this.sel = app.save.tower.best + 1;
    this.low = Math.max(1, this.sel - 1);
  }
  enter() {
    audio.playMusic('map', MUSIC.map);
  }
  onBack() {
    this.app.go('map');
    return true;
  }
  update(dt: number) {
    this.t += dt;
  }

  render(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const save = this.app.save;
    const ui = this.app.ui;
    const best = save.tower.best;
    const next = best + 1;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#2a1d4a');
    g.addColorStop(0.6, '#6a3f7a');
    g.addColorStop(1, '#e08a5a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // stars
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 40; i++) {
      const sx = (i * 137.5) % w,
        sy = (i * 71.3) % (h * 0.5);
      ctx.globalAlpha = 0.4 + 0.4 * Math.sin(this.t * 2 + i);
      ctx.fillRect(sx, sy, 2, 2);
    }
    ctx.globalAlpha = 1;
    const topH = clamp(h * 0.1, 50, 68);
    const portraitMode = h > w * 1.1;

    // ---- the tower (left, or top in portrait) ----
    const tw = portraitMode ? Math.min(220, w * 0.5) : Math.min(260, w * 0.34);
    const tx = portraitMode ? (w - tw) / 2 : 20;
    const tTop = topH + 10;
    const tBot = portraitMode ? h * 0.48 : h - 14;
    const rows = 6;
    const fh = (tBot - tTop) / rows;
    // floors low+5 ... low (top to bottom)
    for (let i = 0; i < rows; i++) {
      const f = this.low + (rows - 1) - i;
      if (f < 1) continue;
      const y = tTop + i * fh;
      const done = f <= best;
      const isNext = f === next;
      const sel = f === this.sel;
      const inset = (rows - i) * 3;
      const r = { x: tx + inset, y: y + 2, w: tw - inset * 2, h: fh - 4 };
      ctx.fillStyle = done ? '#b89a7a' : isNext ? '#ffd27a' : '#7a6a8a';
      rr(ctx, r.x, r.y, r.w, r.h, 8);
      ctx.fill();
      ctx.lineWidth = sel ? 4 : 2;
      ctx.strokeStyle = sel ? '#fff36a' : '#3a2a3a';
      ctx.stroke();
      // windows
      ctx.fillStyle = done ? '#ffe9a0' : '#3a3050';
      for (const k of [0.06, 0.86]) {
        rr(ctx, r.x + r.w * k, r.y + r.h * 0.25, r.w * 0.08, r.h * 0.45, 4);
        ctx.fill();
      }
      const boss = f % 5 === 0;
      text(ctx, `${f}かい${boss ? ' 👑' : ''}`, r.x + r.w / 2, r.y + r.h / 2, clamp(fh * 0.32, 12, 22), { color: done ? '#5a3a12' : '#fff', stroke: done ? '#fff' : '#3a2a3a' });
      if (done) text(ctx, '✓', r.x + r.w * 0.78, r.y + r.h / 2, clamp(fh * 0.34, 12, 22), { color: '#2a9a2a', stroke: '#fff' });
      if (isNext) {
        // our potato climbing
        portrait(ctx, 'jaga', r.x + r.w * 0.2, r.y + r.h * 0.55, Math.min(40, fh * 0.8), this.t * 2, 0, 'walk');
      }
      if (f <= next) ui.add({ id: 'fl' + f, r, onTap: () => (this.sel = f) });
    }

    // scroll buttons
    const sb = Math.min(48, fh * 0.9);
    const up = { x: tx + tw - sb, y: tTop, w: sb, h: sb };
    const dn = { x: tx + tw - sb, y: tBot - sb, w: sb, h: sb };
    if (this.low + rows - 1 < next + 2) {
      const o = drawButton(ctx, up, STYLES.cream, ui.isPressed('up'), 10);
      text(ctx, '▲', up.x + sb / 2, up.y + o + (sb - 6) / 2, sb * 0.45, { color: '#5a3a12', stroke: 'none' });
      ui.add({ id: 'up', r: up, onTap: () => (this.low = Math.min(next + 2 - rows + 1, this.low + rows - 1)) });
    }
    if (this.low > 1) {
      const o = drawButton(ctx, dn, STYLES.cream, ui.isPressed('dn'), 10);
      text(ctx, '▼', dn.x + sb / 2, dn.y + o + (sb - 6) / 2, sb * 0.45, { color: '#5a3a12', stroke: 'none' });
      ui.add({ id: 'dn', r: dn, onTap: () => (this.low = Math.max(1, this.low - (rows - 1))) });
    }

    // ---- info panel ----
    const px = portraitMode ? 10 : tx + tw + 20;
    const py = portraitMode ? h * 0.5 : topH + 10;
    const pw = portraitMode ? w - 20 : w - px - 16;
    const ph = portraitMode ? h - py - 10 : h - py - 14;
    panel(ctx, { x: px, y: py, w: pw, h: ph }, '#fff6dd', '#6a3f7a');
    const f = this.sel;
    const st = towerStage(f);
    const fs = clamp(Math.min(pw * 0.06, ph * 0.08), 13, 24);
    text(ctx, st.name, px + pw / 2, py + fs * 1.1, fs, { color: st.boss ? '#ff5f5f' : '#ffd23a', stroke: '#5a2a5a', maxW: pw - 20 });
    if (st.mod) text(ctx, MOD_LABEL[st.mod], px + pw / 2, py + fs * 2.2, fs * 0.6, { color: '#3d97f0', stroke: '#fff' });
    const ids = [...new Set(st.spawns.map((s) => s.enemy))];
    const es = Math.min(70, (pw - 30) / Math.max(4, ids.length), ph * 0.22);
    ids.forEach((id, i) => {
      const cx = px + pw / 2 + (i - (ids.length - 1) / 2) * es;
      const cy = py + fs * 2.6 + es * 0.55;
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      rr(ctx, cx - es / 2 + 2, cy - es / 2, es - 4, es, 8);
      ctx.fill();
      portrait(ctx, id, cx, cy, es * 0.8, this.t + i, 1);
      if (ENEMY_MAP[id].boss) text(ctx, 'ボス', cx, cy - es * 0.42, 11, { color: '#ff5f5f' });
    });
    let y = py + fs * 2.8 + es * 1.15;
    const first = f > best;
    const rw = towerReward(f, first);
    drawGoldIcon(ctx, px + 26, y, fs * 0.45);
    text(ctx, `きんいも ${rw.gold}${first ? '（はじめて）' : ''}`, px + 42, y, fs * 0.7, { align: 'left', color: '#5a3a12', stroke: 'none', maxW: pw - 50 });
    y += fs * 1.2;
    if (rw.tickets || rw.stone) {
      const parts = [];
      if (rw.tickets) parts.push(`🎟 ガチャけん ${rw.tickets}`);
      if (rw.stone) parts.push('🔥 ほのおのいし');
      if (TOWER_TITLES[f] && first) parts.push(`しょうごう「${TOWER_TITLES[f]}」`);
      text(ctx, '＋ ' + parts.join('・'), px + 16, y, fs * 0.62, { align: 'left', color: '#c0392b', stroke: 'none', maxW: pw - 30 });
      y += fs * 1.2;
    }
    const title = [30, 20, 10].find((n) => best >= n);
    text(ctx, `さいこう きろく: ${best}かい${title ? '　「' + TOWER_TITLES[title] + '」' : ''}`, px + 16, y, fs * 0.6, { align: 'left', color: '#6a3f7a', stroke: 'none', maxW: pw - 30 });
    y += fs * 1.1;
    text(ctx, `🔥 ほのおのいし ${save.stones}こ`, px + 16, y, fs * 0.6, { align: 'left', color: '#e0601a', stroke: 'none', maxW: pw - 30 });
    y += fs * 1.1;
    {
      // little rules list, left of the climb button
      const bhh = clamp(ph * 0.16, 44, 58);
      const sz = Math.max(10, Math.min(fs * 0.5, bhh * 0.26));
      const ty0 = py + ph - bhh - 12 + sz * 0.7;
      wrapLines(ctx, ['👑=ボスで 🎟', '10かいごとに 🔥', 'まけても へらない'], px + 12, ty0, sz, pw * 0.34 - 16);
    }
    const bh = clamp(ph * 0.16, 44, 58);
    const go = { x: px + pw * 0.36, y: py + ph - bh - 12, w: pw * 0.58, h: bh };
    const off = drawButton(ctx, go, STYLES.orange, ui.isPressed('climb'));
    text(ctx, f === next ? 'のぼる！' : 'もういちど', go.x + go.w / 2, go.y + off + (bh - 6) / 2, bh * 0.4, { maxW: go.w - 10 });
    ui.add({ id: 'climb', r: go, onTap: () => { audio.sfx('whistle'); this.app.go('battle', { id: TOWER_ID, floor: f }); } });

    // ---- top bar ----
    ctx.fillStyle = 'rgba(40,20,60,0.85)';
    ctx.fillRect(0, 0, w, topH);
    const back = { x: 6, y: (topH - Math.max(44, topH - 12)) / 2, w: topH * 1.5, h: Math.max(44, topH - 12) };
    const ob = drawButton(ctx, back, STYLES.cream, ui.isPressed('back'));
    text(ctx, '◀ もどる', back.x + back.w / 2, back.y + ob + (back.h - 6) / 2, back.h * 0.34, { color: '#5a3a12', stroke: 'none' });
    ui.add({ id: 'back', r: back, onTap: () => this.app.go('map') });
    text(ctx, '🗼 いもの とう', Math.max(w / 2, back.x + back.w + topH * 2), topH / 2, topH * 0.42, { stroke: '#6a3f7a' });
    void ellipse;
  }
}

function wrapLines(ctx: CanvasRenderingContext2D, lines: string[], x: number, y: number, size: number, maxW: number) {
  lines.forEach((l, i) => text(ctx, l, x, y + i * size * 1.3, size, { align: 'left', color: '#8a5a22', stroke: 'none', maxW }));
}
