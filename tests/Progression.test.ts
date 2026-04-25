import { describe, it, expect } from 'vitest';
import { levelForFruits, tickMsForLevel, obstacleCountForLevel } from '../src/game/Progression';

describe('Progression', () => {
  it('level rises every 5 fruits', () => {
    expect(levelForFruits(0)).toBe(1);
    expect(levelForFruits(4)).toBe(1);
    expect(levelForFruits(5)).toBe(2);
    expect(levelForFruits(14)).toBe(3);
    expect(levelForFruits(15)).toBe(4);
  });
  it('tickMs decreases by 12 per level, floored at 70', () => {
    expect(tickMsForLevel(1)).toBe(180);
    expect(tickMsForLevel(2)).toBe(168);
    expect(tickMsForLevel(10)).toBe(72);
    expect(tickMsForLevel(11)).toBe(70);
    expect(tickMsForLevel(99)).toBe(70);
  });
  it('obstacle count increments at L4, L6, L8, L10 (max 4)', () => {
    expect(obstacleCountForLevel(1)).toBe(0);
    expect(obstacleCountForLevel(3)).toBe(0);
    expect(obstacleCountForLevel(4)).toBe(1);
    expect(obstacleCountForLevel(5)).toBe(1);
    expect(obstacleCountForLevel(6)).toBe(2);
    expect(obstacleCountForLevel(8)).toBe(3);
    expect(obstacleCountForLevel(10)).toBe(4);
    expect(obstacleCountForLevel(20)).toBe(4);
  });
});
