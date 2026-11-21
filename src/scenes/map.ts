import { portrait, silhouette } from '../art/index';
import { ellipse, star } from '../art/kit';
import { mapProp, THEMES } from '../art/scenery';
import type { App, Scene } from '../core/app';
import { audio } from '../core/audio';
import { clamp, drawButton, easeOutBack, panel, rr, STYLES, text, type Rect } from '../core/ui';
import { ENEMY_MAP } from '../game/enemies';
import { ALLIES } from '../game/allies';
import { MUSIC } from '../game/music';
import { highestUnlocked, isCleared } from '../game/save';
import { BONUS_ID, STAGES, STAR_NAMES, ticketReward, WORLD_NAMES } from '../game/stages';
import { todayKey } from '../game/missions';
import { canLevelUp, claimDaily, previewReward } from '../game/progress';
import { claimable } from '../game/missions';
import { drawGoldIcon, drawHand, wrapText } from './battle';

const SPACING = 96;

export class MapScene implements Scene {
  name = 'map';
  scroll = 0;
  targetScroll: number | null = null;
  t = 0;
  popup: number | null = null;
  popT = 0;
  vel = 0;
  private horizontal = true;
  private axisLen = 0;
  private viewMain = 0;

  constructor(private app: App, arg?: { focus?: number; open?: boolean }) {
    const save = app.save;
    const focus = arg?.focus ?? highestUnlocked(save, STAGES.length);
    this.focus = focus;
    if (arg?.open && focus <= STAGES.length) {
      this.popup = focus;
    }
  }
  private focus: number;
  private inited = false;

  popStar = 1;
  daily: { gold: number; tickets: number } | null = null;
  dailyT = 0;

  enter() {
    audio.playMusic('map', MUSIC.map);
    const d = new Date();
    const today = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    if (isCleared(this.app.save, 1)) {
      this.daily = claimDaily(this.app.save, today);
      if (this.daily) {
        this.app.persist();
        audio.sfx('fanfare');
      }
    }
  }

  onBack() {
    if (this.daily) {
      this.daily = null;
      return true;
    }
    if (this.popup) {
      this.popup = null;
      return true;
    }
    this.app.go('title');
    return true;
  }

  update(dt: number) {
    this.t += dt;
    this.dailyT += dt;
    this.popT += dt;
    if (this.vel) {
      this.scroll += this.vel * dt;
      this.vel *= Math.pow(0.03, dt);
      if (Math.abs(this.vel) < 5) this.vel = 0;
    }
    this.clampScroll();
  }

  private clampScroll() {
    const max = Math.max(0, this.axisLen - this.viewMain);
    this.scroll = clamp(this.scroll, 0, max);
  }

  onDrag(dx: number, dy: number) {
    if (this.popup || this.daily) return;
    const d = this.horizontal ? dx : dy;
    this.scroll -= d;
    this.vel = -d * 30;
  }
  onWheel(dy: number) {
    if (this.popup || this.daily) return;
    this.scroll += dy;
  }

  private nodePos(i: number, area: Rect): { x: number; y: number } {
    const main = 70 + i * SPACING + Math.floor(i / 12) * 60 - this.scroll;
    const amp = (this.horizontal ? area.h : area.w) * 0.22;
    const cross = Math.sin(i * 0.85) * amp;
    if (this.horizontal) return { x: area.x + main, y: area.y + area.h / 2 + cross };
    return { x: area.x + area.w / 2 + cross, y: area.y + main };
  }

