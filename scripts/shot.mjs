// Usage: node scripts/shot.mjs <outdir>  — takes screenshots of key screens in portrait & landscape
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const out = process.argv[2] || 'shots';
const url = process.argv[3] || 'http://localhost:4173/';
import { mkdirSync } from 'node:fs';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const errors = [];
for (const [name, vw, vh] of [['port', 360, 740], ['land', 800, 360]]) {
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${name} console: ${m.text()}`); });
  await page.goto(url);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/${name}-1title.png` });
  await page.evaluate(() => { const a = window.__app; a.save.units = { jaga: 3, sato: 2, chips: 2, satsu: 2, kenpi: 1, fry: 1, yaki: 1, murasaki: 1, naga: 1, king: 1 }; a.save.deck = Object.keys(a.save.units); a.save.gold = 5000; a.save.tickets = 3; for (let i = 1; i <= 7; i++) a.save.cleared[i] = 1; a.save.tut.battle = true; a.go('map'); });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/${name}-2map.png` });
  await page.evaluate(() => { window.__app.scene.popup = 8; });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/${name}-3popup.png` });
  await page.evaluate(() => window.__app.go('battle', 6));
  await page.waitForTimeout(600);
  // spam units
  for (let k = 0; k < 30; k++) {
    await page.evaluate(() => { const s = window.__app.scene; s.b.money = 3000; for (let i = 0; i < 10; i++) s.b.deploy(i); if (s.b.beam >= 1) s.b.fireBeam(); });
    await page.waitForTimeout(250);
  }
  await page.screenshot({ path: `${out}/${name}-4battle.png` });
  await page.evaluate(() => { const s = window.__app.scene; s.b.beam = 1; s.b.fireBeam(); });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/${name}-5beam.png` });
  await page.evaluate(() => { const s = window.__app.scene; s.b.eBase.hp = 0; });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${out}/${name}-6win.png` });
  await page.evaluate(() => window.__app.go('power'));
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/${name}-7power.png` });
  await page.evaluate(() => { window.__app.scene.tab = 'castle'; });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/${name}-8castle.png` });
  await page.evaluate(() => window.__app.go('gacha'));
  await page.waitForTimeout(600);
  await page.evaluate(() => window.__app.scene.pull());
  await page.waitForTimeout(3800);
  await page.screenshot({ path: `${out}/${name}-9gacha.png` });
  await ctx.close();
}
await browser.close();
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors');
