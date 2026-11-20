import { App } from './core/app';
import { BattleScene } from './scenes/battle';
import { MapScene } from './scenes/map';
import { TitleScene } from './scenes/title';
import { PowerScene } from './scenes/power';
import { GachaScene } from './scenes/gacha';
import { MissionScene } from './scenes/missions';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const app = new App(canvas);
app.register('title', () => new TitleScene(app));
app.register('map', (arg) => new MapScene(app, arg));
app.register('battle', (id: number) => new BattleScene(app, id));
app.register('power', (arg) => new PowerScene(app, arg));
app.register('gacha', () => new GachaScene(app));
app.register('missions', () => new MissionScene(app));
app.go('title', undefined, true);
app.start();
(window as any).__app = app; // handy for automated tests

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
