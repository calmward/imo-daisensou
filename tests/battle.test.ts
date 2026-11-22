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

import { sanitize } from '../src/game/save';
describe('save sanitize', () => {
  it('survives hostile/corrupt data', () => {
    const s = sanitize({ tut: null, cleared: null, units: null, deck: 'jaga', gold: '100abc', research: null });
    expect(s.gold).toBe(0);
    expect(s.units.jaga).toBe(1);
    expect(s.deck).toEqual(['jaga', 'sato']);
    const t = sanitize({ units: { jaga: 999, sato: -5, bogus: 3 }, deck: ['jaga', 'jaga', 'bogus'], cleared: { 1: 1 } });
    expect(t.units.jaga).toBe(30);
    expect(t.units.sato).toBe(1);
    expect(t.units.bogus).toBeUndefined();
    expect(t.deck).toEqual(['jaga']);
    expect(t.crowns[1]).toBe(1);
    expect(sanitize(null).units.jaga).toBe(1);
  });
});

describe('save round trip', () => {
  it('keeps today\'s daily mission ids and older 10-unit decks', () => {
    const s = sanitize({ today: { date: '2026-1-1', counts: { kills: 3 }, claimed: ['dk'], ids: ['dk', 'db', 'dw'] }, units: { jaga: 1, sato: 1, chips: 1, satsu: 1, kenpi: 1, fry: 1, yaki: 1 }, deck: ['jaga', 'sato', 'chips', 'satsu', 'kenpi', 'fry', 'yaki'] });
    expect(s.today.ids).toEqual(['dk', 'db', 'dw']);
    expect(s.today.counts.kills).toBe(3);
    expect(s.deck.length).toBe(7);
  });
});

describe('world 4 mechanics', () => {
  const w4 = (id: number, deck = [{ id: 'jaga', level: 5 }, { id: 'gratin', level: 5 }]) => new Battle(STAGES[id - 1], deck, battleMods({}), 1);
  it('ユキオトコ revives once, but ポテトグラタン melts it for good', () => {
    const b = w4(43);
    const y = b.spawnEnemy('yukiotoko');
    (b as any).damage(y, y.hp + 1, { s: { strongVs: [] }, side: 0, id: 'jaga' }, false);
    expect(y.state).toBe('revive');
    for (let i = 0; i < 150; i++) b.update(1 / 60);
    expect(y.state).not.toBe('revive');
    expect(y.hp).toBeGreaterThan(0);
    const y2 = b.spawnEnemy('yukiotoko');
    (b as any).damage(y2, y2.hp + 1, { s: { strongVs: ['ice'] }, side: 0, id: 'gratin' }, false);
    expect(y2.state).toBe('dead');
  });
  it('ゆきだるま splits into two ちびゆきだるま', () => {
    const b = w4(39);
    const d = b.spawnEnemy('yukidaruma');
    const before = b.enemies.length;
    (b as any).damage(d, d.hp + 1, null, false);
    expect(b.enemies.filter((e) => e.id === 'chibidaruma').length).toBe(2);
    expect(b.enemies.length).toBe(before + 2);
  });
  it('ふぶき gusts slow potatoes in a headwind and festival doubles rewards', () => {
    const b = w4(38);
    for (let t = 0; t < 31 * 60; t++) b.update(1 / 60);
    expect(b.windDir).toBe(-1);
    expect(b.walkFactor(0)).toBeLessThan(1);
    expect(b.walkFactor(1)).toBeGreaterThan(1);
    const f = w4(40);
    f.money = 0;
    const e = f.spawnEnemy('yukiusagi');
    (f as any).damage(e, e.hp + 1, null, false);
    expect(f.money).toBe(e.reward * 2);
  });
});
