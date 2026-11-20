// Pure battle simulation — no rendering, deterministic with a seed.
// The renderer reads state and drains `events` to draw effects.
import { Rng } from '../core/rng';
import { ALLY_MAP, isEvolved, levelMult } from './allies';
import { ENEMY_MAP } from './enemies';
import type { BattleMods } from './research';
import type { AllyDef, CombatStats, StageDef, Trait } from './types';

export type FState = 'walk' | 'idle' | 'attack' | 'kb' | 'dead' | 'burrow';

export interface Fighter {
  uid: number;
  side: 0 | 1; // 0 = potato (moves right), 1 = enemy (moves left)
  id: string;
  s: CombatStats;
  hp: number;
  maxHp: number;
  x: number; // front position
  state: FState;
  t: number; // time in current state
  atkCd: number;
  hitDone: boolean;
  kbCount: number; // knockbacks already taken from damage thresholds
  kbFrom: number;
  kbTo: number;
  slowT: number;
  freezeT: number;
  lane: number; // 0..1 visual depth
  burrowLeft: number;
  burrowed: boolean; // burrow already used
  boss: boolean;
  reward: number;
  flash: number; // render: hit flash timer
  walkT: number; // render: animation phase
  size: number;
  evo: boolean; // evolved potato (visual)
  shield: number; // remaining barrier threshold (0 = broken / none)
}

export type BEvent =
  | { type: 'hit'; x: number; lane: number; side: 0 | 1; dmg: number; crit: boolean; big: boolean; targetSide: 0 | 1 | 2; effect?: 'slow' | 'freeze' | 'knock' | 'block' | 'break' }
  | { type: 'swing'; f: Fighter }
  | { type: 'kb'; f: Fighter }
  | { type: 'death'; f: Fighter }
  | { type: 'spawn'; f: Fighter }
  | { type: 'money'; x: number; amount: number }
  | { type: 'baseHit'; side: 0 | 1; dmg: number }
  | { type: 'beam' }
  | { type: 'beamHit' }
  | { type: 'boss'; f: Fighter }
  | { type: 'shockwave'; x: number }
  | { type: 'burrow'; f: Fighter; up: boolean }
  | { type: 'end'; win: boolean }
  | { type: 'deny' }
  | { type: 'wallet' }
  | { type: 'rage' }
  | { type: 'rush' }
  | { type: 'castleShake' }
  | { type: 'heal'; f: Fighter };

export interface Slot {
  def: AllyDef;
  level: number;
  stats: CombatStats;
  cd: number; // seconds until ready
}

interface SpawnState {
  idx: number;
  next: number;
  spawned: number;
  active: boolean;
  activatedAt: number;
}

export const KB_TIME = 0.5;
export const KB_DIST = 110;
export const ATTACK_BACKSWING = 0.3;
export const MAX_ALLIES = 40;
export const WALLET_MAX_LV = 8;
export const RAGE_START = 110;

export function walletRate(lv: number) {
  return 30 + 12 * (lv - 1);
}
export function walletCap(lv: number) {
  return 600 + 500 * (lv - 1);
}
export function walletUpgradeCost(lv: number) {
  return lv === 1 ? 80 : 60 + 70 * lv;
}

const hasAny = (a?: Trait[], b?: Trait[]) => !!a && !!b && a.some((t) => b.includes(t));

export class Battle {
  stage: StageDef;
  mods: BattleMods;
  rng: Rng;
  time = 0;
  money: number;
  walletLv = 1;
  beam = 0; // 0..1 charge
  beamT = -1; // >=0 while firing
  allies: Fighter[] = [];
  enemies: Fighter[] = [];
  pBase: { hp: number; max: number; hitT: number };
  eBase: { hp: number; max: number; hitT: number };
  slots: Slot[];
  events: BEvent[] = [];
  result: null | 'win' | 'lose' = null;
  endT = 0;
  bossCount = 0;
  bossAlive = false;
  kills = 0;
  /** which enemy defeated how many potatoes (for the loss hint) */
  killedBy: Record<string, number> = {};
  spawned = 0;
  private uid = 1;
  private spawns: SpawnState[];
  private rushQueue: { t: number; enemy: string; mult: number }[] = [];
  private rushIdx = 0;

