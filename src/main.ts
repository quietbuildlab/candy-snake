import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { PauseScene } from './scenes/PauseScene';
import { GameOverScene } from './scenes/GameOverScene';

const targetW = Math.min(window.innerWidth, 720);
const targetH = Math.min(window.innerHeight, 820);

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: targetW,
  height: targetH,
  backgroundColor: 'rgba(0,0,0,0)',
  transparent: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, MenuScene, GameScene, PauseScene, GameOverScene]
});
