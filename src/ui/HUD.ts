import Phaser from 'phaser';
import { THEME } from '../theme';
import type { PowerUpKind } from '../types';
import { popScale, loseLifeFx } from './FX';

export class HUD {
  private scene: Phaser.Scene;
  private heartImgs: Phaser.GameObjects.Text[] = [];
  private levelText: Phaser.GameObjects.Text;
  private scoreText: Phaser.GameObjects.Text;
  private scoreContainer: Phaser.GameObjects.Container;
  private puContainer: Phaser.GameObjects.Container;
  private puRing: Phaser.GameObjects.Graphics;
  private puIconText: Phaser.GameObjects.Text;
  private puActive: { kind: PowerUpKind; totalMs: number; remainingMs: number } | null = null;
  private puPulseTween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, boardLeft: number, boardTop: number, boardWidth: number, onPause?: () => void) {
    this.scene = scene;
    const y = boardTop - 60;

    // Pause button — circular pillow icon
    if (onPause) {
      const pause = scene.add.container(boardLeft + 16, y + 8);
      const shadow = scene.add.graphics();
      shadow.fillStyle(0xd6cfca, 1);
      shadow.fillCircle(0, 4, 22);
      const face = scene.add.graphics();
      face.fillStyle(0xffffff, 1);
      face.fillCircle(0, 0, 22);
      face.lineStyle(2, 0xebe1f0, 1);
      face.strokeCircle(0, 0, 22);
      const icon = scene.add.text(0, 0, '⏸', {
        fontFamily: THEME.font.display, fontSize: '20px', fontStyle: '700', color: '#8a5be0'
      }).setOrigin(0.5);
      pause.add([shadow, face, icon]);
      const hit = scene.add.zone(0, 4, 50, 50).setInteractive({ useHandCursor: true });
      pause.add(hit);
      hit.on('pointerdown', () => {
        scene.tweens.add({ targets: face, scale: 0.9, duration: 80, yoyo: true, ease: 'Quad.easeOut' });
        onPause();
      });
    }

    // Hearts row — placed just right of pause button
    const heartsX = boardLeft + 56;
    for (let i = 0; i < 3; i++) {
      const h = scene.add.text(heartsX + i * 28, y + 8, '♥', {
        fontFamily: THEME.font.display, fontSize: '28px', fontStyle: '700', color: '#ff4fa3',
        stroke: '#ffffff', strokeThickness: 3
      }).setOrigin(0.5);
      this.heartImgs.push(h);
    }

    // Level chip — small, secondary, center-ish
    this.levelText = scene.add.text(boardLeft + boardWidth / 2 - 80, y + 8, 'LV 1', {
      fontFamily: THEME.font.display, fontSize: '18px', fontStyle: '700', color: '#8a5be0',
      backgroundColor: '#ffffff', padding: { x: 12, y: 4 }
    }).setOrigin(0.5);

    // Power-up ring — sits left of score
    this.puContainer = scene.add.container(boardLeft + boardWidth - 130, y + 8);
    this.puRing = scene.add.graphics();
    const puBg = scene.add.graphics();
    puBg.fillStyle(0xffffff, 0.9);
    puBg.fillCircle(0, 0, 18);
    this.puIconText = scene.add.text(0, 0, '', { fontSize: '18px' }).setOrigin(0.5);
    this.puContainer.add([puBg, this.puRing, this.puIconText]);
    this.puContainer.setVisible(false);

    // Score — HERO element. Bigger, Fredoka, with star icon.
    this.scoreContainer = scene.add.container(boardLeft + boardWidth - 8, y + 8);
    const scoreStar = scene.add.text(-58, 0, '⭐', { fontSize: '24px' }).setOrigin(1, 0.5);
    this.scoreText = scene.add.text(0, 0, '0', {
      fontFamily: THEME.font.display, fontSize: '32px', fontStyle: '700', color: '#3fd16c',
      stroke: '#ffffff', strokeThickness: 3
    }).setOrigin(1, 0.5);
    this.scoreContainer.add([scoreStar, this.scoreText]);
  }

  setLives(n: number) {
    for (let i = 0; i < this.heartImgs.length; i++) {
      const h = this.heartImgs[i];
      const target = i < n ? 1 : 0.2;
      // If a heart just turned off (lose-life), play the FX
      if (h.alpha > 0.5 && target < 0.5 && i === n) {
        loseLifeFx(this.scene, h as unknown as Phaser.GameObjects.GameObject & { setScale: (s: number) => unknown; alpha: number });
      } else {
        h.setAlpha(target);
      }
    }
  }

  setScore(s: number) {
    this.scoreText.setText(`${s}`);
    popScale(this.scene, this.scoreText as unknown as Phaser.GameObjects.GameObject & { scale: number; setScale: (s: number) => unknown });
  }

  setLevel(l: number) {
    this.levelText.setText(`LV ${l}`);
    popScale(this.scene, this.levelText as unknown as Phaser.GameObjects.GameObject & { scale: number; setScale: (s: number) => unknown });
  }

  setPowerUp(kind: PowerUpKind | null, totalMs = 0, remainingMs = 0) {
    if (this.puPulseTween) { this.puPulseTween.stop(); this.puPulseTween = undefined; this.puContainer.setScale(1); }
    if (!kind) { this.puActive = null; this.puContainer.setVisible(false); return; }
    this.puActive = { kind, totalMs, remainingMs };
    this.puIconText.setText({ slowmo: '❄', ghost: '👻', double: '✨' }[kind]);
    this.puContainer.setVisible(true);
    this.puContainer.setScale(0);
    this.scene.tweens.add({ targets: this.puContainer, scale: 1, duration: 220, ease: 'Back.easeOut' });
    this.drawRing();
  }

  tickRing(remainingMs: number) {
    if (!this.puActive) return;
    this.puActive.remainingMs = remainingMs;
    // Pulse in last 2 seconds for urgency
    if (remainingMs <= 2000 && !this.puPulseTween) {
      this.puPulseTween = this.scene.tweens.add({
        targets: this.puContainer,
        scale: { from: 1, to: 1.18 },
        duration: 200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
    this.drawRing();
  }

  private drawRing() {
    this.puRing.clear();
    if (!this.puActive) return;
    const pct = Phaser.Math.Clamp(this.puActive.remainingMs / this.puActive.totalMs, 0, 1);
    const color = this.puActive.remainingMs <= 2000 ? THEME.colors.apple : THEME.colors.accentPurple;
    this.puRing.lineStyle(4, color, 1);
    this.puRing.beginPath();
    this.puRing.arc(0, 0, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct, false);
    this.puRing.strokePath();
  }
}
