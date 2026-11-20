import { Battle } from '../src/game/battle';
import { simulate } from '../src/game/bot';
import { battleMods } from '../src/game/research';
import { STAGES } from '../src/game/stages';
const N = ['jaga', 'sato', 'chips', 'satsu', 'kenpi', 'fry', 'yaki', 'murasaki', 'konnyaku', 'butter'];
const G = ['jaga', 'sato', 'chips', 'satsu', 'kenpi', 'fry', 'yaki', 'king', 'daigaku', 'mash'];
const rl = { castle: 6, income: 6, wallet: 6, beamPow: 6, beamCharge: 6, startMoney: 6 };
for (const id of [12, 24, 30, 36]) {
  const run = (d: string[]) => [1, 2, 3].map((sd) => simulate(new Battle(STAGES[id - 1], d.map((x) => ({ id: x, level: 9 })), battleMods(rl), sd), 420, 0.6));
  const f = (rs: ReturnType<typeof run>) => rs.map((r) => `${r.win ? 'W' : 'L'}${r.time.toFixed(0)}/${r.baseFrac.toFixed(2)}`).join(' ');
  console.log(id, 'N:', f(run(N)), '| G:', f(run(G)));
}