  constructor(stage: StageDef, deck: { id: string; level: number }[], mods: BattleMods, seed = 1) {
    this.stage = stage;
    this.mods = mods;
    this.rng = new Rng(seed);
    // after the tutorial stages everyone starts with a slightly bigger wallet (kids often forget it)
    if (stage.id >= 3) this.walletLv = 2;
    this.money = Math.min(mods.startMoney, this.cap);
    this.pBase = { hp: mods.castleHp, max: mods.castleHp, hitT: 0 };
    this.eBase = { hp: stage.baseHp, max: stage.baseHp, hitT: 0 };
    this.slots = deck.map((d) => {
      const def = ALLY_MAP[d.id];
      const m = levelMult(d.level);
      const evo = isEvolved(d.level);
      const evoCrit = evo ? 0.08 : 0;
      return { def, level: d.level, stats: { ...def, hp: Math.round(def.hp * m), atk: Math.round(def.atk * m), crit: (def.crit ?? 0) + evoCrit }, cd: 0 };
    });
    this.spawns = stage.spawns.map((_, idx) => ({ idx, next: 0, spawned: 0, active: false, activatedAt: 0 }));
  }

  get cap() {
    return Math.round(walletCap(this.walletLv) * this.mods.walletMult);
  }
  get rate() {
    return walletRate(this.walletLv) * this.mods.incomeMult;
  }
  get length() {
    return this.stage.length;
  }
  get walletCost() {
    return walletUpgradeCost(this.walletLv);
  }

  /** evolved potatoes are 15% cheaper */
  slotCost(i: number) {
    const s = this.slots[i];
    return isEvolved(s.level) ? Math.round(s.def.cost * 0.85) : s.def.cost;
  }

  canDeploy(i: number): boolean {
    const s = this.slots[i];
    if (!s || this.result) return false;
    return s.cd <= 0 && this.money >= this.slotCost(i) && this.allies.filter((a) => a.state !== 'dead').length < MAX_ALLIES;
  }

  deploy(i: number): Fighter | null {
    if (!this.canDeploy(i)) {
      this.events.push({ type: 'deny' });
      return null;
    }
    const s = this.slots[i];
    this.money -= this.slotCost(i);
    s.cd = s.def.cooldown * (isEvolved(s.level) ? 0.85 : 1);
    const f = this.makeFighter(0, s.def.id, s.stats, -14 + this.rng.range(-6, 6), s.def.size * (isEvolved(s.level) ? 1.1 : 1), 0);
    f.evo = isEvolved(s.level);
    this.allies.push(f);
    this.events.push({ type: 'spawn', f });
    return f;
  }

  canUpgradeWallet() {
    return !this.result && this.walletLv < WALLET_MAX_LV && this.money >= this.walletCost;
  }

  upgradeWallet(): boolean {
    if (!this.canUpgradeWallet()) {
      this.events.push({ type: 'deny' });
      return false;
    }
    this.money -= this.walletCost;
    this.walletLv++;
    this.events.push({ type: 'wallet' });
    return true;
  }

  get beamReach() {
    return Math.max(700, this.length * 0.55);
  }

  fireBeam(): boolean {
    if (this.beam < 1 || this.beamT >= 0 || this.result) {
      this.events.push({ type: 'deny' });
      return false;
    }
    this.beam = 0;
    this.beamT = 0;
    this.events.push({ type: 'beam' });
    return true;
  }

  private makeFighter(side: 0 | 1, id: string, s: CombatStats, x: number, size: number, reward: number, boss = false): Fighter {
    return {
      uid: this.uid++, side, id, s, hp: s.hp, maxHp: s.hp, x, state: 'walk', t: 0, atkCd: 0, hitDone: false, kbCount: 0, kbFrom: x, kbTo: x,
      slowT: 0, freezeT: 0, lane: this.rng.next(), burrowLeft: s.burrow ?? 0, burrowed: false, boss, reward, flash: 0, walkT: this.rng.next() * 10, size, evo: false, shield: s.barrier ?? 0,
    };
  }

  /** After a while enemies get angry and stronger, so stalemates always resolve. */
  get rage() {
    return this.time > RAGE_START ? 1 + (this.time - RAGE_START) * 0.015 : 1;
  }

  spawnEnemy(id: string, mult = 100): Fighter {
    const def = ENEMY_MAP[id];
    const m = (mult / 100) * this.rage;
    const s: CombatStats = { ...def, hp: Math.round(def.hp * m), atk: Math.round(def.atk * m) };
    const f = this.makeFighter(1, id, s, this.length + 14 + this.rng.range(-6, 6), def.size, def.reward, !!def.boss);
    f.shield = Math.round((def.barrier ?? 0) * m);
    this.enemies.push(f);
    this.spawned++;
    this.events.push({ type: 'spawn', f });
    if (def.boss) {
      this.bossCount++;
      this.events.push({ type: 'boss', f });
    }
    if (def.shockwave) {
      for (const a of this.allies) if (a.state !== 'dead') this.knockback(a);
      this.events.push({ type: 'shockwave', x: f.x });
    }
    return f;
  }