  render(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const save = this.app.save;
    this.horizontal = w >= h;
    const topH = clamp(h * 0.1, 50, 70);
    const botH = clamp(h * 0.14, 70, 110);
    const area = { x: 0, y: topH, w, h: h - topH - botH };
    this.axisLen = 140 + (STAGES.length - 1) * SPACING + (WORLD_NAMES.length - 1) * 60;
    this.viewMain = this.horizontal ? area.w : area.h;
    if (!this.inited) {
      this.inited = true;
      const p = 70 + (this.focus - 1) * SPACING + Math.floor((this.focus - 1) / 12) * 60;
      this.scroll = p - this.viewMain / 2;
      this.clampScroll();
    }
    // background bands per world
    ctx.fillStyle = '#8fd8ff';
    ctx.fillRect(0, 0, w, h);
    for (let wi = 0; wi < WORLD_NAMES.length; wi++) {
      const a = this.nodePos(wi * 12, area);
      const b = this.nodePos(wi * 12 + 11, area);
      const th = THEMES[wi % THEMES.length];
      const start = (this.horizontal ? a.x : a.y) - SPACING * 0.8;
      const end = (this.horizontal ? b.x : b.y) + SPACING * 0.8;
      ctx.fillStyle = th.hill1;
      if (this.horizontal) ctx.fillRect(start, area.y, end - start, area.h);
      else ctx.fillRect(area.x, start, area.w, end - start);
      // soft grass patches + props
      ctx.fillStyle = th.hill2;
      const span = Math.max(1, end - start);
      for (let k = 0; k < 14; k++) {
        const m = start + ((k * 97) % span);
        const c = ((k * 53) % 100) / 100;
        const x = this.horizontal ? m : area.x + c * area.w;
        const y = this.horizontal ? area.y + c * area.h : m;
        ellipse(ctx, x, y, 30, 14);
        ctx.fill();
      }
      for (let k = 0; k < 26; k++) {
        const hm = Math.sin(k * 12.9898 + wi * 78.233) * 43758.5453;
        const fr = hm - Math.floor(hm);
        const m = start + 20 + ((k * 61 + wi * 17) % Math.max(1, span - 40));
        const c = 0.06 + ((k * 37) % 88) / 100;
        const x = this.horizontal ? m : area.x + c * area.w;
        const y = this.horizontal ? area.y + c * area.h : m;
        // keep the path area clear
        const idx = Math.max(0, Math.min(11, Math.round((m - start - SPACING * 0.8) / SPACING)));
        const np = this.nodePos(wi * 12 + idx, area);
        if (Math.hypot(np.x - x, np.y - y) < 55) continue;
        if (x < -40 || x > w + 40 || y < area.y || y > area.y + area.h + 30) continue;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(0.8, 0.8);
        mapProp(ctx, wi, fr, this.t + k);
        ctx.restore();
      }
      // world sign
      const sx = this.horizontal ? start + 70 : area.x + area.w - 90;
      const sy = this.horizontal ? area.y + 26 : start + 30;
      ctx.fillStyle = '#8a5a22';
      ctx.fillRect(sx - 3, sy, 6, 30);
      panel(ctx, { x: sx - 70, y: sy - 18, w: 140, h: 32 }, '#fff6dd', '#8a5a22', 8);
      text(ctx, `${wi + 1}. ${WORLD_NAMES[wi]}`, sx, sy - 2, 14, { color: '#5a3a12', stroke: 'none', maxW: 130 });
    }
    // path
    ctx.strokeStyle = '#f2dcb0';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.setLineDash([2, 18]);
    ctx.beginPath();
    for (let i = 0; i < STAGES.length; i++) {
      const p = this.nodePos(i, area);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    // nodes
    const unlocked = highestUnlocked(save, STAGES.length);
    const ui = this.app.ui;
    for (let i = 0; i < STAGES.length; i++) {
      const st = STAGES[i];
      const p = this.nodePos(i, area);
      if (p.x < -60 || p.x > w + 60 || p.y < area.y - 60 || p.y > area.y + area.h + 60) continue;
      const cleared = isCleared(save, st.id);
      const open = st.id <= unlocked;
      const cur = st.id === unlocked && !cleared;
      const r = st.boss ? 30 : 24;
      const pulse = cur ? 1 + Math.sin(this.t * 5) * 0.08 : 1;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ellipse(ctx, 2, 5, r, r * 0.9);
      ctx.fill();
      const fill = !open ? '#9a9a9a' : st.boss ? '#ff5f5f' : cleared ? '#ffd23a' : '#7cc8ff';
      ellipse(ctx, 0, 0, r, r);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#3b2412';
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ellipse(ctx, -r * 0.3, -r * 0.35, r * 0.4, r * 0.22);
      ctx.fill();
      if (st.boss) {
        const bossId = st.spawns.find((sp) => sp.boss)?.enemy;
        if (bossId) {
          if (!open) silhouette(ctx, bossId, r * 0.1, -r - 18, 44, 1, '#1a1020');
          else portrait(ctx, bossId, r * 0.1, -r - 18, 44, this.t, 1);
        }
        text(ctx, 'ボス', 0, -r - 2, 12, { color: '#ffe14d' });
      }
      text(ctx, String(st.id), 0, 1, r * 0.8, { color: open ? '#fff' : '#ddd' });
      if (!open) {
        // lock
        ctx.fillStyle = '#5a5a5a';
        rr(ctx, r * 0.3, r * 0.2, r * 0.6, r * 0.5, 3);
        ctx.fill();
      }
      if (cleared) {
        const crowns = save.crowns[st.id] ?? 1;
        for (let c = 0; c < 3; c++) {
          star(ctx, (c - 1) * 13, r + 9 - (c === 1 ? 3 : 0), 7);
          ctx.fillStyle = c < crowns ? ['#fff36a', '#ffb000', '#ff5fa8'][c] : 'rgba(0,0,0,0.25)';
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = c < crowns ? '#a36a00' : 'rgba(0,0,0,0.2)';
          ctx.stroke();
        }
      }
      ctx.restore();
      if (cur) {
        // marching potato hero marks the next stage
        portrait(ctx, 'jaga', p.x, p.y - r - 26 - Math.abs(Math.sin(this.t * 4)) * 6, 40, this.t, 0, 'walk');
      }
      if (open && p.y - r > area.y - 4 && p.y + r < area.y + area.h + 4 && !(isCleared(save, 6) && p.x + r > w - 118 && p.y - r < area.y + 66)) ui.add({ id: 'st' + st.id, r: { x: p.x - r - 6, y: p.y - r - 6, w: r * 2 + 12, h: r * 2 + 12 }, onTap: () => { this.popup = st.id; this.popT = 0; this.popStar = 1; } });
    }
    // top bar
    const g = ctx.createLinearGradient(0, 0, 0, topH);
    g.addColorStop(0, '#ffb340');
    g.addColorStop(1, '#ff8a1f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, topH);
    ctx.fillStyle = '#a34e00';
    ctx.fillRect(0, topH - 4, w, 4);
    const fs = topH * 0.36;
    text(ctx, w < 500 ? 'ステージ' : 'ステージを えらぼう', 12, topH / 2, fs, { align: 'left', maxW: w - Math.min(240, w * 0.48) - 30 });
    // resources
    const rx = w - 8;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    const resW = Math.min(240, w * 0.48);
    rr(ctx, rx - resW, topH * 0.18, resW, topH * 0.6, topH * 0.3);
    ctx.fill();
    drawGoldIcon(ctx, rx - resW + topH * 0.3, topH / 2, topH * 0.16);
    text(ctx, `${save.gold}`, rx - resW + topH * 0.55, topH / 2, fs * 0.9, { align: 'left', color: '#ffe14d', maxW: resW * 0.4 });
    text(ctx, `🎟${save.tickets}`, rx - 10, topH / 2, fs * 0.9, { align: 'right', color: '#ffd0ea' });
    // bottom bar
    const by = h - botH;
    ctx.fillStyle = '#5a3a1e';
    ctx.fillRect(0, by, w, botH);
    const bw = Math.min(180, (w - 50) / 4);
    const btns: [string, string, keyof typeof STYLES, () => void, boolean][] = [
      ['power', 'つよくする', 'green', () => this.app.go('power'), isCleared(save, 1) && Object.keys(save.units).some((id) => canLevelUp(save, id))],
      ['gacha', 'ガチャ', 'pink', () => this.app.go('gacha'), save.tickets > 0],
      ['missions', 'ミッション', 'blue', () => this.app.go('missions'), claimable(save).length > 0],
      ['zukan', 'ずかん', 'purple', () => this.app.go('zukan'), false],
    ];
    const totalW = bw * 4 + 30;
    btns.forEach(([id, label, st, fn, badge], i) => {
      const r = { x: (w - totalW) / 2 + i * (bw + 10), y: by + 10, w: bw, h: botH - 20 };
      const off = drawButton(ctx, r, STYLES[st], ui.isPressed(id));
      text(ctx, label, r.x + r.w / 2, r.y + off + (r.h - 6) / 2, Math.min(22, r.h * 0.3, bw * 0.14), { color: st === 'cream' ? '#5a3a12' : '#fff', stroke: st === 'cream' ? 'none' : undefined, maxW: bw - 10 });
      if (badge) {
        const bx = r.x + r.w - 6,
          byy = r.y + 4 + Math.sin(this.t * 6) * 3;
        ellipse(ctx, bx, byy, 13, 13);
        ctx.fillStyle = '#ff3b3b';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        text(ctx, '!', bx, byy, 16, { stroke: 'none' });
      }
      ui.add({ id, r, onTap: fn });
    });
    // hint hand toward power-up after first loss or when rich
    if (!save.tut.power && isCleared(save, 2) && save.gold >= 150 && !this.popup && !this.daily) {
      const r = { x: (w - totalW) / 2, y: by + 10, w: bw, h: botH - 20 };
      drawHand(ctx, r.x + r.w * 0.6, r.y + r.h * 0.4 + Math.abs(Math.sin(this.t * 5)) * 10, 24);
    }
    // daily bonus festival stage (after the first boss)
    if (isCleared(save, 6)) {
      const fr = { x: w - 112, y: topH + 8, w: 104, h: 52 };
      const done = (save.today.date === todayKey() && save.today.counts.bonus) || 0;
      const off = drawButton(ctx, fr, done ? STYLES.cream : STYLES.pink, ui.isPressed('fest'), 14);
      text(ctx, 'いもまつり', fr.x + fr.w / 2, fr.y + off + 16, 15, { color: done ? '#a3205f' : '#fff', stroke: done ? 'none' : undefined });
      text(ctx, done ? 'あしたも きてね' : '🎟 きょうの ボーナス', fr.x + fr.w / 2, fr.y + off + 34, 10, { color: done ? '#a3205f' : '#fff36a', stroke: done ? 'none' : '#a3205f', maxW: fr.w - 8 });
      if (!done) {
        ellipse(ctx, fr.x + fr.w - 4, fr.y + 4 + Math.sin(this.t * 6) * 3, 10, 10);
        ctx.fillStyle = '#ff3b3b';
        ctx.fill();
        text(ctx, '!', fr.x + fr.w - 4, fr.y + 4 + Math.sin(this.t * 6) * 3, 13, { stroke: 'none' });
      }
      if (!this.popup && !this.daily) ui.add({ id: 'fest', r: fr, onTap: () => { audio.sfx('whistle'); this.app.go('battle', BONUS_ID); } });
    }
    if (!this.popup && !this.daily && claimable(save).length && !(!save.tut.power && isCleared(save, 2) && save.gold >= 150)) {
      const mr = { x: (w - totalW) / 2 + 2 * (bw + 10), y: by + 10, w: bw, h: botH - 20 };
      text(ctx, 'もらえるよ！', mr.x + mr.w / 2, mr.y - 14 - Math.abs(Math.sin(this.t * 4)) * 4, 14, { color: '#fff36a', stroke: '#1d5aa3' });
    }
    if (this.popup) this.drawPopup(ctx, w, h);
    if (this.daily) this.drawDaily(ctx, w, h);
  }

  private drawDaily(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const ui = this.app.ui;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, w, h);
    const pw = Math.min(360, w - 30),
      ph = Math.min(300, h - 30);
    const px = (w - pw) / 2,
      py = (h - ph) / 2;
    const k = easeOutBack(Math.min(1, this.dailyT / 0.4));
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(k, k);
    ctx.translate(-w / 2, -h / 2);
    panel(ctx, { x: px, y: py, w: pw, h: ph }, '#fff6dd', '#ff8a1f');
    const fs = Math.min(26, pw * 0.075);
    text(ctx, 'きょうの ボーナス！', w / 2, py + fs * 1.3, fs, { color: '#ffd23a' });
    portrait(ctx, 'jaga', px + pw * 0.22, py + ph * 0.45, ph * 0.3, this.t * 2, 0, 'walk');
    drawGoldIcon(ctx, px + pw * 0.48, py + ph * 0.38, fs * 0.5);
    text(ctx, `+${this.daily!.gold}`, px + pw * 0.56, py + ph * 0.38, fs, { align: 'left', color: '#ffe14d' });
    text(ctx, `🎟 ガチャけん +${this.daily!.tickets}`, px + pw * 0.45, py + ph * 0.55, fs * 0.8, { align: 'left', color: '#ff9ccf', maxW: pw * 0.52 });
    text(ctx, 'まいにち あそぶと もらえるよ', w / 2, py + ph * 0.7, fs * 0.6, { color: '#5a3a12', stroke: 'none' });
    const r = { x: px + pw * 0.2, y: py + ph - 70, w: pw * 0.6, h: 54 };
    const off = drawButton(ctx, r, STYLES.orange, ui.isPressed('dailyok'));
    text(ctx, 'やったー！', w / 2, r.y + off + 24, 22);
    ctx.restore();
    ui.add({ id: 'dailyblock', r: { x: 0, y: 0, w, h }, sound: false });
    ui.add({ id: 'dailyok', r, onTap: () => (this.daily = null) });
  }

  private drawPopup(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const st = STAGES[this.popup! - 1];
    const save = this.app.save;
    const ui = this.app.ui;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, w, h);
    ui.add({ id: 'popbg', r: { x: 0, y: 0, w, h }, onTap: () => { if (this.popT > 0.3) this.popup = null; }, sound: false });
    const pw = Math.min(460, w - 24),
      ph = Math.min(400, h - 24);
    const px = (w - pw) / 2,
      py = (h - ph) / 2;
    const k = easeOutBack(Math.min(1, this.popT / 0.3));
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(k, k);
    ctx.translate(-w / 2, -h / 2);
    panel(ctx, { x: px, y: py, w: pw, h: ph }, st.boss ? '#ffe8e0' : '#fff6dd', st.boss ? '#c0392b' : '#8a5a22');
    ui.add({ id: 'popin', r: { x: px, y: py, w: pw, h: ph }, sound: false });
    const fs = Math.min(24, pw * 0.06);
    text(ctx, `ステージ ${st.id}`, w / 2, py + fs * 1.1, fs * 0.75, { color: '#fff', stroke: '#8a5a22' });
    text(ctx, st.name, w / 2, py + fs * 2.4, fs, { color: st.boss ? '#ff5f5f' : '#ffd23a', maxW: pw - 20 });
    // enemies preview
    const ids = [...new Set(st.spawns.map((s) => s.enemy))];
    const es = Math.min(64, (pw - 40) / Math.max(4, ids.length));
    text(ctx, 'でてくる てき', px + 20, py + fs * 3.7, fs * 0.6, { align: 'left', color: '#5a3a12', stroke: 'none' });
    ids.forEach((id, i) => {
      const cx = px + 20 + es / 2 + i * es;
      const cy = py + fs * 3.9 + es * 0.6;
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      rr(ctx, cx - es / 2 + 2, cy - es / 2, es - 4, es, 8);
      ctx.fill();
      portrait(ctx, id, cx, cy, es * 0.8, this.t + i, 1);
      if (ENEMY_MAP[id].boss) text(ctx, 'ボス', cx, cy - es * 0.42, 11, { color: '#ff5f5f' });
    });
    // recommended owned counters
    const traits = new Set(ids.flatMap((id) => ENEMY_MAP[id].traits ?? []));
    const recs = ALLIES.filter((a) => save.units[a.id] && a.strongVs?.some((t) => traits.has(t))).slice(0, 3);
    if (recs.length) {
      const rx = px + pw - 16 - recs.length * 40;
      text(ctx, 'おすすめ', rx - 6, py + fs * 3.7, fs * 0.55, { align: 'right', color: '#c0392b', stroke: 'none' });
      recs.forEach((a, i) => {
        const cx = rx + 20 + i * 40;
        ctx.fillStyle = 'rgba(255,200,60,0.35)';
        rr(ctx, cx - 18, py + fs * 3.7 - 20, 36, 40, 8);
        ctx.fill();
        portrait(ctx, a.id, cx, py + fs * 3.7, 34, this.t + i);
      });
    }
    let y = py + fs * 3.9 + es * 1.35;
    const cleared = isCleared(save, st.id);
    drawGoldIcon(ctx, px + 30, y, fs * 0.45);
    const ps = this.popStar;
    const firstStar = ps === 1 ? !cleared : (save.crowns[st.id] ?? 0) < ps;
    const rw = previewReward(st, firstStar, ps);
    text(ctx, `もらえる: きんいも ${rw}${firstStar ? '（はじめて）' : ''}`, px + 46, y, fs * 0.62, { align: 'left', color: '#5a3a12', stroke: 'none', maxW: pw - 60 });
    y += fs * 1.1;
    const tk = ps > 1 ? (firstStar ? ps - 1 : 0) : ticketReward(st);
    if (firstStar && (tk || (st.unlock && ps === 1))) {
      const parts = [];
      if (tk) parts.push(`ガチャけん ${tk}まい`);
      if (st.unlock && ps === 1) parts.push('あたらしい なかま');
      text(ctx, `＋ ${parts.join('・')}`, px + 46, y, fs * 0.62, { align: 'left', color: '#c0392b', stroke: 'none', maxW: pw - 60 });
      y += fs * 1.1;
    }
    if (st.tip && !cleared) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      const tipH = Math.max(36, py + ph - 80 - y);
      rr(ctx, px + 14, y, pw - 28, Math.min(tipH, 56), 10);
      ctx.fill();
      wrapText(ctx, '💡 ' + st.tip, w / 2, y + Math.min(tipH, 56) / 2, pw - 44, fs * 0.58, '#5a3a12');
    }
    const bh = Math.min(58, ph * 0.16);
    if (cleared) {
      const sh = Math.max(46, bh * 0.7);
      const sy = py + ph - bh - 22 - sh;
      const sw = (pw - 40) / 3;
      for (let k = 1; k <= 3; k++) {
        const r = { x: px + 14 + (k - 1) * (sw + 6), y: sy, w: sw, h: sh };
        const open = k === 1 || (save.crowns[st.id] ?? 1) >= k - 1;
        const sel = this.popStar === k;
        const off = drawButton(ctx, r, open ? (sel ? [STYLES.blue, STYLES.orange, STYLES.pink][k - 1] : STYLES.cream) : { ...STYLES.gray, disabled: true }, ui.isPressed('star' + k), 10);
        text(ctx, (open ? '' : '🔒') + STAR_NAMES[k] + '★'.repeat(k), r.x + r.w / 2, r.y + off + (sh - 6) / 2, sh * 0.34, { color: sel ? '#fff' : '#5a3a12', stroke: sel ? undefined : 'none', maxW: sw - 6 });
        if (open && this.popT > 0.3) ui.add({ id: 'star' + k, r, onTap: () => (this.popStar = k) });
      }
    }
    const go = { x: px + pw * 0.38, y: py + ph - bh - 14, w: pw * 0.56, h: bh };
    const off = drawButton(ctx, go, STYLES.orange, ui.isPressed('go'));
    text(ctx, 'しゅつげき！', go.x + go.w / 2, go.y + off + (bh - 6) / 2, bh * 0.4);
    if (this.popT > 0.3) ui.add({ id: 'go', r: go, onTap: () => { audio.sfx('whistle'); this.app.go('battle', { id: st.id, star: this.popStar }); } });
    const cl = { x: px + pw * 0.06, y: go.y, w: pw * 0.28, h: bh };
    const off2 = drawButton(ctx, cl, STYLES.cream, ui.isPressed('close'));
    text(ctx, 'とじる', cl.x + cl.w / 2, cl.y + off2 + (bh - 6) / 2, bh * 0.32, { color: '#5a3a12', stroke: 'none' });
    if (this.popT > 0.3) ui.add({ id: 'close', r: cl, onTap: () => (this.popup = null) });
    ctx.restore();
  }
}
