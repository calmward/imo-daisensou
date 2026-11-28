import type { AllyDef } from './types';

/**
 * The potato army. Stats are for level 1.
 * Ranges: melee ~110-150, mid ~200-280, long 350+.
 */
export const ALLIES: AllyDef[] = [
  {
    id: 'jaga', name: 'じゃがいも', role: 'きほん', rarity: 'N',
    desc: 'げんきな じゃがいも。やすくて すぐ だせる！',
    cost: 75, cooldown: 2.0, hp: 160, atk: 22, range: 115, speed: 50, atkInterval: 1.1, foreswing: 0.25, kb: 3, area: false, width: 40, size: 0.9,
  },
  {
    id: 'sato', name: 'さといも', role: 'かべ', rarity: 'N',
    desc: 'けむくじゃらで かたい。てきを とめる かべやく。',
    cost: 120, cooldown: 3.5, hp: 620, atk: 8, range: 105, speed: 42, atkInterval: 1.8, foreswing: 0.3, kb: 2, area: false, width: 46, size: 1.0,
  },
  {
    id: 'chips', name: 'ポテチ', role: 'はやい', rarity: 'N',
    desc: 'ぱりぱり ポテチ。はやくて とっても やすい！',
    cost: 50, cooldown: 1.6, hp: 70, atk: 14, range: 100, speed: 95, atkInterval: 0.6, foreswing: 0.12, kb: 1, area: false, width: 30, size: 0.8,
  },
  {
    id: 'satsu', name: 'さつまいも', role: 'つよい', rarity: 'N',
    desc: 'はちまきを しめた ちからもち。まわりを まとめて なぐる！',
    cost: 240, cooldown: 6.0, hp: 520, atk: 80, range: 140, speed: 55, atkInterval: 1.6, foreswing: 0.35, kb: 3, area: true, width: 60, size: 1.1,
  },
  {
    id: 'kenpi', name: 'いもけんぴ', role: 'すばやい', rarity: 'N',
    desc: 'カリカリの ほそい からだで すばやく れんぞく こうげき。ときどき クリティカル！',
    cost: 180, cooldown: 4.0, hp: 230, atk: 30, range: 120, speed: 115, atkInterval: 0.55, foreswing: 0.1, kb: 3, area: false, width: 40, size: 1.0, crit: 0.15,
  },
  {
    id: 'fry', name: 'フライドポテト', role: 'とおくから', rarity: 'N',
    desc: 'ケチャップの やりで とおくから つく。とりに つよい！',
    cost: 300, cooldown: 8.0, hp: 320, atk: 120, range: 270, speed: 45, atkInterval: 2.3, foreswing: 0.45, kb: 3, area: false, width: 40, size: 1.1, strongVs: ['bird'],
  },
  {
    id: 'yaki', name: 'やきいも', role: 'はんい', rarity: 'N',
    desc: 'あつあつ やきいも。ほのおで まとめて やっつける。むしに つよい！',
    cost: 450, cooldown: 11.0, hp: 950, atk: 150, range: 160, speed: 40, atkInterval: 2.1, foreswing: 0.4, kb: 2, area: true, width: 60, size: 1.2, strongVs: ['bug'],
  },
  {
    id: 'murasaki', name: 'むらさきいも', role: 'まほう', rarity: 'N',
    desc: 'まほうつかいの いも。むらさきの まほうで てきを おそくする。',
    cost: 400, cooldown: 10.0, hp: 420, atk: 115, range: 240, speed: 40, atkInterval: 2.5, foreswing: 0.5, kb: 2, area: true, width: 46, size: 1.05,
    effect: { kind: 'slow', chance: 0.5, dur: 3 },
  },
  {
    id: 'konnyaku', name: 'こんにゃくいも', role: 'ふっとばし', rarity: 'N',
    desc: 'ぷるぷる ボディで てきを ふっとばす！けものに つよい。',
    cost: 350, cooldown: 9.0, hp: 760, atk: 60, range: 150, speed: 60, atkInterval: 1.5, foreswing: 0.3, kb: 3, area: true, width: 50, size: 1.05, strongVs: ['beast'],
    effect: { kind: 'knock', chance: 0.5, dur: 0 },
  },
  {
    id: 'butter', name: 'じゃがバター', role: 'タンク', rarity: 'N',
    desc: 'バターを のせた おおきな じゃがいも。とっても たふ！',
    cost: 500, cooldown: 14.0, hp: 2800, atk: 45, range: 130, speed: 35, atkInterval: 2.0, foreswing: 0.35, kb: 2, area: true, width: 70, size: 1.35,
  },
  {
    id: 'naga', name: 'ながいも', role: 'スナイパー', rarity: 'N',
    desc: 'ひょろながい からだで すごく とおくまで とどく。ねばねばで おそくする。',
    cost: 650, cooldown: 18.0, hp: 520, atk: 320, range: 430, speed: 30, atkInterval: 4.0, foreswing: 0.8, kb: 2, area: true, width: 40, size: 1.3,
    effect: { kind: 'slow', chance: 0.6, dur: 3 },
  },
  {
    id: 'gratin', name: 'ポテトグラタン', role: 'とかす', rarity: 'N',
    desc: 'あつあつ グラタンで こおりの てきを とかす！ ふっかつも させない',
    cost: 480, cooldown: 12.0, hp: 1500, atk: 150, range: 260, speed: 40, atkInterval: 2.0, foreswing: 0.4, kb: 2, area: true, width: 62, size: 1.2, strongVs: ['ice'],
  },
  {
    id: 'ski', name: 'スキーいも', role: 'ジャンプ', rarity: 'N',
    desc: 'スキーで てきを とびこえて、うしろの てきを こうげき！',
    cost: 360, cooldown: 9.0, hp: 600, atk: 110, range: 130, speed: 100, atkInterval: 1.0, foreswing: 0.2, kb: 2, area: false, width: 44, size: 1.0, crit: 0.1, burrow: 280, jump: true,
  },
  {
    id: 'imoice', name: 'いもアイス', role: 'ひやす', rarity: 'N',
    desc: 'ひんやり アイスで ほのおの てきを ひやす！ ゴーレムも ふっかつ させない',
    cost: 450, cooldown: 11.0, hp: 1100, atk: 140, range: 250, speed: 42, atkInterval: 2.0, foreswing: 0.4, kb: 3, area: true, width: 46, size: 1.05, strongVs: ['fire'],
    effect: { kind: 'slow', chance: 0.4, dur: 2 },
  },
  {
    id: 'imomochi', name: 'いももち', role: 'ねばねば', rarity: 'N',
    desc: 'もちもち ボディで うけとめて、けものを ねばねばで とめる！',
    cost: 360, cooldown: 9.0, hp: 2400, atk: 60, range: 120, speed: 40, atkInterval: 1.6, foreswing: 0.3, kb: 2, area: true, width: 56, size: 1.1,
    effect: { kind: 'freeze', chance: 0.5, dur: 1.5, vs: ['beast'] },
  },
  // ---- ガチャ限定 ----
  {
    id: 'sweet', name: 'スイートポテト', role: 'とめる', rarity: 'R', gacha: true,
    desc: 'あまい かおりで てきを うっとり ストップ させる！',
    cost: 380, cooldown: 11.0, hp: 480, atk: 60, range: 250, speed: 50, atkInterval: 2.0, foreswing: 0.35, kb: 3, area: false, width: 44, size: 1.0,
    effect: { kind: 'freeze', chance: 0.4, dur: 2.0 },
  },
  {
    id: 'youkan', name: 'いもようかん', role: 'てっぺき', rarity: 'R', gacha: true,
    desc: 'かちかちの ようかん。すごく かたい かべ。むしに つよい！',
    cost: 300, cooldown: 9.0, hp: 2600, atk: 25, range: 110, speed: 32, atkInterval: 2.0, foreswing: 0.3, kb: 1, area: false, width: 56, size: 1.1, strongVs: ['bug'],
  },
  {
    id: 'ninja', name: 'いもにんじゃ', role: 'にんじゃ', rarity: 'R', gacha: true,
    desc: 'しゅしゅっと はしる にんじゃ いも。クリティカルが でやすい！',
    cost: 330, cooldown: 7.0, hp: 380, atk: 70, range: 130, speed: 140, atkInterval: 0.7, foreswing: 0.12, kb: 4, area: false, width: 40, size: 1.0, crit: 0.3,
  },
  {
    id: 'hash', name: 'ハッシュドポテト', role: 'たて', rarity: 'R', gacha: true,
    desc: 'しかくい たて で みんなを まもる。けものに つよい！',
    cost: 260, cooldown: 6.0, hp: 1500, atk: 40, range: 120, speed: 45, atkInterval: 1.6, foreswing: 0.3, kb: 2, area: true, width: 54, size: 1.1, strongVs: ['beast'],
  },
  {
    id: 'korokke', name: 'コロッケ', role: 'なげる', rarity: 'R', gacha: true,
    desc: 'サクサク コロッケを とおくまで なげる！ まとめて あたるよ。',
    cost: 420, cooldown: 10.0, hp: 380, atk: 130, range: 320, speed: 42, atkInterval: 2.6, foreswing: 0.5, kb: 3, area: true, width: 44, size: 1.0,
  },
  {
    id: 'potesala', name: 'ポテトサラダ', role: 'かいふく', rarity: 'R', gacha: true,
    desc: 'しゃきしゃき やさいで まわりの いもを げんきに する！',
    cost: 400, cooldown: 12.0, hp: 900, atk: 30, range: 200, speed: 40, atkInterval: 2.0, foreswing: 0.35, kb: 3, area: true, width: 50, size: 1.05, heal: 0.08,
  },
  {
    id: 'mash', name: 'マッシュポテト', role: 'ふわふわ', rarity: 'SR', gacha: true,
    desc: 'ふわっふわの おおきな からだで うけとめて、てきを おそくする。',
    cost: 520, cooldown: 13.0, hp: 5200, atk: 140, range: 150, speed: 32, atkInterval: 2.2, foreswing: 0.4, kb: 2, area: true, width: 76, size: 1.3,
    effect: { kind: 'slow', chance: 0.6, dur: 3 },
  },
  {
    id: 'nyokki', name: 'ニョッキ', role: 'れんぞく', rarity: 'R', gacha: true,
    desc: 'ころころ ニョッキが ちかくの てき 3たいを いっきに こうげき！',
    cost: 200, cooldown: 4.0, hp: 900, atk: 40, range: 110, speed: 70, atkInterval: 0.8, foreswing: 0.15, kb: 2, area: false, width: 40, size: 0.9, multiHit: 3,
  },
  {
    id: 'pie', name: 'ポテトパイ', role: 'こうらわり', rarity: 'SR', gacha: true,
    desc: 'さくさく パイの すごい いちげき！ かたい バリアも わる',
    cost: 600, cooldown: 15.0, hp: 2200, atk: 1100, range: 180, speed: 45, atkInterval: 3.4, foreswing: 0.6, kb: 3, area: false, width: 54, size: 1.15, crit: 0.1,
  },
  {
    id: 'german', name: 'ジャーマンポテト', role: 'じゅうじゅう', rarity: 'SR', gacha: true,
    desc: 'じゅうじゅう やけた ベーコンで まとめて ふっとばす！ むれに つよい',
    cost: 420, cooldown: 7.0, hp: 1800, atk: 220, range: 200, speed: 55, atkInterval: 1.4, foreswing: 0.3, kb: 3, area: true, width: 60, size: 1.15,
    effect: { kind: 'knock', chance: 0.25, dur: 0 },
  },
  {
    id: 'daigaku', name: 'だいがくいも', role: 'エース', rarity: 'SR', gacha: true,
    desc: 'あまくて つよい エース！ みつの こうげきで まとめて たおす。',
    cost: 650, cooldown: 16.0, hp: 2800, atk: 380, range: 200, speed: 60, atkInterval: 1.7, foreswing: 0.35, kb: 3, area: true, width: 66, size: 1.3,
  },
  {
    id: 'king', name: 'キングさつまいも', role: 'でんせつ', rarity: 'UR', gacha: true,
    desc: 'いもの おうさま！ すべてを なぎはらう でんせつの いも。ボスに つよい！',
    cost: 1200, cooldown: 35.0, hp: 9000, atk: 1400, range: 320, speed: 35, atkInterval: 3.0, foreswing: 0.6, kb: 3, area: true, width: 90, size: 1.8, strongVs: ['boss'],
  },
];

