// How does a team without castle research do on the volcano stages?
import { Battle } from '../src/game/battle';
import { simulate } from '../src/game/bot';
import { battleMods } from '../src/game/research';
import { STAGES } from '../src/game/stages';
const deck = ['jaga', 'sato', 'naga', 'butter', 'gratin', 'yaki', 'murasaki', 'ski', 'konnyaku', 'fry'];
const sets: [string, Record<string, number>][] = [['bare', {}], ['some', { castle: 4, income: 3, wallet: 4, beamPow: 4, beamCharge: 3, startMoney: 4 }]];
for (const [label, res] of sets) {
  for (const id of [49, 51, 53, 54, 56]) {
    let w = 0;
    const d = id >= 50 ? [...deck.slice(0, 9), 'imoice'] : deck;
    for (let s = 0; s < 8; s++) {
      const b = new Battle(STAGES[id - 1], d.map((x) => ({ id: x, level: 14 })), battleMods(res), 300 + s);
      if (simulate(b, 600, 0.6).win) w++;
    }
    console.log(label, id, `${w}/8`);
  }
}
