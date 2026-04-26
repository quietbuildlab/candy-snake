import Phaser from 'phaser';
import { THEME } from '../theme';
import type { PowerUpKind } from '../types';

export class HUD {
  private heartsContainer: Phaser.GameObjects.Container;
  private heartImgs: Phaser.GameObjects.Text[] = [];
  private levelText: Phaser.GameObjects.Text;
  private scoreText: Phaser.GameObjects.Text;
  private puContainer: Phaser.GameObjects.Container;
  private puRing: Phaser.GameObjects.Graphics;
  private puIconText: Phaser.GameObjects.Text;
  private puActive: { kind: PowerUpKind; totalMs: number; remainingMs: number } | null = null;

  constructor(scene: Phaser.Scene, boardLeft: number, boardTop: number, boardWidth: number, onPause?: () => void) {
    const y = boardTop - 56;
    // Pause button (top-left of board, always shown — useful on touch where ESC isn't available, harmless on desktop)
    if (onPause) {
      const pauseBtn = scene.add.text(boardLeft - 36, y, '⏸', {
        fontFamily: THEME.font.family, fontSize: '24px', color: '#7a5cff', fontStyle: '800',
        backgroundColor: '#ffffff', padding: { x: 8, y: 4 }
      }).setInteractive({ useHandCursor: true });
      pauseBtn.on('pointerdown', () => onPause());
    }
    // Hearts (left)
    this.heartsContainer = scene.add.container(boardLeft, y);
    for (let i = 0; i < 3; i++) {
      const h = scene.add.text(i * 22, 0, '♥', { fontFamily: THEME.font.family, fontSize: '24px', color: '#ff4d6d', fontStyle: '800' });
      this.heartsContainer.add(h);
      this.heartImgs.push(h);
    }
    // Level (center)
    this.levelText = scene.add.text(boardLeft + boardWidth / 2, y + 12, 'LEVEL 1', {
      fontFamily: THEME.font.family, fontSize: '18px', fontStyle: '800', color: '#7a5cff'
    }).setOrigin(0.5);
    // Score (right)
    this.scoreText = scene.add.text(boardLeft + boardWidth, y + 12, '⭐ 0', {
      fontFamily: THEME.font.family, fontSize: '18px', fontStyle: '800', color: '#3ecf8e'
    }).setOrigin(1, 0.5);
    // Power-up ring (right of score)
    this.puContainer = scene.add.container(boardLeft + boardWidth + 36, y + 12);
    this.puRing = scene.add.graphics();
    this.puIconText = scene.add.text(0, 0, '', { fontSize: '16px' }).setOrigin(0.5);
    this.puContainer.add([this.puRing, this.puIconText]);
    this.puContainer.setVisible(false);
  }
  setLives(n: number) {
    for (let i = 0; i < this.heartImgs.length; i++) {
      this.heartImgs[i].setAlpha(i < n ? 1 : 0.2);
    }
  }
  setScore(s: number) { this.scoreText.setText(`⭐ ${s}`); }
  setLevel(l: number) { this.levelText.setText(`LEVEL ${l}`); }
  setPowerUp(kind: PowerUpKind | null, totalMs = 0, remainingMs = 0) {
    if (!kind) { this.puActive = null; this.puContainer.setVisible(false); return; }
    this.puActive = { kind, totalMs, remainingMs };
    this.puIconText.setText({ slowmo: '❄', ghost: '👻', double: '✨' }[kind]);
    this.puContainer.setVisible(true);
    this.drawRing();
  }
  tickRing(remainingMs: number) {
    if (!this.puActive) return;
    this.puActive.remainingMs = remainingMs;
    this.drawRing();
  }
  private drawRing() {
    this.puRing.clear();
    if (!this.puActive) return;
    const pct = Phaser.Math.Clamp(this.puActive.remainingMs / this.puActive.totalMs, 0, 1);
    this.puRing.lineStyle(3, THEME.colors.accentPurple, 1);
    this.puRing.beginPath();
    this.puRing.arc(0, 0, 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct, false);
    this.puRing.strokePath();
  }
}
