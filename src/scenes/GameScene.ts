import Phaser from 'phaser';
import { CONFIG } from '../config';
import { THEME } from '../theme';
import { Grid } from '../game/Grid';
import { Snake } from '../game/Snake';
import type { Cell } from '../types';

export class GameScene extends Phaser.Scene {
  private grid!: Grid;
  private snake!: Snake;
  private boardOriginX = 0;
  private boardOriginY = 0;
  private snakeGfx!: Phaser.GameObjects.Graphics;

  constructor() { super('GameScene'); }

  create() {
    this.grid = new Grid(CONFIG.grid.cols, CONFIG.grid.rows, CONFIG.grid.cellPx);
    this.snake = new Snake(
      { x: CONFIG.snake.initialHeadCol, y: CONFIG.snake.initialHeadRow },
      CONFIG.snake.initialDirection,
      CONFIG.snake.initialLength
    );

    // Center the play card on the canvas
    this.boardOriginX = (this.scale.width - this.grid.widthPx) / 2;
    this.boardOriginY = (this.scale.height - this.grid.heightPx) / 2 + 20;

    // Play card background
    const card = this.add.graphics();
    card.fillStyle(THEME.colors.surface, 1);
    card.fillRoundedRect(this.boardOriginX - 12, this.boardOriginY - 12, this.grid.widthPx + 24, this.grid.heightPx + 24, 24);
    // Soft inner dot grid
    card.fillStyle(THEME.colors.accentPurple, 0.06);
    for (let y = 0; y < CONFIG.grid.rows; y++) {
      for (let x = 0; x < CONFIG.grid.cols; x++) {
        const p = this.cellCenterPx({ x, y });
        card.fillCircle(p.x, p.y, 1.2);
      }
    }

    this.snakeGfx = this.add.graphics();
    this.renderSnake();
  }

  private cellCenterPx(c: Cell) {
    const p = this.grid.cellToPixel(c);
    return { x: this.boardOriginX + p.x, y: this.boardOriginY + p.y };
  }

  private renderSnake() {
    this.snakeGfx.clear();
    const body = this.snake.body;
    for (let i = 0; i < body.length; i++) {
      const p = this.cellCenterPx(body[i]);
      const t = i / Math.max(1, body.length - 1);
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.IntegerToColor(THEME.colors.snakeDark),
        Phaser.Display.Color.IntegerToColor(THEME.colors.snakeLight),
        100, Math.round(t * 100)
      );
      const color = Phaser.Display.Color.GetColor(c.r, c.g, c.b);
      const radius = (i === 0 ? 12 : 11) - Math.min(2, i * 0.1);
      this.snakeGfx.fillStyle(color, 1);
      this.snakeGfx.fillCircle(p.x, p.y, radius);
      if (i === 0) {
        // simple eyes (will rotate-with-direction in a later task)
        this.snakeGfx.fillStyle(0x1a1a1a, 1);
        this.snakeGfx.fillCircle(p.x + 3, p.y - 2, 2);
        this.snakeGfx.fillCircle(p.x + 3, p.y + 2, 2);
      }
    }
  }
}
