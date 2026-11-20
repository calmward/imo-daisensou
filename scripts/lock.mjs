// Encrypts the built game with a password ("あいことば").
// Usage: GAME_PASSWORD=... node scripts/lock.mjs   (run after `vite build`)
// Without GAME_PASSWORD it does nothing, so local builds keep working.
//
// The game bundle is encrypted with AES-GCM (key from PBKDF2-SHA256), the plain
// file is deleted, and index.html gets a small kid-friendly password screen that
// decrypts and starts the game in the browser. Without the password the code
// cannot be read or run.
import { readFileSync, writeFileSync, unlinkSync, readdirSync } from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';

const PASSWORD = process.env.GAME_PASSWORD ?? '';
const ITER = 250000;

if (!PASSWORD) {
  if (process.env.REQUIRE_LOCK) {
    console.error('[lock] GAME_PASSWORD secret is missing. Refusing to publish the game without a password.');
    console.error('[lock] Add it in GitHub: Settings > Secrets and variables > Actions > New repository secret (name: GAME_PASSWORD).');
    process.exit(1);
  }
  console.warn('[lock] GAME_PASSWORD is not set: the game is NOT password protected.');
  process.exit(0);
}

const dist = 'dist';
const html = readFileSync(`${dist}/index.html`, 'utf8');
const m = /<script type="module" crossorigin src="\.\/(assets\/[^"]+\.js)"><\/script>/.exec(html);
if (!m) throw new Error('[lock] could not find the game script in dist/index.html');
const jsPath = m[1];
const extraJs = readdirSync(`${dist}/assets`).filter((f) => f.endsWith('.js') && `assets/${f}` !== jsPath);
if (extraJs.length) throw new Error(`[lock] expected a single JS bundle, found extra: ${extraJs.join(', ')}`);

const plain = readFileSync(`${dist}/${jsPath}`);
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const baseKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(PASSWORD.normalize('NFKC')), 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, baseKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain));

// file layout: salt(16) | iv(12) | ciphertext
const out = new Uint8Array(16 + 12 + cipher.length);
out.set(salt, 0);
out.set(iv, 16);
out.set(cipher, 28);
const encPath = 'assets/game.enc';
writeFileSync(`${dist}/${encPath}`, out);
unlinkSync(`${dist}/${jsPath}`);

const loader = `
<div id="lock" style="position:fixed;inset:0;z-index:10;display:flex;align-items:center;justify-content:center;background:linear-gradient(#ffe9b8,#f5c97a);font-family:'Hiragino Maru Gothic ProN','Rounded Mplus 1c','Noto Sans JP',sans-serif">
  <form id="lockf" style="background:#fff6dd;border:4px solid #8a5a22;border-radius:20px;padding:24px 20px;width:min(320px,86vw);text-align:center;box-shadow:0 6px 0 rgba(0,0,0,.2)">
    <div style="font-size:40px">🍠🔒</div>
    <div style="font-weight:900;font-size:22px;color:#a3244e;margin:6px 0 14px">あいことばを いれてね</div>
    <input id="lockp" type="password" autocomplete="current-password" style="font-size:22px;width:100%;box-sizing:border-box;padding:10px;border-radius:12px;border:3px solid #c8a060;text-align:center" />
    <div id="locke" style="color:#d0302a;font-weight:900;min-height:1.6em;margin-top:8px"></div>
    <button style="font-size:22px;font-weight:900;color:#fff;background:#ff8a1f;border:none;border-bottom:5px solid #a34e00;border-radius:14px;padding:10px 28px;margin-top:4px">はじめる！</button>
  </form>
</div>
<script>
(function () {
  var STORE = 'imo-daisensou-key';
  var lock = document.getElementById('lock');
  var form = document.getElementById('lockf');
  var input = document.getElementById('lockp');
  var err = document.getElementById('locke');
  var dataP = fetch('./${encPath}').then(function (r) { if (!r.ok) throw new Error('fetch'); return r.arrayBuffer(); });
  function b64(buf) { return btoa(String.fromCharCode.apply(null, new Uint8Array(buf))); }
  function unb64(s) { return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); }); }
  async function start(rawKey) {
    var data = new Uint8Array(await dataP);
    var key = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['decrypt']);
    var plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: data.slice(16, 28) }, key, data.slice(28));
    var url = URL.createObjectURL(new Blob([plain], { type: 'text/javascript' }));
    lock.remove();
    await import(url);
  }
  async function derive(pw) {
    var data = new Uint8Array(await dataP);
    var base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw.normalize('NFKC')), 'PBKDF2', false, ['deriveKey']);
    var k = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: data.slice(0, 16), iterations: ${ITER}, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, true, ['decrypt']);
    return new Uint8Array(await crypto.subtle.exportKey('raw', k));
  }
  // remembered on this device so the child doesn't have to type it every time
  var saved = null;
  try { saved = localStorage.getItem(STORE); } catch (e) {}
  if (saved) {
    lock.style.display = 'none';
    start(unb64(saved)).catch(function () { try { localStorage.removeItem(STORE); } catch (e) {} lock.style.display = 'flex'; });
  }
  form.addEventListener('submit', async function (ev) {
    ev.preventDefault();
    err.textContent = 'しらべてるよ…';
    try {
      var raw = await derive(input.value);
      await start(raw);
      try { localStorage.setItem(STORE, b64(raw)); } catch (e) {}
    } catch (e) {
      err.textContent = 'あいことばが ちがうよ';
      input.value = '';
    }
  });
})();
</script>`;

writeFileSync(`${dist}/index.html`, html.replace(m[0], loader));

// keep offline play working: precache the encrypted file instead of the plain one
const sw = readFileSync(`${dist}/sw.js`, 'utf8');
writeFileSync(`${dist}/sw.js`, sw.split(jsPath).join(encPath));
console.log(`[lock] game encrypted -> ${encPath} (${out.length} bytes)`);