  private knockback(f: Fighter) {
    if (f.state === 'dead') return;
    const d = f.side === 0 ? -1 : 1;
    f.state = 'kb';
    f.t = 0;
    f.kbFrom = f.x;
    f.kbTo = Math.max(-40, Math.min(this.length + 40, f.x + d * KB_DIST * (f.boss ? 0.6 : 1)));
    f.hitDone = true;
    this.events.push({ type: 'kb', f });
  }

  private targetable(f: Fighter) {
    return f.state !== 'dead' && f.state !== 'kb' && f.state !== 'burrow';
  }

  /** Units in reach of f, plus whether the opposing base is in reach. */
  private findTargets(f: Fighter): { list: Fighter[]; base: boolean } {
    const range = f.s.range;
    const list: Fighter[] = [];
    if (f.side === 0) {
      for (const e of this.enemies) {
        if (!this.targetable(e)) continue;
        if (e.x >= f.x - 25 && e.x <= f.x + range) list.push(e);
      }
      const base = this.length - f.x <= range;
      if (list.length && !f.s.area) {
        let best = list[0];
        for (const e of list) if (e.x < best.x) best = e;
        return { list: [best], base: false };
      }
      return { list, base: base && (f.s.area || list.length === 0) };
    } else {
      if (f.s.thief) {
        // sneak past the potatoes when they get close (handled as a burrow)
        if (!f.burrowed && this.allies.some((a) => this.targetable(a) && a.x <= f.x + 25 && a.x >= f.x - 120)) return { list: [this.allies[0]], base: false };
        return { list, base: f.x <= range };
      }
      for (const a of this.allies) {
        if (!this.targetable(a)) continue;
        if (a.x <= f.x + 25 && a.x >= f.x - range) list.push(a);
      }
      const base = f.x <= range;
      if (list.length && !f.s.area) {
        let best = list[0];
        for (const a of list) if (a.x > best.x) best = a;
        return { list: [best], base: false };
      }
      return { list, base: base && (f.s.area || list.length === 0) };
    }
  }

  private damage(target: Fighter, amount: number, src: Fighter | null, crit: boolean) {
    if (target.state === 'dead') return;
    const before = target.hp;
    target.hp -= amount;
    target.flash = 0.12;
    this.events.push({
      type: 'hit', x: target.x, lane: target.lane, side: src ? src.side : 0, dmg: Math.round(amount), crit, big: amount > 150 || crit, targetSide: target.side,
    });
    if (target.hp <= 0) {
      target.hp = 0;
      target.state = 'dead';
      target.t = 0;
      target.kbFrom = target.x;
      target.kbTo = target.x + (target.side === 0 ? -1 : 1) * 70;
      this.events.push({ type: 'death', f: target });
      if (target.side === 0 && src) this.killedBy[src.id] = (this.killedBy[src.id] ?? 0) + 1;
      if (target.side === 1 && target.boss) {
        // beating the boss rattles the enemy castle
        const dmg = Math.round(this.eBase.max * 0.25);
        this.eBase.hp = Math.max(1, this.eBase.hp - dmg);
        this.eBase.hitT = 0.6;
        this.events.push({ type: 'baseHit', side: 1, dmg });
        this.events.push({ type: 'castleShake' });
      }
      if (target.side === 1) {
        this.kills++;
        if (target.reward > 0) {
          this.money = Math.min(this.cap, this.money + target.reward);
          this.events.push({ type: 'money', x: target.x, amount: target.reward });
        }
      }
      return;
    }
    // threshold knockbacks
    const K = target.s.kb;
    if (K > 1) {
      const nextIdx = target.kbCount + 1;
      if (nextIdx < K) {
        const threshold = target.maxHp * (1 - nextIdx / K);
        if (before > threshold && target.hp <= threshold) {
          target.kbCount = nextIdx;
          this.knockback(target);
        }
      }
    }
  }

