import Phaser from 'phaser';
import { THEME } from '../theme';

export function showLevelBanner(scene: Phaser.Scene, level: number) {
  const { width, height } = scene.scale;
  const t = scene.add.text(-200, height / 2, `Level ${level}!`, {
    fontFamily: THEME.font.family, fontSize: '64px', fontStyle: '800', color: '#7a5cff'
  }).setOrigin(0.5);
  scene.tweens.chain({
    targets: t,
    tweens: [
      { x: width / 2, duration: 350, ease: THEME.easings.bannerSlide },
      { x: width / 2, duration: 700 },
      { x: width + 300, duration: 350, ease: 'Cubic.easeIn' }
    ],
    onComplete: () => t.destroy()
  });
}
