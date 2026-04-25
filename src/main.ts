import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { PauseScene } from './scenes/PauseScene';
import { GameOverScene } from './scenes/GameOverScene';
import { CONFIG } from './config';

const cardW = CONFIG.grid.cols * CONFIG.grid.cellPx;
const cardH = CONFIG.grid.rows * CONFIG.grid.cellPx;

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: cardW + 80,
  height: cardH + 160,
  backgroundColor: '#ffeede',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BootScene, MenuScene, GameScene, PauseScene, GameOverScene]
});
