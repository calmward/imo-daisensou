import { Battle } from '../src/game/battle';
import { simulate } from '../src/game/bot';
import { battleMods } from '../src/game/research';
import { STAGES } from '../src/game/stages';
const sid = Number(process.argv[2]), lv = Number(process.argv[3]), rl = Number(process.argv[4] ?? 3);
const deck = (process.argv[5] ?? 'jaga,sato,chips,satsu,kenpi,fry').split(',');
for (let f = 0.5; f <= 3.01; f += 0.25) {
  const st = { ...STAGES[sid - 1], spawns: STAGES[sid - 1].spawns.map((s) => ({ ...s, mult: Math.round((s.mult ?? 100) * f) })) };
  const rs = [1, 2, 3].map((sd) => simulate(new Battle(st, deck.map((id) => ({ id, level: lv })), battleMods({ castle: rl, income: rl, wallet: rl, beamPow: rl, beamCharge: rl, startMoney: rl }), sd), 420, 0.6));
  console.log(f.toFixed(2), rs.map((r) => `${r.win ? 'W' : 'L'} t${r.time.toFixed(0)} b${r.baseFrac.toFixed(2)}`).join(' | '));
}
