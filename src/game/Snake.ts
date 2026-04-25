import { Direction, Cell, OPPOSITE, DIR_VECTORS } from '../types';

export class Snake {
  body: Cell[];
  direction: Direction;
  constructor(headStart: Cell, dir: Direction, length: number) {
    this.direction = dir;
    const back = OPPOSITE[dir];
    const v = DIR_VECTORS[back];
    this.body = [];
    for (let i = 0; i < length; i++) {
      this.body.push({ x: headStart.x + v.x * i, y: headStart.y + v.y * i });
    }
  }
  get head(): Cell { return this.body[0]; }
  get length(): number { return this.body.length; }
  setDirection(next: Direction): boolean {
    if (next === OPPOSITE[this.direction]) return false;
    this.direction = next;
    return true;
  }
  advance(opts: { grow: boolean; maxLength?: number }): void {
    const v = DIR_VECTORS[this.direction];
    const newHead = { x: this.head.x + v.x, y: this.head.y + v.y };
    this.body.unshift(newHead);
    const cap = opts.maxLength ?? Infinity;
    const shouldGrow = opts.grow && this.body.length <= cap;
    if (!shouldGrow) this.body.pop();
  }
  hitsSelf(): boolean {
    const h = this.head;
    for (let i = 1; i < this.body.length; i++) {
      if (this.body[i].x === h.x && this.body[i].y === h.y) return true;
    }
    return false;
  }
}