  private doHit(f: Fighter) {
    const { list, base } = this.findTargets(f);
    if (!list.length && !base) return;
    this.events.push({ type: 'swing', f });
    if (f.s.heal) {
      const mine = f.side === 0 ? this.allies : this.enemies;
      for (const a of mine) {
        if (a.state === 'dead' || Math.abs(a.x - f.x) > f.s.range || a.hp >= a.maxHp) continue;
        a.hp = Math.min(a.maxHp, a.hp + a.maxHp * f.s.heal);
        this.events.push({ type: 'heal', f: a });
      }
    }
    for (const t of list) {
      let dmg = f.s.atk;
      if (hasAny(f.s.strongVs, t.s.traits)) dmg *= 2.5;
      if (hasAny(t.s.strongVs, f.s.traits)) dmg *= 0.5;
      const crit = !!f.s.crit && this.rng.chance(f.s.crit);
      if (crit) dmg *= 2;
      if (t.s.metal && !crit) dmg = 1;
      if (t.shield > 0) {
        if (dmg < t.shield) {
          this.events.push({ type: 'hit', x: t.x, lane: t.lane, side: f.side, dmg: 0, crit: false, big: false, targetSide: t.side, effect: 'block' });
          continue;
        }
        t.shield = 0;
        this.events.push({ type: 'hit', x: t.x, lane: t.lane, side: f.side, dmg: 0, crit: false, big: true, targetSide: t.side, effect: 'break' });
      }
      this.damage(t, dmg, f, crit);
      const ef = f.s.effect;
      if (ef && t.state !== 'dead' && (!ef.vs || hasAny(ef.vs, t.s.traits)) && this.rng.chance(ef.chance)) {
        const resist = t.boss ? 0.5 : 1;
        if (ef.kind === 'slow') t.slowT = Math.max(t.slowT, ef.dur * resist);
        else if (ef.kind === 'freeze') {
          t.freezeT = Math.max(t.freezeT, ef.dur * resist);
          if (t.state === 'attack') t.state = 'idle';
        } else if (ef.kind === 'knock' && t.state !== 'kb') this.knockback(t);
        this.events.push({ type: 'hit', x: t.x, lane: t.lane, side: f.side, dmg: 0, crit: false, big: false, targetSide: t.side, effect: ef.kind });
      }
    }
    if (base) {
      const b = f.side === 0 ? this.eBase : this.pBase;
      const dmg = f.s.atk;
      b.hp = Math.max(0, b.hp - dmg);
      b.hitT = 0.15;
      this.events.push({ type: 'baseHit', side: f.side === 0 ? 1 : 0, dmg });
    }
  }

  private stepFighter(f: Fighter, dt: number) {
    if (f.flash > 0) f.flash -= dt;
    if (f.state === 'dead') {
      f.t += dt;
      return;
    }
    if (f.state === 'kb') {
      f.t += dt;
      const p = Math.min(1, f.t / KB_TIME);
      f.x = f.kbFrom + (f.kbTo - f.kbFrom) * (1 - (1 - p) * (1 - p));
      if (p >= 1) {
        f.state = 'walk';
        f.t = 0;
      }
      return;
    }
    if (f.freezeT > 0) {
      f.freezeT -= dt;
      return;
    }
    if (f.slowT > 0) f.slowT -= dt;
    f.atkCd -= dt;
    const dir = f.side === 0 ? 1 : -1;
    if (f.state === 'attack') {
      f.t += dt;
      if (!f.hitDone && f.t >= f.s.foreswing) {
        f.hitDone = true;
        this.doHit(f);
      }
      if (f.t >= f.s.foreswing + ATTACK_BACKSWING) {
        f.state = 'idle';
        f.t = 0;
      }
      return;
    }
    if (f.state === 'burrow') {
      const mv = f.s.speed * 1.6 * dt;
      f.x += dir * mv;
      f.burrowLeft -= mv;
      f.walkT += dt;
      if (f.burrowLeft <= 0 || f.x <= 20 || (f.s.thief && f.x <= 230)) {
        f.state = 'walk';
        f.t = 0;
        f.burrowed = true;
        this.events.push({ type: 'burrow', f, up: true });
      }
      return;
    }
    const tg = this.findTargets(f);
    if (tg.list.length || tg.base) {
      if (f.burrowLeft > 0 && !f.burrowed && tg.list.length) {
        f.state = 'burrow';
        f.t = 0;
        this.events.push({ type: 'burrow', f, up: false });
        return;
      }
      if (f.atkCd <= 0) {
        f.state = 'attack';
        f.t = 0;
        f.hitDone = false;
        f.atkCd = f.s.atkInterval;
      } else {
        f.state = 'idle';
        f.t += dt;
      }
    } else {
      f.state = 'walk';
      const sp = f.s.speed * (f.slowT > 0 ? 0.35 : 1);
      f.x += dir * sp * dt;
      f.walkT += dt * (f.slowT > 0 ? 0.35 : 1);
      if (f.side === 0) f.x = Math.min(f.x, this.length - 10);
      else f.x = Math.max(f.x, 10);
    }
  }

