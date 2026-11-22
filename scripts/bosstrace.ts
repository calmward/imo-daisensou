import { Battle } from '../src/game/battle';
import { Bot } from '../src/game/bot';
import { battleMods } from '../src/game/research';
import { STAGES } from '../src/game/stages';
const id = Number(process.argv[2] ?? 48);
const deck = (process.argv[3] ?? 'jaga,sato,chips,satsu,kenpi,fry').split(',');
const rl = 5;
const b = new Battle(STAGES[id - 1], deck.map((d) => ({ id: d, level: 11 })), battleMods({ castle: rl, income: rl, wallet: rl, beamPow: rl, beamCharge: rl, startMoney: rl }), 1);
const bot = new Bot(b, { skill: 0.6 });
let next = 0;
while (!b.result && b.time < 600) {
  bot.step(1 / 30);
  b.update(1 / 30);
  b.events.length = 0;
  if (b.time >= next) {
    next += 30;
    const boss = b.enemies.find((e) => e.boss && e.state !== 'dead');
    const al = b.allies.filter((a) => a.state !== 'dead');
    console.log(`t=${b.time.toFixed(0)} eBase=${b.eBase.hp.toFixed(0)}/${b.eBase.max} boss=${boss ? boss.id + ' ' + boss.hp.toFixed(0) + '/' + boss.maxHp + ' x=' + boss.x.toFixed(0) : '-'} A=${al.length} front=${Math.max(0, ...al.map((a) => a.x)).toFixed(0)} E=${b.enemies.filter((e) => e.state !== 'dead').length} p=${b.pBase.hp.toFixed(0)}`);
  }
}
console.log(b.result, b.time.toFixed(0));
