import { portrait } from '../art/index';
import { ellipse, star } from '../art/kit';
import type { App, Scene } from '../core/app';
import { audio } from '../core/audio';
import { clamp, drawButton, easeOutBack, panel, rr, STYLES, text } from '../core/ui';
import { ALLY_MAP } from '../game/allies';
import { canGacha, GACHA_GOLD_COST, rollGacha, type GachaResult } from '../game/gacha';
import { MUSIC } from '../game/music';
import { drawGoldIcon, wrapText } from './battle';

type Phase = 'idle' | 'spin' | 'drop' | 'open' | 'reveal';
const CAPSULE: Record<string, [string, string]> = { N: ['#f2f2f2', '#c8c8c8'], R: ['#7cc8ff', '#3d97f0'], SR: ['#d9a6ff', '#9160f0'], UR: ['#ffe680', '#ffb000'] };

export class GachaScene implements Scene {
  name = 'gacha';
  t = 0;
  phase: Phase = 'idle';
  pt = 0;
  res: GachaResult | null = null;
  confetti: { x: number; y: number; vx: number; vy: number; c: string; r: number }[] = [];
  constructor(private app: App) {}

  enter() {
    audio.playMusic('map', MUSIC.map);
  }
  onBack() {
    if (this.phase === 'idle' || this.phase === 'reveal') this.app.go('map');
    return true;
  }

  update(dt: number) {
    this.t += dt;
    this.pt += dt;
    if (this.phase === 'spin' && this.pt > 1.3) this.setPhase('drop');
    if (this.phase === 'drop' && this.pt > 1.0) this.setPhase('open');
    if (this.phase === 'open' && this.pt > 0.9) {
      this.setPhase('reveal');
      const rare = this.res && this.res.rarity !== 'N';
      audio.sfx(rare ? 'fanfare' : 'coin');
      for (let i = 0; i < (rare ? 80 : 20); i++)
        this.confetti.push({ x: 0.5, y: 0.45, vx: (Math.random() - 0.5) * 1.2, vy: -Math.random() * 1.2, c: ['#ff5fa8', '#ffd23a', '#7cc8ff', '#8fe36b', '#c49bff'][i % 5], r: Math.random() * 6 });
    }
    for (const c of this.confetti) {
      c.x += c.vx * dt * 0.6;
      c.y += c.vy * dt * 0.6;
      c.vy += dt * 1.2;
      c.r += dt * 8;
    }
    this.confetti = this.confetti.filter((c) => c.y < 1.2);
  }

  private setPhase(p: Phase) {
    this.phase = p;
    this.pt = 0;
    if (p === 'drop') audio.sfx('pop');
    if (p === 'open') audio.sfx('charge');
  }

  private pull() {
    const save = this.app.save;
    if (!canGacha(save)) {
      audio.sfx('deny');
      return;
    }
    this.res = rollGacha(save);
    this.app.persist();
    this.setPhase('spin');
    audio.sfx('gacha');
  }

