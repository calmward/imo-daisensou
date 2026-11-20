// Renders the app icons with headless Chromium (Playwright) so no image assets need downloading.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { writeFileSync } from 'node:fs';

const draw = (size, maskable) => `
const c = document.createElement('canvas'); c.width = c.height = ${size};
const x = c.getContext('2d'); const s = ${size} / 512;
x.scale(s, s);
const g = x.createRadialGradient(256, 200, 40, 256, 256, 360);
g.addColorStop(0, '#ffe680'); g.addColorStop(1, '#ff8a1f');
x.fillStyle = g;
${maskable ? 'x.fillRect(0,0,512,512);' : 'x.beginPath(); x.roundRect(16,16,480,480,110); x.fill(); x.lineWidth=14; x.strokeStyle="#a34e00"; x.stroke();'}
const k = ${maskable ? 0.78 : 1};
x.translate(256, 270); x.scale(k, k); x.translate(-256, -270);
// sweet potato body
x.save(); x.translate(256, 290); x.rotate(-0.18);
x.beginPath(); x.ellipse(0, 0, 150, 175, 0, 0, Math.PI * 2);
const b = x.createRadialGradient(-50, -60, 20, 0, 0, 190); b.addColorStop(0, '#f07aa0'); b.addColorStop(1, '#a3244e');
x.fillStyle = b; x.fill(); x.lineWidth = 16; x.strokeStyle = '#3b2412'; x.stroke(); x.restore();
// headband
x.beginPath(); x.moveTo(110, 200); x.quadraticCurveTo(256, 160, 400, 190); x.lineTo(402, 236); x.quadraticCurveTo(256, 206, 108, 246); x.closePath();
x.fillStyle = '#fff'; x.fill(); x.lineWidth = 10; x.strokeStyle = '#3b2412'; x.stroke();
x.beginPath(); x.arc(270, 208, 18, 0, Math.PI * 2); x.fillStyle = '#e8312f'; x.fill();
// eyes
for (const ex of [200, 320]) {
  x.beginPath(); x.ellipse(ex, 300, 34, 40, 0, 0, Math.PI * 2); x.fillStyle = '#fff'; x.fill(); x.lineWidth = 9; x.strokeStyle = '#3b2412'; x.stroke();
  x.beginPath(); x.ellipse(ex + 8, 304, 22, 27, 0, 0, Math.PI * 2); x.fillStyle = '#2a1a0e'; x.fill();
  x.beginPath(); x.ellipse(ex, 292, 8, 9, 0, 0, Math.PI * 2); x.fillStyle = '#fff'; x.fill();
  // angry brows
  x.beginPath(); x.lineWidth = 12; x.lineCap = 'round'; x.moveTo(ex - 36, ex < 256 ? 245 : 262); x.lineTo(ex + 34, ex < 256 ? 262 : 245); x.stroke();
}
// blush
x.fillStyle = 'rgba(255,140,150,0.7)';
for (const bx of [150, 372]) { x.beginPath(); x.ellipse(bx, 350, 24, 14, 0, 0, Math.PI * 2); x.fill(); }
// mouth
x.beginPath(); x.moveTo(225, 360); x.quadraticCurveTo(262, 420, 300, 360); x.closePath(); x.fillStyle = '#c0392b'; x.fill(); x.lineWidth = 9; x.strokeStyle = '#3b2412'; x.stroke();
c.toDataURL('image/png');
`;

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size, mask] of [['icon-192', 192, false], ['icon-512', 512, false], ['icon-maskable-512', 512, true]]) {
  const url = await page.evaluate(draw(size, mask));
  writeFileSync(`public/icons/${name}.png`, Buffer.from(url.split(',')[1], 'base64'));
  console.log('wrote', name);
}
await browser.close();
