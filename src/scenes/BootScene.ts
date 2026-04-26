import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }
  preload() {
    this.load.audio('chomp', 'audio/chomp.mp3');
    this.load.audio('pop', 'audio/pop.mp3');
    this.load.audio('chime', 'audio/chime.mp3');
    this.load.audio('power-up', 'audio/power-up.mp3');
    this.load.audio('level-up', 'audio/level-up.mp3');
    this.load.audio('oof', 'audio/oof.mp3');
    this.load.audio('game-over', 'audio/game-over.mp3');
    this.load.audio('bgm', 'audio/bgm.mp3');
  }
  create() { this.scene.start('MenuScene'); }
}
