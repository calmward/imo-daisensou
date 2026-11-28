import type { Battle } from './battle';

/** チャレンジメダル: an extra goal for each volcano stage, offered after its first clear. */
export interface Medal {
  text: string;
  /** did the finished (won) battle meet the goal? */
  ok: (b: Battle) => boolean;
  /** short live progress for the HUD; `fail` = already impossible this battle */
  live: (b: Battle) => { text: string; fail: boolean };
}

const castle = (b: Battle) => b.pBase.hp / b.pBase.max;
const mins = (b: Battle) => `${Math.floor(b.time / 60)}:${String(Math.floor(b.time % 60)).padStart(2, '0')}`;

function maxDeploy(n: number): Medal {
  return { text: `なかまを ${n}たい までで かつ`, ok: (b) => b.deploys <= n, live: (b) => ({ text: `なかま ${b.deploys}/${n}`, fail: b.deploys > n }) };
}
function inTime(sec: number): Medal {
  return { text: `${sec / 60}ぷん いないに かつ`, ok: (b) => b.time <= sec, live: (b) => ({ text: `${mins(b)} / ${sec / 60}:00`, fail: b.time > sec }) };
}
function noBeam(): Medal {
  return { text: 'ビームを つかわずに かつ', ok: (b) => b.beamsFired === 0, live: (b) => ({ text: b.beamsFired ? 'ビーム つかった…' : 'ビーム なし', fail: b.beamsFired > 0 }) };
}
function keepCastle(p: number): Medal {
  return {
    text: `おしろを ${Math.round(p * 100)}% のこして かつ`,
    ok: (b) => castle(b) >= p,
    live: (b) => ({ text: `おしろ ${Math.round(castle(b) * 100)}%`, fail: castle(b) < p }),
  };
}

export const MEDALS: Record<number, Medal> = {
  49: keepCastle(0.8),
  50: inTime(180),
  51: { text: 'いわを 5こ こわして かつ', ok: (b) => b.rocksBroken >= 5, live: (b) => ({ text: `いわ ${Math.min(5, b.rocksBroken)}/5`, fail: false }) },
  52: noBeam(),
  53: { text: 'たまごを 1こも かえさずに かつ（タップで われる！）', ok: (b) => b.hatched === 0, live: (b) => ({ text: b.hatched ? 'うまれちゃった…' : 'たまご まもり中', fail: b.hatched > 0 }) },
  54: keepCastle(0.5),
  55: { text: '3しゅるい だけで かつ', ok: (b) => b.typesUsed.size <= 3, live: (b) => ({ text: `しゅるい ${b.typesUsed.size}/3`, fail: b.typesUsed.size > 3 }) },
  56: {
    text: 'ティラノを 2ふん いないに たおす',
    ok: (b) => b.bossKillT >= 0 && b.bossT0 >= 0 && b.bossKillT - b.bossT0 <= 120,
    live: (b) => {
      if (b.bossT0 < 0) return { text: 'ティラノ まち…', fail: false };
      const left = Math.ceil(120 - ((b.bossKillT >= 0 ? b.bossKillT : b.time) - b.bossT0));
      return { text: b.bossKillT >= 0 ? (left >= 0 ? 'たおした！' : 'おそかった…') : `のこり ${Math.max(0, left)}びょう`, fail: left < 0 };
    },
  },
  57: maxDeploy(35),
  58: { text: 'てきを 80ぴき たおして かつ', ok: (b) => b.kills >= 80, live: (b) => ({ text: `${Math.min(80, b.kills)}/80 ひき`, fail: false }) },
  59: keepCastle(0.7),
  60: {
    text: 'マグマ大王を いもアイスで たおす',
    ok: (b) => b.magmaKiller === 'imoice',
    live: (b) => ({ text: b.magmaKiller ? (b.magmaKiller === 'imoice' ? 'ひやした！' : 'いもアイスじゃ なかった…') : 'さいごは いもアイスで！', fail: !!b.magmaKiller && b.magmaKiller !== 'imoice' }),
  },
};

export const MEDAL_COUNT = Object.keys(MEDALS).length;
