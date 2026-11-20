import { drawChar, portrait } from '../art/index';
import { ellipse, type Pose } from '../art/kit';
import { drawBackground, drawEnemyBase, drawPlayerBase } from '../art/scenery';
import type { App, Scene } from '../core/app';
import { audio } from '../core/audio';
import { clamp, drawButton, easeOutBack, font, panel, rr, STYLES, text, type Rect } from '../core/ui';
import { ATTACK_BACKSWING, Battle, KB_TIME, WALLET_MAX_LV, type BEvent, type Fighter } from '../game/battle';
import { ALLY_MAP, isEvolved } from '../game/allies';
import { ENEMY_MAP } from '../game/enemies';
import { MUSIC } from '../game/music';
import { applyLoss, applyWin, type WinResult } from '../game/progress';
import { battleMods } from '../game/research';
import { STAGES, STAR_NAMES, starStage } from '../game/stages';
import { FX } from './fx';

interface Layout {
  portrait: boolean;
  field: Rect;
  scale: number;
  groundY: number;
  top: Rect | null;
  pause: Rect;
  speed: Rect;
  money: Rect;
  mini: Rect;
  units: Rect[];
  wallet: Rect;
  beam: Rect;
}

const HIT_WORDS = ['ポカッ', 'ドカッ', 'バシッ', 'ボコッ', 'ガツン'];
const STEP = 1 / 60;
const POP_T = 0.42;

type TutStep = 'deploy' | 'money' | 'wallet' | 'beam' | 'done';

export class BattleScene implements Scene {
  name = 'battle';
  b: Battle;
  stageId: number;
  fx = new FX();
  camX = -200;
  userCamT = 0;
  shake = 0;
  acc = 0;
  t = 0;
  paused = false;
  banner: { text: string; sub?: string; t: number; color: string; dur: number } | null = null;
  flashT = 0;
  hitStop = 0;
  endHandled = false;
  winRes: WinResult | null = null;
  lossGold = 0;
  resultT = 0;
  L!: Layout;
  tut: TutStep = 'done';
  tutT = 0;
  bossMusic = false;
  dragMini = false;
  beamReadyPlayed = false;
  lastMoney = 0;

  star = 1;
  constructor(private app: App, arg: number | { id: number; star?: number }) {
    const stageId = typeof arg === 'number' ? arg : arg.id;
    this.star = typeof arg === 'number' ? 1 : arg.star ?? 1;
    this.stageId = stageId;
    const stage = starStage(STAGES[stageId - 1], this.star);
    const save = app.save;
    const deck = save.deck.map((id) => ({ id, level: save.units[id] ?? 1 }));
    this.b = new Battle(stage, deck, battleMods(save.research), (Date.now() & 0xffff) + stageId);
    if (stageId === 1 && !save.tut.battle) {
      this.tut = 'deploy';
      this.b.money = Math.max(this.b.money, 100);
    }
  }

  get speed() {
    return this.app.save.speed2 ? 2 : 1;
  }

  enter() {
    audio.playMusic('battle', MUSIC.battle);
    const st = this.b.stage;
    this.banner = { text: st.boss ? 'ボス ステージ！' : 'スタート！', sub: `${st.id}. ${st.name}${this.star > 1 ? '（' + STAR_NAMES[this.star] + '）' : ''}`, t: 0, color: st.boss ? '#ff5f5f' : '#ffd23a', dur: 2.2 };
    audio.sfx('whistle');
  }

  onBack() {
    if (this.b.result) return true;
    this.paused = !this.paused;
    return true;
  }

