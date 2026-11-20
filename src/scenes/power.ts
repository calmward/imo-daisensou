import { portrait, silhouette } from '../art/index';
import { ellipse } from '../art/kit';
import type { App, Scene } from '../core/app';
import { audio } from '../core/audio';
import { clamp, drawButton, panel, rr, STYLES, text, type Rect } from '../core/ui';
import { ALLIES, ALLY_MAP, EVOLVE_LV, isEvolved, levelCost, levelMult, MAX_LEVEL, unitName } from '../game/allies';
import { MUSIC } from '../game/music';
import { canLevelUp, canResearch, doResearch, levelUp } from '../game/progress';
import { RESEARCH, researchCost } from '../game/research';
import { DECK_SIZE } from '../game/save';
import { STAGES } from '../game/stages';
import { drawGoldIcon, drawHand, wrapText } from './battle';

const RARITY_COLOR: Record<string, string> = { N: '#b0a090', R: '#5ab0ff', SR: '#c070ff', UR: '#ffb000' };
const RARITY_LABEL: Record<string, string> = { N: 'ノーマル', R: 'レア', SR: 'スーパーレア', UR: 'ウルトラレア' };

export class PowerScene implements Scene {
  name = 'power';
  t = 0;
  tab: 'units' | 'castle' = 'units';
  sel: string;
  scroll = 0;
  maxScroll = 0;
  popText: { s: string; t: number } | null = null;
  confirmRemove: string | null = null;
  private gridArea: Rect = { x: 0, y: 0, w: 0, h: 0 };

  constructor(private app: App, arg?: { tab?: 'units' | 'castle' }) {
    if (arg?.tab) this.tab = arg.tab;
    this.sel = app.lastNew && app.save.units[app.lastNew] ? app.lastNew : app.save.deck[0] ?? 'jaga';
    app.lastNew = null;
  }

  enter() {
    audio.playMusic('map', MUSIC.map);
  }
  onBack() {
    this.leave2();
    return true;
  }
  private leave2() {
    this.app.save.tut.power = true;
    this.app.persist();
    this.app.go('map');
  }

  update(dt: number) {
    this.t += dt;
    if (this.popText) {
      this.popText.t += dt;
      if (this.popText.t > 1.2) this.popText = null;
    }
  }

  onDrag(_dx: number, dy: number, x: number, y: number) {
    const g = this.gridArea;
    if (x >= g.x && x <= g.x + g.w && y >= g.y && y <= g.y + g.h) this.scroll = clamp(this.scroll - dy, 0, this.maxScroll);
  }
  onWheel(dy: number) {
    this.scroll = clamp(this.scroll + dy, 0, this.maxScroll);
  }

  render(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const save = this.app.save;
    const ui = this.app.ui;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#ffe9b8');
    g.addColorStop(1, '#f5c97a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // polka dots
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let y = 0; y < h; y += 40) for (let x = (y / 40) % 2 ? 20 : 0; x < w; x += 40) {
      ellipse(ctx, x, y, 5, 5);
      ctx.fill();
    }
    const topH = clamp(h * 0.1, 50, 68);
    // header
    const hg = ctx.createLinearGradient(0, 0, 0, topH);
    hg.addColorStop(0, '#8fe36b');
    hg.addColorStop(1, '#4cbf3a');
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, w, topH);
    ctx.fillStyle = '#2a7a1e';
    ctx.fillRect(0, topH - 4, w, 4);
    const bH = Math.max(44, topH - 12);
    const back = { x: 6, y: (topH - bH) / 2, w: topH * 1.5, h: bH };
    const ob = drawButton(ctx, back, STYLES.cream, ui.isPressed('back'));
    text(ctx, '◀ もどる', back.x + back.w / 2, back.y + ob + (back.h - 6) / 2, back.h * 0.34, { color: '#5a3a12', stroke: 'none', maxW: back.w - 6 });
    ui.add({ id: 'back', r: back, onTap: () => this.leave2() });
    // tabs
    const gw = Math.min(150, w * 0.26);
    const tabW = Math.min(150, (w - back.w - gw - 40) / 2);
    const tabs: ['units' | 'castle', string][] = [['units', 'なかま'], ['castle', 'おしろ']];
    tabs.forEach(([id, label], i) => {
      const r = { x: back.x + back.w + 8 + i * (tabW + 6), y: back.y, w: tabW, h: bH };
      const on = this.tab === id;
      const off = drawButton(ctx, r, on ? STYLES.orange : STYLES.cream, ui.isPressed('tab' + id));
      text(ctx, label, r.x + r.w / 2, r.y + off + (r.h - 6) / 2, r.h * 0.4, { color: on ? '#fff' : '#5a3a12', stroke: on ? undefined : 'none', maxW: r.w - 6 });
      ui.add({ id: 'tab' + id, r, onTap: () => { this.tab = id; this.scroll = 0; } });
    });
    // gold
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    rr(ctx, w - gw - 8, topH * 0.2, gw, topH * 0.56, topH * 0.28);
    ctx.fill();
    drawGoldIcon(ctx, w - gw + topH * 0.12, topH / 2, topH * 0.15);
    text(ctx, `${save.gold}`, w - 16, topH / 2, topH * 0.32, { align: 'right', color: '#ffe14d', maxW: gw - 40 });

