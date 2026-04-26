import Phaser from 'phaser';
import { THEME } from '../theme';
import { loadHighScore, saveHighScore } from '../storage';

export class GameOverScene extends Phaser.Scene {
  private finalScore = 0;
  constructor() { super('GameOverScene'); }
  init(data: { score: number }) { this.finalScore = data?.score ?? 0; }
  create() {
    const { width, height } = this.scale;
    const prev = loadHighScore();
    const isBest = this.finalScore > prev;
    if (isBest) saveHighScore(this.finalScore);

    this.add.rectangle(0,0,width,height,0x000000,0.4).setOrigin(0);
    const card = this.add.rectangle(width/2, height/2, 360, 280, THEME.colors.surface, 1).setOrigin(0.5);
    card.setStrokeStyle(0);

    this.add.text(width/2, height/2 - 90, 'Game Over', { fontFamily: THEME.font.family, fontSize: '40px', fontStyle: '800', color: '#7a5cff' }).setOrigin(0.5);
    this.add.text(width/2, height/2 - 30, `${this.finalScore}`, { fontFamily: THEME.font.family, fontSize: '56px', fontStyle: '800', color: '#3ecf8e' }).setOrigin(0.5);
    if (isBest) {
      this.add.text(width/2, height/2 + 16, '🏆 New Best!', { fontFamily: THEME.font.family, fontSize: '20px', fontStyle: '800', color: '#ff4d6d' }).setOrigin(0.5);
    } else {
      this.add.text(width/2, height/2 + 16, `Best: ${prev}`, { fontFamily: THEME.font.family, fontSize: '16px', color: '#6b6b8a' }).setOrigin(0.5);
    }

    const mkBtn = (y: number, label: string, color: string, bg: string, onClick: () => void) => {
      const t = this.add.text(width/2, y, label, {
        fontFamily: THEME.font.family, fontSize: '18px', fontStyle: '800',
        color, backgroundColor: bg, padding: { x: 18, y: 8 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      t.on('pointerdown', onClick);
    };
    mkBtn(height/2 + 60, '▶  Play again', '#fff', '#3ecf8e', () => this.scene.start('GameScene'));
    mkBtn(height/2 + 100, '⌂  Menu', '#1a1a1a', '#fff', () => this.scene.start('MenuScene'));

    this.input.keyboard?.on('keydown-SPACE', () => this.scene.start('GameScene'));
  }
}
