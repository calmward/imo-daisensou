// Pure battle simulation — no rendering, deterministic with a seed.
// The renderer reads state and drains `events` to draw effects.
import { Rng } from '../core/rng';
import { ALLY_MAP, evoStage, isEvolved, levelMult } from './allies';
import { ENEMY_MAP } from './enemies';
import type { BattleMods } from './research';
import type { AllyDef, CombatStats, StageDef, Trait } from './types';

export type FState = 'walk' | 'idle' | 'attack' | 'kb' | 'dead' | 'burrow' | 'revive';

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
  evo: number; // 0 normal, 1 スーパー, 2 ハイパー, 3 ウルトラ (visual)
  shield: number; // remaining barrier threshold (0 = broken / none)
  mult: number; // enemy strength % (passed on to splits/summons)
  revived: boolean;
  rageAt?: number; // rage level when this enemy spawned
  skillT: number[]; // per-skill timers
  skillDone: boolean[]; // 'below' skills already used
  summoned: boolean; // spawned by a boss skill
  burnT: number;
  burnDps: number;
  burnAcc: number;
  age: number;
  hazardAcc: number;
}

export type BEvent =
  | { type: 'hit'; x: number; lane: number; side: 0 | 1; dmg: number; crit: boolean; big: boolean; targetSide: 0 | 1 | 2; effect?: 'slow' | 'freeze' | 'knock' | 'block' | 'break' | 'burn' }
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
  | { type: 'turret'; x: number }
  | { type: 'hatch'; f: Fighter }
  | { type: 'rockWarn' }
  | { type: 'rock'; x: number; broken: boolean }
  | { type: 'revive'; f: Fighter; up: boolean }
  | { type: 'melt'; f: Fighter }
  | { type: 'split'; f: Fighter }
  | { type: 'gust'; dir: 1 | -1; warn: boolean }
  | { type: 'skill'; f: Fighter; kind: string }
  | { type: 'heal'; f: Fighter };

export interface Slot {
  def: AllyDef;
  level: number;
  ultra?: boolean;
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
export const TIME_LIMIT = 420;
export const WALLET_MAX_LV = 8;
export const RAGE_START = 110;
export const REVIVE_TIME = 2;
export const GUST_TIME = 7;
export const ROCK_TIME = 2;

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
/** an ice/fire enemy's revive is cancelled by a potato that is strong against its element */
const canMelt = (src: { s: CombatStats }, target: { s: CombatStats }) =>
  hasAny(src.s.strongVs, (target.s.traits ?? []).filter((t) => t === 'ice' || t === 'fire'));

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
  judged = false;
  endT = 0;
  bossCount = 0;
  bossT0 = -1; // when the first boss appeared
  bossKiller = ''; // which potato finished the (last) boss
  magmaKiller = '';
  bossKillT = -1;
  bossAlive = false;
  kills = 0;
  hatched = 0;
  rocksBroken = 0;
  deploys = 0;
  beamsFired = 0;
  typesUsed = new Set<string>();
  rocks: { x: number; t: number }[] = [];
  private nextRocks = 25;
  eggTaps = 0;
  eggsBroken = 0;
  private rockWarned = false;
  /** which enemy defeated how many potatoes (for the loss hint) */
  killedBy: Record<string, number> = {};
  /** which enemy damaged the potato castle how much (for the loss hint) */
  castleBy: Record<string, number> = {};
  private turretT = 0;
  spawned = 0;
  private uid = 1;
  private spawns: SpawnState[];
  private rushQueue: { t: number; enemy: string; mult: number }[] = [];
  private rushIdx = 0;

