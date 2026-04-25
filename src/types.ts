export type Direction = 'up' | 'down' | 'left' | 'right';
export type FoodKind = 'apple' | 'berry' | 'star';
export type PowerUpKind = 'slowmo' | 'ghost' | 'double';
export interface Cell { x: number; y: number }

export const OPPOSITE: Record<Direction, Direction> = {
  up: 'down', down: 'up', left: 'right', right: 'left'
};

export const DIR_VECTORS: Record<Direction, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};
