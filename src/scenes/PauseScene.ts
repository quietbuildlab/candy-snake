import Phaser from 'phaser';
import { THEME } from '../theme';

export class PauseScene extends Phaser.Scene {
  constructor() { super('PauseScene'); }
  create() {
    const { width, height } = this.scale;
    // Translucent backdrop. Made interactive so it captures (swallows) clicks
    // and they don't fall through to the GameScene under it. NOTE: do NOT
    // resume on background click — that's too easy to trigger by accident on
    // touch devices. Resume is only via the explicit Resume button or ESC.
    const bg = this.add.rectangle(0, 0, width, height, 0x000000, 0.45).setOrigin(0).setInteractive();
    bg.on('pointerdown', () => { /* swallow only */ });

    const card = this.add.rectangle(width/2, height/2, 320, 240, THEME.colors.surface, 1).setStrokeStyle(0).setOrigin(0.5);
    card.setInteractive(); // swallow clicks on the card
    this.add.text(width/2, height/2 - 60, 'Paused', { fontFamily: THEME.font.family, fontSize: '32px', fontStyle: '800', color: '#7a5cff' }).setOrigin(0.5);

    const mkBtn = (y: number, label: string, onClick: () => void) => {
      const t = this.add.text(width/2, y, label, { fontFamily: THEME.font.family, fontSize: '20px', fontStyle: '600', color: '#1a1a1a' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      t.on('pointerdown', onClick);
    };
    mkBtn(height/2 - 10, '▶  Resume', () => this.resumeGame());
    mkBtn(height/2 + 30, '↺  Restart', () => { this.scene.stop('PauseScene'); this.scene.stop('GameScene'); this.scene.start('GameScene'); });
    mkBtn(height/2 + 70, '⌂  Menu', () => { this.scene.stop('PauseScene'); this.scene.stop('GameScene'); this.scene.start('MenuScene'); });

    this.input.keyboard?.on('keydown-ESC', () => this.resumeGame());
  }
  private resumeGame() {
    const game = this.scene.get('GameScene') as Phaser.Scene & { resumeFromPause?: () => void };
    game.resumeFromPause?.();
    this.scene.stop('PauseScene');
  }
}
