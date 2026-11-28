# World 5「かざんの しま」(stages 49–60)

## 1. Theme
Story: 「こおり大王を たおしたら、いちばん うえの おにいさん マグマ大王が きた！『いもを ぜんぶ やきいもに しちゃうぞ！』」
Why this theme: dinosaurs are the most popular thing for 7-year-olds, fire after ice is an easy contrast to read, and the third-brother story continues from World 4.
- Palette `{ sky:['#ff9a6a','#ffe2b8'], hill1:'#6b4a5c', hill2:'#4a3042', ground:['#5c4036','#3a2822'], accent:'#ff5a2a' }`
- Props: a smoking volcano with a lava glow far back, cycads/ferns, dinosaur bones, glowing lava cracks in the ground, steaming hot springs.
- Particles: orange embers drifting up, plus a little grey ash.
- Enemy castle: a volcano fortress with a dinosaur-skull gate and dripping lava.

## 2. New mechanics (3)
1. **burn** (`Effect.kind`): on a hit, the target loses 3% of its maxHp per second for `dur` seconds (enemy source: at most atk×0.4 per second). It does not stack, it refreshes. Units with `strongVs:'fire'` are immune. A potesala heal removes it. Show a flame icon and an orange tint.
2. **hatch {id, t}**: after t seconds alive, the enemy is replaced by `id` at its x (same mult, "パカッ！うまれた！"). For the last 3 seconds it wobbles and shows a 3-2-1 bubble. Breaking it earlier gives its reward and adds to `kills.tamagoBroken`.
3. **rocks** (used by mod `eruption` and skill `meteor {n}`): picks n distinct living allies' x (random x if there are none). A red shadow appears for 2.0s, then the rock hits radius 70. Allies take 20% maxHp plus knockback. Non-boss enemies take 10%. Castles are never hit. **Tapping the shadow breaks the rock (+15 money, "パリン！")**, which gives the kid a job.

Reuse: revive's melt rule changes from `['ice']` to the target's ice/fire traits ("ひえた！"). Skill `blizzard` is reused as the dinosaur roar ("ガオー！" art).

Enemy table (trait `'fire'` added; stats at mult 100):

| id | name | traits | hp | atk | rng | spd | atkI | other | reward |
|---|---|---|---|---|---|---|---|---|---|
| hinotokage | ひのこトカゲ | beast,fire | 380 | 45 | 100 | 100 | 0.9 | burn .3/3s | 200 |
| raptor | ラプトル | beast | 950 | 120 | 120 | 85 | 1.2 | crit .15, burrow 260 jump | 600 |
| ptera | プテラノドン | bird | 850 | 95 | 210 | 70 | 1.8 | flying | 520 |
| torikera | トリケラトプス | beast | 2800 | 160 | 150 | 28 | 2.4 | area, barrier 350, knock .35 | 1000 |
| tamago | きょうりゅうの たまご | beast | 1200 | 0 | 0 | 26 | 99 | hatch raptor 12s, kb 1 | 300 |
| magmagolem | マグマゴーレム | fire | 2600 | 190 | 150 | 32 | 2.3 | area, revive .5, burn .25/4s | 1300 |

**Mid-boss tyranno ティラノサウルス** (beast, boss): hp 12000, atk 680, range 190, speed 34, atkInterval 2.8, kb 4, area, shockwave, crit 0.1, reward 5000.
- Skills: roar (`blizzard`) every 30; stomp every 16; summon raptor×2 every 24; below 0.5 summon tamago×2 plus stomp.
- What the kid learns: "ガオー → ずしん", so rebuild after each one.

**Final boss magmaou マグマ大王** (beast, fire, boss): hp 30000, atk 850, range 240, speed 34, atkInterval 3.0, kb 5, area, shockwave, burn 0.4 for 4s, revive 0.25 ("まだまだ！"; finishing him with いもアイス cancels it), reward 12000.
- Skills: summon hinotokage×3 every 20; meteor 3 every 18; breath 0.07 every 22; below 0.6 summon tamago×2; below 0.3 meteor 6 plus stomp ("ふんか！").

