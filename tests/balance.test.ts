import { describe, expect, it } from 'vitest';
import { Battle } from '../src/game/battle';
import { simulate } from '../src/game/bot';
import { battleMods } from '../src/game/research';
import { runCampaign } from '../src/game/simCampaign';
import { STAGES } from '../src/game/stages';

describe('campaign balance', () => {
  for (const skill of [1, 0.6, 0.4]) {
    it(`bot (skill ${skill}) clears all ${STAGES.length} stages with few retries`, () => {
      const { logs } = runCampaign({ skill, seed: 3 });
      expect(logs.length).toBe(STAGES.length);
      expect(logs.every((l) => l.win)).toBe(true);
      // nobody should need to grind more than a few times for a stage
      expect(Math.max(...logs.map((l) => l.tries))).toBeLessThanOrEqual(5);
      const avg = logs.reduce((s, l) => s + l.time, 0) / logs.length;
      expect(avg).toBeLessThan(260);
    }, 120_000);
  }

  it('battles have tension: the castle often gets hurt', () => {
    const { logs } = runCampaign({ skill: 0.6, seed: 5 });
    // tutorial stages (1-4) and rest stages are meant to be safe
    const rest = new Set([9, 16, 21, 28, 34]);
    const real = logs.filter((l) => l.id > 4 && !rest.has(l.id));
    const hurt = real.filter((l) => l.baseFrac < 0.95).length;
    expect(hurt / real.length).toBeGreaterThan(0.45);
  }, 120_000);

  it('starter deck beats stage 1 even when played sloppily', () => {
    const b = new Battle(STAGES[0], [{ id: 'jaga', level: 1 }, { id: 'sato', level: 1 }], battleMods({}), 1);
    expect(simulate(b, 400, 0.3).win).toBe(true);
  });

  it('later stages are NOT beatable without any power-ups (not too easy)', () => {
    const deck = ['jaga', 'sato', 'chips', 'satsu', 'kenpi', 'fry', 'yaki', 'murasaki', 'konnyaku', 'butter'].map((id) => ({ id, level: 1 }));
    for (const id of [13, 20, 24, 30, 36]) {
      const b = new Battle(STAGES[id - 1], deck, battleMods({}), 2);
      expect(simulate(b, 420, 1).win, `stage ${id}`).toBe(false);
    }
  });
});
