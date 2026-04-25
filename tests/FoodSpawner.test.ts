import { describe, it, expect } from 'vitest';
import { pickFoodKind, rollPowerUpDrop, findEmptyCell } from '../src/game/FoodSpawner';

const seq = (vals: number[]) => { let i = 0; return () => vals[i++ % vals.length]; };

describe('pickFoodKind', () => {
  it('returns apple for low rolls', () => {
    expect(pickFoodKind(seq([0.0]))).toBe('apple');
    expect(pickFoodKind(seq([0.79]))).toBe('apple');
  });
  it('returns berry for middle rolls', () => {
    expect(pickFoodKind(seq([0.80]))).toBe('berry');
    expect(pickFoodKind(seq([0.94]))).toBe('berry');
  });
  it('returns star for high rolls', () => {
    expect(pickFoodKind(seq([0.95]))).toBe('star');
    expect(pickFoodKind(seq([0.999]))).toBe('star');
  });
});

describe('rollPowerUpDrop', () => {
  it('drops at <0.10 only', () => {
    expect(rollPowerUpDrop(seq([0.05]))).toBe(true);
    expect(rollPowerUpDrop(seq([0.10]))).toBe(false);
    expect(rollPowerUpDrop(seq([0.99]))).toBe(false);
  });
});

describe('findEmptyCell', () => {
  it('picks a cell not in the blocked set', () => {
    const blocked = new Set(['0,0', '1,0', '2,0']);
    const c = findEmptyCell({ cols: 4, rows: 1 }, blocked, () => 0)!;
    expect(blocked.has(`${c.x},${c.y}`)).toBe(false);
  });
  it('returns null when grid is fully blocked', () => {
    const blocked = new Set<string>();
    for (let x = 0; x < 2; x++) for (let y = 0; y < 2; y++) blocked.add(`${x},${y}`);
    expect(findEmptyCell({ cols: 2, rows: 2 }, blocked, () => 0)).toBeNull();
  });
});
