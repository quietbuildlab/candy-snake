import Phaser from 'phaser';
import { CONFIG } from '../config';
import type { Direction } from '../types';
import type { DirectionBuffer } from './KeyboardInput';

export class SwipeInput {
  private start: { x: number; y: number } | null = null;
  constructor(scene: Phaser.Scene, private buffer: DirectionBuffer) {
    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.start = { x: p.x, y: p.y };
    });
    scene.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (!this.start) return;
      const dx = p.x - this.start.x;
      const dy = p.y - this.start.y;
      this.start = null;
      const ax = Math.abs(dx), ay = Math.abs(dy);
      if (Math.max(ax, ay) < CONFIG.swipe.minDistancePx) return;
      let dir: Direction;
      if (ax >= ay) dir = dx > 0 ? 'right' : 'left';
      else dir = dy > 0 ? 'down' : 'up';
      this.buffer.tryQueue(dir);
    });
  }
}
