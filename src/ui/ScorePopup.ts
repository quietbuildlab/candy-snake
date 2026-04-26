import Phaser from 'phaser';
import { THEME } from '../theme';

export function showScorePopup(scene: Phaser.Scene, x: number, y: number, text: string, color: number = THEME.colors.apple) {
  const t = scene.add.text(x, y, text, {
    fontFamily: THEME.font.family, fontSize: '20px', fontStyle: '800',
    color: '#' + color.toString(16).padStart(6, '0')
  }).setOrigin(0.5);
  scene.tweens.add({ targets: t, y: y - 36, alpha: 0, duration: 700, onComplete: () => t.destroy() });
}
