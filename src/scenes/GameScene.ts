import Phaser from 'phaser';
import { createActor } from 'xstate';
import { CONFIG } from '../config';
import { THEME } from '../theme';
import { Grid } from '../game/Grid';
import { Snake, findRespawnPlacement } from '../game/Snake';
import { gameFlowMachine } from '../game/GameFlowMachine';
import { KeyboardInput } from '../input/KeyboardInput';
import { pickFoodKind, findEmptyCell } from '../game/FoodSpawner';
import { showScorePopup } from '../ui/ScorePopup';
import { levelForFruits, tickMsForLevel, obstacleCountForLevel } from '../game/Progression';
import { showLevelBanner } from '../ui/LevelBanner';
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
  private lives = CONFIG.lives.start;
  private invulnerableUntil = 0;
  private fruitsEaten = 0;
  private level = 1;
  private obstacles: Cell[] = [];
  private obstacleGfx: Phaser.GameObjects.Rectangle[] = [];
  private flow = createActor(gameFlowMachine);

  constructor() { super('GameScene'); }

  create() {
    this.flow = createActor(gameFlowMachine);
    this.flow.start();
    this.events.once('shutdown', () => this.flow.stop());
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
    for (const c of this.obstacles) s.add(`${c.x},${c.y}`);
    return s;
  }
  private renderObstacles() {
    for (const r of this.obstacleGfx) r.destroy();
    this.obstacleGfx = this.obstacles.map(c => {
      const p = this.cellCenterPx(c);
      const r = this.add.rectangle(p.x, p.y, 22, 22, THEME.colors.obstacle);
      r.setStrokeStyle(2, THEME.colors.starLight);
      return r;
    });
  }
  private addObstacles(count: number) {
    while (this.obstacles.length < count) {
      const blocked = this.boardBlockedCells();
      if (this.food) blocked.add(`${this.food.cell.x},${this.food.cell.y}`);
      const cell = findEmptyCell(this.grid, blocked, this.rng);
      if (!cell) break;
      this.obstacles.push(cell);
    }
    this.renderObstacles();
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

    const v = { up:{x:0,y:-1}, down:{x:0,y:1}, left:{x:-1,y:0}, right:{x:1,y:0} }[this.snake.direction];
    const newHead = { x: this.snake.head.x + v.x, y: this.snake.head.y + v.y };

    const outOfBounds = !this.grid.inBounds(newHead);
    const intoBody = this.snake.body.some((c, i) => i > 0 && c.x === newHead.x && c.y === newHead.y);
    const intoObstacle = this.obstacles.some(o => o.x === newHead.x && o.y === newHead.y);
    if (outOfBounds || intoBody || intoObstacle) {
      if (this.time.now >= this.invulnerableUntil) {
        this.loseLife();
        return;
      }
      // INVULNERABLE collision: do NOT advance into the illegal cell.
      return;
    }

    const willEat = !!this.food && newHead.x === this.food.cell.x && newHead.y === this.food.cell.y;
    this.snake.advance({ grow: willEat, maxLength: CONFIG.snake.maxLength });
    this.tweenSegmentsToBody();
    if (willEat && this.food) {
      const grant = { apple: 10, berry: 30, star: 50 }[this.food.kind];
      this.score += grant;
      const p = this.cellCenterPx(this.food.cell);
      showScorePopup(this, p.x, p.y, `+${grant}!`, ({apple:THEME.colors.apple, berry:THEME.colors.berry, star:THEME.colors.star}[this.food.kind]));
      this.foodGfx?.destroy(); this.foodGfx = undefined; this.food = null;
      this.fruitsEaten++;
      const newLevel = levelForFruits(this.fruitsEaten);
      if (newLevel !== this.level) {
        this.level = newLevel;
        this.currentTickMs = tickMsForLevel(newLevel);
        this.startTickLoop();
        showLevelBanner(this, newLevel);
        const desired = obstacleCountForLevel(newLevel);
        if (desired > this.obstacles.length) this.addObstacles(desired);
      }
      this.spawnFood();
    }
  }

  private loseLife() {
    this.lives--;
    this.flow.send({ type: 'HIT', livesAfter: this.lives });
    // Flash snake red
    for (const seg of this.segments) {
      this.tweens.add({ targets: seg, fillColor: 0xff4d6d, duration: 80, yoyo: true, repeat: 1, onComplete: () => seg.setFillStyle(THEME.colors.snakeLight) });
    }
    if (this.lives <= 0) {
      this.tickEvent?.destroy();
      this.scene.start('GameOverScene', { score: this.score });
      return;
    }
    // Pause briefly, then respawn
    if (this.tickEvent) this.tickEvent.paused = true;
    this.time.delayedCall(400, () => this.flow.send({ type: 'FLASH_DONE' }));
    this.time.delayedCall(CONFIG.snake.respawnPauseMs, () => this.respawn());
  }

  private respawn() {
    const blocked = new Set<string>();
    if (this.food) blocked.add(`${this.food.cell.x},${this.food.cell.y}`);
    for (const o of this.obstacles) blocked.add(`${o.x},${o.y}`);
    const r = findRespawnPlacement(this.grid, this.snake.length, blocked);
    if (!r) { this.flow.send({ type: 'GAME_OVER' }); this.scene.start('GameOverScene', { score: this.score }); return; }
    this.snake.body = r.body;
    this.snake.direction = r.direction;
    this.spawnSegments();
    this.flow.send({ type: 'RESPAWN_DONE' });
    this.invulnerableUntil = this.time.now + CONFIG.snake.respawnInvulnerabilityMs;
    // Blink during invulnerability
    const blinkTween = this.tweens.add({
      targets: this.segments, alpha: { from: 1, to: 0.4 }, yoyo: true,
      duration: 150, repeat: Math.floor(CONFIG.snake.respawnInvulnerabilityMs / 300)
    });
    if (this.tickEvent) this.tickEvent.paused = false;
    this.time.delayedCall(CONFIG.snake.respawnInvulnerabilityMs, () => {
      blinkTween.stop();
      this.flow.send({ type: 'INVULNERABLE_DONE' });
    });
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
