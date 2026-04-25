import type { Cell } from '../types';

export class Grid {
  constructor(public readonly cols: number, public readonly rows: number, public readonly cellPx: number) {}
  get widthPx(): number { return this.cols * this.cellPx; }
  get heightPx(): number { return this.rows * this.cellPx; }
  cellToPixel(c: Cell): { x: number; y: number } {
    return { x: c.x * this.cellPx + this.cellPx / 2, y: c.y * this.cellPx + this.cellPx / 2 };
  }
  inBounds(c: Cell): boolean { return c.x >= 0 && c.x < this.cols && c.y >= 0 && c.y < this.rows; }
  wrap(c: Cell): Cell { return { x: ((c.x % this.cols) + this.cols) % this.cols, y: ((c.y % this.rows) + this.rows) % this.rows }; }
  static cellsEqual(a: Cell, b: Cell): boolean { return a.x === b.x && a.y === b.y; }
}
