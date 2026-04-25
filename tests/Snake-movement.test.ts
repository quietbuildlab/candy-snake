import { describe, it, expect } from 'vitest';
import { Snake } from '../src/game/Snake';

describe('Snake movement', () => {
  it('starts with initial length facing right at given head', () => {
    const s = new Snake({ x: 4, y: 10 }, 'right', 3);
    expect(s.length).toBe(3);
    expect(s.head).toEqual({ x: 4, y: 10 });
    expect(s.direction).toBe('right');
    expect(s.body).toEqual([
      { x: 4, y: 10 }, { x: 3, y: 10 }, { x: 2, y: 10 }
    ]);
  });
  it('advances head one cell in current direction without growing', () => {
    const s = new Snake({ x: 4, y: 10 }, 'right', 3);
    s.advance({ grow: false });
    expect(s.head).toEqual({ x: 5, y: 10 });
    expect(s.length).toBe(3);
    expect(s.body[s.body.length - 1]).toEqual({ x: 3, y: 10 });
  });
  it('advance with grow=true increases length by 1', () => {
    const s = new Snake({ x: 4, y: 10 }, 'right', 3);
    s.advance({ grow: true });
    expect(s.length).toBe(4);
  });
  it('setDirection rejects 180° reversal', () => {
    const s = new Snake({ x: 4, y: 10 }, 'right', 3);
    expect(s.setDirection('left')).toBe(false);
    expect(s.direction).toBe('right');
    expect(s.setDirection('up')).toBe(true);
    expect(s.direction).toBe('up');
  });
});