export const ALLY_MAP: Record<string, AllyDef> = Object.fromEntries(ALLIES.map((a) => [a.id, a]));

/** Stat multiplier for a unit level. */
export function levelMult(lv: number, ultra = false): number {
  return (1 + 0.26 * (lv - 1)) * (lv >= EVOLVE_LV ? 1.2 : 1) * (lv >= HYPER_LV ? 1.15 : 1) * (ultra && lv >= ULTRA_LV ? ULTRA_MULT : 1);
}

/** third evolution (ウルトラ): Lv22 + 1 ほのおのいし */
export const ULTRA_LV = 22;
export const ULTRA_MULT = 1.12;

/** At this level a potato evolves ("しんか") into its super form. */
export const EVOLVE_LV = 7;
/** second evolution (ハイパー) */
export const HYPER_LV = 15;

export function evoStage(lv: number, ultra = false): 0 | 1 | 2 | 3 {
  return ultra && lv >= ULTRA_LV ? 3 : lv >= HYPER_LV ? 2 : lv >= EVOLVE_LV ? 1 : 0;
}

export function isEvolved(lv: number) {
  return lv >= EVOLVE_LV;
}

export function unitName(def: AllyDef, lv: number, ultra = false) {
  return ultra && lv >= ULTRA_LV ? 'ウルトラ' + def.name : lv >= HYPER_LV ? 'ハイパー' + def.name : isEvolved(lv) ? 'スーパー' + def.name : def.name;
}

export const MAX_LEVEL = 30;

/** きんいも needed to go from lv to lv+1. */
export function levelCost(def: AllyDef, lv: number): number {
  const base = { N: 60, R: 100, SR: 160, UR: 260 }[def.rarity];
  return Math.round((base * lv * (1 + lv * 0.06)) / 10) * 10;
}
