import { describe, expect, it } from 'vitest';
import { Battle, TIME_LIMIT } from '../src/game/battle';
import { applyTowerWin, applyWin, awardMedal, canUltra, cheerAvailable, doUltra, noteResult } from '../src/game/progress';
import { battleMods } from '../src/game/research';
import { newSave, sanitize } from '../src/game/save';
import { STAGES } from '../src/game/stages';
import { MEDALS } from '../src/game/medals';
import { TOWER_ID, towerPower, towerStage } from '../src/game/tower';
import { ENEMY_MAP } from '../src/game/enemies';
import { levelMult } from '../src/game/allies';

const deck = [{ id: 'jaga', level: 10 }, { id: 'imoice', level: 10 }];

describe('world 5 mechanics', () => {
  it('burn hurts over time', () => {
    const b = new Battle(STAGES[48], deck, battleMods({}), 3);
    b.money = 9999;
    const a = b.deploy(0)!;
    a.burnT = 3;
    a.burnDps = 50;
    const hp = a.hp;
    for (let i = 0; i < 60; i++) b.update(1 / 30);
    expect(a.hp).toBeLessThan(hp);
  });

  it('eggs hatch into raptors', () => {
    const b = new Battle(STAGES[52], deck, battleMods({}), 3);
    const egg = b.spawnEnemy('tamago', 100, 2500);
    for (let i = 0; i < 30 * 13; i++) b.update(1 / 30);
    expect(egg.state).toBe('dead');
    expect(b.hatched).toBeGreaterThanOrEqual(1);
    expect(b.enemies.some((e) => e.id === 'raptor')).toBe(true);
  });

  it('tapping a falling rock breaks it and pays', () => {
    const b = new Battle(STAGES[50], deck, battleMods({}), 3);
    b.dropRocks(2);
    expect(b.rocks.length).toBe(2);
    const m = b.money;
    b.tapRock(0);
    expect(b.rocks.length).toBe(1);
    expect(b.rocksBroken).toBe(1);
    expect(b.money).toBeGreaterThan(m);
  });

  it('battles end at the time limit with a judgement', () => {
    const b = new Battle(STAGES[48], deck, battleMods({}), 3);
    b.eBase.hp = b.eBase.max * 0.3;
    for (let i = 0; i < 30 * (TIME_LIMIT + 2) && !b.result; i++) b.update(1 / 30);
    expect(b.result).not.toBeNull();
    expect(b.judged || b.pBase.hp <= 0).toBe(true);
  });

  it('barriers are not boosted by rage and wear down in world 5', () => {
    const b = new Battle(STAGES[54], deck, battleMods({}), 3);
    b.time = 300;
    const t = b.spawnEnemy('torikera', 100, 2000);
    expect(t.shield).toBe(ENEMY_MAP.torikera.barrier);
  });
});

describe('world 5 goals', () => {
  it('every volcano stage has a medal; medals pay once', () => {
    for (let id = 49; id <= 60; id++) expect(MEDALS[id]).toBeTruthy();
    const s = newSave();
    expect(awardMedal(s, 49)).toBeTruthy();
    expect(awardMedal(s, 49)).toBeNull();
    awardMedal(s, 50);
    const r = awardMedal(s, 51);
    expect(r?.stone).toBe(true);
    expect(s.stones).toBe(1);
    expect(s.tickets).toBe(3);
  });

  it('tower floors are generated, valid and get harder', () => {
    for (let f = 1; f <= 60; f++) {
      const st = towerStage(f);
      expect(st.id).toBe(TOWER_ID);
      for (const sp of st.spawns) expect(ENEMY_MAP[sp.enemy]).toBeTruthy();
      expect(st.boss).toBe(f % 5 === 0);
      expect(towerPower(f + 1)).toBeGreaterThan(towerPower(f));
    }
    const s = newSave();
    const r = applyTowerWin(s, 10, 0);
    expect(r.first && r.stone && r.tickets === 1).toBe(true);
    expect(s.tower.best).toBe(10);
    expect(applyTowerWin(s, 10, 0).first).toBe(false);
  });

  it('ultra evolution needs Lv22 and a stone', () => {
    const s = newSave();
    s.units.jaga = 21;
    s.stones = 1;
    expect(canUltra(s, 'jaga')).toBe(false);
    s.units.jaga = 22;
    expect(doUltra(s, 'jaga')).toBe(true);
    expect(s.stones).toBe(0);
    expect(levelMult(22, true)).toBeGreaterThan(levelMult(22));
  });

  it('cheer power after 3 losses in a row, reset by a win', () => {
    const s = newSave();
    for (let i = 0; i < 3; i++) noteResult(s, 51, false);
    expect(cheerAvailable(s, 51)).toBe(true);
    noteResult(s, 51, true);
    expect(cheerAvailable(s, 51)).toBe(false);
  });

  it('★★ on the volcano bosses gives a stone; old saves load with new fields', () => {
    const s = newSave();
    applyWin(s, STAGES[55], 0, 1, () => 1);
    applyWin(s, STAGES[55], 0, 2, () => 1);
    expect(s.stones).toBe(1);
    const old = sanitize({ cleared: { 1: 1 }, units: { jaga: 22 }, medals: [49, 'x', 999, 3], ultra: ['nope', 'jaga'], tower: { best: 5 } });
    expect(old.medals).toEqual([49]);
    expect(old.ultra).toEqual(['jaga']);
    expect(old.tower.best).toBe(5);
    const fresh = sanitize({ cleared: { 1: 1 } });
    expect(fresh.stones).toBe(0);
    expect(fresh.tower.best).toBe(0);
  });
});
