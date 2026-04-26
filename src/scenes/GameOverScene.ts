import Phaser from 'phaser';
import { THEME } from '../theme';
import { loadHighScore, saveHighScore } from '../storage';
import { makePillowButton } from '../ui/PillowButton';
import { confetti, countUp, popScale } from '../ui/FX';

export class GameOverScene extends Phaser.Scene {
  private finalScore = 0;
  constructor() { super('GameOverScene'); }
  init(data: { score: number }) { this.finalScore = data?.score ?? 0; }

  create() {
    const { width, height } = this.scale;
    const prev = loadHighScore();
    const isBest = this.finalScore > prev;
    if (isBest) saveHighScore(this.finalScore);

    // Translucent backdrop
    this.add.rectangle(0, 0, width, height, 0x1a1a30, 0.55).setOrigin(0).setInteractive();

    // Card with shadow + slight scale-in
    const cardShadow = this.add.graphics();
    cardShadow.fillStyle(0x1a1a30, 0.3);
    cardShadow.fillRoundedRect(width / 2 - 190, height / 2 - 160, 380, 340, 28);
    void cardShadow;
    const card = this.add.graphics();
    card.fillStyle(THEME.colors.surface, 1);
    card.fillRoundedRect(width / 2 - 190, height / 2 - 165, 380, 340, 28);
    card.lineStyle(3, 0xf0e6f5, 1);
    card.strokeRoundedRect(width / 2 - 190, height / 2 - 165, 380, 340, 28);

    const cardGroup = this.add.container(0, 0).setScale(0.85).setAlpha(0);
    cardGroup.add(card);
    this.tweens.add({ targets: cardGroup, scale: 1, alpha: 1, duration: 300, ease: 'Back.easeOut' });

    // Title
    this.add.text(width / 2, height / 2 - 110, 'Game Over', {
      fontFamily: THEME.font.display,
      fontSize: '40px',
      fontStyle: '700',
      color: '#8a5be0'
    }).setOrigin(0.5);

    // Score with star icon — count-up animation
    const star = this.add.text(width / 2 - 70, height / 2 - 35, '⭐', {
      fontSize: '40px'
    }).setOrigin(0.5);
    void star;
    const scoreText = this.add.text(width / 2 + 10, height / 2 - 35, '0', {
      fontFamily: THEME.font.display,
      fontSize: '64px',
      fontStyle: '700',
      color: '#3fd16c'
    }).setOrigin(0.5);

    countUp(this, scoreText, 0, this.finalScore, 700);
    this.time.delayedCall(720, () => popScale(this, scoreText));

    // Best badge — confetti rains and a "New Best!" tag if it's a new best
    if (isBest && this.finalScore > 0) {
      const badge = this.add.container(width / 2, height / 2 + 25).setScale(0);
      const badgeBg = this.add.graphics();
      badgeBg.fillStyle(THEME.colors.btnYellowFace, 1);
      badgeBg.fillRoundedRect(-110, -22, 220, 44, 22);
      badgeBg.lineStyle(3, THEME.colors.btnYellowBase, 1);
      badgeBg.strokeRoundedRect(-110, -22, 220, 44, 22);
      const badgeTxt = this.add.text(0, 0, '🏆  New Best!', {
        fontFamily: THEME.font.display,
        fontSize: '22px',
        fontStyle: '700',
        color: '#7a5417'
      }).setOrigin(0.5);
      badge.add([badgeBg, badgeTxt]);
      this.time.delayedCall(750, () => {
        this.tweens.add({ targets: badge, scale: 1, duration: 350, ease: 'Back.easeOut' });
        confetti(this, 80);
      });
    } else {
      this.add.text(width / 2, height / 2 + 25, prev > 0 ? `Best  ${prev}` : '', {
        fontFamily: THEME.font.body,
        fontSize: '18px',
        fontStyle: '600',
        color: '#7a7a92'
      }).setOrigin(0.5);
    }

    // Buttons
    const playAgain = makePillowButton(this, width / 2, height / 2 + 90, {
      width: 240, height: 60, label: '▶  Play Again', color: 'green', breathing: true,
      onClick: () => this.scene.start('GameScene')
    });
    void playAgain;
    makePillowButton(this, width / 2, height / 2 + 158, {
      width: 240, height: 56, label: '⌂  Menu', color: 'white',
      onClick: () => this.scene.start('MenuScene')
    });

    this.input.keyboard?.on('keydown-SPACE', () => this.scene.start('GameScene'));
  }
}
