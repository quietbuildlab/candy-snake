import Phaser from 'phaser';
import { THEME } from '../theme';

export type PillowColor = 'green' | 'pink' | 'purple' | 'yellow' | 'white';

export interface PillowButtonOpts {
  width: number;
  height: number;
  label: string;
  color?: PillowColor;
  fontSize?: number;
  textColor?: string;
  /** Subtle idle "breathing" tween. Defaults to true for primary CTAs. */
  breathing?: boolean;
  onClick: () => void;
}

const FACE_BY_COLOR: Record<PillowColor, number> = {
  green: THEME.colors.btnGreenFace,
  pink: THEME.colors.btnPinkFace,
  purple: THEME.colors.btnPurpleFace,
  yellow: THEME.colors.btnYellowFace,
  white: THEME.colors.btnWhiteFace
};
const BASE_BY_COLOR: Record<PillowColor, number> = {
  green: THEME.colors.btnGreenBase,
  pink: THEME.colors.btnPinkBase,
  purple: THEME.colors.btnPurpleBase,
  yellow: THEME.colors.btnYellowBase,
  white: THEME.colors.btnWhiteBase
};

const PRESS_OFFSET = 5; // px the face translates down when pressed

/**
 * A Duolingo-style two-layer "pillow" button. The bottom layer is a darker
 * shadow base; the top layer (face) sits 5px above and tweens down when pressed
 * to give a tactile click. Includes optional idle breathing tween for CTAs.
 *
 * Returns a Container positioned at (x, y); origin is (0.5, 0.5) on the face.
 */
export function makePillowButton(scene: Phaser.Scene, x: number, y: number, opts: PillowButtonOpts): Phaser.GameObjects.Container {
  const color = opts.color ?? 'green';
  const w = opts.width;
  const h = opts.height;
  const radius = Math.min(h / 2, 24);
  const faceColor = FACE_BY_COLOR[color];
  const baseColor = BASE_BY_COLOR[color];
  const textColor = opts.textColor ?? (color === 'white' || color === 'yellow' ? '#1a1a1a' : '#ffffff');
  const fontSize = opts.fontSize ?? Math.round(h * 0.45);

  const container = scene.add.container(x, y);

  // Shadow base (sits below the face, doesn't move)
  const base = scene.add.graphics();
  base.fillStyle(baseColor, 1);
  base.fillRoundedRect(-w / 2, -h / 2 + PRESS_OFFSET, w, h, radius);
  container.add(base);

  // Face — its own container so we can tween position + scale independently
  const face = scene.add.container(0, 0);
  const faceGfx = scene.add.graphics();
  faceGfx.fillStyle(faceColor, 1);
  faceGfx.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
  // Subtle highlight stroke at top for depth
  faceGfx.lineStyle(2, 0xffffff, 0.35);
  faceGfx.strokeRoundedRect(-w / 2 + 1, -h / 2 + 1, w - 2, h * 0.45, { tl: radius, tr: radius, bl: 0, br: 0 });
  face.add(faceGfx);

  const label = scene.add.text(0, 0, opts.label, {
    fontFamily: THEME.font.display,
    fontSize: `${fontSize}px`,
    fontStyle: '700',
    color: textColor
  }).setOrigin(0.5);
  face.add(label);
  container.add(face);

  // Hit zone — covers face area, including the press offset
  const hit = scene.add.zone(0, PRESS_OFFSET / 2, w, h + PRESS_OFFSET).setInteractive({ useHandCursor: true });
  container.add(hit);

  let pressed = false;
  let breathingTween: Phaser.Tweens.Tween | undefined;

  const startBreathing = () => {
    if (!opts.breathing || breathingTween) return;
    breathingTween = scene.tweens.add({
      targets: face,
      scale: { from: 1.0, to: 1.04 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  };
  const stopBreathing = () => {
    if (breathingTween) { breathingTween.stop(); breathingTween = undefined; face.setScale(1); }
  };

  startBreathing();

  hit.on('pointerdown', () => {
    if (pressed) return;
    pressed = true;
    stopBreathing();
    scene.tweens.add({
      targets: face,
      y: PRESS_OFFSET,
      scaleX: 0.97,
      scaleY: 0.97,
      duration: 80,
      ease: THEME.easings.pillowPress
    });
  });

  const release = (fire: boolean) => {
    if (!pressed) return;
    pressed = false;
    scene.tweens.add({
      targets: face,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      duration: 220,
      ease: THEME.easings.pillowRelease,
      onComplete: () => startBreathing()
    });
    if (fire) opts.onClick();
  };
  hit.on('pointerup', () => release(true));
  hit.on('pointerupoutside', () => release(false));
  hit.on('pointercancel', () => release(false));

  // Cleanup on container destroy
  container.once('destroy', () => stopBreathing());

  return container;
}
