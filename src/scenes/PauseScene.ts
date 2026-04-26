import Phaser from 'phaser';
import { THEME } from '../theme';
import { makePillowButton } from '../ui/PillowButton';

export class PauseScene extends Phaser.Scene {
  constructor() { super('PauseScene'); }

  create() {
    const { width, height } = this.scale;

    // Translucent backdrop — interactive to swallow clicks but not resume
    // (too easy to trigger by accident on touch).
    const bg = this.add.rectangle(0, 0, width, height, 0x1a1a30, 0.55).setOrigin(0).setInteractive();
    bg.on('pointerdown', () => { /* swallow only */ });

    // Card with soft drop shadow effect (two stacked rounded rects)
    const cardShadow = this.add.graphics();
    cardShadow.fillStyle(0x1a1a30, 0.25);
    cardShadow.fillRoundedRect(width / 2 - 170, height / 2 - 145, 340, 290, 28);
    const card = this.add.graphics();
    card.fillStyle(THEME.colors.surface, 1);
    card.fillRoundedRect(width / 2 - 170, height / 2 - 150, 340, 290, 28);
    card.lineStyle(3, 0xf0e6f5, 1);
    card.strokeRoundedRect(width / 2 - 170, height / 2 - 150, 340, 290, 28);
    void cardShadow;

    // Title
    const title = this.add.text(width / 2, height / 2 - 95, 'Paused', {
      fontFamily: THEME.font.display,
      fontSize: '40px',
      fontStyle: '700',
      color: '#8a5be0'
    }).setOrigin(0.5);
    this.tweens.add({ targets: title, scale: { from: 0.7, to: 1 }, duration: 250, ease: 'Back.easeOut' });

    // Pause icon (two rounded bars)
    const pauseIcon = this.add.graphics();
    pauseIcon.fillStyle(THEME.colors.berry, 0.2);
    pauseIcon.fillCircle(width / 2, height / 2 - 95, 40);
    void pauseIcon;

    // Buttons — pillow style
    makePillowButton(this, width / 2, height / 2 - 30, {
      width: 240, height: 56, label: '▶  Resume', color: 'green', breathing: true,
      onClick: () => this.resumeGame()
    });
    makePillowButton(this, width / 2, height / 2 + 38, {
      width: 240, height: 56, label: '↺  Restart', color: 'pink',
      onClick: () => { this.scene.stop('PauseScene'); this.scene.stop('GameScene'); this.scene.start('GameScene'); }
    });
    makePillowButton(this, width / 2, height / 2 + 106, {
      width: 240, height: 56, label: '⌂  Menu', color: 'white',
      onClick: () => { this.scene.stop('PauseScene'); this.scene.stop('GameScene'); this.scene.start('MenuScene'); }
    });

    this.input.keyboard?.on('keydown-ESC', () => this.resumeGame());
  }

  private resumeGame() {
    const game = this.scene.get('GameScene') as Phaser.Scene & { resumeFromPause?: () => void };
    game.resumeFromPause?.();
    this.scene.stop('PauseScene');
  }
}
