import { describe, it, expect } from 'vitest';
import { findRespawnPlacement } from '../src/game/Snake';

const grid = { cols: 20, rows: 20 };
const empty = new Set<string>(); // no obstacles, no food

function blocked(cells: Array<{x:number;y:number}>): Set<string> {
  return new Set(cells.map(c => `${c.x},${c.y}`));
}

describe('findRespawnPlacement', () => {
  it('places horizontally on center row when free', () => {
    const r = findRespawnPlacement(grid, 5, empty)!;
    expect(r.direction).toBe('right');
    expect(r.body.length).toBe(5);
    // head at center column area, on row 10
    expect(r.body[0].y).toBe(10);
    // body extends to the left of head
    for (let i = 1; i < r.body.length; i++) {
      expect(r.body[i].y).toBe(10);
      expect(r.body[i].x).toBe(r.body[0].x - i);
    }
  });
  it('falls back to vertical center column when row 10 blocked', () => {
    const cells: {x:number;y:number}[] = [];
    for (let x = 0; x < 20; x++) cells.push({ x, y: 10 });
    const r = findRespawnPlacement(grid, 5, blocked(cells))!;
    expect(r.direction).toBe('down');
    expect(r.body[0].x).toBe(10);
  });
  it('scans grid when both centers blocked', () => {
    const cells: {x:number;y:number}[] = [];
    for (let x = 0; x < 20; x++) cells.push({ x, y: 10 });
    for (let y = 0; y < 20; y++) cells.push({ x: 10, y });
    const r = findRespawnPlacement(grid, 5, blocked(cells));
    expect(r).not.toBeNull();
    // Sanity: none of the placed cells are blocked
    for (const c of r!.body) {
      expect(blocked(cells).has(`${c.x},${c.y}`)).toBe(false);
    }
  });
});