  private stepRushes() {
    const rushes = this.stage.rushes ?? [];
    while (this.rushIdx < rushes.length && this.time >= rushes[this.rushIdx].at) {
      const r = rushes[this.rushIdx++];
      for (let i = 0; i < r.count; i++) this.rushQueue.push({ t: this.time + 1.5 + i * 0.45, enemy: r.enemy, mult: r.mult });
      this.events.push({ type: 'rush' });
    }
    while (this.rushQueue.length && this.time >= this.rushQueue[0].t) {
      const q = this.rushQueue.shift()!;
      this.spawnEnemy(q.enemy, q.mult);
    }
  }

  private stepSpawns() {
    this.stepRushes();
    const frac = this.eBase.hp / this.eBase.max;
    const maxE = this.stage.maxEnemies ?? 16;
    let alive = this.enemies.filter((e) => e.state !== 'dead').length;
    this.stage.spawns.forEach((sp, i) => {
      const st = this.spawns[i];
      if (!st.active) {
        if (sp.trigger === undefined || frac <= sp.trigger) {
          st.active = true;
          st.activatedAt = this.time;
          st.next = this.time + sp.start;
        } else return;
      }
      if (sp.count && st.spawned >= sp.count) return;
      if (this.time >= st.next) {
        if (alive >= maxE && !sp.boss) {
          st.next = this.time + 1;
          return;
        }
        this.spawnEnemy(sp.enemy, sp.mult ?? 100);
        alive++;
        st.spawned++;
        const iv = sp.interval ?? [10, 10];
        // when potatoes besiege the castle, the enemies get scared and come out slower
        const siege = this.allies.some((a) => a.state !== 'dead' && a.x > this.length - 260) ? 1.8 : 1;
        st.next = this.time + this.rng.range(iv[0], iv[1]) * siege;
      }
    });
  }

  update(dt: number) {
    if (this.result) {
      this.endT += dt;
      for (const f of this.allies) this.stepEndAnim(f, dt);
      for (const f of this.enemies) this.stepEndAnim(f, dt);
      return;
    }
    const before = this.time;
    this.time += dt;
    if (before < RAGE_START && this.time >= RAGE_START) this.events.push({ type: 'rage' });
    this.money = Math.min(this.cap, this.money + this.rate * dt);
    if (this.beamT < 0) this.beam = Math.min(1, this.beam + dt / this.mods.beamCharge);
    for (const s of this.slots) if (s.cd > 0) s.cd = Math.max(0, s.cd - dt);
    if (this.pBase.hitT > 0) this.pBase.hitT -= dt;
    if (this.eBase.hitT > 0) this.eBase.hitT -= dt;

    if (this.beamT >= 0) {
      const prev = this.beamT;
      this.beamT += dt;
      if (prev < 0.35 && this.beamT >= 0.35) {
        const reach = this.beamReach;
        for (const e of this.enemies) {
          if (e.state === 'dead' || e.x > reach) continue;
          if (e.state === 'burrow') continue;
          this.damage(e, e.s.metal ? 1 : this.mods.beamDmg * (e.boss ? 0.8 : 1), null, false);
          if ((e.state as string) !== 'dead') this.knockback(e);
        }
        this.events.push({ type: 'beamHit' });
      }
      if (this.beamT >= 1.1) this.beamT = -1;
    }

    this.stepSpawns();
    for (const f of this.allies) this.stepFighter(f, dt);
    for (const f of this.enemies) this.stepFighter(f, dt);
    this.allies = this.allies.filter((f) => !(f.state === 'dead' && f.t > 0.9));
    this.enemies = this.enemies.filter((f) => !(f.state === 'dead' && f.t > 0.9));
    this.bossAlive = this.enemies.some((e) => e.boss && e.state !== 'dead');

    if (this.eBase.hp <= 0) {
      this.result = 'win';
      // remaining enemies flee/vanish (no rewards, not counted as kills)
      for (const e of this.enemies)
        if (e.state !== 'dead') {
          e.state = 'dead';
          e.t = 0;
          e.kbFrom = e.x;
          e.kbTo = e.x + 70;
        }
      this.events.push({ type: 'end', win: true });
    } else if (this.pBase.hp <= 0) {
      this.result = 'lose';
      this.events.push({ type: 'end', win: false });
    }
  }

  private stepEndAnim(f: Fighter, dt: number) {
    f.walkT += dt;
    if (f.state === 'dead') f.t += dt;
    if (f.state === 'kb') {
      f.t += dt;
      const p = Math.min(1, f.t / KB_TIME);
      f.x = f.kbFrom + (f.kbTo - f.kbFrom) * (1 - (1 - p) * (1 - p));
    }
  }
}