  constructor(stage: StageDef, deck: { id: string; level: number; ultra?: boolean }[], mods: BattleMods, seed = 1) {
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
      const m = levelMult(d.level, d.ultra);
      const evo = isEvolved(d.level);
      const es = evoStage(d.level, d.ultra);
      const evoCrit = (evo ? 0.08 : 0) + (es >= 2 ? 0.1 : 0) + (es === 3 ? 0.05 : 0);
      // ウルトラ: fire-proof and strong against fire enemies
      const strongVs = es === 3 ? [...new Set([...(def.strongVs ?? []), 'fire' as const])] : def.strongVs;
      return { def, level: d.level, ultra: es === 3, stats: { ...def, strongVs, hp: Math.round(def.hp * m), atk: Math.round(def.atk * m), crit: (def.crit ?? 0) + evoCrit }, cd: 0 };
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
    const f = this.makeFighter(0, s.def.id, s.stats, -14 + this.rng.range(-6, 6), s.def.size * (isEvolved(s.level) ? 1.1 : 1) * (s.ultra ? 1.12 : 1), 0);
    f.evo = evoStage(s.level, s.ultra);
    this.allies.push(f);
    this.deploys++;
    this.typesUsed.add(s.def.id);
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
    this.beamsFired++;
    this.events.push({ type: 'beam' });
    return true;
  }

  private makeFighter(side: 0 | 1, id: string, s: CombatStats, x: number, size: number, reward: number, boss = false): Fighter {
    return {
      uid: this.uid++, side, id, s, hp: s.hp, maxHp: s.hp, x, state: 'walk', t: 0, atkCd: 0, hitDone: false, kbCount: 0, kbFrom: x, kbTo: x,
      slowT: 0, freezeT: 0, lane: this.rng.next(), burrowLeft: s.burrow ?? 0, burrowed: false, boss, reward, flash: 0, walkT: this.rng.next() * 10, size, evo: 0, shield: s.barrier ?? 0, mult: 100, revived: false, skillT: (s.skills ?? []).map(() => 0), skillDone: (s.skills ?? []).map(() => false), summoned: false, burnT: 0, burnDps: 0, burnAcc: 0, age: 0, hazardAcc: 0,
    };
  }

  /** After a while enemies get angry and stronger, so stalemates always resolve. */
  get rage() {
    const t0 = this.rageStart;
    return this.time > t0 ? 1 + (this.time - t0) * 0.015 : 1;
  }

  /** world 5 rules (time limit, live rage, barrier wear...) apply to stages 49+ and the tower, not the daily bonus stage */
  get w5rules() {
    return this.stage.id >= 49 && this.stage.id !== 100;
  }

  /** world 5+ boss stages: the rage clock follows the boss (starts 60s after it appears, stops once all bosses are beaten) */
  get w5Boss() {
    return !!this.stage.boss && this.w5rules;
  }
  get bossTotal() {
    return this.stage.spawns.filter((s) => s.boss).length;
  }
  get bossesDone() {
    return this.bossCount >= this.bossTotal && !this.bossAlive;
  }
  get rageStart() {
    if (!this.w5Boss) return RAGE_START;
    if (this.bossT0 < 0 || this.bossesDone) return Infinity;
    return this.bossT0 + 60;
  }

  spawnEnemy(id: string, mult = 100, atX?: number): Fighter {
    const def = ENEMY_MAP[id];
    const m = (mult / 100) * this.rage;
    const s: CombatStats = { ...def, hp: Math.round(def.hp * m), atk: Math.round(def.atk * m) };
    const f = this.makeFighter(1, id, s, atX ?? this.length + 14 + this.rng.range(-6, 6), def.size, def.reward, !!def.boss);
    // barriers follow the stage strength but not the rage timer (rage-boosted barriers caused endless stalemates)
    f.shield = Math.round(((def.barrier ?? 0) * mult) / 100);
    f.mult = mult;
    f.rageAt = this.rage;
    this.enemies.push(f);
    this.spawned++;
    this.events.push({ type: 'spawn', f });
    if (def.boss) {
      this.bossCount++;
      if (this.bossT0 < 0) this.bossT0 = this.time;
      this.events.push({ type: 'boss', f });
    }
    if (def.shockwave) {
      for (const a of this.allies) if (a.state !== 'dead') this.knockback(a);
      this.events.push({ type: 'shockwave', x: f.x });
    }
    return f;
  }

