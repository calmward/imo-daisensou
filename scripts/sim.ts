import { runCampaign } from '../src/game/simCampaign';
const skill = Number(process.argv[2] ?? 1);
const { logs, save } = runCampaign({ skill, seed: Number(process.argv[3] ?? 3), maxTries: 12 });
for (const l of logs) console.log(`${String(l.id).padStart(2)} ${l.win ? 'WIN ' : 'LOSE'} tries=${l.tries} t=${l.time}s base=${l.baseFrac} close=${l.closest} lv=${l.avgLv} ${l.name}`);
console.log('gold left', save.gold, 'research', JSON.stringify(save.research));
