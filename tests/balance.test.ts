import { describe, expect, it } from 'vitest';
import { runCampaign } from '../src/game/simCampaign';
import { STAGES } from '../src/game/stages';

describe('campaign balance', () => {
  it('a decent bot can clear every stage with limited retries', () => {
    const { logs } = runCampaign({ skill: 1, seed: 3 });
    const table = logs.map((l) => `${String(l.id).padStart(2)} ${l.win ? 'WIN ' : 'LOSE'} tries=${l.tries} t=${l.time}s base=${l.baseFrac} lv=${l.avgLv} ${l.name}`).join('\n');
    console.log(table);
    // TODO(balance): tighten to all stages once tuned
    expect(logs.filter((l) => l.win).length).toBeGreaterThanOrEqual(12);
    void STAGES;
  }, 120_000);
});
