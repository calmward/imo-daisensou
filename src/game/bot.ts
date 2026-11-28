// A simple automatic player. Used for balance tests and the title-screen demo.
import { Battle } from './battle';

const WALL_ROLES = new Set(['かべ', 'てっぺき', 'タンク', 'たて']);

export interface BotOptions {
  /** 0..1 how well it manages money (1 = decent player, 0.5 = sloppy kid) */
  skill?: number;
  /** taps every affordable unit, never touches the wallet (a typical first-time kid) */
  spam?: boolean;
}

export class Bot {
  private t = 0;
  private seenRocks = new WeakSet<object>();
  constructor(private b: Battle, private opts: BotOptions = {}) {}

  step(dt: number) {
    this.t += dt;
    const skill = this.opts.skill ?? 1;
    // sloppier players react more slowly
    if (this.t < 0.2 + (1 - skill) * 1.2) return;
    this.t = 0;
    const b = this.b;
    if (b.result) return;
    // a kid notices about half of the falling rocks and taps them
    for (let i = b.rocks.length - 1; i >= 0; i--) {
      const r = b.rocks[i];
      if (r.t > 1.4 || this.seenRocks.has(r)) continue;
      this.seenRocks.add(r);
      if (b.rng.next() < 0.5) b.tapRock(i);
    }
    // ...and pokes at eggs now and then
    const egg = b.enemies.find((e) => e.s.hatch && e.state !== 'dead' && e.age > 3);
    if (egg && b.rng.next() < 0.35) b.tapEgg(egg.uid);
    if (this.opts.spam) {
      if (b.beam >= 1) b.fireBeam();
      for (let i = 0; i < b.slots.length; i++) if (b.canDeploy(i)) b.deploy(i);
      return;
    }
    const live = b.enemies.filter((e) => e.state !== 'dead');
    const front = live.reduce((m, e) => Math.min(m, e.x), Infinity);
    const danger = front < b.length * 0.35;

    // beam
    if (b.beam >= 1) {
      const inReach = live.filter((e) => e.x <= b.beamReach);
      if (inReach.length >= 3 || inReach.some((e) => e.boss) || (danger && inReach.length)) b.fireBeam();
    }
    // wallet
    const wantWallet = skill >= 0.8 ? 8 : 6;
    if (b.walletLv < wantWallet && b.canUpgradeWallet() && (!danger || b.money >= b.cap * 0.95)) {
      b.upgradeWallet();
      return;
    }
    // deploy: walls when enemies exist; attackers by descending cost
    const order = b.slots.map((s, i) => ({ s, i })).sort((a, c) => c.s.def.cost - a.s.def.cost);
    const allies = b.allies.filter((a) => a.state !== 'dead');
    const wallsNearFront = allies.filter((a) => WALL_ROLES.has(b.slots.find((s) => s.def.id === a.id)?.def.role ?? '') && a.x > front - 350).length;
    for (const { s, i } of order) {
      if (!b.canDeploy(i)) continue;
      const isWall = WALL_ROLES.has(s.def.role);
      if (isWall) {
        if (live.length && wallsNearFront < 3) b.deploy(i);
        continue;
      }
      // cheap fodder only when rich or in danger
      if (s.def.cost < 100 && !(danger || b.money > b.cap * 0.6)) continue;
      // keep some money for walls when sloppy
      b.deploy(i);
    }
  }
}

export function simulate(b: Battle, maxTime = 600, skill = 1, dt = 1 / 30, spam = false) {
  const bot = new Bot(b, { skill, spam });
  let minEnemyX = b.length;
  while (!b.result && b.time < maxTime) {
    bot.step(dt);
    b.update(dt);
    for (const e of b.enemies) if (e.state !== 'dead' && e.x < minEnemyX) minEnemyX = e.x;
    b.events.length = 0;
  }
  return {
    closest: minEnemyX / b.length,
    win: b.result === 'win',
    time: b.time,
    baseFrac: b.pBase.hp / b.pBase.max,
    enemyFrac: b.eBase.hp / b.eBase.max,
  };
}