  private knockback(f: Fighter) {
    if (f.state === 'revive') return;
    if (f.state === 'burrow') {
      // knocked out of a jump/dig: it doesn't get a second one
      f.burrowed = true;
      f.burrowLeft = 0;
    }
    if (f.state === 'dead') return;
    const d = f.side === 0 ? -1 : 1;
    f.state = 'kb';
    f.t = 0;
    f.kbFrom = f.x;
    f.kbTo = Math.max(-40, Math.min(this.length + 40, f.x + d * KB_DIST * (f.boss ? 0.6 : 1) * (this.stage.mod === 'slippery' ? 1.4 : 1)));
    f.hitDone = true;
    this.events.push({ type: 'kb', f });
  }

  private targetable(f: Fighter) {
    return f.state !== 'dead' && f.state !== 'kb' && f.state !== 'burrow' && f.state !== 'revive';
  }

  /** Units in reach of f, plus whether the opposing base is in reach. */
  private findTargets(f: Fighter): { list: Fighter[]; base: boolean } {
    const range = f.s.range;
    const list: Fighter[] = [];
    if (f.side === 0) {
      for (const e of this.enemies) {
        if (!this.targetable(e) && !(e.state === 'revive' && canMelt(f, e))) continue;
        if (e.x >= f.x - 25 && e.x <= f.x + range) list.push(e);
      }
      const base = this.length - f.x <= range;
      if (list.length && !f.s.area) {
        let best = list[0];
        if (f.s.multiHit && f.s.multiHit > 1) {
          // multi-hitters strike the nearest few enemies
          return { list: [...list].sort((a, b) => a.x - b.x).slice(0, f.s.multiHit), base: false };
        }
        if (f.s.jump) {
          // jumpers go for the back line: healers and long-range enemies first
          const score = (e: Fighter) => (e.s.heal ? 1000 : 0) + e.s.range;
          for (const e of list) if (score(e) > score(best)) best = e;
        } else for (const e of list) if (e.x < best.x) best = e;
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

  private bossDown(target: Fighter, src: Fighter | null) {
    // beating the boss rattles the enemy castle (world 5: much harder, and everyone gets blown back)
    this.bossKiller = src?.id ?? '';
    if (target.id === 'magmaou') this.magmaKiller = src?.id ?? 'beam';
    this.bossKillT = this.time;
    const w5 = this.w5rules;
    const dmg = Math.round(this.eBase.max * (w5 ? 0.5 : 0.25));
    if (w5) for (const e of [...this.enemies]) if (e !== target && this.targetable(e)) this.knockback(e);
    // world 5: beating the last boss can bring the castle down right away (a proper finale)
    const last = w5 && this.bossCount >= this.bossTotal && !this.enemies.some((e) => e.boss && e !== target && e.state !== 'dead');
    this.eBase.hp = Math.max(last ? 0 : 1, this.eBase.hp - dmg);
    this.eBase.hitT = 0.6;
    this.events.push({ type: 'baseHit', side: 1, dmg });
    this.events.push({ type: 'castleShake' });
  }

  private damage(target: Fighter, amount: number, src: Fighter | null, crit: boolean) {
    if (target.state === 'dead') return;
    // world 5+: enemies on the field toughen up with the rage timer too
    if (target.side === 1 && !target.boss && this.w5rules) amount /= this.rage / (target.rageAt ?? 1);
    if (target.state === 'revive') {
      // only an ice counter can hit the ice block: it melts for good
      if (!src || !canMelt(src, target)) return;
      this.events.push({ type: 'melt', f: target });
      target.hp = 0;
      target.state = 'dead';
      target.t = 0;
      target.kbFrom = target.x;
      target.kbTo = target.x + 70;
      this.events.push({ type: 'death', f: target });
      if (target.boss) this.bossDown(target, src);
      this.kills++;
      const reward = target.reward * (this.stage.mod === 'festival' ? 2 : 1);
      if (reward > 0) {
        this.money = Math.min(this.cap, this.money + reward);
        this.events.push({ type: 'money', x: target.x, amount: reward });
      }
      return;
    }
    const before = target.hp;
    target.hp -= amount;
    target.flash = 0.12;
    this.events.push({
      type: 'hit', x: target.x, lane: target.lane, side: src ? src.side : 0, dmg: Math.round(amount), crit, big: amount > 150 || crit, targetSide: target.side,
    });
    if (target.hp <= 0) {
      target.hp = 0;
      // ユキオトコ style: freeze into an ice block and come back once (an 'ice' counter melts it for good)
      if (target.s.revive && !target.revived) {
        if (src && canMelt(src, target)) {
          this.events.push({ type: 'melt', f: target });
        } else {
          target.state = 'revive';
          target.t = 0;
          target.revived = true;
          this.events.push({ type: 'revive', f: target, up: false });
          return;
        }
      }
      target.state = 'dead';
      target.t = 0;
      target.kbFrom = target.x;
      target.kbTo = target.x + (target.side === 0 ? -1 : 1) * 70;
      this.events.push({ type: 'death', f: target });
      if (target.s.hatch) this.eggsBroken++;
      if (target.side === 0 && src) this.killedBy[src.id] = (this.killedBy[src.id] ?? 0) + 1;
      if (target.side === 1 && target.boss) this.bossDown(target, src);
      if (target.side === 1) {
        this.kills++;
        const reward = target.reward * (this.stage.mod === 'festival' ? 2 : 1);
        if (reward > 0) {
          this.money = Math.min(this.cap, this.money + reward);
          this.events.push({ type: 'money', x: target.x, amount: reward });
        }
        if (target.s.split) {
          for (let i = 0; i < target.s.split.n; i++) {
            const c = this.spawnEnemy(target.s.split.id, target.mult, Math.min(this.length, target.x) - i * 28);
            c.lane = Math.min(1, Math.max(0, target.lane + (i - 0.5) * 0.4));
          }
          this.events.push({ type: 'split', f: target });
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
        if (a.state === 'dead' || a.state === 'revive' || (f.side === 1 && a.boss) || Math.abs(a.x - f.x) > f.s.range || a.hp >= a.maxHp) continue;
        const amt = f.side === 1 ? Math.min(a.maxHp * f.s.heal, f.s.atk * 3) : a.maxHp * f.s.heal;
        a.hp = Math.min(a.maxHp, a.hp + amt);
        a.burnT = 0;
        this.events.push({ type: 'heal', f: a });
      }
    }
    // world-4 bosses grow angrier over time too, so a stalemate always ends
    const rs = this.rageStart;
    let bossRage = f.boss && this.stage.id >= 37 && this.time > rs ? 1 + (this.time - rs) * (this.w5rules ? 0.04 : 0.07) : 1;
    // world 5+: enemies already on the field get angrier too (both sides at their unit caps used to freeze the line)
    if (!f.boss && f.side === 1 && this.w5rules) bossRage = this.rage / (f.rageAt ?? 1);
    for (const t of list) {
      let dmg = f.s.atk * bossRage;
      if (hasAny(f.s.strongVs, t.s.traits)) dmg *= 2.5;
      if (hasAny(t.s.strongVs, f.s.traits)) dmg *= 0.5;
      const crit = !!f.s.crit && this.rng.chance(f.s.crit);
      if (crit) dmg *= 2;
      if (t.s.metal && !crit) dmg = 1;
      if (t.s.flying && f.s.range < 160) dmg *= 0.5;
      if (t.shield > 0) {
        if (dmg < t.shield) {
          // world 5+: small hits slowly crack the barrier, so it is never an unbreakable wall
          if (this.w5rules) t.shield = Math.max(1, t.shield - dmg * 0.3);
          this.events.push({ type: 'hit', x: t.x, lane: t.lane, side: f.side, dmg: 0, crit: false, big: false, targetSide: t.side, effect: 'block' });
          continue;
        }
        t.shield = 0;
        this.events.push({ type: 'hit', x: t.x, lane: t.lane, side: f.side, dmg: 0, crit: false, big: true, targetSide: t.side, effect: 'break' });
      }
      this.damage(t, dmg, f, crit);
      const ef = f.s.effect;
      if (ef && this.targetable(t) && (!ef.vs || hasAny(ef.vs, t.s.traits)) && this.rng.chance(ef.chance)) {
        const resist = t.boss ? 0.5 : 1;
        if (ef.kind === 'slow') t.slowT = Math.max(t.slowT, ef.dur * resist);
        else if (ef.kind === 'freeze') {
          t.freezeT = Math.max(t.freezeT, ef.dur * resist);
          if (t.state === 'attack') t.state = 'idle';
        } else if (ef.kind === 'knock' && t.state !== 'kb') this.knockback(t);
        else if (ef.kind === 'burn') {
          if (hasAny(t.s.strongVs, ['fire'])) continue; // fire-proof potatoes
          t.burnT = ef.dur;
          t.burnDps = f.side === 1 ? Math.min(t.maxHp * 0.03, f.s.atk * 0.4) : t.maxHp * 0.03;
        }
        this.events.push({ type: 'hit', x: t.x, lane: t.lane, side: f.side, dmg: 0, crit: false, big: false, targetSide: t.side, effect: ef.kind });
      }
    }
    // world 4+: potatoes fighting right at the castle gate also chip the castle (no endless sieges)
    // world 5+: the same goes for enemies at the potato gate, so a siege of our castle can't last forever either
    const spill = !base && list.length > 0 && (f.side === 0 ? this.stage.id >= 37 && this.length - f.x <= f.s.range : this.w5rules && f.x <= f.s.range);
    if (base || spill) {
      const b = f.side === 0 ? this.eBase : this.pBase;
      if (f.side === 1) this.castleBy[f.id] = (this.castleBy[f.id] ?? 0) + f.s.atk;
      const dmg = f.s.atk * (spill ? 0.35 : 1) * (f.side === 1 && this.w5rules ? bossRage : 1);
      b.hp = Math.max(0, b.hp - dmg);
      b.hitT = 0.15;
      this.events.push({ type: 'baseHit', side: f.side === 0 ? 1 : 0, dmg });
    }
  }

  private stepFighter(f: Fighter, dt: number) {
    if (f.flash > 0) f.flash -= dt;
    if (f.state !== 'dead') {
      if (!(f.s.hatch && f.freezeT > 0)) f.age += dt; // frozen eggs don't hatch
      if (f.burnT > 0) {
        f.burnT -= dt;
        f.burnAcc += f.burnDps * dt;
        if (f.state === 'revive') f.burnAcc = 0; // no stored-up burn while frozen
        else if (f.burnAcc >= f.burnDps * 0.5) {
          this.damage(f, f.burnAcc, null, false);
          f.burnAcc = 0;
        }
      }
      if (f.s.hatch && f.age >= f.s.hatch.t && f.state !== 'kb') {
        // the egg hatches into a dinosaur
        f.state = 'dead';
        f.t = 9;
        this.hatched++;
        const c = this.spawnEnemy(f.s.hatch.id, f.mult, f.x);
        c.lane = f.lane;
        this.events.push({ type: 'hatch', f: c });
        return;
      }
    }
    if (f.state === 'dead') {
      f.t += dt;
      return;
    }
    if (f.state === 'revive') {
      f.t += dt;
      if (f.t >= REVIVE_TIME) {
        f.state = 'walk';
        f.t = 0;
        f.hp = f.maxHp * (f.s.revive ?? 0.5);
        f.kbCount = 0;
        this.events.push({ type: 'revive', f, up: true });
      }
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
      if (f.burrowLeft <= 0 || (f.side === 1 && f.x <= 20) || (f.side === 0 && f.x >= this.length - 60) || (f.s.thief && f.x <= 230)) {
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
        if (f.side === 0 && f.s.jump) {
          let rear = f.x;
          for (const e of this.enemies) if (this.targetable(e) && e.x > f.x && e.x - f.x <= 350) rear = Math.max(rear, e.x);
          f.burrowLeft = Math.max(60, rear - f.x + 30);
        }
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
      if (f.side === 0 && this.enemies.some((e) => e.state === 'revive' && e.x >= f.x - 10 && e.x <= f.x + 30)) {
        f.state = 'idle';
        return;
      }
      const sp = f.s.speed * (f.slowT > 0 ? 0.35 : 1) * this.walkFactor(f.side);
      f.x += dir * sp * dt;
      f.walkT += dt * (f.slowT > 0 ? 0.35 : 1);
      if (f.side === 0) f.x = Math.min(f.x, this.length - 10);
      else f.x = Math.max(f.x, 10);
    }
  }

  /** ふぶき: gusts that speed one side up and slow the other. dir 1 = おいかぜ (helps potatoes), -1 = むかいかぜ */
  windDir: 0 | 1 | -1 = 0;
  windT = 0;
  private gustN = 0;
  private nextGust = 30;
  private warned = false;
  private forcedGust = 0;

  walkFactor(side: 0 | 1) {
    let k = this.stage.mod === 'slippery' ? 1.15 : 1;
    if (this.windDir !== 0) {
      const helps = (this.windDir === 1) === (side === 0);
      k *= helps ? 1.4 : side === 0 ? 0.5 + this.mods.windResist : 0.5;
    }
    return k;
  }

  private stepWind(dt: number) {
    if (this.windT > 0) {
      this.windT -= dt;
      if (this.windT <= 0) {
        this.windDir = 0;
        if (this.forcedGust) this.nextGust = Math.max(this.nextGust, this.time + 5);
        this.forcedGust = 0;
      }
    }
    if (this.forcedGust > 0) return;
    if (this.stage.mod !== 'blizzard') return;
    if (!this.warned && this.time >= this.nextGust - 3) {
      this.warned = true;
      this.events.push({ type: 'gust', dir: this.gustN % 2 === 0 ? -1 : 1, warn: true });
    }
    if (this.time >= this.nextGust) {
      this.windDir = this.gustN % 2 === 0 ? -1 : 1;
      this.windT = GUST_TIME;
      this.gustN++;
      this.nextGust = this.time + 35;
      this.warned = false;
      this.events.push({ type: 'gust', dir: this.windDir, warn: false });
    }
  }

  private stepSkills(dt: number) {
    for (const f of this.enemies) {
      const sk = f.s.skills;
      if (!sk || f.state === 'dead' || f.state === 'revive' || f.state === 'kb' || f.freezeT > 0) continue;
      sk.forEach((k, i) => {
        let fire = false;
        if (k.every) {
          f.skillT[i] += dt;
          if (f.skillT[i] >= k.every) {
            f.skillT[i] = 0;
            fire = true;
          }
        }
        if (k.below !== undefined && !f.skillDone[i] && f.hp <= f.maxHp * k.below) {
          f.skillDone[i] = true;
          fire = true;
        }
        if (fire) this.useSkill(f, k);
      });
    }
  }

  private useSkill(f: Fighter, k: { kind: string; id?: string; n?: number; power?: number }) {
    if (k.kind === 'meteor') {
      this.dropRocks(k.n ?? 3);
      this.events.push({ type: 'rockWarn' });
    } else if (k.kind === 'breath') {
      // こおりの いき: an icy blast straight at the potato castle — beat the boss quickly!
      const dmg = Math.round(this.pBase.max * (k.power ?? 0.05));
      this.pBase.hp = Math.max(0, this.pBase.hp - dmg);
      this.pBase.hitT = 0.5;
      this.events.push({ type: 'baseHit', side: 0, dmg });
    } else if (k.kind === 'stomp') {
      for (const a of this.allies) if (a.state !== 'dead' && a.x >= f.x - 450 && a.x <= f.x + 40) this.knockback(a);
      this.events.push({ type: 'shockwave', x: f.x });
    } else if (k.kind === 'summon' && k.id) {
      // each kind of summon has its own cap of 4
      const alive = this.enemies.filter((e) => e.summoned && e.id === k.id && e.state !== 'dead').length;
      for (let i = 0; i < (k.n ?? 1) && alive + i < 4; i++) {
        const c = this.spawnEnemy(k.id, Math.round(f.mult / 1.7), f.x + 40 + i * 30);
        c.summoned = true;
      }
    } else if (k.kind === 'blizzard') {
      this.windDir = -1;
      this.windT = 8;
      this.forcedGust = 1;
      this.events.push({ type: 'gust', dir: -1, warn: false });
    }
    this.events.push({ type: 'skill', f, kind: k.kind });
  }

  /** world 4+: the potato castle's little cannon shoots thieves that reach it */
  private stepTurret(dt: number) {
    if (this.stage.id < 37) return;
    this.turretT -= dt;
    if (this.turretT > 0) return;
    const thief = this.enemies.find((e) => e.s.thief && this.targetable(e) && e.x <= 240);
    if (!thief) return;
    this.turretT = 1.2;
    this.events.push({ type: 'turret', x: thief.x });
    this.damage(thief, thief.maxHp * 0.18, null, false);
  }

  // ---------------- World 5 hazards ----------------
  /** falling rocks: shadows appear, then they crash down (tap a shadow to break the rock) */
  dropRocks(n: number) {
    const xs = this.allies.filter((a) => this.targetable(a)).map((a) => a.x);
    for (let i = 0; i < n; i++) {
      const x = xs.length ? xs.splice(Math.floor(this.rng.next() * xs.length), 1)[0] : this.rng.range(200, this.length - 300);
      this.rocks.push({ x: Math.max(60, Math.min(this.length - 60, x + this.rng.range(-30, 30))), t: ROCK_TIME });
    }
  }

  tapRock(which: number | { x: number; t: number }) {
    const i = typeof which === 'number' ? which : this.rocks.indexOf(which);
    const r = this.rocks[i];
    if (!r || this.result) return;
    this.rocks.splice(i, 1);
    this.rocksBroken++;
    this.money = Math.min(this.cap, this.money + 15);
    this.events.push({ type: 'rock', x: r.x, broken: true });
  }

  /** マグマの かわ: 0..12 crust, 12..14 bubbling, 14..22 flowing */
  get lavaPhase(): 'crust' | 'bubble' | 'flow' {
    const c = this.time % 22;
    return c < 12 ? 'crust' : c < 14 ? 'bubble' : 'flow';
  }
  get lavaBand(): [number, number] {
    return [this.length * 0.42, this.length * 0.52];
  }

  /** the eruption tutorial (51) rains often but gently; later stages rarely but hard */
  get rockSet() {
    return this.stage.id === 51 ? { n: 4, every: 16, dmg: 0.25 } : { n: 3, every: 28, dmg: 0.2 };
  }

  /** tap an egg to crack it a little */
  tapEgg(uid: number) {
    const e = this.enemies.find((x) => x.uid === uid);
    if (!e || !e.s.hatch || !this.targetable(e) || this.result) return false;
    this.damage(e, e.maxHp * 0.15, null, false);
    this.eggTaps++;
    this.events.push({ type: 'hit', x: e.x, lane: e.lane, side: 0, dmg: Math.round(e.maxHp * 0.15), crit: false, big: false, targetSide: 1 });
    return true;
  }

  private stepHazards(dt: number) {
    const mod = this.stage.mod;
    if (mod === 'eruption') {
      if (!this.rockWarned && this.time >= this.nextRocks - 3) {
        this.rockWarned = true;
        this.events.push({ type: 'rockWarn' });
      }
      if (this.time >= this.nextRocks) {
        this.dropRocks(this.rockSet.n);
        this.nextRocks = this.time + this.rockSet.every;
        this.rockWarned = false;
      }
    }
    for (let i = this.rocks.length - 1; i >= 0; i--) {
      const r = this.rocks[i];
      r.t -= dt;
      if (r.t > 0) continue;
      this.rocks.splice(i, 1);
      for (const a of [...this.allies]) {
        if (!this.targetable(a) || Math.abs(a.x - r.x) > 70) continue;
        this.damage(a, a.maxHp * this.rockSet.dmg, null, false);
        this.knockback(a);
      }
      for (const e of [...this.enemies]) if (!e.boss && this.targetable(e) && Math.abs(e.x - r.x) <= 70) this.damage(e, e.maxHp * 0.1, null, false);
      this.events.push({ type: 'rock', x: r.x, broken: false });
    }
    if (mod === 'lava' && this.lavaPhase === 'flow') {
      const [a0, a1] = this.lavaBand;
      for (const f of [...this.allies, ...this.enemies]) {
        if (f.state === 'dead' || f.state === 'burrow' || f.state === 'kb' || f.state === 'revive') continue;
        if (f.s.flying || f.s.traits?.includes('fire') || f.x < a0 || f.x > a1) continue;
        if (f.side === 0 && f.state === 'walk') continue; // potatoes hop across quickly; fighting in the lava hurts
        f.hazardAcc += f.maxHp * 0.04 * dt;
        if (f.hazardAcc >= f.maxHp * 0.02) {
          this.damage(f, f.hazardAcc, null, false);
          f.hazardAcc = 0;
        }
      }
    }
    if (mod === 'onsen') for (const a of this.allies) if (a.state !== 'dead' && a.hp < a.maxHp) a.hp = Math.min(a.maxHp, a.hp + a.maxHp * 0.01 * dt);
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
      this.rocks.length = 0;
      this.endT += dt;
      for (const f of this.allies) this.stepEndAnim(f, dt);
      for (const f of this.enemies) this.stepEndAnim(f, dt);
      return;
    }
    const before = this.time;
    this.time += dt;
    const rs0 = this.rageStart;
    if (before < rs0 && this.time >= rs0) this.events.push({ type: 'rage' });
    this.money = Math.min(this.cap, this.money + this.rate * dt);
    // world 4+: when the army is full, the beam charges faster so there's still something to do
    const capped = this.stage.id >= 37 && this.allies.length >= MAX_ALLIES;
    if (this.beamT < 0) this.beam = Math.min(1, this.beam + (dt / this.mods.beamCharge) * (capped ? 2.5 : 1));
    // おいかぜ: potatoes get ready twice as fast — a chance for a big push
    const cdRate = this.windDir === 1 ? 2 : 1;
    for (const s of this.slots) if (s.cd > 0) s.cd = Math.max(0, s.cd - dt * cdRate);
    if (this.pBase.hitT > 0) this.pBase.hitT -= dt;
    if (this.eBase.hitT > 0) this.eBase.hitT -= dt;

    if (this.beamT >= 0) {
      const prev = this.beamT;
      this.beamT += dt;
      if (prev < 0.35 && this.beamT >= 0.35) {
        const reach = this.beamReach;
        for (const e of [...this.enemies]) {
          if (e.state === 'dead' || e.x > reach) continue;
          if (e.state === 'burrow' || e.state === 'revive') continue;
          this.damage(e, e.s.metal ? 1 : this.mods.beamDmg * (e.boss ? 0.8 : 1), null, false);
          if ((e.state as string) !== 'dead') this.knockback(e);
        }
        this.events.push({ type: 'beamHit' });
      }
      if (this.beamT >= 1.1) this.beamT = -1;
    }

    this.stepWind(dt);
    this.stepSkills(dt);
    this.stepTurret(dt);
    this.stepHazards(dt);
    this.stepSpawns();
    for (const f of this.allies) this.stepFighter(f, dt);
    for (const f of this.enemies) this.stepFighter(f, dt);
    this.allies = this.allies.filter((f) => !(f.state === 'dead' && f.t > 0.9));
    this.enemies = this.enemies.filter((f) => !(f.state === 'dead' && f.t > 0.9));
    this.bossAlive = this.enemies.some((e) => e.boss && e.state !== 'dead');

    // world 5 boss stages: the castle can't fall while a boss is still alive or yet to come
    if (this.w5Boss && !this.bossesDone && this.eBase.hp < this.eBase.max * 0.4) this.eBase.hp = Math.round(this.eBase.max * 0.4);
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
    } else if (this.timeLimit && this.time >= this.timeLimit) {
      // time up: whoever's castle is in better shape wins ("はんてい")
      const win = !this.bossAlive && this.eBase.hp / this.eBase.max <= this.pBase.hp / this.pBase.max;
      this.result = win ? 'win' : 'lose';
      this.judged = true;
      if (win)
        for (const e of this.enemies)
          if (e.state !== 'dead') {
            e.state = 'dead';
            e.t = 0;
            e.kbFrom = e.x;
            e.kbTo = e.x + 70;
          }
      this.events.push({ type: 'end', win });
    }
  }

  /** world 5+: battles end at 7 minutes with a castle-damage judgement */
  get timeLimit() {
    return this.w5rules ? TIME_LIMIT : 0;
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
