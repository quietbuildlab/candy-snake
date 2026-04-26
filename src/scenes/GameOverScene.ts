import Phaser from 'phaser';
import { THEME } from '../theme';

export class GameOverScene extends Phaser.Scene {
  private finalScore = 0;
  constructor() { super('GameOverScene'); }
  init(data: { score: number }) { this.finalScore = data?.score ?? 0; }
  create() {
    const { width, height } = this.scale;
    this.add.text(width/2, height/2 - 40, 'Game Over', { fontFamily: THEME.font.family, fontSize: '48px', color: '#7a5cff' }).setOrigin(0.5);
    this.add.text(width/2, height/2 + 10, `Score: ${this.finalScore}`, { fontFamily: THEME.font.family, fontSize: '24px', color: '#1a1a1a' }).setOrigin(0.5);
    this.add.text(width/2, height/2 + 60, '▶ Play again', { fontFamily: THEME.font.family, fontSize: '20px', color: '#3ecf8e' })
      .setOrigin(0.5).setInteractive({useHandCursor:true})
      .on('pointerdown', () => this.scene.start('GameScene'));
  }
}
