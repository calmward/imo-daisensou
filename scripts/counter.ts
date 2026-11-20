import { Battle } from '../src/game/battle';
import { simulate } from '../src/game/bot';
import { battleMods } from '../src/game/research';
import { STAGES } from '../src/game/stages';
const rl = { castle: 3, income: 3, wallet: 3, beamPow: 3, beamCharge: 3, startMoney: 3 };
const W = ['jaga', 'sato', 'chips', 'satsu', 'kenpi', 'yaki', 'konnyaku', 'butter'];
for (const [name, deck] of [['with fry+murasaki', [...W.slice(0, 6), 'fry', 'murasaki']], ['melee only', W]] as const) {
  const rs = [1, 2, 3, 4].map((sd) => simulate(new Battle(STAGES[11], (deck as readonly string[]).map((id) => ({ id, level: 5 })), battleMods(rl), sd), 420, 0.6));
  console.log(name, rs.map((r) => `${r.win ? 'W' : 'L'}${r.time.toFixed(0)}`).join(' '));
}
