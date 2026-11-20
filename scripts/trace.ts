import { Battle } from '../src/game/battle';
import { Bot } from '../src/game/bot';
import { battleMods } from '../src/game/research';
import { STAGES } from '../src/game/stages';
const sid = Number(process.argv[2]);
const lv = Number(process.argv[3] ?? 5);
const deck = (process.argv[4] ?? 'jaga,sato,chips,satsu,kenpi,fry,yaki,murasaki,konnyaku').split(',');
const rl = Number(process.argv[5] ?? 4);
const research = { castle: rl, income: rl, wallet: rl, beamPow: rl, beamCharge: rl, startMoney: rl };
const b = new Battle(STAGES[sid - 1], deck.map((id) => ({ id, level: lv })), battleMods(research), 5);
const bot = new Bot(b);
let next = 0;
const deaths: Record<string, number> = {};
while (!b.result && b.time < 600) {
  bot.step(1 / 30);
  b.update(1 / 30);
  for (const e of b.events) if (e.type === 'death') deaths[(e.f.side ? 'E:' : 'A:') + e.f.id] = (deaths[(e.f.side ? 'E:' : 'A:') + e.f.id] ?? 0) + 1;
  b.events.length = 0;
  if (b.time >= next) {
    next += 40;
    const al = b.allies.filter((a) => a.state !== 'dead');
    const en = b.enemies.filter((a) => a.state !== 'dead');
    console.log(`t=${b.time.toFixed(0)} money=${b.money.toFixed(0)} wl=${b.walletLv} A=${al.length} maxX=${Math.max(0, ...al.map((a) => a.x)).toFixed(0)} E=${en.length} minX=${Math.min(b.length, ...en.map((a) => a.x)).toFixed(0)} eBase=${b.eBase.hp.toFixed(0)} pBase=${b.pBase.hp.toFixed(0)} [${en.map((e) => e.id).join(',')}]`);
  }
}
console.log(b.result, b.time.toFixed(0), JSON.stringify(deaths));
