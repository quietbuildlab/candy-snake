import Phaser from 'phaser';
import { CONFIG } from '../config';
import { THEME } from '../theme';
import { Grid } from '../game/Grid';
import { Snake } from '../game/Snake';
import { KeyboardInput } from '../input/KeyboardInput';
import type { Cell } from '../types';

export class GameScene extends Phaser.Scene {
  private grid!: Grid;
  private snake!: Snake;
  private boardOriginX = 0;
  private boardOriginY = 0;
  private segments: Phaser.GameObjects.Arc[] = [];
  private tickEvent?: Phaser.Time.TimerEvent;
  private currentTickMs = CONFIG.ticks.initialMs;
  private input2!: KeyboardInput;

  constructor() { super('GameScene'); }

  create() {
    this.grid = new Grid(CONFIG.grid.cols, CONFIG.grid.rows, CONFIG.grid.cellPx);
    this.snake = new Snake(
      { x: CONFIG.snake.initialHeadCol, y: CONFIG.snake.initialHeadRow },
      CONFIG.snake.initialDirection,
      CONFIG.snake.initialLength
    );
    this.boardOriginX = (this.scale.width - this.grid.widthPx) / 2;
    this.boardOriginY = (this.scale.height - this.grid.heightPx) / 2 + 20;
    this.drawBoard();
    this.spawnSegments();
    this.input2 = new KeyboardInput(this, this.snake.direction);
    this.startTickLoop();
  }

  private cellCenterPx(c: Cell) {
    const p = this.grid.cellToPixel(c);
    return { x: this.boardOriginX + p.x, y: this.boardOriginY + p.y };
  }

  private drawBoard() {
    const card = this.add.graphics();
    card.fillStyle(THEME.colors.surface, 1);
    card.fillRoundedRect(this.boardOriginX - 12, this.boardOriginY - 12, this.grid.widthPx + 24, this.grid.heightPx + 24, 24);
    card.fillStyle(THEME.colors.accentPurple, 0.06);
    for (let y = 0; y < CONFIG.grid.rows; y++) {
      for (let x = 0; x < CONFIG.grid.cols; x++) {
        const p = this.cellCenterPx({ x, y });
        card.fillCircle(p.x, p.y, 1.2);
      }
    }
  }

  private spawnSegments() {
    for (const seg of this.segments) seg.destroy();
    this.segments = this.snake.body.map((c, i) => {
      const p = this.cellCenterPx(c);
      const radius = i === 0 ? 12 : 11;
      const color = i === 0 ? THEME.colors.snakeDark : THEME.colors.snakeLight;
      return this.add.circle(p.x, p.y, radius, color);
    });
  }

  private startTickLoop() {
    this.tickEvent?.destroy();
    this.tickEvent = this.time.addEvent({
      delay: this.currentTickMs,
      loop: true,
      callback: () => this.tick()
    });
  }

  private tick() {
    const nextDir = this.input2.consumeDirection();
    this.snake.setDirection(nextDir);
    this.snake.advance({ grow: false, maxLength: CONFIG.snake.maxLength });
    this.tweenSegmentsToBody();
  }

  private tweenSegmentsToBody() {
    const body = this.snake.body;
    // Add new head segment if needed
    while (this.segments.length < body.length) {
      const last = this.segments[this.segments.length - 1];
      this.segments.push(this.add.circle(last?.x ?? 0, last?.y ?? 0, 11, THEME.colors.snakeLight));
    }
    // Remove tail if shrunk
    while (this.segments.length > body.length) {
      this.segments.pop()?.destroy();
    }
    const dur = this.currentTickMs * 0.7;
    for (let i = 0; i < body.length; i++) {
      const p = this.cellCenterPx(body[i]);
      this.tweens.add({ targets: this.segments[i], x: p.x, y: p.y, duration: dur, ease: THEME.easings.snakeMove });
    }
  }
}
