import type { SpawnEntry, StageDef, StageMod } from './types';
import { TUNING } from './tuning';
import { ENEMY_MAP } from './enemies';

// Helper to keep the stage table compact.
// e(enemy, start, [min,max] interval, count?, mult?, trigger?)
function e(enemy: string, start: number, interval: [number, number] | number, count = 0, mult = 100, trigger?: number): SpawnEntry {
  const iv: [number, number] = typeof interval === 'number' ? [interval, interval] : interval;
  return { enemy, start, interval: iv, count, mult, trigger };
}
function boss(enemy: string, mult: number, trigger = 0.99, start = 1): SpawnEntry {
  // bosses are deliberately much beefier than their escorts
  return { enemy, start, interval: [999, 999], count: 1, mult: Math.round(mult * 1.7), trigger, boss: true };
}

interface Raw {
  name: string;
  len: number;
  hp: number;
  d: number; // difficulty % applied to every spawn
  spawns: SpawnEntry[];
  unlock?: string;
  boss?: boolean;
  tip?: string;
  max?: number;
  mod?: StageMod;
}

export const WORLD_NAMES = ['いもばたけ', 'どんぐりの もり', 'ぐらぐら やま', 'ゆきの くに'];

const RAW: Raw[] = [
  // ===== World 1: いもばたけ =====
  { name: 'はじめての たたかい', len: 1200, hp: 1200, d: 100, unlock: 'chips',
    tip: 'したの じゃがいもボタンを タップして しゅつげき！',
    spawns: [e('ari', 3, [7, 9])] },
  { name: 'ネズミが きた！', len: 1350, hp: 2000, d: 100, unlock: 'satsu',
    tip: 'さといもは かたい かべ。まえに だして まもろう！',
    spawns: [e('ari', 3, [6, 8]), e('nezumi', 14, [12, 16])] },
  { name: 'のろのろ けむし', len: 1450, hp: 2800, d: 100,
    tip: 'おさいふを レベルアップすると おかねが はやく たまるよ！',
    spawns: [e('ari', 2, [5, 7]), e('kemushi', 12, [16, 20]), e('nezumi', 25, [12, 16])] },
  { name: 'カラスの むれ', len: 1500, hp: 3500, d: 105, unlock: 'kenpi',
    spawns: [e('ari', 3, [6, 8]), e('karasu', 15, [14, 18]), e('nezumi', 8, [10, 14])] },
  { name: 'はたけの ピンチ', len: 1600, hp: 4500, d: 110,
    tip: 'いもビームが たまったら タップ！ てきを まとめて ふっとばすよ',
    spawns: [e('ari', 2, [4, 6]), e('kemushi', 8, [14, 18]), e('karasu', 20, [14, 18]), e('nezumi', 30, [6, 9], 0, 100, 0.6)] },
  { name: 'ボス！ カブトムシ', len: 1600, hp: 6000, d: 100, boss: true, unlock: 'fry',
    tip: 'ボスが くると みんな ふっとばされる！ たくさん だして たちむかおう',
    spawns: [e('ari', 2, [5, 7]), boss('kabuto', 35, 0.95, 2), e('nezumi', 10, [9, 12], 0, 100, 0.95)] },
  { name: 'ハチの すあな', len: 1650, hp: 6000, d: 110,
    tip: 'ハチは とおくから うってくる。かべで うけとめよう',
    spawns: [e('ari', 2, [5, 7]), e('hachi', 10, [12, 15]), e('kemushi', 20, [18, 22])] },
  { name: 'モグラの いたずら', len: 1700, hp: 7000, d: 110, unlock: 'yaki',
    tip: 'モグラは もぐって うしろに まわりこむ！',
    spawns: [e('ari', 2, [5, 7]), e('mogura', 12, [16, 20]), e('nezumi', 6, [8, 12])] },
  { name: 'ありの だいぎょうれつ', len: 1500, hp: 5000, d: 95, max: 34,
    tip: 'ありが いっぱい！ まとめて やっつけよう',
    spawns: [e('ari', 1, [1.2, 2.0]), e('ari', 30, [0.8, 1.4], 0, 130)] },
  { name: 'カタツムリ さんぽ', len: 1800, hp: 8000, d: 120,
    spawns: [e('katatsumuri', 5, [22, 26]), e('hachi', 12, [11, 14]), e('ari', 2, [5, 7])] },
  { name: 'あれた はたけ', len: 1900, hp: 9000, d: 125, unlock: 'murasaki',
    spawns: [e('nezumi', 2, [6, 9]), e('karasu', 8, [11, 14]), e('mogura', 20, [18, 24]), e('kemushi', 15, [16, 20]), e('hachi', 30, [10, 14], 0, 100, 0.7)] },
  { name: 'ボス！ おおガラス', len: 2000, hp: 12000, d: 100, boss: true,
    tip: 'フライドポテトは とりに つよいよ！',
    spawns: [e('karasu', 2, [8, 11], 0, 120), boss('okarasu', 40, 0.9, 2), e('karasu', 6, [7, 9], 0, 120, 0.9), e('ari', 4, [6, 8], 0, 140)] },

  // ===== World 2: どんぐりの もり =====
  { name: 'もりの いりぐち', len: 1900, hp: 12000, d: 140,
    spawns: [e('tanuki', 6, [16, 20]), e('nezumi', 2, [6, 8]), e('ari', 3, [5, 7])] },
  { name: 'カマキリの まちぶせ', len: 2000, hp: 14000, d: 140, unlock: 'konnyaku',
    tip: 'カマキリは こうげきが つよい。かべを たくさん だそう',
    spawns: [e('kamakiri', 12, [18, 22]), e('ari', 2, [4, 6]), e('hachi', 18, [12, 15])] },
  { name: 'ヘビの こみち', len: 2100, hp: 15000, d: 150,
    spawns: [e('hebi', 10, [18, 22]), e('nezumi', 3, [5, 7]), e('karasu', 15, [12, 15])] },
  { name: 'どんぐり ひろば', len: 1700, hp: 10000, d: 120, max: 34,
    tip: 'てきが いっぱい。おかねを ためる チャンス！',
    spawns: [e('nezumi', 1, [1.5, 2.5]), e('ari', 1, [1.5, 2.5]), e('kemushi', 10, [6, 9])] },
  { name: 'フクロウの よる', len: 2100, hp: 16000, d: 155, unlock: 'butter',
    tip: 'フクロウに にらまれると うごけなくなるよ',
    spawns: [e('fukurou', 10, [18, 22]), e('ari', 2, [5, 7]), e('tanuki', 20, [18, 22])] },
  { name: 'ボス！ もりの カブトムシ', len: 2100, hp: 20000, d: 100, boss: true,
    spawns: [e('ari', 2, [4, 6], 0, 200), boss('kabuto', 110, 0.95, 3), e('kamakiri', 10, [16, 20], 0, 140, 0.95), e('hachi', 5, [10, 13], 0, 160)] },
  { name: 'イノシシ とっしん', len: 2200, hp: 18000, d: 160,
    tip: 'こんにゃくいもは けものに つよい！',
    spawns: [e('kaeru', 30, [20, 26]), e('inoshishi', 12, [18, 24]), e('nezumi', 2, [5, 7]), e('tanuki', 25, [16, 20])] },
  { name: 'もりの だいらんとう', len: 2300, hp: 20000, d: 170, unlock: 'naga',
    tip: 'カメの こうらは よわい こうげきを はじく！ つよい いちげきで わろう',
    spawns: [e('kame', 20, [26, 32]), e('kamakiri', 8, [16, 20]), e('hebi', 18, [18, 22]), e('karasu', 3, [7, 10]), e('ari', 2, [4, 6]), e('inoshishi', 30, [20, 26], 0, 100, 0.6)] },
  { name: 'きのこ やすみ', len: 1800, hp: 14000, d: 130, max: 34,
    tip: 'ひとやすみ ステージ。たくさん たおそう！',
    spawns: [e('kemushi', 2, [3, 5]), e('ari', 1, [1.5, 2.2]), e('katatsumuri', 20, [14, 18])] },
  { name: 'まよいの もり', len: 2300, hp: 22000, d: 180,
    spawns: [e('kaeru', 12, [16, 20]), e('fukurou', 6, [16, 20]), e('mogura', 10, [14, 18]), e('nezumi', 2, [4, 6]), e('hachi', 15, [10, 13])] },
  { name: 'けものみち', len: 2400, hp: 24000, d: 185,
    spawns: [e('kaeru', 20, [18, 22]), e('inoshishi', 6, [14, 18]), e('tanuki', 3, [10, 13]), e('hebi', 20, [18, 22]), e('nezumi', 2, [3, 5])] },
  { name: 'ボス！ クマ', len: 2300, hp: 30000, d: 100, boss: true,
    tip: 'クマは とっても つよい！ いもビームを うまく つかおう',
    spawns: [e('nezumi', 2, [4, 6], 0, 200), boss('kuma', 75, 0.9, 2), e('tanuki', 8, [12, 15], 0, 180, 0.9), e('inoshishi', 25, [20, 26], 0, 160, 0.9)] },

  // ===== World 3: ぐらぐら やま =====
  { name: 'やまの ふもと', len: 2300, hp: 30000, d: 210,
    spawns: [e('kame', 15, [22, 28]), e('ari', 2, [3, 5]), e('karasu', 5, [8, 11]), e('tanuki', 12, [12, 15]), e('kemushi', 8, [10, 13])] },
  { name: 'ハチの おしろ', len: 2400, hp: 32000, d: 220,
    tip: 'ピカピカの てきは クリティカルで しか たおせない！ いもけんぴが とくいだよ',
    spawns: [e('metal', 25, [35, 45], 4), e('hachi', 2, [4, 6]), e('kamakiri', 12, [14, 18]), e('katatsumuri', 20, [20, 24])] },
  { name: 'がけの カラス', len: 2400, hp: 34000, d: 225,
    spawns: [e('karasu', 2, [4, 6]), e('fukurou', 10, [14, 18]), e('okarasu', 40, [60, 60], 1, 50)] },
  { name: 'おんせん ひとやすみ', len: 2000, hp: 25000, d: 180, max: 36,
    tip: 'おんせんで ひとやすみ。たくさん たおして おかねを ためよう',
    spawns: [e('nezumi', 1, [1.2, 2]), e('ari', 1, [1.2, 2]), e('tanuki', 10, [8, 10])] },
  { name: 'いわの トンネル', len: 2500, hp: 38000, d: 240,
    spawns: [e('kaeru', 6, [14, 18]), e('mogura', 4, [9, 12]), e('hebi', 10, [14, 18]), e('nezumi', 2, [4, 6]), e('inoshishi', 25, [18, 22])] },
  { name: 'ボス！ そらと だいち', len: 2500, hp: 45000, d: 100, boss: true,
    spawns: [e('karasu', 2, [5, 7], 0, 260), boss('okarasu', 160, 0.95, 2), boss('kuma', 110, 0.6, 2), e('tanuki', 6, [10, 13], 0, 240, 0.95)] },
  { name: 'きりの やまみち', len: 2500, hp: 42000, d: 260,
    spawns: [e('metal', 20, [30, 40], 5), e('fukurou', 4, [10, 13]), e('kamakiri', 8, [12, 15]), e('ari', 2, [3, 5]), e('hebi', 20, [16, 20])] },
  { name: 'イノシシの むれ', len: 2600, hp: 45000, d: 270,
    spawns: [e('kame', 25, [24, 30]), e('inoshishi', 3, [8, 11]), e('nezumi', 2, [3, 5]), e('tanuki', 15, [12, 15])] },
  { name: 'カブトの もり', len: 2600, hp: 48000, d: 100,
    spawns: [e('kabuto', 10, [40, 50], 3, 150), e('kamakiri', 5, [12, 15], 0, 280), e('ari', 2, [3, 4], 0, 300)] },
  { name: 'やまの おまつり', len: 2200, hp: 35000, d: 220, max: 36,
    tip: 'おまつりだ！ てきが たくさん くるよ',
    spawns: [e('kemushi', 1, [3, 4]), e('nezumi', 1, [1.5, 2]), e('karasu', 5, [5, 7]), e('ari', 1, [1, 1.5])] },
  { name: 'ちょうじょう まえ', len: 2700, hp: 55000, d: 300,
    spawns: [e('kame', 30, [28, 34]), e('metal', 15, [30, 40], 5), e('kaeru', 10, [16, 20]), e('inoshishi', 5, [12, 15]), e('fukurou', 8, [14, 18]), e('kamakiri', 10, [12, 15]), e('hebi', 15, [16, 20]), e('nezumi', 2, [3, 5])] },
  { name: 'さいごの たたかい！ イモクイ大王', len: 2800, hp: 80000, d: 100, boss: true,
    tip: 'いよいよ さいご！ ぜんぶの ちからで 大王を たおせ！',
    spawns: [e('nezumi', 2, [4, 6], 0, 320), boss('daiou', 100, 0.95, 3), e('inoshishi', 10, [16, 20], 0, 280, 0.95), e('kamakiri', 15, [14, 18], 0, 300, 0.95), e('okarasu', 30, [60, 60], 2, 140, 0.5)] },

  // ===== World 4: ゆきの くに =====
  { name: 'ゆきの いりぐち', len: 2700, hp: 56000, d: 300,
    tip: 'ペンギンの ゆきだまに あたると おそくなるよ',
    spawns: [e('yukiusagi', 4, [6, 8]), e('penguin', 10, [14, 18]), e('tanuki', 15, [12, 15]), e('ari', 2, [3, 5])] },
  { name: 'ふぶきの はら', len: 2700, hp: 58000, d: 305, mod: 'blizzard', unlock: 'gratin',
    tip: 'ふぶきに ちゅうい！ おいかぜの ときに いっきに すすもう',
    spawns: [e('yukiusagi', 2, [5, 7]), e('penguin', 8, [12, 15]), e('kame', 20, [24, 30]), e('karasu', 5, [8, 11])] },
  { name: 'ゆきだるま がっせん', len: 2600, hp: 60000, d: 310,
    tip: 'ゆきだるまは わると 2つに なるよ。まとめて たおそう',
    spawns: [e('yukidaruma', 8, [14, 18]), e('nezumi', 2, [4, 6]), e('hachi', 12, [10, 13])] },
  { name: 'ゆきまつり', len: 2200, hp: 40000, d: 240, max: 36, mod: 'festival',
    tip: 'おまつりだ！ てきの おかねが 2ばい！',
    spawns: [e('yukiusagi', 1, [1.5, 2]), e('chibidaruma', 3, [2, 3]), e('metal', 20, [25, 30], 4)] },
  { name: 'つるつる いけ', len: 2700, hp: 62000, d: 320, mod: 'slippery',
    tip: 'こおりの うえ！ ふっとぶと とおくまで すべるよ',
    spawns: [e('inoshishi', 6, [12, 15]), e('yukidaruma', 10, [16, 20]), e('kaeru', 15, [16, 20]), e('nezumi', 2, [3, 5])] },
  { name: 'トナカイの そり', len: 2800, hp: 65000, d: 330, mod: 'blizzard',
    tip: 'トナカイは なかまを なおす！ とおくから ねらおう',
    spawns: [e('tonakai', 10, [18, 22]), e('kamakiri', 8, [12, 15]), e('penguin', 5, [12, 15]), e('ari', 2, [3, 5])] },
  { name: 'ユキオトコの どうくつ', len: 2800, hp: 68000, d: 340, unlock: 'ski',
    tip: 'ユキオトコは ふっかつ する！ ポテトグラタンで とかせば ふっかつ しないよ',
    spawns: [e('yukiotoko', 12, [20, 26]), e('mogura', 6, [12, 15]), e('hebi', 15, [16, 20]), e('yukiusagi', 2, [5, 7])] },
  { name: 'ボス！ マンモス', len: 2700, hp: 60000, d: 100, boss: true,
    tip: 'マンモスの ずしん！で ふっとばされたら、すぐに なかまを だそう',
    spawns: [e('yukiusagi', 2, [4, 6], 0, 300), boss('mammoth', 150, 0.95, 2), e('yukidaruma', 8, [14, 18], 0, 260, 0.95), e('penguin', 10, [12, 15], 0, 260, 0.9)] },
  { name: 'こおりの めいろ', len: 2900, hp: 72000, d: 350, mod: 'slippery',
    tip: 'ピカピカの てきは いもけんぴで！ つるつる すべるよ',
    spawns: [e('yukiotoko', 15, [22, 28]), e('tonakai', 10, [18, 22]), e('fukurou', 6, [14, 18]), e('metal', 20, [30, 40], 5), e('nezumi', 2, [3, 5])] },
  { name: 'かまくら ひとやすみ', len: 2200, hp: 45000, d: 260, max: 36,
    tip: 'かまくらで ひとやすみ。たくさん たおして おかねを ためよう',
    spawns: [e('chibidaruma', 1, [1.5, 2.2]), e('kemushi', 2, [3, 4]), e('yukiusagi', 5, [3, 5])] },
  { name: 'ふぶきの とうげ', len: 3000, hp: 64000, d: 370, mod: 'blizzard',
    tip: 'さいごの とうげ！ ぜんぶの ちからを だそう',
    spawns: [e('yukiotoko', 20, [22, 26]), e('yukidaruma', 8, [14, 18]), e('tonakai', 12, [18, 22]), e('penguin', 5, [12, 15]), e('inoshishi', 10, [14, 18]), e('kame', 25, [26, 32]), e('yukiusagi', 2, [4, 6])] },
  { name: 'さいごの たたかい！ こおり大王', len: 3000, hp: 88000, d: 100, boss: true, unlock: 'german',
    tip: 'こおり大王を たおせ！ ポテトグラタンで こおりを とかそう',
    spawns: [e('yukiusagi', 2, [4, 6], 0, 340), boss('kooriou', 120, 0.95, 3), e('yukidaruma', 10, [16, 20], 0, 320, 0.95), e('tonakai', 20, [22, 26], 0, 300, 0.9), boss('mammoth', 100, 0.5, 2)] },
];