    const body = { x: 0, y: topH, w, h: h - topH };
    if (this.tab === 'units') this.renderUnits(ctx, body);
    else this.renderCastle(ctx, body);

    if (this.popText) {
      const k = this.popText.t / 1.2;
      ctx.save();
      ctx.globalAlpha = 1 - k;
      text(ctx, this.popText.s, w / 2, h * 0.45 - k * 40, clamp(w * 0.07, 24, 44), { color: '#ffe14d' });
      ctx.restore();
    }
  }

  private renderUnits(ctx: CanvasRenderingContext2D, body: Rect) {
    const save = this.app.save;
    const ui = this.app.ui;
    const portraitMode = body.h > body.w;
    const detail: Rect = portraitMode ? { x: 8, y: body.y + body.h * 0.5 + 4, w: body.w - 16, h: body.h * 0.5 - 12 } : { x: body.w * 0.55, y: body.y + 8, w: body.w * 0.45 - 8, h: body.h - 16 };
    const gridA: Rect = portraitMode ? { x: 8, y: body.y + 8, w: body.w - 16, h: body.h * 0.5 - 12 } : { x: 8, y: body.y + 8, w: body.w * 0.55 - 16, h: body.h - 16 };
    this.gridArea = gridA;
    // deck info
    const fs = clamp(body.w * 0.03, 12, 16);
    text(ctx, `へんせい ${save.deck.length}/${DECK_SIZE}（✓が バトルに でるよ）`, gridA.x + 4, gridA.y + fs * 0.6, fs, { align: 'left', color: '#5a3a12', stroke: 'none', maxW: gridA.w - 8 });
    const cols = clamp(Math.floor(gridA.w / 82), 3, 8);
    const cw = (gridA.w - (cols - 1) * 6) / cols;
    const ch = cw * 1.15;
    const gy0 = gridA.y + fs * 1.4;
    const rows = Math.ceil(ALLIES.length / cols);
    this.maxScroll = Math.max(0, rows * (ch + 6) - (gridA.h - fs * 1.4));
    ctx.save();
    ctx.beginPath();
    ctx.rect(gridA.x - 4, gy0 - 2, gridA.w + 8, gridA.h - fs * 1.4 + 4);
    ctx.clip();
    const list = [...ALLIES].sort((a, b) => (save.units[b.id] ? 1 : 0) - (save.units[a.id] ? 1 : 0));
    list.forEach((a, i) => {
      const r = { x: gridA.x + (i % cols) * (cw + 6), y: gy0 + Math.floor(i / cols) * (ch + 6) - this.scroll, w: cw, h: ch };
      if (r.y > gridA.y + gridA.h || r.y + r.h < gy0) return;
      const owned = !!save.units[a.id];
      const inDeck = save.deck.includes(a.id);
      const selected = this.sel === a.id;
      ctx.fillStyle = selected ? '#ffe14d' : '#8a5a22';
      rr(ctx, r.x - 2, r.y - 2, r.w + 4, r.h + 4, 12);
      ctx.fill();
      ctx.fillStyle = owned ? '#fffaf0' : '#b8b0a4';
      rr(ctx, r.x, r.y, r.w, r.h, 10);
      ctx.fill();
      ctx.fillStyle = RARITY_COLOR[a.rarity];
      rr(ctx, r.x, r.y, r.w, 6, 3);
      ctx.fill();
      if (owned) {
        portrait(ctx, a.id, r.x + r.w / 2, r.y + r.h * 0.44, r.w * 0.78, selected ? this.t * 2 : 0, 0, selected ? 'walk' : 'idle', isEvolved(save.units[a.id]));
        text(ctx, `Lv.${save.units[a.id]}`, r.x + r.w / 2, r.y + r.h - 12, clamp(r.w * 0.17, 10, 15), { color: '#fff' });
        if (canLevelUp(save, a.id)) text(ctx, '▲', r.x + r.w - 10, r.y + 16, 14, { color: '#7dff7d' });
      } else {
        silhouette(ctx, a.id, r.x + r.w / 2, r.y + r.h * 0.44, r.w * 0.78, 0, '#000', 0.35);
        text(ctx, '？', r.x + r.w / 2, r.y + r.h * 0.42, r.w * 0.35, { color: '#fff' });
      }
      if (inDeck) {
        ellipse(ctx, r.x + 13, r.y + 17, 10, 10);
        ctx.fillStyle = '#4cbf3a';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        text(ctx, '✓', r.x + 13, r.y + 17, 13, { stroke: 'none' });
      }
      const top = Math.max(r.y, gy0),
        bot = Math.min(r.y + r.h, gridA.y + gridA.h);
      if (bot - top > 10) ui.add({ id: 'card' + a.id, r: { x: r.x, y: top, w: r.w, h: bot - top }, onTap: () => (this.sel = a.id) });
    });
    ctx.restore();
    if (this.maxScroll > 0) {
      const sh = (gridA.h / (gridA.h + this.maxScroll)) * gridA.h;
      ctx.fillStyle = 'rgba(90,58,18,0.4)';
      rr(ctx, gridA.x + gridA.w + 1, gridA.y + (this.scroll / this.maxScroll) * (gridA.h - sh), 4, sh, 2);
      ctx.fill();
    }
    this.renderDetail(ctx, detail);
  }

  private renderDetail(ctx: CanvasRenderingContext2D, r: Rect) {
    const save = this.app.save;
    const ui = this.app.ui;
    const a = ALLY_MAP[this.sel];
    const owned = !!save.units[a.id];
    panel(ctx, r, '#fffaf0', '#8a5a22', 16);
    const ps = Math.min(r.h * 0.42, r.w * 0.36);
    const fs = clamp(Math.min(r.w * 0.055, r.h * 0.06), 12, 22);
    const px = r.x + ps * 0.6 + 10;
    const py = r.y + ps * 0.6 + 8;
    ctx.fillStyle = 'rgba(140,200,255,0.25)';
    ellipse(ctx, px, py, ps * 0.55, ps * 0.55);
    ctx.fill();
    if (owned) portrait(ctx, a.id, px, py, ps, this.t * 1.5, 0, Math.sin(this.t * 0.7) > 0.6 ? 'attack' : 'walk', isEvolved(save.units[a.id]));
    else {
      silhouette(ctx, a.id, px, py, ps, 0, '#000', 0.3);
    }
    const tx = px + ps * 0.62;
    const tw = r.x + r.w - tx - 10;
    text(ctx, owned ? unitName(a, save.units[a.id]) : '？？？', tx, r.y + fs * 1.1, fs * 1.1, { align: 'left', color: '#ffd23a', maxW: tw });
    ctx.fillStyle = RARITY_COLOR[a.rarity];
    rr(ctx, tx, r.y + fs * 2, Math.min(tw, fs * 6.5), fs * 1.2, fs * 0.6);
    ctx.fill();
    text(ctx, `${RARITY_LABEL[a.rarity]}・${a.role}`, tx + Math.min(tw, fs * 6.5) / 2, r.y + fs * 2.6, fs * 0.65, { maxW: Math.min(tw, fs * 6.5) - 6 });
    if (owned) {
      const lv = save.units[a.id];
      text(ctx, `Lv.${lv}`, tx, r.y + fs * 4.1, fs * 1.1, { align: 'left', color: '#fff' });
      if (!isEvolved(lv)) text(ctx, `Lv.${EVOLVE_LV}で しんか！`, tx + fs * 3.4, r.y + fs * 4.15, fs * 0.6, { align: 'left', color: '#ff8a1f', stroke: 'none', maxW: tw - fs * 3.4 });
      // stats bars
      const m = levelMult(lv);
      const stats: [string, number, number][] = [
        ['たいりょく', Math.round(a.hp * m), 7000],
        ['こうげき', Math.round(a.atk * m), 900],
        ['しゃてい', a.range, 450],
        ['はやさ', a.speed, 140],
      ];
      const sy = r.y + ps * 1.2 + 8;
      const lineH = Math.min(fs * 1.25, (r.h * 0.33) / 4.5);
      stats.forEach(([label, v, max], i) => {
        const y = sy + i * lineH;
        text(ctx, label, r.x + 14, y, lineH * 0.55, { align: 'left', color: '#5a3a12', stroke: 'none' });
        const bx = r.x + 14 + lineH * 3.6,
          bw = r.w - (bx - r.x) - 70;
        ctx.fillStyle = '#e8dcc8';
        rr(ctx, bx, y - lineH * 0.25, bw, lineH * 0.5, lineH * 0.25);
        ctx.fill();
        ctx.fillStyle = ['#ff7a7a', '#ffb340', '#7cc8ff', '#8fe36b'][i];
        rr(ctx, bx, y - lineH * 0.25, Math.max(lineH * 0.5, bw * Math.min(1, Math.sqrt(v / max))), lineH * 0.5, lineH * 0.25);
        ctx.fill();
        text(ctx, String(v), r.x + r.w - 14, y, lineH * 0.5, { align: 'right', color: '#5a3a12', stroke: 'none' });
      });
      const bh0 = clamp(r.h * 0.14, 38, 60);
      if (sy + 4.3 * lineH < r.y + r.h - bh0 - 14) text(ctx, `コスト ${a.cost}えん　つぎまで ${a.cooldown}びょう`, r.x + 14, sy + 4 * lineH, lineH * 0.5, { align: 'left', color: '#8a5a22', stroke: 'none', maxW: r.w - 28 });
      // desc
      const descY = sy + 4.9 * lineH;
      const bh = Math.max(44, bh0);
      const descH = r.y + r.h - bh - 16 - descY;
      if (descH > 18) wrapText(ctx, a.desc, r.x + r.w / 2, descY + descH / 2, r.w - 28, Math.min(fs * 0.7, descH / 2.6), '#5a3a12');
      // buttons
      const by = r.y + r.h - bh - 10;
      const lvR = { x: r.x + 10, y: by, w: r.w * 0.58 - 15, h: bh };
      const maxed = lv >= MAX_LEVEL;
      const cost = levelCost(a, lv);
      const can = canLevelUp(save, a.id);
      const off = drawButton(ctx, lvR, can ? STYLES.green : STYLES.gray, ui.isPressed('lvup'));
      text(ctx, maxed ? 'さいだい レベル' : 'レベルアップ', lvR.x + lvR.w / 2, lvR.y + off + bh * 0.3, bh * 0.28, { maxW: lvR.w - 8 });
      if (!maxed) {
        drawGoldIcon(ctx, lvR.x + lvR.w / 2 - bh * 0.6, lvR.y + off + bh * 0.62, bh * 0.1);
        text(ctx, `${cost}`, lvR.x + lvR.w / 2 + bh * 0.1, lvR.y + off + bh * 0.62, bh * 0.26, { color: can ? '#ffe14d' : '#ffd0d0' });
      }
      if (can && !this.app.save.tut.lvup) drawHand(ctx, lvR.x + lvR.w * 0.7, lvR.y + bh * 0.5 + Math.abs(Math.sin(this.t * 5)) * 8, 22);
      ui.add({ id: 'lvup', r: lvR, onTap: () => {
        if (levelUp(save, a.id)) {
          const evolved = save.units[a.id] === EVOLVE_LV;
          audio.sfx(evolved ? 'fanfare' : 'levelup');
          this.popText = evolved ? { s: `しんか！ ${unitName(a, EVOLVE_LV)}！`, t: -0.8 } : { s: 'レベルアップ！', t: 0 };
          save.tut.lvup = true;
          this.app.persist();
        } else audio.sfx('deny');
      }, sound: false });
      const inDeck = save.deck.includes(a.id);
      const dR = { x: r.x + r.w * 0.58, y: by, w: r.w * 0.42 - 10, h: bh };
      const off2 = drawButton(ctx, dR, inDeck ? STYLES.blue : STYLES.orange, ui.isPressed('deck'));
      text(ctx, inDeck ? (this.confirmRemove === a.id ? 'ほんとに はずす？' : 'はずす') : 'へんせいに いれる', dR.x + dR.w / 2, dR.y + off2 + (bh - 6) / 2, bh * 0.28, { maxW: dR.w - 8 });
      ui.add({ id: 'deck', r: dR, onTap: () => {
        if (inDeck) {
          if (save.deck.length <= 1) audio.sfx('deny');
          else if (this.confirmRemove !== a.id) {
            this.confirmRemove = a.id;
            this.popText = { s: 'もういちど おすと はずすよ', t: 0 };
          } else {
            save.deck = save.deck.filter((d) => d !== a.id);
            this.confirmRemove = null;
          }
        } else if (save.deck.length < DECK_SIZE) save.deck.push(a.id);
        else this.popText = { s: '10たいまで だよ', t: 0 };
        this.app.persist();
      } });
    } else {
      // how to get
      const stage = STAGES.find((s) => s.unlock === a.id);
      const how = a.gacha ? 'ガチャで でるかも！' : stage ? `ステージ ${stage.id} を クリアすると なかまに なるよ` : '';
      wrapText(ctx, how, r.x + r.w / 2, r.y + r.h * 0.7, r.w - 30, fs * 0.85, '#5a3a12');
    }
  }

  private renderCastle(ctx: CanvasRenderingContext2D, body: Rect) {
    const save = this.app.save;
    const ui = this.app.ui;
    const n = RESEARCH.length;
    const twoCol = body.w > 640;
    const cols = twoCol ? 2 : 1;
    const rowsN = Math.ceil(n / cols);
    const gap = 8;
    const rh = Math.min(110, (body.h - 16 - gap * (rowsN - 1)) / rowsN);
    const cw = (body.w - 16 - gap * (cols - 1)) / cols;
    RESEARCH.forEach((rd, i) => {
      const c = i % cols,
        rI = Math.floor(i / cols);
      const r = { x: 8 + c * (cw + gap), y: body.y + 8 + rI * (rh + gap), w: cw, h: rh };
      panel(ctx, r, '#fffaf0', '#8a5a22', 14);
      const lv = save.research[rd.id] ?? 0;
      const fs = clamp(rh * 0.2, 11, 20);
      const icon = ['🏰', '💰', '👛', '⚡', '🔋', '🪙'][i];
      text(ctx, icon, r.x + rh * 0.35, r.y + rh / 2, rh * 0.4, { stroke: 'none' });
      const textW = r.w - rh * 0.7 - Math.min(140, r.w * 0.3) - 26;
      text(ctx, rd.name, r.x + rh * 0.7, r.y + rh * 0.28, fs, { align: 'left', color: '#ffd23a', maxW: textW });
      text(ctx, `Lv.${lv}/${rd.max}`, r.x + rh * 0.7, r.y + rh * 0.55, fs * 0.8, { align: 'left', color: '#fff', maxW: r.w * 0.3 });
      text(ctx, rd.desc, r.x + rh * 0.7, r.y + rh * 0.8, fs * 0.62, { align: 'left', color: '#5a3a12', stroke: 'none', maxW: textW });
      const maxed = lv >= rd.max;
      const cost = researchCost(rd, lv);
      const can = canResearch(save, rd.id);
      const br = { x: r.x + r.w - Math.min(140, r.w * 0.3) - 10, y: r.y + rh * 0.18, w: Math.min(140, r.w * 0.3), h: rh * 0.64 };
      const off = drawButton(ctx, br, can ? STYLES.green : STYLES.gray, ui.isPressed('rs' + rd.id));
      text(ctx, maxed ? 'MAX' : 'つよくする', br.x + br.w / 2, br.y + off + br.h * 0.3, br.h * 0.24, { maxW: br.w - 6 });
      if (!maxed) text(ctx, `${cost}`, br.x + br.w / 2, br.y + off + br.h * 0.62, br.h * 0.24, { color: can ? '#ffe14d' : '#ffd0d0' });
      ui.add({ id: 'rs' + rd.id, r: br, onTap: () => {
        if (doResearch(save, rd.id)) {
          audio.sfx('levelup');
          this.popText = { s: 'つよくなった！', t: 0 };
          this.app.persist();
        } else audio.sfx('deny');
      }, sound: false });
    });
  }
}
