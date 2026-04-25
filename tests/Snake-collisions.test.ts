import { describe, it, expect } from 'vitest';
import { Snake } from '../src/game/Snake';

describe('Snake collisions and growth cap', () => {
  it('hitsSelf detects head occupying any non-head body cell', () => {
    const s = new Snake({ x: 4, y: 10 }, 'right', 4);
    expect(s.hitsSelf()).toBe(false);
    // Force head onto a body cell
    s.body[0] = { x: 3, y: 10 };
    expect(s.hitsSelf()).toBe(true);
  });
  it('grow caps at maxLength=20', () => {
    const s = new Snake({ x: 0, y: 0 }, 'right', 19);
    s.advance({ grow: true, maxLength: 20 });
    expect(s.length).toBe(20);
    s.advance({ grow: true, maxLength: 20 });
    expect(s.length).toBe(20); // capped
  });
});
