import Phaser from 'phaser';
import { THEME } from '../theme';

/**
 * Pop a target's scale (Back.Out 1.0→1.3→1.0) — used on score number changes,
 * level chip updates, etc. Squash-and-stretch for "juice."
 */
export function popScale(scene: Phaser.Scene, target: Phaser.GameObjects.GameObject & { scale: number; setScale: (s: number) => unknown }): void {
  scene.tweens.killTweensOf(target);
  target.setScale(1);
  scene.tweens.add({
    targets: target,
    scale: 1.3,
    duration: 100,
    ease: 'Quad.easeOut',
    yoyo: true,
    onYoyo: () => { scene.tweens.add({ targets: target, scale: 1, duration: 200, ease: 'Back.easeOut' }); }
  });
}

/**
 * Spawn a small radial burst of sparkles at the given canvas position.
 * Used when a piece of food is eaten — adds reward feedback to the core loop.
 */
export function sparkleAt(scene: Phaser.Scene, x: number, y: number, color: number, count = 8): void {
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const dist = 18 + Math.random() * 16;
    const size = 3 + Math.random() * 3;
    const star = scene.add.star(x, y, 4, size * 0.5, size, color).setAlpha(1);
    star.setRotation(Math.random() * Math.PI);
    scene.tweens.add({
      targets: star,
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      alpha: 0,
      scale: { from: 1, to: 0.2 },
      duration: 450 + Math.random() * 200,
      ease: 'Quad.easeOut',
      onComplete: () => star.destroy()
    });
  }
}

/**
 * Count a Text object up from `from` to `to` over `durationMs`. Used on the
 * Game Over screen so the final score builds suspense instead of slamming in.
 */
export function countUp(scene: Phaser.Scene, text: Phaser.GameObjects.Text, from: number, to: number, durationMs = 600, prefix = ''): void {
  const proxy = { v: from };
  scene.tweens.add({
    targets: proxy,
    v: to,
    duration: durationMs,
    ease: 'Quad.easeOut',
    onUpdate: () => { text.setText(`${prefix}${Math.floor(proxy.v)}`); },
    onComplete: () => { text.setText(`${prefix}${to}`); }
  });
}

/**
 * Rain multicolored confetti from the top of the scene. Used on Game Over
 * when the player hits a new personal best — universal "you did it" signal.
 */
export function confetti(scene: Phaser.Scene, count = 60): void {
  const palette = [
    THEME.colors.apple, THEME.colors.berry, THEME.colors.star,
    THEME.colors.snakeLight, THEME.colors.accentBlue
  ];
  const { width, height } = scene.scale;
  for (let i = 0; i < count; i++) {
    const x = Math.random() * width;
    const y = -10 - Math.random() * 60;
    const size = 6 + Math.random() * 6;
    const color = palette[Math.floor(Math.random() * palette.length)];
    const piece = scene.add.rectangle(x, y, size, size * 1.6, color);
    piece.setRotation(Math.random() * Math.PI);
    const targetY = height + 40;
    const duration = 2200 + Math.random() * 1600;
    const drift = (Math.random() - 0.5) * 200;
    scene.tweens.add({
      targets: piece,
      y: targetY,
      x: x + drift,
      angle: piece.angle + (Math.random() - 0.5) * 720,
      duration,
      ease: 'Quad.easeIn',
      delay: Math.random() * 300,
      onComplete: () => piece.destroy()
    });
  }
}

/**
 * Damage feedback bundle: camera shake + soft red flash + heart shrink-out.
 * Called when the player loses a life — converts a silent decrement into a
 * weighty event.
 */
export function loseLifeFx(scene: Phaser.Scene, heart: Phaser.GameObjects.GameObject & { setScale: (s: number) => unknown; alpha: number }): void {
  scene.cameras.main.shake(180, 0.008);
  scene.cameras.main.flash(120, 255, 80, 80, false);
  scene.tweens.add({
    targets: heart,
    scale: 0,
    alpha: 0,
    duration: 280,
    ease: 'Back.easeIn'
  });
}
