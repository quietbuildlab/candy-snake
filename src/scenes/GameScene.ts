import Phaser from 'phaser';
import { CONFIG } from '../config';
import { THEME } from '../theme';
import { Grid } from '../game/Grid';
import { Snake } from '../game/Snake';
import { KeyboardInput } from '../input/KeyboardInput';
import { pickFoodKind, findEmptyCell } from '../game/FoodSpawner';
import { showScorePopup } from '../ui/ScorePopup';
import type { Cell, FoodKind } from '../types';

export class GameScene extends Phaser.Scene {
  private grid!: Grid;
  private snake!: Snake;
  private boardOriginX = 0;
  private boardOriginY = 0;
  private segments: Phaser.GameObjects.Arc[] = [];
  private tickEvent?: Phaser.Time.TimerEvent;
  private currentTickMs = CONFIG.ticks.initialMs;
  private input2!: KeyboardInput;
  private food: { cell: Cell; kind: FoodKind; spawnedAt: number } | null = null;
  private foodGfx?: Phaser.GameObjects.Container;
  private score = 0;
  private rng = () => Math.random();

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
    this.spawnFood();
    this.startTickLoop();
  }

  /**
   * Returns every grid cell currently occupied by the snake plus anything
   * else that should not be spawned on. Tasks 19 and 20 extend this helper
   * to include obstacles and the uncollected power-up icon. ALL spawn
   * logic (food, power-ups, obstacles) must use this — never just the snake.
   */
  private boardBlockedCells(): Set<string> {
    const s = new Set<string>();
    for (const c of this.snake.body) s.add(`${c.x},${c.y}`);
    return s;
  }
  private spawnFood(kind?: FoodKind) {
    const blocked = this.boardBlockedCells();
    const cell = findEmptyCell(this.grid, blocked, this.rng);
    if (!cell) return;
    this.food = { cell, kind: kind ?? pickFoodKind(this.rng), spawnedAt: this.time.now };
    this.renderFood();
  }
  private renderFood() {
    this.foodGfx?.destroy();
    if (!this.food) return;
    const p = this.cellCenterPx(this.food.cell);
    const c = this.add.container(p.x, p.y);
    const colorByKind = { apple: THEME.colors.apple, berry: THEME.colors.berry, star: THEME.colors.star }[this.food.kind];
    const dot = this.add.circle(0, 0, 12, colorByKind);
    c.add(dot);
    if (this.food.kind === 'berry') {
      const halo = this.add.circle(0, 0, 18, THEME.colors.berry, 0.18);
      c.addAt(halo, 0);
      this.tweens.add({ targets: halo, scale: { from: 0.9, to: 1.15 }, alpha: { from: 0.18, to: 0.05 }, duration: 800, yoyo: true, repeat: -1 });
    }
    if (this.food.kind === 'star') {
      this.tweens.add({ targets: dot, angle: 360, duration: 2000, repeat: -1 });
    }
    c.setScale(0);
    this.tweens.add({ targets: c, scale: 1, duration: 250, ease: THEME.easings.foodPop });
    this.foodGfx = c;
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
    // Compute proposed head
    const willEat = !!this.food && (() => {
      const v = { up: {x:0,y:-1}, down: {x:0,y:1}, left: {x:-1,y:0}, right: {x:1,y:0} }[this.snake.direction];
      const nh = { x: this.snake.head.x + v.x, y: this.snake.head.y + v.y };
      return Grid.cellsEqual(nh, this.food!.cell);
    })();
    this.snake.advance({ grow: willEat, maxLength: CONFIG.snake.maxLength });
    this.tweenSegmentsToBody();
    if (willEat && this.food) {
      const grant = { apple: 10, berry: 30, star: 50 }[this.food.kind];
      this.score += grant;
      const p = this.cellCenterPx(this.food.cell);
      showScorePopup(this, p.x, p.y, `+${grant}!`, ({apple:THEME.colors.apple, berry:THEME.colors.berry, star:THEME.colors.star}[this.food.kind]));
      this.foodGfx?.destroy(); this.foodGfx = undefined; this.food = null;
      this.spawnFood();
    }
  }

  update(_time: number, _delta: number) {
    if (!this.food) return;
    if (this.food.kind === 'apple') return;
    const lifetime = this.food.kind === 'berry' ? CONFIG.food.berryLifetimeMs : CONFIG.food.starLifetimeMs;
    if (this.time.now - this.food.spawnedAt >= lifetime) {
      // Convert to apple in same cell
      this.food = { cell: this.food.cell, kind: 'apple', spawnedAt: this.time.now };
      this.renderFood();
    }
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
