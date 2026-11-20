// A simple automatic player. Used for balance tests and the title-screen demo.
import { Battle } from './battle';

const WALL_ROLES = new Set(['かべ', 'てっぺき', 'タンク', 'たて']);

export interface BotOptions {
  /** 0..1 how well it manages money (1 = decent player, 0.5 = sloppy kid) */
  skill?: number;
}

export class Bot {
  private t = 0;
  constructor(private b: Battle, private opts: BotOptions = {}) {}

  step(dt: number) {
    this.t += dt;
    if (this.t < 0.2) return;
    this.t = 0;
    const b = this.b;
    if (b.result) return;
    const skill = this.opts.skill ?? 1;
    const live = b.enemies.filter((e) => e.state !== 'dead');
    const front = live.reduce((m, e) => Math.min(m, e.x), Infinity);
    const danger = front < b.length * 0.35;

    // beam
    if (b.beam >= 1) {
      const inReach = live.filter((e) => e.x <= b.beamReach);
      if (inReach.length >= 3 || inReach.some((e) => e.boss) || (danger && inReach.length)) b.fireBeam();
    }
    // wallet
    const wantWallet = skill >= 0.8 ? 6 : 3;
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
      if (s.def.cost < 100 && !(danger || b.money > b.cap * 0.5 || live.length > 3)) continue;
      // keep some money for walls when sloppy
      b.deploy(i);
    }
  }
}

export function simulate(b: Battle, maxTime = 600, skill = 1, dt = 1 / 30) {
  const bot = new Bot(b, { skill });
  while (!b.result && b.time < maxTime) {
    bot.step(dt);
    b.update(dt);
    b.events.length = 0;
  }
  return {
    win: b.result === 'win',
    time: b.time,
    baseFrac: b.pBase.hp / b.pBase.max,
    enemyFrac: b.eBase.hp / b.eBase.max,
  };
}