## 3. Allies
- **imoice いもアイス** (N, stage 50): role ひやす. cost 450, cooldown 11, hp 1100, atk 140, range 250, speed 42, atkInterval 2.0, area, strongVs fire, slow 0.4 for 2s. It answers burn and stops the golem and the boss from reviving.
- **imomochi いももち** (N, stage 53): role ねばねば. cost 360, cooldown 9, hp 2400, atk 60, range 120, speed 40, atkInterval 1.6, area, freeze 0.35 for 1.5s vs beast. A cheap wall that pins raptors and triceratops.
- **pie ポテトパイ** (SR gacha, also granted on first clear of 57): role こうらわり. cost 600, cooldown 15, hp 2200, atk 1100, range 180, speed 45, atkInterval 3.4, crit 0.1. One big hit breaks barriers.
- Add to the gacha pool: **nyokki ニョッキ** (R): cost 200, hp 500, atk 40, multiHit 3, range 110, speed 70, atkInterval 0.8. It is good against lizard swarms and eggs.

## 4. Stage modifiers
- **eruption ふんか**: rocks n=3 at 25s, then every 22s. "ゴゴゴ… いわが おちるよ！ タップで こわせ！" comes 3s before.
- **lava マグマの かわ**: a band at x∈[0.42L, 0.52L] that cycles 12s crust ("いまだ！わたれる！"), 2s bubbling, 8s flow.
  - While it flows, walking units inside lose 5% maxHp per second (enemies 2.5%). Fire-trait, flying, burrowed and jumping units are unaffected ("あちちっ！").
- **onsen おんせん** (valley): allies regenerate 1% maxHp per second. Steam particles.

## 5. Stages
Bosses: 56 and 60. Valleys: ★52 and ★58. With no new thief rule, 49 and 55 have no thieves, and 56 and 60 have none either (boss stages ≥37).

| id | name | len/hp/d | spawns | mod | unlock | tip |
|---|---|---|---|---|---|---|
| 49 | かざんの しま | 2900/70000/440 | e('hinotokage',2,[4,6]), e('raptor',12,[16,20]), e('penguin',8,[14,18]), e('tanuki',15,[12,15]) | | | やけどに ちゅうい！ |
| 50 | ラプトルの もり | 2900/72000/450 | e('raptor',6,[12,15]), e('ptera',10,[14,18]), e('hinotokage',2,[4,6]), e('yukiusagi',4,[6,8]) | | imoice | ラプトルは とびこえて くるよ |
| 51 | ふんかの ふもと | 2800/70000/430 | e('torikera',15,[22,28]), e('hinotokage',2,[4,6]), e('hachi',8,[10,13]), e('kamakiri',12,[14,18]) | eruption | | いわの かげを タップ！ |
| ★52 | ひみつの おんせん | 2200/48000/280, max 36 | e('hinotokage',1,[1.5,2.2]), e('tamago',5,[10,12]), e('chibidaruma',3,[3,4]) | onsen | | たまごは はやく わろう |
| 53 | きょうりゅうの すあな | 2900/74000/460 | e('tamago',6,[12,15]), e('raptor',15,[18,22]), e('magmagolem',20,[24,30]), e('nezumi',2,[3,5]) | | imomochi | ゴーレムは いもアイスで ひやそう |
| 54 | マグマの かわ | 3000/76000/450 | e('magmagolem',12,[20,24]), e('ptera',6,[12,15]), e('hinotokage',2,[4,6]), e('kaeru',15,[16,20]) | lava | | スキーいもは とびこえる！ |
| 55 | トリケラの とっしん | 3000/78000/480 | e('torikera',8,[16,20]), e('tamago',12,[16,20]), e('kame',20,[26,32]), e('yukiusagi',2,[4,6]) | | | つよい いちげきで わろう |
| 56 | ボス！ ティラノサウルス | 2800/66000/100 | e('hinotokage',2,[4,6],0,340), boss('tyranno',160,0.95,2), e('raptor',10,[14,18],0,300,0.95), e('tamago',20,[24,28],0,300,0.9) | | | ガオー！の あと ずしん！ |
| 57 | ようがん どうくつ | 3000/80000/490 | e('magmagolem',15,[20,24]), e('yukiotoko',25,[26,30]), e('ptera',6,[12,15]), e('tonakai',12,[20,24]), e('hinotokage',2,[4,6]) | eruption | pie | |
| ★58 | かざん まつり | 2300/50000/300, max 36 | e('hinotokage',1,[1.5,2]), e('tamago',4,[8,10]), e('metal',20,[25,30],5) | festival | | |
| 59 | マグマの かこう | 3100/84000/540 | e('raptor',8,[14,18]), e('torikera',20,[24,28]), e('magmagolem',15,[22,26]), e('ptera',5,[12,15]), e('tamago',12,[18,22]), e('fukurou',10,[16,20]), e('hinotokage',2,[4,6]) | lava | | |
| 60 | さいごの たたかい！ マグマ大王 | 3100/96000/100 | e('hinotokage',2,[4,6],0,340), boss('magmaou',125,0.95,3), e('torikera',12,[18,22],0,320,0.95), e('raptor',10,[14,18],0,300,0.9), boss('tyranno',100,0.6,2) | | | さいごは いもアイスで！ |

