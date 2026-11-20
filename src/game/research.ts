// Base upgrades ("けんきゅう") bought with きんいも. Effects apply to every battle.

export interface ResearchDef {
  id: string;
  name: string;
  desc: string;
  max: number;
  baseCost: number;
}

export const RESEARCH: ResearchDef[] = [
  { id: 'castle', name: 'おしろの かたさ', desc: 'みかたの おしろの たいりょくが ふえる', max: 20, baseCost: 150 },
  { id: 'income', name: 'おかねの たまるはやさ', desc: 'バトルで おかねが はやく たまる', max: 20, baseCost: 200 },
  { id: 'wallet', name: 'おさいふの おおきさ', desc: 'おかねを たくさん もてる', max: 20, baseCost: 150 },
  { id: 'beamPow', name: 'いもビームの いりょく', desc: 'いもビームが つよくなる', max: 20, baseCost: 150 },
  { id: 'beamCharge', name: 'いもビームの じゅうでん', desc: 'いもビームが はやく つかえる', max: 20, baseCost: 180 },
  { id: 'startMoney', name: 'はじめの おかね', desc: 'バトルの さいしょに もってる おかね', max: 20, baseCost: 120 },
];

export function researchCost(def: ResearchDef, lv: number): number {
  return Math.round((def.baseCost * (1 + lv * 0.6 + lv * lv * 0.04)) / 10) * 10;
}

export interface BattleMods {
  castleHp: number;
  incomeMult: number;
  walletMult: number;
  beamDmg: number;
  beamCharge: number; // seconds
  startMoney: number;
}

export function battleMods(r: Record<string, number>): BattleMods {
  const L = (id: string) => r[id] ?? 0;
  return {
    castleHp: 5000 + 800 * L("castle"),
    incomeMult: 1 + 0.035 * L('income'),
    walletMult: 1 + 0.05 * L('wallet'),
    beamDmg: 160 + 70 * L('beamPow'),
    beamCharge: Math.max(12, 32 - 1.0 * L('beamCharge')),
    startMoney: 50 * L('startMoney'),
  };
}
