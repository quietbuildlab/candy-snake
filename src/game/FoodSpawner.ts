import { CONFIG } from '../config';
import type { FoodKind, Cell } from '../types';

export function pickFoodKind(rng: () => number): FoodKind {
  const r = rng();
  const w = CONFIG.food.weights;
  if (r < w.apple) return 'apple';
  if (r < 1 - w.star) return 'berry';
  return 'star';
}

export function rollPowerUpDrop(rng: () => number): boolean {
  return rng() < CONFIG.powerUps.dropChance;
}

export function findEmptyCell(
  grid: { cols: number; rows: number },
  blocked: Set<string>,
  rng: () => number
): Cell | null {
  const total = grid.cols * grid.rows;
  if (blocked.size >= total) return null;
  // Reservoir: try up to 32 random picks, then fall through to scan.
  for (let i = 0; i < 32; i++) {
    const idx = Math.floor(rng() * total);
    const x = idx % grid.cols, y = Math.floor(idx / grid.cols);
    if (!blocked.has(`${x},${y}`)) return { x, y };
  }
  for (let y = 0; y < grid.rows; y++) {
    for (let x = 0; x < grid.cols; x++) {
      if (!blocked.has(`${x},${y}`)) return { x, y };
    }
  }
  return null;
}