**tune.ts changes for ids ≥49:**
- target = 0.80 + 0.15·pos; bosses 1.0.
- castleGoal 0.70 (bosses 0.45); time caps 180s/240s.
- Acceptance: `sim.ts 0.6` needs an average of 1.5–2.5 tries per non-valley stage (World 4 was 1 try everywhere); skill 0.8 needs ≤1.3.
- Add simple bot logic for rocks (taps 50% of them) and eggs.

## 6. Longer-lasting goals
1. **チャレンジメダル** (one per stage, offered after its first clear, with a HUD counter):
   - 49 なかま15たいまで, 50 3ぷんいない, 51 いわを 5こ こわす, 52 ビームなし, 53 たまごを かえさない, 54 おしろ50%のこす, 55 3しゅるい だけ, 56 ビームなし, 57 なかま20たいまで, 58 80ぴき たおす, 59 おしろ70%のこす, 60 4ぷんいない.
   - Reward: 1 ticket each; every 3 medals give 1 ほのおのいし.
2. **いもの とう** (opens after clearing 50):
   - Floor f: len 2000+20f; baseHp 20000+3000f.
   - Enemies: 3 drawn by seed f from a pool that grows (worlds 1–2 for f≤10, adds worlds 3–4 at 11–20, World 5 from 21); mult = 150+14f.
   - Every 5th floor a past boss; every 10th floor a modifier.
   - First clears give gold 200+30f; every 5 floors a ticket; floors 10/20/30 give a ほのおのいし plus a title.
   - After floor 30: endless, +4% per floor, gold only, best floor recorded. A loss costs nothing.
3. **ウルトラしんか** at Lv22 plus 1 ほのおのいし: ×1.12, name ウルトラ…, flame aura. Getting there from Lv15 takes about 15k gold per N unit. Stones come from medals (4), the tower (3, then +1 per 10 floors) and ★★ on 56/60 (2).
4. **きょうりゅう ずかん** (8 stickers): ラプトル 50, たまご わり 30, トリケラ 20, プテラ 30, ゴーレム ひやす 10, ティラノ ★★, マグマ大王 ★★★, all 12 medals. A full page gives 5 tickets.

## 7. Risks and mitigations
- **Losing streaks:** after 2 losses, show a counter hint ("いもアイスを つかってみよう！"). After 3 losses, "おうえんパワー" gives +15% start money and castle (medals disabled). The tower and valleys are always available as fallbacks.
- **Hard-to-read hazards:** burn icon, egg countdown, lava cycle bar, rock shadow 2s. One new hazard per stage until 57.
- **Tapping takes over:** rocks only appear on 3 stages, and the shadows are large touch targets on Android.
- **Scary dinosaurs:** round eyes, chubby style, comic "ガオー！".
- **Grind and screen time:** no stamina, rewards only on first clears, Ultra targets one favorite unit.
- **Text:** hiragana/katakana only.
