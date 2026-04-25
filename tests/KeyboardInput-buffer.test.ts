import { describe, it, expect } from 'vitest';
import { DirectionBuffer } from '../src/input/KeyboardInput';

describe('DirectionBuffer', () => {
  it('queues last valid input', () => {
    const b = new DirectionBuffer('right');
    b.tryQueue('up');
    expect(b.consume()).toBe('up');
  });
  it('rejects 180° vs current when no buffered direction', () => {
    const b = new DirectionBuffer('right');
    b.tryQueue('left');
    expect(b.consume()).toBe('right');
  });
  it('rejects 180° vs already-buffered direction', () => {
    const b = new DirectionBuffer('right');
    b.tryQueue('up');     // valid
    b.tryQueue('down');   // 180° vs buffered up → rejected
    expect(b.consume()).toBe('up');
  });
  it('consume advances current and clears buffer', () => {
    const b = new DirectionBuffer('right');
    b.tryQueue('up');
    expect(b.consume()).toBe('up');
    expect(b.consume()).toBe('up'); // current is now 'up'
    b.tryQueue('down'); // 180° vs current → rejected
    expect(b.consume()).toBe('up');
  });
});
