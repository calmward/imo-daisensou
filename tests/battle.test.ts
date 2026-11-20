import { describe, expect, it } from 'vitest';
import { Battle, walletUpgradeCost } from '../src/game/battle';
import { rollGacha } from '../src/game/gacha';
import { applyWin, levelUp } from '../src/game/progress';
import { battleMods } from '../src/game/research';
import { loadSave, newSave } from '../src/game/save';
import { STAGES } from '../src/game/stages';
import { ALLIES } from '../src/game/allies';
import { ENEMIES } from '../src/game/enemies';
import { ALLY_ART } from '../src/art/allies';
import { ENEMY_ART } from '../src/art/enemies';

const mk = () => new Battle(STAGES[0], [{ id: 'jaga', level: 1 }, { id: 'sato', level: 1 }], battleMods({}), 1);

describe('battle rules', () => {
  it('deploy costs money and starts cooldown', () => {
    const b = mk();
    b.money = 200;
    expect(b.deploy(0)).not.toBeNull();
    expect(b.money).toBe(125);
    expect(b.canDeploy(0)).toBe(false);
    b.update(2.1);
    expect(b.canDeploy(0)).toBe(true);
  });
  it('cannot deploy without money', () => {
    const b = mk();
    b.money = 10;
    expect(b.deploy(0)).toBeNull();
  });
  it('wallet upgrade raises income', () => {
    const b = mk();
    const r1 = b.rate;
    b.money = walletUpgradeCost(1);
    expect(b.upgradeWallet()).toBe(true);
    expect(b.rate).toBeGreaterThan(r1);
  });
  it('beam needs full charge and knocks enemies back', () => {
    const b = mk();
    expect(b.fireBeam()).toBe(false);
    const e = b.spawnEnemy('ari');
    e.x = 300;
    b.beam = 1;
    expect(b.fireBeam()).toBe(true);
    for (let i = 0; i < 30; i++) b.update(1 / 60);
    expect(e.hp < e.maxHp || e.state === 'dead').toBe(true);
  });
  it('destroying the enemy base wins', () => {
    const b = mk();
    b.eBase.hp = 0;
    b.update(0.016);
    expect(b.result).toBe('win');
  });
  it('boss shockwave knocks back all potatoes', () => {
    const b = mk();
    b.money = 1000;
    const a = b.deploy(0)!;
    for (let i = 0; i < 60; i++) b.update(1 / 60);
    b.spawnEnemy('kabuto');
    expect(a.state).toBe('kb');
  });
  it('mole burrows past the front line', () => {
    const b = mk();
    b.money = 1000;
    const a = b.deploy(1)!;
    a.x = 600;
    const m = b.spawnEnemy('mogura');
    m.x = 680;
    b.update(1 / 60);
    expect(m.state).toBe('burrow');
  });
});

describe('progress & data', () => {
  it('every stage has valid enemies and art', () => {
    for (const s of STAGES) for (const sp of s.spawns) expect(ENEMIES.some((e) => e.id === sp.enemy)).toBe(true);
    for (const a of ALLIES) expect(ALLY_ART[a.id], a.id).toBeTypeOf('function');
    for (const e of ENEMIES) expect(ENEMY_ART[e.id], e.id).toBeTypeOf('function');
    expect(ALLIES.length).toBeGreaterThanOrEqual(10);
    expect(STAGES.length).toBeGreaterThanOrEqual(30);
  });
  it('first win grants reward and unlock, replay gives less', () => {
    const s = newSave();
    const r1 = applyWin(s, STAGES[0], 0);
    expect(r1.unlocked).toBe('chips');
    const r2 = applyWin(s, STAGES[0], 0);
    expect(r2.gold).toBeLessThan(r1.gold);
  });
  it('level up spends gold', () => {
    const s = newSave();
    s.gold = 10000;
    expect(levelUp(s, 'jaga')).toBe(true);
    expect(s.units.jaga).toBe(2);
    expect(s.gold).toBeLessThan(10000);
  });
  it('first gacha always gives a new unit', () => {
    const s = newSave();
    s.tickets = 1;
    const r = rollGacha(s, () => 0.99);
    expect(r?.kind).toBe('unit');
    expect(s.tickets).toBe(0);
  });
  it('loadSave survives missing/corrupt storage', () => {
    expect(loadSave().units.jaga).toBe(1);
  });
});
