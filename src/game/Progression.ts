import { CONFIG } from '../config';

export function levelForFruits(fruits: number): number {
  return Math.floor(fruits / CONFIG.ticks.fruitsPerLevel) + 1;
}

export function tickMsForLevel(level: number): number {
  const dec = (level - 1) * CONFIG.ticks.perLevelDelta;
  return Math.max(CONFIG.ticks.floorMs, CONFIG.ticks.initialMs - dec);
}

export function obstacleCountForLevel(level: number): number {
  let n = 0;
  for (const threshold of CONFIG.obstacles.schedule) {
    if (level >= threshold) n++;
  }
  return Math.min(n, CONFIG.obstacles.max);
}