const VALLEYS = new Set([9, 16, 21, 28, 34, 40, 46]);

export const STAGES: StageDef[] = RAW.map((r, i) => ({
  id: i + 1,
  name: r.name,
  world: Math.floor(i / 12),
  length: r.len,
  baseHp: i >= 19 ? Math.round(r.hp * 0.42) : i >= 12 ? Math.round(r.hp * 0.55) : r.hp,
  spawns: withThieves(i + 1, r).map((s) => ({ ...s, mult: Math.round(((s.mult ?? 100) * r.d * (TUNING[i] ?? 1)) / 100) })),
  reward: Math.round((150 + 60 * i + (r.boss ? 300 + 40 * i : 0)) / 10) * 10,
  unlock: r.unlock,
  boss: r.boss,
  maxEnemies: r.max,
  tip: r.tip,
  mod: r.mod,
  rushes: makeRushes(i + 1, r, TUNING[i] ?? 1),
}));

function withThieves(id: number, r: Raw): SpawnEntry[] {
  if (id < 5 || VALLEYS.has(id) || id % 3 === 1) return r.spawns;
  const iv: [number, number] = id < 13 ? [20, 28] : [15, 21];
  return [...r.spawns, { enemy: 'dorobou', start: 25, interval: iv, count: 0, mult: 100 }];
}

