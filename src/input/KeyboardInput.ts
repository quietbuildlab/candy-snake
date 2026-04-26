import Phaser from 'phaser';
import { Direction, OPPOSITE } from '../types';

export class DirectionBuffer {
  private current: Direction;
  private buffered: Direction | null = null;
  constructor(initial: Direction) { this.current = initial; }
  tryQueue(d: Direction): boolean {
    const compareAgainst = this.buffered ?? this.current;
    if (d === OPPOSITE[compareAgainst]) return false;
    this.buffered = d;
    return true;
  }
  consume(): Direction {
    if (this.buffered) { this.current = this.buffered; this.buffered = null; }
    return this.current;
  }
  peekCurrent(): Direction { return this.current; }
}

export type DirEventListener = (d: Direction) => void;

export class KeyboardInput {
  private buffer: DirectionBuffer;
  constructor(scene: Phaser.Scene, initial: Direction) {
    this.buffer = new DirectionBuffer(initial);
    const kb = scene.input.keyboard!;
    const map: Array<[string, Direction]> = [
      ['UP', 'up'], ['W', 'up'],
      ['DOWN', 'down'], ['S', 'down'],
      ['LEFT', 'left'], ['A', 'left'],
      ['RIGHT', 'right'], ['D', 'right']
    ];
    for (const [key, dir] of map) {
      kb.on(`keydown-${key}`, () => this.buffer.tryQueue(dir));
    }
  }
  consumeDirection(): Direction { return this.buffer.consume(); }
  setCurrent(_: Direction): void { /* not needed; buffer tracks via consume */ }
  getBuffer(): DirectionBuffer { return this.buffer; }  /* Task 24 swipe will use this */
}
