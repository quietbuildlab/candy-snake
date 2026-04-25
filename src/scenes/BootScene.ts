import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }
  preload() {
    // Audio assets are loaded here in a later task
  }
  create() {
    // Wait one frame, then go to Menu
    this.time.delayedCall(50, () => this.scene.start('MenuScene'));
  }
}