function makeRushes(id: number, r: Raw, tune: number) {
  if (id <= 2 || VALLEYS.has(id)) return [];
  // the fastest regular enemy of the stage charges in as a big group
  const regular = r.spawns.filter((s) => !ENEMY_MAP[s.enemy].boss && s.trigger === undefined);
  if (!regular.length) return [];
  const pick = regular.reduce((a, b) => (ENEMY_MAP[b.enemy].speed > ENEMY_MAP[a.enemy].speed ? b : a));
  const mult = Math.round(((pick.mult ?? 100) * r.d * tune) / 100);
  const count = Math.min(9, 4 + Math.floor(id / 7));
  const times = r.boss ? [60, 140] : [45, 100, 155];
  return times.map((at) => ({ at, enemy: pick.enemy, count, mult }));
}

/** Gacha tickets awarded on first clear */
export function ticketReward(stage: StageDef): number {
  if (stage.boss) return 2;
  return stage.id % 3 === 0 ? 1 : 0;
}

/** ★2 / ★3 versions of a stage: same layout, much stronger enemies. */
export const STAR_MULT = [1, 1, 1.45, 2.1];
export const STAR_NAMES = ['', 'ふつう', 'むずかしい', 'げきむず'];

export function starStage(stage: StageDef, star: number): StageDef {
  if (star <= 1) return stage;
  // early stages get a much bigger boost (the player is far stronger than they were the first time)
  // measured against the first 3 worlds so adding worlds doesn't change old stages
  const early = Math.max(0, 36 - stage.id) / 36;
  const m = STAR_MULT[star] * (1 + early * (star === 2 ? 0.8 : 1.2));
  return {
    ...stage,
    baseHp: Math.round(stage.baseHp * (1 + (m - 1) * 0.5)),
    spawns: stage.spawns.map((s) => ({ ...s, mult: Math.round((s.mult ?? 100) * m) })),
    rushes: (stage.rushes ?? []).map((r) => ({ ...r, mult: Math.round(r.mult * m), count: r.count + star })),
  };
}

/** Daily bonus stage: swarms of weak, coin-rich enemies. Scales with progress. */
export const BONUS_ID = 100;
export function bonusStage(progress: number): StageDef {
  const p = Math.max(1, Math.min(STAGES.length, progress));
  const m = Math.round(80 + p * 12);
  return {
    id: BONUS_ID,
    name: 'いもまつり（ボーナス）',
    world: Math.min(WORLD_NAMES.length - 1, Math.floor((p - 1) / 12)),
    length: 1500,
    baseHp: 3000 + p * 700,
    spawns: [
      { enemy: 'ari', start: 1, interval: [0.8, 1.4], count: 0, mult: m },
      { enemy: 'nezumi', start: 4, interval: [1.5, 2.5], count: 0, mult: m },
      { enemy: 'metal', start: 20, interval: [25, 30], count: 3, mult: 100 },
    ],
    reward: 300 + p * 30,
    maxEnemies: 30,
    tip: 'てきが いっぱい！ たおして おかねを ためよう！ 1にち 1かい、ガチャけんが もらえるよ',
    rushes: [],
  };
}
