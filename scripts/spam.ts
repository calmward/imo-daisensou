// How does a "tap everything, never upgrade the wallet" kid do on early stages with the units they'd have?
import { Battle } from '../src/game/battle';
import { simulate } from '../src/game/bot';
import { battleMods } from '../src/game/research';
import { STAGES } from '../src/game/stages';
const RL = Number(process.argv[3] ?? 0);
const unlockOrder = ['jaga', 'sato', 'chips', 'satsu', 'kenpi', 'fry', 'yaki', 'murasaki'];
for (let id = 1; id <= 12; id++) {
  const owned = ['jaga', 'sato', ...STAGES.slice(0, id - 1).map((s) => s.unlock).filter(Boolean)] as string[];
  const lv = Number(process.argv[2] ?? 1) + Math.floor(id / 4);
  const deck = unlockOrder.filter((u) => owned.includes(u)).map((u) => ({ id: u, level: lv }));
  const rs = [1, 2, 3].map((sd) => simulate(new Battle(STAGES[id - 1], deck, battleMods({ castle: RL, income: RL, wallet: RL, beamPow: RL, startMoney: RL }), sd), 420, 1, 1 / 30, true));
  console.log(id, `lv${lv}`, deck.map((d) => d.id).join(','), rs.map((r) => `${r.win ? 'W' : 'L'}${r.time.toFixed(0)}`).join(' '));
}
