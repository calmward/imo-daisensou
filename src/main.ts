import { App } from './core/app';
import { BattleScene } from './scenes/battle';
import { MapScene } from './scenes/map';
import { TitleScene } from './scenes/title';
import { PowerScene } from './scenes/power';
import { GachaScene } from './scenes/gacha';
import { MissionScene } from './scenes/missions';
import { ZukanScene } from './scenes/zukan';
import { TowerScene } from './scenes/tower';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const app = new App(canvas);
app.register('title', () => new TitleScene(app));
app.register('map', (arg) => new MapScene(app, arg));
app.register('battle', (arg) => new BattleScene(app, arg));
app.register('power', (arg) => new PowerScene(app, arg));
app.register('gacha', () => new GachaScene(app));
app.register('missions', () => new MissionScene(app));
app.register('zukan', () => new ZukanScene(app));
app.register('tower', () => new TowerScene(app));
app.go('title', undefined, true);
app.start();
(window as any).__app = app; // handy for automated tests

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  // the game may start after 'load' already fired (password-locked build), so check readyState
  const reg = () => navigator.serviceWorker.register('./sw.js').catch(() => {});
  if (document.readyState === 'complete') reg();
  else window.addEventListener('load', reg);
}
