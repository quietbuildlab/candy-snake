import Phaser from 'phaser';
import type { Direction } from '../types';
import type { DirectionBuffer } from './KeyboardInput';

// Inertial swipe with mid-gesture re-arming (Subway-Surfers / Crossy-Road style).
// Direction commits during pointermove the moment a 20px axis cross is detected,
// then the origin resets so the same touch can chain a second turn without lifting.
const THRESHOLD_PX = 20;
const DEAD_ZONE_PX = 6;

export class SwipeInput {
  private origin: { x: number; y: number } | null = null;
  private lastDir: Direction | null = null;

  constructor(scene: Phaser.Scene, private buffer: DirectionBuffer) {
    scene.input.addPointer(2); // tolerate a stray second finger without losing the first

    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.origin = { x: p.x, y: p.y };
      this.lastDir = null;
    });

    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.origin || !p.isDown) return;
      const dx = p.x - this.origin.x;
      const dy = p.y - this.origin.y;
      const ax = Math.abs(dx), ay = Math.abs(dy);
      const max = Math.max(ax, ay);
      if (max < DEAD_ZONE_PX) return;
      if (max < THRESHOLD_PX) return;

      const dir: Direction =
        ax >= ay ? (dx > 0 ? 'right' : 'left')
                 : (dy > 0 ? 'down'  : 'up');

      if (dir !== this.lastDir) {
        this.buffer.tryQueue(dir);
        this.lastDir = dir;
      }
      // Re-arm origin so the next swipe in this same touch starts fresh.
      this.origin = { x: p.x, y: p.y };
    });

    const clear = () => { this.origin = null; this.lastDir = null; };
    scene.input.on('pointerup', clear);
    scene.input.on('pointerupoutside', clear);
    scene.input.on('pointercancel', clear);
  }
}
