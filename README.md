# いも大戦争

いもたちが たたかう よこスクロール じんとり バトル！ スマホ（Android Chrome）で あそべる ブラウザゲームです。

- 公開URL: https://calmward.github.io/imo-daisensou/ （`main` ブランチへの push で GitHub Actions が自動デプロイ）
- ホーム画面に追加すると アプリのように 全画面で あそべます（オフラインでも うごきます）。

## あそびかた
1. 「あそぶ！」→ ステージを えらんで「しゅつげき！」
2. したの いもボタンを タップすると なかまが でるよ（おかねと じゅんびじかんが ひつよう）
3. 「おさいふ」で おかねの たまる はやさを アップ
4. 「いもビーム」が たまったら タップで てきを まとめて ふっとばす！
5. てきの おしろを こわしたら かち。もらった「きんいも」で パワーアップ、「ガチャけん」で ガチャ！

## 開発
```bash
npm install
npm run dev      # 開発サーバ
npm test         # ユニットテスト＋全ステージのバランスシミュレーション
npm run build    # dist/ に出力
```
- `src/game/` … ゲームロジック（描画なし・決定的シミュレーション）。`battle.ts` が戦闘、`stages.ts` がステージ表、`allies.ts`/`enemies.ts` がキャラ性能
- `src/art/` … キャラ・背景の Canvas 描画。キャラは ID ごとの描画関数なので差し替えが簡単
- `src/scenes/` … タイトル/マップ/バトル/パワーアップ/ガチャ画面
- `src/core/audio.ts` … 効果音・BGM を Web Audio API で生成

### GitHub Pages の初回設定
1. リポジトリの Settings → Pages → Source を「GitHub Actions」にする（初回のみ）
2. **あいことば（パスワード）を設定**: Settings → Secrets and variables → Actions → New repository secret
   - Name: `GAME_PASSWORD` / Secret: 好きなあいことば
   - これが無いとデプロイは止まります（パスワード無しで公開されないように）

### あいことば（パスワード）のしくみ
- デプロイ時にゲーム本体のプログラムを、あいことばで暗号化（AES-GCM / PBKDF2）します（`scripts/lock.mjs`）。あいことばを知らない人はダウンロードしても中身を読めず、動かせません。
- 一度入れた端末では覚えておくので、子どもが毎回入力する必要はありません（ブラウザのデータを消すと再入力）。
- あいことばを変えたいときは Secret を変えて、もう一度デプロイ（`main` に push するか Actions から手動実行）。
- 推測されにくいように、ある程度長い言葉にしてください（例: 「いもいもパーティー2026」）。短い数字だけだと、暗号ファイルを持ち出されたときに総当たりで破られる可能性があります。
- 手元で試す: `npm run build && GAME_PASSWORD=ためし npm run lock && npm run preview`
