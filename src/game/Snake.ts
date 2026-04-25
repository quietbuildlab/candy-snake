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

export interface RespawnResult { body: Cell[]; direction: Direction }

export function findRespawnPlacement(
  grid: { cols: number; rows: number },
  length: number,
  blocked: Set<string>
): RespawnResult | null {
  const isFree = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < grid.cols && y < grid.rows && !blocked.has(`${x},${y}`);

  const tryHorizontal = (row: number, length: number): RespawnResult | null => {
    // Try every starting column where snake fits within bounds
    for (let startCol = grid.cols - length; startCol >= 0; startCol--) {
      const cells: Cell[] = [];
      let ok = true;
      for (let i = 0; i < length; i++) {
        const x = startCol + (length - 1) - i; // head is rightmost
        if (!isFree(x, row)) { ok = false; break; }
        cells.push({ x, y: row });
      }
      if (ok) return { body: cells, direction: 'right' };
    }
    return null;
  };

  const tryVertical = (col: number, length: number): RespawnResult | null => {
    for (let startRow = 0; startRow + length <= grid.rows; startRow++) {
      const cells: Cell[] = [];
      let ok = true;
      for (let i = 0; i < length; i++) {
        const y = startRow + (length - 1) - i; // head is bottom
        if (!isFree(col, y)) { ok = false; break; }
        cells.push({ x: col, y });
      }
      if (ok) return { body: cells, direction: 'down' };
    }
    return null;
  };

  // 1. Center row (y=10) horizontal
  let r = tryHorizontal(10, length);
  if (r) return r;
  // 2. Center column (x=10) vertical
  r = tryVertical(10, length);
  if (r) return r;
  // 3. Scan all rows then all columns at requested length
  for (let y = 0; y < grid.rows; y++) {
    r = tryHorizontal(y, length);
    if (r) return r;
  }
  for (let x = 0; x < grid.cols; x++) {
    r = tryVertical(x, length);
    if (r) return r;
  }
  // 4. Defensive trim (unreachable under current rules)
  for (let trimmed = length - 1; trimmed >= 3; trimmed--) {
    r = tryHorizontal(10, trimmed) ?? tryVertical(10, trimmed);
    if (r) return r;
    for (let y = 0; y < grid.rows; y++) { r = tryHorizontal(y, trimmed); if (r) return r; }
    for (let x = 0; x < grid.cols; x++) { r = tryVertical(x, trimmed); if (r) return r; }
  }
  return null;
}