  // ---------- update ----------
  update(dt: number) {
    this.t += dt;
    if (this.banner) {
      this.banner.t += dt;
      if (this.banner.t > this.banner.dur) this.banner = null;
    }
    if (this.paused) return;
    const frozen = this.tutFrozen();
    if (this.hitStop > 0) this.hitStop -= dt;
    else if (!frozen) {
      this.acc += dt * this.speed;
      let n = 0;
      while (this.acc >= STEP && n < 8) {
        this.b.update(STEP);
        this.acc -= STEP;
        n++;
      }
      if (n >= 8) this.acc = 0;
    }
    this.handleEvents();
    this.popDeaths();
    this.fx.update(dt * (frozen ? 0.3 : 1));
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 30);
    if (this.flashT > 0) this.flashT -= dt;
    if (this.userCamT > 0) this.userCamT -= dt;
    this.updateCamera(dt);
    this.updateTutorial(dt);
    if (this.b.result) this.resultT += dt;
    if (this.b.beam >= 1 && !this.beamReadyPlayed) {
      this.beamReadyPlayed = true;
      audio.sfx('beamReady');
    }
    if (this.b.beam < 1) this.beamReadyPlayed = false;
    if (!this.b.result) {
      if (this.b.bossAlive && !this.bossMusic) {
        this.bossMusic = true;
        audio.playMusic('boss', MUSIC.boss);
      } else if (!this.b.bossAlive && this.bossMusic) {
        this.bossMusic = false;
        audio.playMusic('battle', MUSIC.battle);
      }
    }
  }

  private tutFrozen() {
    return this.tut === 'deploy' || this.tut === 'wallet' || this.tut === 'beam';
  }

  private updateTutorial(dt: number) {
    if (this.tut === 'done') return;
    this.tutT += dt;
    const b = this.b;
    if (this.tut === 'money' && this.tutT > 4 && b.money >= b.walletCost) {
      this.tut = 'wallet';
      this.tutT = 0;
    }
    if ((this.tut === 'money' || this.tut === 'wallet') && b.beam >= 1 && this.tut !== 'wallet') {
      this.tut = 'beam';
      this.tutT = 0;
    }
    if (b.result) this.tut = 'done';
  }

  private updateCamera(dt: number) {
    const L = this.L;
    if (!L) return;
    const viewW = L.field.w / L.scale;
    const minX = -280,
      maxX = this.b.length + 280 - viewW;
    let target = this.camX;
    if (this.b.result) {
      target = this.b.result === 'win' ? this.b.length - viewW * 0.65 : -viewW * 0.35;
    } else if (this.userCamT <= 0) {
      // follow the front line
      let front = 0;
      for (const a of this.b.allies) if (a.state !== 'dead') front = Math.max(front, a.x);
      let enemyFront = this.b.length;
      for (const e of this.b.enemies) if (e.state !== 'dead') enemyFront = Math.min(enemyFront, e.x);
      const focus = Math.min(front + 150, enemyFront) ;
      target = focus - viewW * 0.6;
    }
    if (maxX < minX) {
      this.camX = (minX + maxX) / 2;
      return;
    }
    target = clamp(target, minX, maxX);
    if (this.userCamT <= 0 || this.b.result) this.camX += (target - this.camX) * Math.min(1, dt * 2.2);
    this.camX = clamp(this.camX, minX, maxX);
  }

  onDrag(dx: number, _dy: number, x: number, y: number) {
    if (!this.L || this.paused || this.b.result) return;
    if (this.dragMini) {
      this.camFromMini(x);
      return;
    }
    const f = this.L.field;
    if (y >= f.y && y <= f.y + f.h) {
      this.camX -= dx / this.L.scale;
      this.userCamT = 4;
    }
  }

  onPointerDown(x: number, y: number) {
    const m = this.L?.mini;
    if (m && x >= m.x - 4 && x <= m.x + m.w + 4 && y >= m.y - 12 && y <= m.y + m.h + 12 && !this.paused && !this.b.result) {
      this.dragMini = true;
      this.camFromMini(x);
    }
  }
  onPointerUp() {
    this.dragMini = false;
  }

  private camFromMini(x: number) {
    const m = this.L.mini;
    const total = this.b.length + 560;
    const wx = ((x - m.x) / m.w) * total - 280;
    const viewW = this.L.field.w / this.L.scale;
    this.camX = wx - viewW / 2;
    this.userCamT = 4;
  }

  private popped = new Set<number>();
  private popDeaths() {
    const r = Math.random;
    for (const f of [...this.b.allies, ...this.b.enemies]) {
      if (f.state !== 'dead' || f.t < POP_T || this.popped.has(f.uid)) continue;
      this.popped.add(f.uid);
      const ly = this.laneY(f.lane);
      const dir = f.side === 0 ? 1 : -1;
      const cx = f.x - dir * f.s.width * 0.5;
      const n = 7 + Math.round(f.size * 3);
      for (let i = 0; i < n; i++)
        this.fx.add({ kind: 'puff', x: cx + (r() - 0.5) * 30 * f.size, y: -30 * f.size + ly + (r() - 0.5) * 24, vx: (r() - 0.5) * 120, vy: -r() * 80, max: 0.55, size: 15 * f.size, color: f.side === 0 ? '#fff4dc' : '#f2ead8' });
      for (let i = 0; i < 5; i++) this.fx.add({ kind: 'spark', x: cx, y: -30 * f.size + ly, vx: (r() - 0.5) * 260, vy: -r() * 260, max: 0.5, size: 10, color: f.side === 0 ? '#fff' : '#ffe14d', rot: r() * 6, vr: 10 });
      if (f.side === 0) this.fx.add({ kind: 'soul', x: cx, y: -40 + ly, vy: -55, max: 1.6, size: 10 });
      audio.sfx('pop');
    }
    if (this.popped.size > 500) this.popped.clear();
  }

  private handleEvents() {
    const evs = this.b.events;
    this.b.events = [];
    for (const e of evs) this.onEvent(e);
  }

  private onEvent(e: BEvent) {
    const fx = this.fx;
    const r = Math.random;
    switch (e.type) {
      case 'hit': {
        const y = -26 - e.lane * 0;
        const ly = this.laneY(e.lane);
        if (e.effect) {
          const label = e.effect === 'slow' ? 'おそく！' : e.effect === 'freeze' ? 'ストップ！' : 'ふっとばし！';
          const col = e.effect === 'slow' ? '#d9a6ff' : e.effect === 'freeze' ? '#9be8ff' : '#ffb340';
          fx.add({ kind: 'text', x: e.x, y: y - 40 + ly, vy: -40, max: 0.9, size: 16, color: col, text: label });
          if (e.effect === 'freeze') audio.sfx('freeze');
          break;
        }
        const n = e.big ? 6 : 3;
        for (let i = 0; i < n; i++)
          fx.add({ kind: 'spark', x: e.x + (r() - 0.5) * 20, y: y + ly + (r() - 0.5) * 20, vx: (r() - 0.5) * 160, vy: -r() * 160, max: 0.35, size: e.big ? 14 : 9, color: e.crit ? '#ff5f5f' : r() < 0.5 ? '#fff6a0' : '#ffffff', rot: r() * 6, vr: 8 });
        if (e.big || r() < 0.25) fx.add({ kind: 'flash', x: e.x, y: y + ly, max: 0.18, size: e.big ? 34 : 20, color: '#fffbe0' });
        const dmgColor = e.targetSide === 1 ? '#fff36a' : '#ffb0b0';
        fx.add({ kind: 'text', x: e.x + (r() - 0.5) * 16, y: y - 26 + ly, vy: -70, max: 0.75, size: e.big ? 28 : 20, color: dmgColor, text: String(e.dmg) });
        if (e.big) this.hitStop = Math.max(this.hitStop, 0.045);
        if (e.crit) {
          fx.add({ kind: 'text', x: e.x, y: y - 56 + ly, vy: -40, max: 0.9, size: 22, color: '#ff4040', stroke: '#fff', text: 'クリティカル！', rot: -0.1 });
          audio.sfx('crit');
          this.shake = Math.max(this.shake, 5);
        } else if (e.big && r() < 0.6) {
          fx.add({ kind: 'text', x: e.x + 14, y: y - 52 + ly, vy: -30, max: 0.6, size: 20, color: '#ffe14d', text: HIT_WORDS[Math.floor(r() * HIT_WORDS.length)], rot: (r() - 0.5) * 0.4 });
        }
        audio.sfx(e.big ? 'hit2' : 'hit');
        if (e.big) this.shake = Math.max(this.shake, 3);
        break;
      }
      case 'kb':
        fx.add({ kind: 'puff', x: e.f.x, y: -10 + this.laneY(e.f.lane), max: 0.4, size: 22, color: '#fff' });
        for (let i = 0; i < 4; i++) fx.add({ kind: 'dirt', x: e.f.kbTo, y: -2 + this.laneY(e.f.lane), vx: (r() - 0.5) * 90, vy: -60 - r() * 60, grav: 400, max: 0.9, size: 4, color: '#c9a070' });
        if (!e.f.boss) audio.sfx('kb');
        break;
      case 'death': {
        const f = e.f;
        const ly = this.laneY(f.lane);
        void ly;
        if (f.side === 0) {
          audio.sfx('die');
        } else {
          audio.sfx('enemyDie');
          if (f.boss) {
            this.shake = 14;
            this.flashT = 0.3;
            audio.sfx('boom');
            this.banner = { text: 'ボスを たおした！', t: 0, color: '#ffd23a', dur: 1.8 };
          }
        }
        break;
      }
      case 'money':
        for (let i = 0; i < 3; i++) fx.add({ kind: 'coin', x: e.x + 20, y: -30, vx: (r() - 0.5) * 120, vy: -150 - r() * 100, grav: 500, max: 0.9, size: 6 });
        fx.add({ kind: 'text', x: e.x + 20, y: -70, vy: -40, max: 0.9, size: 15, color: '#ffe14d', text: `+${e.amount}えん` });
        audio.sfx('coin');
        break;
      case 'baseHit': {
        const bx = e.side === 1 ? this.b.length + 70 : -70;
        for (let i = 0; i < 2; i++)
          fx.add({ kind: 'debris', x: bx + (r() - 0.5) * 60, y: -60 - r() * 80, vx: (r() - 0.5) * 200, vy: -100 - r() * 100, grav: 600, max: 1.0, size: 8, color: e.side === 1 ? '#6a4a2a' : '#c0446a', rot: r() * 6, vr: 10 });
        audio.sfx('baseHit');
        break;
      }
      case 'beam':
        audio.sfx('beam');
        this.shake = 6;
        break;
      case 'beamHit':
        this.shake = 12;
        this.flashT = 0.15;
        break;
      case 'boss':
        this.banner = { text: 'ボスが あらわれた！', sub: ENEMY_MAP[e.f.id]?.name, t: 0, color: '#ff5f5f', dur: 2.4 };
        audio.sfx('boss');
        this.userCamT = 0;
        break;
      case 'shockwave':
        fx.add({ kind: 'ring', x: e.x, y: 0, max: 0.9, size: 600, color: '#ffffff' });
        this.shake = 16;
        audio.sfx('shock');
        break;
      case 'burrow':
        if (e.f.s.jump) {
          if (!e.up) fx.add({ kind: 'text', x: e.f.x, y: -90, vy: -30, max: 0.9, size: 18, color: '#8fe36b', text: 'ぴょーん！' });
          audio.sfx('pop');
          break;
        }
        for (let i = 0; i < 8; i++) fx.add({ kind: 'dirt', x: e.f.x + 20, y: -4, vx: (r() - 0.5) * 160, vy: -120 - r() * 120, grav: 600, max: 0.8, size: 5, color: '#7a4a22' });
        break;
      case 'rush':
        this.banner = { text: 'てきの だいぐんだ！', sub: 'かべで まもろう！', t: 0, color: '#ff9a3a', dur: 1.8 };
        audio.sfx('boss');
        break;
      case 'rage':
        this.banner = { text: 'てきが おこってきた！', sub: 'はやく おしろを こわそう！', t: 0, color: '#ff7a3a', dur: 2.4 };
        audio.sfx('boss');
        break;
      case 'end':
        this.onEnd(e.win);
        break;
      case 'deny':
        audio.sfx('deny');
        break;
      case 'wallet':
        audio.sfx('wallet');
        fx.add({ kind: 'text', x: this.camX + this.L.field.w / this.L.scale * 0.2, y: -150, vy: -30, max: 1.2, size: 22, color: '#ffe14d', text: `おさいふ Lv.${this.b.walletLv}！` });
        if (this.tut === 'wallet') {
          this.tut = 'money';
          this.tutT = -999;
        }
        break;
      case 'spawn':
        if (e.f.side === 0) {
          audio.sfx('spawn');
          fx.add({ kind: 'puff', x: e.f.x - 10, y: -10, max: 0.4, size: 22, color: '#fff' });
          if (this.tut === 'deploy') {
            this.tut = 'money';
            this.tutT = 0;
          }
        }
        break;
    }
  }

  private onEnd(win: boolean) {
    if (this.endHandled) return;
    this.endHandled = true;
    const save = this.app.save;
    const stage = this.b.stage;
    const killGold = Math.min(300, this.b.kills * 3);
    save.stats.kills += this.b.kills;
    audio.sfx('boom');
    this.shake = 20;
    this.flashT = 0.4;
    if (win) {
      this.winRes = applyWin(save, stage, killGold, this.star);
      if (stage.id === 1) save.tut.battle = true;
      save.lastStage = Math.min(STAGES.length, stage.id + (this.winRes.first ? 1 : 0));
      const bx = this.b.length + 70;
      for (let i = 0; i < 40; i++)
        this.fx.add({ kind: 'debris', x: bx + (Math.random() - 0.5) * 100, y: -Math.random() * 200, vx: (Math.random() - 0.5) * 400, vy: -200 - Math.random() * 300, grav: 700, max: 2, size: 10, color: ['#6a4a2a', '#3a2a1a', '#9a7a5a'][i % 3], rot: Math.random() * 6, vr: 10 });
      setTimeout(() => audio.jingle('win'), 900);
    } else {
      this.lossGold = applyLoss(save, stage, killGold);
      setTimeout(() => audio.jingle('lose'), 600);
    }
    this.app.persist();
  }

  // ---------- layout ----------
  private layout(w: number, h: number): Layout {
    const portrait = h > w * 1.1;
    if (!portrait) {
      const bottomH = clamp(h * 0.34, 96, 190);
      const field = { x: 0, y: 0, w, h: h - bottomH };
      const scale = Math.min(field.h / 400, w / 560);
      const groundY = field.y + field.h - 48 * scale;
      const by = h - bottomH + 6;
      const sideW = clamp(w * 0.14, 84, 150);
      const wallet = { x: 6, y: by, w: sideW, h: bottomH - 12 };
      const beam = { x: w - sideW - 6, y: by, w: sideW, h: bottomH - 12 };
      const gx = wallet.x + wallet.w + 6,
        gw = beam.x - 6 - gx;
      const units = grid(gx, by, gw, bottomH - 12, 5, 2, 5);
      const hud = clamp(h * 0.11, 34, 52);
      return {
        portrait, field, scale, groundY, top: null,
        pause: { x: 6, y: 6, w: hud, h: hud },
        speed: { x: 12 + hud, y: 6, w: hud * 1.4, h: hud },
        money: { x: w - Math.min(260, w * 0.36) - 6, y: 6, w: Math.min(260, w * 0.36), h: hud },
        mini: { x: w * 0.25, y: field.y + field.h - 12, w: w * 0.5, h: 8 },
        units, wallet, beam,
      };
    }
    const topH = clamp(h * 0.07, 48, 64);
    const scale = Math.min(w / 400, (h * 0.38) / 310);
    const fh = Math.min(h * 0.42, 310 * scale);
    const field = { x: 0, y: topH, w, h: fh };
    const groundY = field.y + field.h - 48 * scale;
    const rest = h - topH - fh;
    const pad = 8;
    const miniH = 22;
    const avail = rest - miniH - pad * 2;
    const rowH = clamp(avail * 0.36, 70, 130);
    const gridH = clamp(avail - rowH - pad, 120, 260);
    const gy = topH + fh + miniH + pad;
    const units = grid(pad, gy, w - pad * 2, gridH, 5, 2, 6);
    const ry = gy + gridH + pad;
    const half = (w - pad * 3) / 2;
    return {
      portrait, field, scale, groundY,
      top: { x: 0, y: 0, w, h: topH },
      pause: { x: 6, y: 6, w: topH - 12, h: topH - 12 },
      speed: { x: topH, y: 6, w: (topH - 12) * 1.4, h: topH - 12 },
      money: { x: w - Math.min(220, w * 0.55) - 6, y: 6, w: Math.min(220, w * 0.55), h: topH - 12 },
      mini: { x: 16, y: topH + fh + 7, w: w - 32, h: 9 },
      units,
      wallet: { x: pad, y: ry, w: half, h: rowH },
      beam: { x: pad * 2 + half, y: ry, w: half, h: rowH },
    };
  }

  private laneY(lane: number) {
    return lane * 16 - 6;
  }

  // ---------- render ----------
  render(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const L = (this.L = this.layout(w, h));
    const b = this.b;
    // panel background
    ctx.fillStyle = '#5a3a1e';
    ctx.fillRect(0, 0, w, h);
    const f = L.field;
    ctx.save();
    ctx.beginPath();
    ctx.rect(f.x, f.y, f.w, f.h);
    ctx.clip();
    const sh = this.shake;
    if (sh > 0) ctx.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);
    const s = L.scale;
    const toX = (x: number) => f.x + (x - this.camX) * s;
    const toY = (y: number) => L.groundY + y * s;
    drawBackground(ctx, w, f.y + f.h, L.groundY, this.camX, s, b.stage.world, this.t);
    // ground fill below field
    // bases
    const pFrac = b.pBase.hp / b.pBase.max,
      eFrac = b.eBase.hp / b.eBase.max;
    const pDestroyed = b.result === 'lose' ? Math.min(1.5, b.endT * 0.8) : 0;
    const eDestroyed = b.result === 'win' ? Math.min(1.5, b.endT * 0.8) : 0;
    ctx.save();
    ctx.translate(toX(0), L.groundY);
    ctx.scale(s, s);
    drawPlayerBase(ctx, pFrac, this.t, b.pBase.hitT, pDestroyed);
    ctx.restore();
    ctx.save();
    ctx.translate(toX(b.length), L.groundY);
    ctx.scale(s, s);
    drawEnemyBase(ctx, eFrac, this.t, b.eBase.hitT, b.stage.world, eDestroyed);
    ctx.restore();
    // base HP labels
    const lblSize = clamp(15 * s * 1.4, 11, 18);
    this.hpPlate(ctx, toX(-70), toY(-250), lblSize, b.pBase.hp, b.pBase.max, '#7dff7d');
    this.hpPlate(ctx, toX(b.length + 70), toY(-268), lblSize, b.eBase.hp, b.eBase.max, '#ff6a6a');

    // fighters sorted by lane (back first)
    const all = [...b.enemies, ...b.allies].sort((a, c) => a.lane - c.lane);
    for (const fi of all) this.drawFighter(ctx, fi, toX, toY, s);
    this.drawBeam(ctx, toX, toY, s);
    this.fx.render(ctx, toX, toY, s);
    if (this.flashT > 0) {
      ctx.fillStyle = `rgba(255,255,240,${Math.min(0.7, this.flashT * 3)})`;
      ctx.fillRect(f.x, f.y, f.w, f.h);
    }
    ctx.restore();

    this.drawBossBar(ctx, L);
    this.drawHud(ctx, L, w);
    this.drawControls(ctx, L);
    this.drawBanner(ctx, w, h, L);
    if (this.tut !== 'done' && !this.paused) this.drawTutorial(ctx, L, w, h);
    if (this.paused) this.drawPause(ctx, w, h);
    if (b.result && this.resultT > 2.2) this.drawResult(ctx, w, h);
  }

  private drawFighter(ctx: CanvasRenderingContext2D, fi: Fighter, toX: (x: number) => number, toY: (y: number) => number, s: number) {
    const dir = fi.side === 0 ? 1 : -1;
    const cx = fi.x - dir * fi.s.width * 0.5;
    let yOff = this.laneY(fi.lane);
    let rot = 0;
    let alpha = 1;
    let state: Pose['state'] = fi.state;
    let atk = 0;
    if (fi.state === 'attack') {
      const fs = fi.s.foreswing;
      atk = fi.t < fs ? (0.5 * fi.t) / fs : 0.5 + (0.5 * (fi.t - fs)) / ATTACK_BACKSWING;
      atk = Math.min(1, atk);
    }
    if (fi.state === 'burrow' && fi.s.jump) {
      const p = 1 - fi.burrowLeft / (fi.s.burrow ?? 1);
      yOff -= Math.sin(Math.min(1, p) * Math.PI) * 110;
      state = 'walk';
    }
    if (fi.state === 'kb') {
      const p = Math.min(1, fi.t / KB_TIME);
      yOff -= Math.sin(p * Math.PI) * 36;
      rot = -dir * 0.35 * Math.sin(p * Math.PI);
    }
    if (fi.state === 'dead') {
      // fly back spinning with X eyes, then pop into a puff (see popDeaths)
      if (fi.t >= POP_T) return;
      const p = fi.t / POP_T;
      fi.x = fi.kbFrom + (fi.kbTo - fi.kbFrom) * p;
      yOff -= Math.sin(p * Math.PI * 0.9) * 46;
      rot = -dir * p * 3.2;
      state = 'dead';
    }
    const sx = toX(cx),
      sy = toY(yOff);
    if (sx < -200 || sx > this.L.field.w + 200) return;
    const sc = s * fi.size;
    // shadow
    if (fi.state !== 'burrow' || fi.s.jump) {
      ctx.globalAlpha = 0.25 * alpha;
      ellipse(ctx, sx, toY(this.laneY(fi.lane)) + 2, fi.s.width * 0.45 * s, 6 * s);
      ctx.fillStyle = '#000';
      ctx.fill();
    }
    ctx.globalAlpha = alpha;
    ctx.save();
    ctx.translate(sx, sy);
    if (rot) ctx.rotate(rot);
    const flashing = fi.flash > 0;
    if (flashing) ctx.filter = 'brightness(1.8)';
    else if (fi.freezeT > 0) ctx.filter = 'saturate(0.4) brightness(1.15) hue-rotate(160deg)';
    drawChar(ctx, fi.id, 0, 0, sc, { t: this.t + fi.uid, walk: fi.walkT, state, atk, hurt: flashing, frozen: fi.freezeT > 0 }, fi.side, fi.evo);
    ctx.filter = 'none';
    ctx.restore();
    ctx.globalAlpha = 1;
    if (fi.freezeT > 0 && fi.state !== 'dead') {
      ctx.fillStyle = 'rgba(160,230,255,0.35)';
      rr(ctx, sx - 30 * sc, sy - 64 * sc, 60 * sc, 64 * sc, 6 * sc);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (fi.slowT > 0 && fi.state !== 'dead') {
      ctx.fillStyle = 'rgba(170,90,230,0.7)';
      for (let i = 0; i < 3; i++) {
        const py = sy - ((this.t * 40 + i * 20) % 50) * s;
        ellipse(ctx, sx + (i - 1) * 12 * sc, py, 3 * s + 1, 3 * s + 1);
        ctx.fill();
      }
    }
    // small hp bar for hurt enemies
    if (fi.side === 1 && !fi.boss && fi.hp < fi.maxHp && fi.state !== 'dead' && fi.state !== 'burrow') {
      const bw = Math.max(26, fi.s.width * 0.8 * s);
      const by = sy - 78 * sc;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(sx - bw / 2 - 1, by - 1, bw + 2, 6);
      ctx.fillStyle = '#ff5f5f';
      ctx.fillRect(sx - bw / 2, by, bw * (fi.hp / fi.maxHp), 4);
    }
  }

  private hpPlate(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, hp: number, max: number, color: string) {
    const label = `${Math.ceil(hp)}/${max}`;
    ctx.font = font(size);
    const w = Math.max(ctx.measureText(label).width + 16, 70);
    ctx.fillStyle = 'rgba(40,20,5,0.7)';
    rr(ctx, x - w / 2, y - size * 0.9, w, size * 2.1, 8);
    ctx.fill();
    ctx.fillStyle = '#3a1a10';
    rr(ctx, x - w / 2 + 5, y + size * 0.55, w - 10, size * 0.4, 3);
    ctx.fill();
    ctx.fillStyle = color;
    rr(ctx, x - w / 2 + 5, y + size * 0.55, (w - 10) * Math.max(0, hp / max), size * 0.4, 3);
    ctx.fill();
    text(ctx, label, x, y - size * 0.1, size, { color: '#fff' });
  }

  private drawBeam(ctx: CanvasRenderingContext2D, toX: (x: number) => number, toY: (y: number) => number, s: number) {
    const bt = this.b.beamT;
    if (bt < 0) return;
    const ox = toX(-60),
      oy = toY(-120);
    if (bt < 0.35) {
      const k = bt / 0.35;
      ctx.fillStyle = `rgba(255,240,120,${0.5 + k * 0.5})`;
      ellipse(ctx, ox, oy, (10 + k * 30) * s, (10 + k * 30) * s);
      ctx.fill();
      for (let i = 0; i < 6; i++) {
        const a = this.t * 10 + i;
        ctx.strokeStyle = '#fff6a0';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(ox + Math.cos(a) * 80 * s * (1 - k), oy + Math.sin(a) * 80 * s * (1 - k));
        ctx.lineTo(ox, oy);
        ctx.stroke();
      }
      return;
    }
    const k = (bt - 0.35) / 0.75;
    const ex = toX(this.b.beamReach);
    const gy = toY(-20);
    const thick = (1 - k) * 60 * s + 10 * s;
    const g = ctx.createLinearGradient(0, gy - thick, 0, gy + thick);
    g.addColorStop(0, 'rgba(255,120,40,0)');
    g.addColorStop(0.3, 'rgba(255,190,60,0.9)');
    g.addColorStop(0.5, 'rgba(255,255,230,1)');
    g.addColorStop(0.7, 'rgba(255,190,60,0.9)');
    g.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(ox, oy - thick * 0.5);
    ctx.lineTo(ox + 60 * s, gy - thick);
    for (let x = ox + 60 * s; x < ex; x += 20) ctx.lineTo(x, gy - thick + Math.sin(x * 0.1 + this.t * 40) * 4);
    ctx.lineTo(ex, gy);
    for (let x = ex; x > ox + 60 * s; x -= 20) ctx.lineTo(x, gy + thick * 0.6 + Math.sin(x * 0.13 + this.t * 37) * 4);
    ctx.lineTo(ox, oy + thick * 0.5);
    ctx.closePath();
    ctx.fill();
    // sweet-potato shaped sparkles
    for (let i = 0; i < 8; i++) {
      const px = ox + ((i * 137 + bt * 900) % Math.max(1, ex - ox));
      ctx.fillStyle = '#fff';
      ellipse(ctx, px, gy + Math.sin(i * 3 + this.t * 20) * thick * 0.4, 6 * s + 2, 3 * s + 1);
      ctx.fill();
    }
    if (k < 0.5) text(ctx, 'いもビーーム！', ox + 160 * s, oy - 60 * s, clamp(36 * s, 18, 40), { color: '#ffe14d' });
  }

  private drawBossBar(ctx: CanvasRenderingContext2D, L: Layout) {
    const boss = this.b.enemies.find((e) => e.boss && e.state !== 'dead');
    if (!boss) return;
    const bw = Math.min(360, L.field.w * 0.5);
    const x = L.field.x + (L.field.w - bw) / 2;
    const y = L.field.y + (L.portrait ? 8 : 52);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    rr(ctx, x - 4, y - 4, bw + 8, 24, 8);
    ctx.fill();
    ctx.fillStyle = '#5a1a1a';
    rr(ctx, x, y + 6, bw, 10, 5);
    ctx.fill();
    ctx.fillStyle = '#ff4d4d';
    rr(ctx, x, y + 6, bw * (boss.hp / boss.maxHp), 10, 5);
    ctx.fill();
    text(ctx, `ボス ${ENEMY_MAP[boss.id].name}`, x + 6, y + 1, 12, { align: 'left' });
  }

  private drawHud(ctx: CanvasRenderingContext2D, L: Layout, w: number) {
    const b = this.b;
    if (L.top) {
      const g = ctx.createLinearGradient(0, 0, 0, L.top.h);
      g.addColorStop(0, '#7a4a22');
      g.addColorStop(1, '#5a3a1e');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, L.top.h);
    }
    // pause
    const ui = this.app.ui;
    drawButton(ctx, L.pause, STYLES.cream, ui.isPressed('pause'));
    ctx.fillStyle = '#5a3a12';
    const p = L.pause;
    ctx.fillRect(p.x + p.w * 0.32, p.y + p.h * 0.25, p.w * 0.12, p.h * 0.42);
    ctx.fillRect(p.x + p.w * 0.56, p.y + p.h * 0.25, p.w * 0.12, p.h * 0.42);
    ui.add({ id: 'pause', r: p, onTap: () => (this.paused = true) });
    // speed
    const sp = this.app.save.speed2;
    drawButton(ctx, L.speed, sp ? STYLES.orange : STYLES.cream, ui.isPressed('speed'));
    text(ctx, sp ? '▶▶x2' : '▶x1', L.speed.x + L.speed.w / 2, L.speed.y + L.speed.h * 0.45, L.speed.h * 0.36, { color: sp ? '#fff' : '#5a3a12', stroke: sp ? '#a34e00' : 'none' });
    ui.add({ id: 'speed', r: L.speed, onTap: () => { this.app.save.speed2 = !this.app.save.speed2; this.app.persist(); } });
    // money
    const m = L.money;
    ctx.fillStyle = 'rgba(40,20,5,0.65)';
    rr(ctx, m.x, m.y, m.w, m.h, m.h / 2);
    ctx.fill();
    ctx.fillStyle = b.money >= b.cap ? 'rgba(125,255,125,0.35)' : 'rgba(255,210,60,0.3)';
    rr(ctx, m.x + 3, m.y + 3, Math.max(m.h, (m.w - 6) * (b.money / b.cap)), m.h - 6, (m.h - 6) / 2);
    ctx.fill();
    ctx.fillStyle = '#ffd23a';
    ellipse(ctx, m.x + m.h / 2, m.y + m.h / 2, m.h * 0.34, m.h * 0.34);
    ctx.fill();
    ctx.strokeStyle = '#a36a00';
    ctx.lineWidth = 2;
    ctx.stroke();
    text(ctx, 'えん', m.x + m.h / 2, m.y + m.h / 2 + 1, m.h * 0.24, { color: '#a36a00', stroke: 'none' });
    const full = b.money >= b.cap;
    text(ctx, `${Math.floor(b.money)}`, m.x + m.w * 0.62, m.y + m.h / 2, m.h * 0.5, { color: full ? '#7dff7d' : '#ffe14d', align: 'right', maxW: m.w * 0.42 });
    text(ctx, `/${b.cap}`, m.x + m.w * 0.64, m.y + m.h / 2 + 2, m.h * 0.34, { color: '#fff', align: 'left', maxW: m.w * 0.33 });
    // minimap
    const mm = L.mini;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    rr(ctx, mm.x - 3, mm.y - 3, mm.w + 6, mm.h + 6, 6);
    ctx.fill();
    const total = b.length + 560;
    const mx = (x: number) => mm.x + ((x + 280) / total) * mm.w;
    ctx.fillStyle = '#e6648a';
    ctx.fillRect(mx(-120), mm.y - 2, 6, mm.h + 4);
    ctx.fillStyle = '#5a3a22';
    ctx.fillRect(mx(b.length + 60), mm.y - 2, 6, mm.h + 4);
    for (const a of b.allies) if (a.state !== 'dead') {
      ctx.fillStyle = '#ffd23a';
      ctx.fillRect(mx(a.x) - 1.5, mm.y + 1, 3, mm.h - 2);
    }
    for (const e of b.enemies) if (e.state !== 'dead') {
      ctx.fillStyle = e.boss ? '#ff2222' : '#ff7a7a';
      ctx.fillRect(mx(e.x) - (e.boss ? 3 : 1.5), mm.y + (e.boss ? -2 : 1), e.boss ? 6 : 3, e.boss ? mm.h + 4 : mm.h - 2);
    }
    const viewW = L.field.w / L.scale;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(mx(this.camX), mm.y - 3, (viewW / total) * mm.w, mm.h + 6);
  }

  private drawControls(ctx: CanvasRenderingContext2D, L: Layout) {
    const b = this.b;
    const ui = this.app.ui;
    const t = this.t;
    // units
    L.units.forEach((r, i) => {
      const slot = b.slots[i];
      if (!slot) {
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        rr(ctx, r.x, r.y, r.w, r.h, 10);
        ctx.fill();
        return;
      }
      const ready = b.canDeploy(i);
      const affordable = b.money >= slot.def.cost;
      const pressed = ui.isPressed('u' + i);
      const off = pressed ? 3 : 0;
      // card
      ctx.fillStyle = '#3a2410';
      rr(ctx, r.x, r.y + 3, r.w, r.h - 3, 10);
      ctx.fill();
      const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
      const cooling = slot.cd > 0;
      g.addColorStop(0, ready ? '#fff8e0' : cooling ? '#cfc4b0' : '#efe4cc');
      g.addColorStop(1, ready ? '#ffe2a0' : cooling ? '#a89c88' : '#d8c8a8');
      ctx.fillStyle = g;
      rr(ctx, r.x, r.y + off, r.w, r.h - 3, 10);
      ctx.fill();
      if (ready) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = `rgba(255,${180 + Math.sin(t * 6) * 60},0,1)`;
        ctx.stroke();
      }
      // portrait
      ctx.save();
      rr(ctx, r.x + 2, r.y + off + 2, r.w - 4, r.h - 7, 8);
      ctx.clip();
      const ps = Math.min(r.w * 0.95, (r.h - 3) * 0.85);
      if (!ready) ctx.globalAlpha = slot.cd > 0 ? 0.55 : 0.85;
      portrait(ctx, slot.def.id, r.x + r.w / 2, r.y + off + (r.h - 3) * 0.42, ps, t * (ready ? 1 : 0), 0, ready ? 'idle' : 'portrait', isEvolved(slot.level));
      ctx.globalAlpha = 1;
      // cooldown overlay
      if (slot.cd > 0) {
        const k = slot.cd / slot.def.cooldown;
        ctx.fillStyle = 'rgba(30,20,10,0.55)';
        ctx.fillRect(r.x, r.y + off, r.w, (r.h - 3) * k);
      }
      ctx.restore();
      // cost
      const cs = clamp(r.h * 0.2, 10, 17);
      text(ctx, `${slot.def.cost}えん`, r.x + r.w / 2, r.y + off + r.h - 3 - cs * 0.75, cs, { color: affordable ? '#fff' : '#ff8080', maxW: r.w - 6 });
      if (slot.cd > 0) {
        ctx.fillStyle = '#3a2410';
        ctx.fillRect(r.x + 6, r.y + off + 5, r.w - 12, 5);
        ctx.fillStyle = '#7cc8ff';
        ctx.fillRect(r.x + 6, r.y + off + 5, (r.w - 12) * (1 - slot.cd / slot.def.cooldown), 5);
      }
      ui.add({ id: 'u' + i, r, onDown: () => this.tapUnit(i) });
    });
    // wallet
    const wl = L.wallet;
    const canW = b.canUpgradeWallet();
    const maxed = b.walletLv >= WALLET_MAX_LV;
    const off = drawButton(ctx, wl, { ...(canW ? STYLES.green : STYLES.gray) }, ui.isPressed('wallet'), 14);
    const ws = Math.min(wl.w * 0.2, wl.h * 0.2);
    this.drawWalletIcon(ctx, wl.x + wl.w * 0.5, wl.y + off + wl.h * 0.47, Math.min(wl.w * 0.22, wl.h * 0.17), canW);
    text(ctx, `おさいふ Lv.${b.walletLv}`, wl.x + wl.w / 2, wl.y + off + wl.h * 0.16, ws * 0.75, { maxW: wl.w - 10 });
    text(ctx, maxed ? 'MAX' : `${b.walletCost}えん`, wl.x + wl.w / 2, wl.y + off + wl.h * 0.76, ws * 0.9, { color: canW ? '#fff' : '#ffd0d0', maxW: wl.w - 8 });
    if (canW) {
      ctx.save();
      ctx.globalAlpha = 0.5 + Math.sin(t * 8) * 0.3;
      text(ctx, '▲', wl.x + wl.w - ws, wl.y + off + ws, ws * 1.1, { color: '#ffe14d' });
      ctx.restore();
    }
    ui.add({ id: 'wallet', r: wl, onDown: () => this.tapWallet() });
    // beam
    const bm = L.beam;
    const ready = b.beam >= 1 && b.beamT < 0;
    const boff = drawButton(ctx, bm, ready ? STYLES.orange : STYLES.gray, ui.isPressed('beam'), 14);
    const cx = bm.x + bm.w / 2,
      cy = bm.y + boff + bm.h * 0.4;
    const rad = Math.min(bm.w, bm.h) * 0.28;
    ctx.lineWidth = Math.max(4, rad * 0.25);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = ready ? '#fff6a0' : '#7cc8ff';
    ctx.beginPath();
    ctx.arc(cx, cy, rad, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * b.beam);
    ctx.stroke();
    // little potato in the gauge
    portrait(ctx, 'satsu', cx, cy, rad * 1.6, ready ? t * 3 : 0, 0, ready ? 'attack' : 'idle');
    text(ctx, ready ? 'いもビーム！' : 'じゅうでん中', cx, bm.y + boff + bm.h * 0.8, Math.min(bm.w * 0.13, bm.h * 0.17), { color: ready ? '#fff' : '#e0e0e0', maxW: bm.w - 8 });
    if (ready) {
      ctx.save();
      ctx.globalAlpha = 0.3 + Math.sin(t * 10) * 0.25;
      ctx.fillStyle = '#fff6a0';
      rr(ctx, bm.x, bm.y + boff, bm.w, bm.h - 6, 14);
      ctx.fill();
      ctx.restore();
    }
    ui.add({ id: 'beam', r: bm, onDown: () => this.tapBeam() });
  }

  private drawWalletIcon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, glow: boolean) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#a0522d';
    rr(ctx, -r, -r * 0.6, r * 2, r * 1.3, r * 0.3);
    ctx.fill();
    ctx.strokeStyle = '#3b2412';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = glow ? '#ffe14d' : '#d0b070';
    ellipse(ctx, 0, -r * 0.65, r * 0.45, r * 0.45);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffd23a';
    rr(ctx, r * 0.4, -r * 0.1, r * 0.6, r * 0.4, 4);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private tapUnit(i: number) {
    if (this.paused || this.b.result) return;
    if (this.tut === 'wallet' || this.tut === 'beam') return;
    this.b.deploy(i);
  }
  private tapWallet() {
    if (this.paused || this.b.result) return;
    if (this.tut === 'deploy' || this.tut === 'beam') return;
    this.b.upgradeWallet();
  }
  private tapBeam() {
    if (this.paused || this.b.result) return;
    if (this.tut === 'deploy' || this.tut === 'wallet') return;
    if (this.b.fireBeam() && this.tut === 'beam') {
      this.tut = 'done';
      this.app.save.tut.battle = true;
    }
  }

  private drawBanner(ctx: CanvasRenderingContext2D, w: number, h: number, L: Layout) {
    const bn = this.banner;
    if (!bn) return;
    const k = bn.t / bn.dur;
    const appear = easeOutBack(Math.min(1, bn.t / 0.35));
    const alpha = k > 0.8 ? (1 - k) / 0.2 : 1;
    const cy = L.field.y + L.field.h * 0.38;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, cy - 44, w, 88);
    ctx.translate(w / 2, cy - 6);
    ctx.scale(appear, appear);
    const size = clamp(w * 0.08, 26, 54);
    text(ctx, bn.text, 0, 0, size, { color: bn.color, lw: size * 0.25 });
    if (bn.sub) text(ctx, bn.sub, 0, size * 0.85, size * 0.45, { color: '#fff' });
    ctx.restore();
  }

  private drawTutorial(ctx: CanvasRenderingContext2D, L: Layout, w: number, h: number) {
    let target: Rect | null = null;
    let msg = '';
    if (this.tut === 'deploy') {
      target = L.units[0];
      msg = 'じゃがいもを タップして しゅつげき！';
    } else if (this.tut === 'money') {
      if (this.tutT < 0 || this.tutT > 5) return;
      target = L.money;
      msg = 'おかねは じどうで たまるよ。てきの おしろを こわせば かち！';
    } else if (this.tut === 'wallet') {
      target = L.wallet;
      msg = 'おさいふを レベルアップ！ おかねが はやく たまるよ';
    } else if (this.tut === 'beam') {
      target = L.beam;
      msg = 'いもビームが たまった！ タップして はっしゃ！';
    }
    if (!target) return;
    const frozen = this.tutFrozen();
    if (frozen) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.rect(0, 0, w, h);
      rr(ctx, target.x - 6, target.y - 6, target.w + 12, target.h + 12, 14);
      ctx.fill('evenodd');
      ctx.restore();
    }
    ctx.strokeStyle = '#ffe14d';
    ctx.lineWidth = 4;
    rr(ctx, target.x - 6, target.y - 6, target.w + 12, target.h + 12, 14);
    ctx.stroke();
    // bouncing hand
    const bounce = Math.abs(Math.sin(this.t * 5)) * 12;
    const hx = target.x + target.w * 0.6,
      hy = target.y + target.h * 0.55 + bounce;
    drawHand(ctx, hx, hy, 26);
    // bubble
    const bw = Math.min(w - 20, 440);
    const above = target.y > h * 0.4;
    const by = above ? Math.max(8, target.y - 90) : Math.min(h - 80, target.y + target.h + 16);
    const bx = clamp(target.x + target.w / 2 - bw / 2, 10, w - bw - 10);
    panel(ctx, { x: bx, y: by, w: bw, h: 70 }, '#fffef5', '#ff8a1f', 16);
    wrapText(ctx, msg, bx + bw / 2, by + 35, bw - 24, clamp(w * 0.04, 14, 20), '#5a3a12');
  }

  private drawPause(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, w, h);
    const pw = Math.min(340, w - 40),
      ph = Math.min(360, h - 30);
    const px = (w - pw) / 2,
      py = (h - ph) / 2;
    panel(ctx, { x: px, y: py, w: pw, h: ph });
    text(ctx, 'ちょっと きゅうけい', w / 2, py + ph * 0.12, Math.min(26, pw * 0.08), { color: '#ffe14d' });
    const ui = this.app.ui;
    const bh = Math.min(56, ph * 0.17);
    const items: [string, string, keyof typeof STYLES, () => void][] = [
      ['resume', 'つづける', 'green', () => (this.paused = false)],
      ['retry', 'やりなおす', 'orange', () => this.app.go('battle', { id: this.stageId, star: this.star })],
      ['quit', 'マップに もどる', 'blue', () => this.app.go('map')],
      ['sound', audio.muted ? 'おと: オフ' : 'おと: オン', 'cream', () => { audio.setMuted(!audio.muted); this.app.save.muted = audio.muted; this.app.persist(); }],
    ];
    items.forEach(([id, label, st, fn], i) => {
      const r = { x: px + pw * 0.12, y: py + ph * 0.24 + i * (bh + 10), w: pw * 0.76, h: bh };
      const off = drawButton(ctx, r, STYLES[st], ui.isPressed(id));
      text(ctx, label, r.x + r.w / 2, r.y + off + (r.h - 6) / 2, bh * 0.38, { color: st === 'cream' ? '#5a3a12' : '#fff', stroke: st === 'cream' ? 'none' : undefined });
      ui.add({ id, r, onTap: fn });
    });
  }

  private drawResult(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const k = Math.min(1, (this.resultT - 2.2) / 0.4);
    ctx.fillStyle = `rgba(0,0,0,${0.5 * k})`;
    ctx.fillRect(0, 0, w, h);
    const win = this.b.result === 'win';
    const pw = Math.min(420, w - 24),
      ph = Math.min(400, h - 20);
    const px = (w - pw) / 2,
      py = (h - ph) / 2;
    ctx.save();
    ctx.translate(w / 2, h / 2);
    const sc = easeOutBack(k);
    ctx.scale(sc, sc);
    ctx.translate(-w / 2, -h / 2);
    panel(ctx, { x: px, y: py, w: pw, h: ph }, win ? '#fff6dd' : '#e8e4f0', win ? '#c87a1a' : '#5a5a8a');
    const ts = Math.min(44, pw * 0.12);
    if (win) {
      // rays
      ctx.save();
      ctx.translate(w / 2, py + ph * 0.13);
      ctx.rotate(this.t * 0.5);
      ctx.fillStyle = 'rgba(255,210,60,0.25)';
      for (let i = 0; i < 12; i++) {
        ctx.rotate(Math.PI / 6);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-20, -ph * 0.4);
        ctx.lineTo(20, -ph * 0.4);
        ctx.fill();
      }
      ctx.restore();
      text(ctx, 'しょうり！', w / 2, py + ph * 0.13, ts, { color: '#ffd23a', lw: ts * 0.25 });
    } else {
      text(ctx, 'まけちゃった…', w / 2, py + ph * 0.13, ts * 0.85, { color: '#c0c8ff', lw: ts * 0.22 });
    }
    // characters
    const deck = this.b.slots.slice(0, 5);
    deck.forEach((s, i) => {
      const cx = px + pw * (0.18 + i * 0.16);
      portrait(ctx, s.def.id, cx, py + ph * 0.37, Math.min(64, pw * 0.15), this.t * (win ? 2 : 0.3) + i, 0, win ? 'walk' : 'idle');
    });
    const fs = Math.min(22, pw * 0.055);
    let y = py + ph * 0.55;
    if (win && this.winRes) {
      const r = this.winRes;
      // count-up for a satisfying reward moment
      const cnt = Math.min(1, Math.max(0, (this.resultT - 2.7) / 1.0));
      const shown = Math.round(r.gold * cnt);
      if (cnt > 0 && cnt < 1 && Math.floor(this.resultT * 15) !== Math.floor((this.resultT - 1 / 60) * 15)) audio.sfx('coin');
      drawGoldIcon(ctx, px + pw * 0.22, y, fs * 0.7 * (1 + (cnt < 1 ? Math.sin(this.t * 30) * 0.08 : 0)));
      text(ctx, `きんいも +${shown}`, px + pw * 0.3, y, fs * (cnt >= 1 ? 1.1 : 1), { color: '#ffe14d', align: 'left' });
      y += fs * 1.5;
      if (r.tickets) {
        text(ctx, `🎟 ガチャけん +${r.tickets}`, w / 2, y, fs * 0.9, { color: '#ff9ccf' });
        y += fs * 1.4;
      }
      if (r.unlocked) {
        const pulse = 1 + Math.sin(this.t * 6) * 0.05;
        ctx.save();
        ctx.translate(w / 2, y + 2);
        ctx.scale(pulse, pulse);
        text(ctx, `あたらしい なかま！「${ALLY_MAP[r.unlocked].name}」`, 0, 0, fs * 0.9, { color: '#7dff7d', maxW: pw - 20 });
        ctx.restore();
        y += fs * 1.4;
      }
      if (r.chest && this.resultT > 3.9) {
        const k2 = easeOutBack(Math.min(1, (this.resultT - 3.9) / 0.4));
        ctx.save();
        ctx.translate(w / 2, y);
        ctx.scale(k2, k2);
        drawChest(ctx, -fs * 4.2, 0, fs * 0.9, this.t);
        text(ctx, r.chest.kind === 'ticket' ? 'たからばこ！ ガチャけん +1' : `たからばこ！ きんいも +${r.chest.amount}`, fs * 0.6, 0, fs * 0.85, { color: '#ffd23a', maxW: pw - fs * 5 });
        ctx.restore();
        y += fs * 1.4;
      }
    } else {
      text(ctx, `きんいも +${this.lossGold}`, w / 2, y, fs, { color: '#ffe14d' });
      y += fs * 1.5;
      const foe = Object.entries(this.b.killedBy).sort((a, c) => c[1] - a[1])[0]?.[0];
      if (foe) {
        const ed = ENEMY_MAP[foe];
        portrait(ctx, foe, px + pw * 0.16, y + fs * 0.9, fs * 2.6, this.t, 1);
        void 0;
        text(ctx, `ニガテな てき: ${ed.name}`, px + pw * 0.3, y + fs * 0.3, fs * 0.8, { align: 'left', color: '#ff8080', maxW: pw * 0.66 });
        wrapText(ctx, counterHint(foe, this.app.save.units), px + pw * 0.63, y + fs * 1.6, pw * 0.64, fs * 0.62, '#3a3a6a');
      } else wrapText(ctx, 'パワーアップで なかまを つよくしよう！', w / 2, y + 4, pw - 30, fs * 0.8, '#3a3a6a');
    }
    // buttons
    const ui = this.app.ui;
    const bh = Math.min(54, ph * 0.15);
    const by = py + ph - bh - 16;
    const bw = (pw - 48) / 2;
    const next = STAGES[this.stageId] && win;
    const b1 = { x: px + 16, y: by, w: bw, h: bh };
    const b2 = { x: px + 32 + bw, y: by, w: bw, h: bh };
    if (k >= 1) {
      const o1 = drawButton(ctx, b1, STYLES.blue, ui.isPressed('r1'));
      text(ctx, win ? 'マップへ' : 'パワーアップ', b1.x + bw / 2, b1.y + o1 + (bh - 6) / 2, bh * 0.36, { maxW: bw - 10 });
      ui.add({ id: 'r1', r: b1, onTap: () => this.app.go(win ? 'map' : 'power') });
      const o2 = drawButton(ctx, b2, next ? STYLES.orange : STYLES.green, ui.isPressed('r2'));
      text(ctx, next ? 'つぎの ステージ' : 'もういちど', b2.x + bw / 2, b2.y + o2 + (bh - 6) / 2, bh * 0.36, { maxW: bw - 10 });
      ui.add({ id: 'r2', r: b2, onTap: () => this.app.go(next ? 'map' : 'battle', next ? { focus: this.star > 1 ? this.stageId : this.stageId + 1, open: this.star === 1 } : { id: this.stageId, star: this.star }) });
    }
    ctx.restore();
  }
}

