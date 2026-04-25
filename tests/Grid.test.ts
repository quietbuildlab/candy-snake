import { describe, it, expect } from 'vitest';
import { Grid } from '../src/game/Grid';

describe('Grid', () => {
  const g = new Grid(20, 20, 28);
  it('cellToPixel returns the cell center', () => {
    expect(g.cellToPixel({ x: 0, y: 0 })).toEqual({ x: 14, y: 14 });
    expect(g.cellToPixel({ x: 10, y: 10 })).toEqual({ x: 294, y: 294 });
  });
  it('inBounds rejects out-of-range cells', () => {
    expect(g.inBounds({ x: 0, y: 0 })).toBe(true);
    expect(g.inBounds({ x: 19, y: 19 })).toBe(true);
    expect(g.inBounds({ x: -1, y: 5 })).toBe(false);
    expect(g.inBounds({ x: 20, y: 5 })).toBe(false);
  });
  it('wrap brings out-of-bounds cells back inside', () => {
    expect(g.wrap({ x: -1, y: 5 })).toEqual({ x: 19, y: 5 });
    expect(g.wrap({ x: 20, y: 5 })).toEqual({ x: 0, y: 5 });
    expect(g.wrap({ x: 5, y: -1 })).toEqual({ x: 5, y: 19 });
  });
  it('cellsEqual compares by coords', () => {
    expect(Grid.cellsEqual({ x: 1, y: 2 }, { x: 1, y: 2 })).toBe(true);
    expect(Grid.cellsEqual({ x: 1, y: 2 }, { x: 2, y: 1 })).toBe(false);
  });
});