  render(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const save = this.app.save;
    const ui = this.app.ui;
    // bg rays
    const g = ctx.createRadialGradient(w / 2, h * 0.45, 10, w / 2, h * 0.45, Math.max(w, h));
    g.addColorStop(0, '#ffd0ea');
    g.addColorStop(1, '#c86aa8');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h * 0.45);
    ctx.rotate(this.t * 0.2);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    for (let i = 0; i < 16; i++) {
      ctx.rotate(Math.PI / 8);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-40, -Math.max(w, h));
      ctx.lineTo(40, -Math.max(w, h));
      ctx.fill();
    }
    ctx.restore();
    const topH = clamp(h * 0.1, 50, 68);
    text(ctx, 'いもガチャ', w / 2, topH * 0.55, topH * 0.5, { color: '#fff', stroke: '#a3205f' });
    // resources
    text(ctx, `🎟 ガチャけん ${save.tickets}まい`, 12, topH * 1.25, clamp(w * 0.035, 12, 18), { align: 'left', color: '#fff', stroke: '#a3205f' });
    drawGoldIcon(ctx, w - 110, topH * 1.25, 8);
    text(ctx, `${save.gold}`, w - 12, topH * 1.25, clamp(w * 0.035, 12, 18), { align: 'right', color: '#ffe14d', stroke: '#a3205f' });

    // machine
    const ms = Math.min(w * 0.42, h * 0.32);
    const mx = w / 2,
      my = h * 0.42;
    this.drawMachine(ctx, mx, my, ms);

    // capsule anim
    if (this.res && this.phase !== 'idle' && this.phase !== 'spin') {
      const [c1, c2] = CAPSULE[this.res.rarity];
      let cx = mx,
        cy = my + ms * 0.85,
        open = 0,
        cr = ms * 0.18;
      if (this.phase === 'drop') {
        const k = this.pt / 1.0;
        cy = my + ms * 0.55 + Math.abs(Math.sin(k * Math.PI * 2.5)) * -ms * 0.3 * (1 - k) + k * ms * 0.3;
        cx = mx + k * 0;
      } else if (this.phase === 'open') {
        cy = my + ms * 0.85;
        cx = mx + Math.sin(this.pt * 50) * 4;
        cr *= 1 + this.pt * 0.6;
      } else {
        open = 1;
      }
      if (!open) {
        ctx.save();
        ctx.translate(cx, cy);
        ellipse(ctx, 0, 0, cr, cr);
        ctx.fillStyle = c1;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 0, cr, 0, Math.PI);
        ctx.fillStyle = c2;
        ctx.fill();
        ellipse(ctx, 0, 0, cr, cr);
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#3b2412';
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ellipse(ctx, -cr * 0.35, -cr * 0.4, cr * 0.3, cr * 0.15);
        ctx.fill();
        ctx.restore();
      }
    }
    // confetti
    for (const c of this.confetti) {
      ctx.save();
      ctx.translate(c.x * w, c.y * h);
      ctx.rotate(c.r);
      ctx.fillStyle = c.c;
      ctx.fillRect(-5, -3, 10, 6);
      ctx.restore();
    }
    if (this.phase === 'reveal' && this.res) this.drawReveal(ctx, w, h);

    // buttons
    if (this.phase === 'idle' || this.phase === 'reveal') {
      const bh = clamp(h * 0.1, 50, 72);
      const bw = Math.min(300, w * 0.6);
      const r = { x: (w - bw) / 2, y: h - bh * 2 - 30, w: bw, h: bh };
      const can = canGacha(save);
      const off = drawButton(ctx, r, can ? STYLES.pink : STYLES.gray, ui.isPressed('pull'), 18);
      text(ctx, this.phase === 'reveal' ? 'もういっかい！' : 'ガチャを まわす！', w / 2, r.y + off + bh * 0.32, bh * 0.32, { maxW: bw - 10 });
      text(ctx, save.tickets > 0 ? 'ガチャけん 1まい' : `きんいも ${GACHA_GOLD_COST}`, w / 2, r.y + off + bh * 0.66, bh * 0.22, { color: can ? '#fff' : '#ffd0d0', maxW: bw - 10 });
      ui.add({ id: 'pull', r, onTap: () => this.pull(), sound: false });
      const back = { x: (w - bw) / 2, y: h - bh - 16, w: bw, h: bh * 0.8 };
      const ob = drawButton(ctx, back, STYLES.cream, ui.isPressed('gback'));
      text(ctx, 'マップに もどる', w / 2, back.y + ob + (back.h - 6) / 2, back.h * 0.34, { color: '#5a3a12', stroke: 'none' });
      ui.add({ id: 'gback', r: back, onTap: () => this.app.go('map') });
      if (this.phase === 'idle') {
        const fs = clamp(w * 0.03, 11, 15);
        text(ctx, 'でるかも: スイートポテト・いもようかん・いもにんじゃ・ハッシュドポテト・コロッケ・ポテトサラダ・マッシュポテト・だいがくいも・キングさつまいも', w / 2, r.y - fs * 1.2, fs, { color: '#fff', stroke: '#a3205f', maxW: w - 20 });
      }
    }
  }

  private drawMachine(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
    // globe
    ctx.save();
    ctx.translate(x, y);
    const shake = this.phase === 'spin' ? Math.sin(this.pt * 40) * 3 : 0;
    ctx.translate(shake, 0);
    // base
    ctx.fillStyle = '#e8312f';
    rr(ctx, -s * 0.5, s * 0.25, s, s * 0.75, s * 0.12);
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#3b2412';
    ctx.stroke();
    ctx.fillStyle = '#3b2412';
    rr(ctx, -s * 0.18, s * 0.65, s * 0.36, s * 0.28, s * 0.06);
    ctx.fill();
    // handle
    ctx.save();
    ctx.translate(s * 0.25, s * 0.45);
    ctx.rotate(this.phase === 'spin' ? this.pt * 8 : 0);
    ctx.fillStyle = '#ffd23a';
    ctx.fillRect(-s * 0.12, -s * 0.03, s * 0.24, s * 0.06);
    ellipse(ctx, 0, 0, s * 0.07, s * 0.07);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    // glass globe
    ellipse(ctx, 0, -s * 0.1, s * 0.5, s * 0.45);
    ctx.fillStyle = 'rgba(220,245,255,0.75)';
    ctx.fill();
    ctx.stroke();
    // capsules inside
    const cols = ['#7cc8ff', '#d9a6ff', '#ffe680', '#f2f2f2', '#ff9ccf', '#8fe36b'];
    for (let i = 0; i < 14; i++) {
      const a = i * 2.3 + (this.phase === 'spin' ? this.pt * 6 : 0);
      const rr2 = (i % 4) * s * 0.08 + s * 0.06;
      const cx = Math.cos(a) * rr2 * 1.3,
        cy = -s * 0.02 + Math.abs(Math.sin(a)) * s * 0.2 - (i % 3) * s * 0.08;
      ellipse(ctx, cx, cy, s * 0.07, s * 0.07);
      ctx.fillStyle = cols[i % cols.length];
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ellipse(ctx, -s * 0.22, -s * 0.32, s * 0.12, s * 0.06, -0.5);
    ctx.fill();
    // top
    ctx.fillStyle = '#e8312f';
    rr(ctx, -s * 0.2, -s * 0.6, s * 0.4, s * 0.1, s * 0.04);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.stroke();
    text(ctx, 'いも', 0, s * 0.42, s * 0.12, { color: '#fff' });
    ctx.restore();
  }

  private drawReveal(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const res = this.res!;
    const k = easeOutBack(Math.min(1, this.pt / 0.5));
    const pw = Math.min(360, w - 30),
      ph = Math.min(330, h * 0.5, h - clamp(h * 0.1, 50, 72) * 2 - 60 - h * 0.1);
    const px = (w - pw) / 2,
      py = h * 0.1 + 10;
    ctx.save();
    ctx.translate(w / 2, py + ph / 2);
    ctx.scale(k, k);
    ctx.translate(-w / 2, -(py + ph / 2));
    const [c1, c2] = CAPSULE[res.rarity];
    panel(ctx, { x: px, y: py, w: pw, h: ph }, '#fffaf0', c2, 20);
    // glow
    ctx.save();
    ctx.translate(w / 2, py + ph * 0.45);
    ctx.rotate(this.t);
    ctx.fillStyle = c1;
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 8; i++) {
      ctx.rotate(Math.PI / 4);
      star(ctx, 0, -ph * 0.28, 10);
      ctx.fill();
    }
    ctx.restore();
    const fs = Math.min(26, pw * 0.07);
    if (res.kind === 'unit') {
      const a = ALLY_MAP[res.id];
      text(ctx, res.isNew ? 'NEW！ あたらしい なかま！' : 'レベルアップ！', w / 2, py + fs * 1.1, fs * 0.9, { color: res.isNew ? '#ff5fa8' : '#4cbf3a', maxW: pw - 20 });
      portrait(ctx, a.id, w / 2, py + ph * 0.46, ph * 0.42, this.t * 2, 0, 'walk');
      text(ctx, a.name, w / 2, py + ph * 0.76, fs, { color: '#ffd23a' });
      const label = { R: 'レア', SR: 'スーパーレア', UR: 'ウルトラレア！！', N: '' }[res.rarity];
      text(ctx, res.isNew ? label : `Lv.${res.level} に なった！`, w / 2, py + ph * 0.89, fs * 0.65, { color: c2 });
    } else if (res.kind === 'power') {
      const a = ALLY_MAP[res.id];
      text(ctx, 'いもパワー！', w / 2, py + fs * 1.1, fs, { color: '#4cbf3a' });
      portrait(ctx, a.id, w / 2, py + ph * 0.46, ph * 0.42, this.t * 2, 0, 'walk');
      text(ctx, `${a.name} が Lv.${res.level} に なった！`, w / 2, py + ph * 0.8, fs * 0.75, { color: '#ffd23a', maxW: pw - 20 });
    } else {
      text(ctx, 'きんいも ゲット！', w / 2, py + fs * 1.1, fs, { color: '#ffb000' });
      drawGoldIcon(ctx, w / 2, py + ph * 0.45, ph * 0.1);
      text(ctx, `+${res.amount}`, w / 2, py + ph * 0.72, fs * 1.3, { color: '#ffe14d' });
      wrapText(ctx, 'パワーアップに つかおう！', w / 2, py + ph * 0.88, pw - 30, fs * 0.6);
    }
    ctx.restore();
  }
}