function grid(x: number, y: number, w: number, h: number, cols: number, rows: number, gap: number): Rect[] {
  const cw = (w - gap * (cols - 1)) / cols;
  const ch = (h - gap * (rows - 1)) / rows;
  const out: Rect[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push({ x: x + c * (cw + gap), y: y + r * (ch + gap), w: cw, h: ch });
  return out;
}

export function drawHand(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.4);
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#3b2412';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-s * 0.18, s * 0.05);
  ctx.lineTo(-s * 0.18, s * 0.9);
  ctx.quadraticCurveTo(-s * 0.5, s * 0.75, -s * 0.5, s * 1.0);
  ctx.quadraticCurveTo(-s * 0.3, s * 1.5, s * 0.1, s * 1.7);
  ctx.lineTo(s * 0.6, s * 1.7);
  ctx.quadraticCurveTo(s * 0.8, s * 1.2, s * 0.7, s * 0.9);
  ctx.lineTo(s * 0.7, s * 0.6);
  ctx.quadraticCurveTo(s * 0.55, s * 0.45, s * 0.4, s * 0.6);
  ctx.quadraticCurveTo(s * 0.3, s * 0.45, s * 0.15, s * 0.55);
  ctx.lineTo(s * 0.15, s * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawGoldIcon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.3);
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.3, r * 0.8, 0, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(-r * 0.4, -r * 0.3, 1, 0, 0, r * 1.3);
  g.addColorStop(0, '#fff6b0');
  g.addColorStop(1, '#e8a812');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#8a5a00';
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.4, -r * 0.3, r * 0.3, r * 0.15, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Word-wrap Japanese text (wraps on spaces first, then characters). */
export function wrapText(ctx: CanvasRenderingContext2D, s: string, cx: number, cy: number, maxW: number, size: number, color = '#5a3a12') {
  ctx.font = font(size);
  const lines: string[] = [];
  let cur = '';
  const tokens = s.split(/(?<= )/);
  for (const tok of tokens) {
    const test = cur + tok;
    if (ctx.measureText(test).width > maxW && cur) {
      lines.push(cur.trim());
      cur = tok;
    } else cur = test;
    while (ctx.measureText(cur).width > maxW && cur.length > 1) {
      let i = cur.length - 1;
      while (i > 1 && ctx.measureText(cur.slice(0, i)).width > maxW) i--;
      lines.push(cur.slice(0, i));
      cur = cur.slice(i);
    }
  }
  if (cur.trim()) lines.push(cur.trim());
  const lh = size * 1.3;
  const y0 = cy - ((lines.length - 1) * lh) / 2;
  lines.forEach((l, i) => text(ctx, l, cx, y0 + i * lh, size, { color, stroke: 'none' }));
  return lines.length * lh;
}

const TRAIT_NAME: Record<string, string> = { bug: 'むし', bird: 'とり', beast: 'けもの', boss: 'ボス' };

/** Suggest an owned potato that is strong against this enemy. */
export function counterHint(enemyId: string, owned: Record<string, number>): string {
  const e = ENEMY_MAP[enemyId];
  const traits = e.traits ?? [];
  const counter = Object.keys(owned).map((id) => ALLY_MAP[id]).find((a) => a && a.strongVs?.some((t) => traits.includes(t)));
  if (counter) return `${TRAIT_NAME[counter.strongVs!.find((t) => traits.includes(t))!]}に つよい「${counter.name}」を だそう！`;
  if (e.range >= 200) return 'とおくから うってくる てき。しゃていの ながい なかまで たおそう！';
  if (e.metal) return 'かたい てきは クリティカルで たおそう！「いもけんぴ」や しんかした いもが とくい！';
  if (e.burrow) return 'うしろに まわりこんで くるよ。うしろにも なかまを だそう！';
  return 'パワーアップで なかまを つよくしよう！';
}

function drawChest(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(255,230,100,0.5)';
  ctx.beginPath();
  ctx.arc(0, -s * 0.2, s * 1.4 + Math.sin(t * 6) * 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#a0522d';
  rr(ctx, -s, -s * 0.4, s * 2, s * 1.1, s * 0.15);
  ctx.fill();
  ctx.strokeStyle = '#3b2412';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#c8783a';
  ctx.save();
  ctx.translate(0, -s * 0.4);
  ctx.rotate(-0.4);
  rr(ctx, -s, -s * 0.5, s * 2, s * 0.5, s * 0.2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#ffd23a';
  ctx.fillRect(-s * 0.15, -s * 0.3, s * 0.3, s * 0.35);
  ctx.restore();
}
