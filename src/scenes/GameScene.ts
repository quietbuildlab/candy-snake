import Phaser from 'phaser';
import { createActor } from 'xstate';
import { CONFIG } from '../config';
import { THEME } from '../theme';
import { Grid } from '../game/Grid';
import { Snake, findRespawnPlacement } from '../game/Snake';
import { gameFlowMachine } from '../game/GameFlowMachine';
import { KeyboardInput } from '../input/KeyboardInput';
import { SwipeInput } from '../input/SwipeInput';
import { pickFoodKind, findEmptyCell } from '../game/FoodSpawner';
import { showScorePopup } from '../ui/ScorePopup';
import { sparkleAt } from '../ui/FX';
import { levelForFruits, tickMsForLevel, obstacleCountForLevel } from '../game/Progression';
import { showLevelBanner } from '../ui/LevelBanner';
import { rollPowerUpDrop } from '../game/FoodSpawner';
import { PowerUpController } from '../game/PowerUps';
import { HUD } from '../ui/HUD';
import { AudioManager } from '../audio/AudioManager';
import type { Cell, FoodKind } from '../types';
import type { PowerUpKind } from '../types';

export class GameScene extends Phaser.Scene {
  private grid!: Grid;
  private snake!: Snake;
  private boardOriginX = 0;
  private boardOriginY = 0;
  private segments: Phaser.GameObjects.Arc[] = [];
  private headContainer?: Phaser.GameObjects.Container;
  private tickEvent?: Phaser.Time.TimerEvent;
  private currentTickMs: number = CONFIG.ticks.initialMs;
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
  private pu = new PowerUpController();
  private puIcon: { kind: PowerUpKind; cell: Cell; spawnedAt: number; gfx: Phaser.GameObjects.Container } | null = null;
  private flow = createActor(gameFlowMachine);
  private hud!: HUD;
  private onVisibilityChange = () => { if (document.hidden && !this.scene.isPaused()) this.pauseGame(); };

  constructor() { super('GameScene'); }

  create() {
    this.flow = createActor(gameFlowMachine);
    this.flow.start();
    this.events.once('shutdown', () => this.flow.stop());
    const isMobile = this.scale.width < CONFIG.responsive.breakpointPx;
    const margin = isMobile ? CONFIG.responsive.mobileMargin : 80;
    const maxBoardW = isMobile ? Math.min(this.scale.width - margin, CONFIG.responsive.mobileMaxCardPx) : CONFIG.grid.cols * CONFIG.grid.cellPx;
    const cellPx = Math.floor(maxBoardW / CONFIG.grid.cols);
    this.grid = new Grid(CONFIG.grid.cols, CONFIG.grid.rows, cellPx);
    this.snake = new Snake(
      { x: CONFIG.snake.initialHeadCol, y: CONFIG.snake.initialHeadRow },
      CONFIG.snake.initialDirection,
      CONFIG.snake.initialLength
    );
    this.boardOriginX = (this.scale.width - this.grid.widthPx) / 2;
    this.boardOriginY = (this.scale.height - this.grid.heightPx) / 2 + 20;
    this.drawBoard();
    this.hud = new HUD(this, this.boardOriginX, this.boardOriginY, this.grid.widthPx, () => this.pauseGame());
    this.hud.setLives(this.lives);
    this.hud.setScore(0);
    this.hud.setLevel(1);
    this.spawnSegments();
    this.input2 = new KeyboardInput(this, this.snake.direction);
    new SwipeInput(this, this.input2.getBuffer());
    this.spawnFood();
    this.startTickLoop();
    this.input.keyboard?.on('keydown-ESC', () => this.pauseGame());
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.events.once('shutdown', () => document.removeEventListener('visibilitychange', this.onVisibilityChange));
  }

  private pauseGame() {
    if (this.scene.isPaused()) return;
    this.flow.send({ type: 'PAUSE' });
    this.scene.pause();
    this.scene.launch('PauseScene');
    AudioManager.duckBgm();
  }

  public resumeFromPause() {
    this.flow.send({ type: 'RESUME' });
    this.scene.resume();
    AudioManager.unduckBgm();
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
    if (this.puIcon) s.add(`${this.puIcon.cell.x},${this.puIcon.cell.y}`);
    return s;
  }

  private maybeDropPowerUp() {
    if (this.puIcon) return; // at most one icon at a time
    if (!rollPowerUpDrop(this.rng)) return;
    const blocked = this.boardBlockedCells();
    if (this.food) blocked.add(`${this.food.cell.x},${this.food.cell.y}`);
    const cell = findEmptyCell(this.grid, blocked, this.rng);
    if (!cell) return;
    const kinds: PowerUpKind[] = ['slowmo', 'ghost', 'double'];
    const kind = kinds[Math.floor(this.rng() * 3)];
    const p = this.cellCenterPx(cell);
    const colorByKind = { slowmo: 0x60a5fa, ghost: 0xffffff, double: THEME.colors.accentPurple };
    const g = this.add.container(p.x, p.y);
    const ring = this.add.circle(0, 0, 14, colorByKind[kind], 0.85);
    ring.setStrokeStyle(2, 0xffffff);
    const label = this.add.text(0, 0, ({slowmo:'❄', ghost:'👻', double:'✨'}[kind]), { fontSize: '16px' }).setOrigin(0.5);
    g.add([ring, label]);
    g.setScale(0);
    this.tweens.add({ targets: g, scale: 1, duration: 250, ease: THEME.easings.foodPop });
    this.puIcon = { kind, cell, spawnedAt: this.time.now, gfx: g };
  }

  private collectPowerUpIfHere(headCell: Cell) {
    if (!this.puIcon) return;
    if (headCell.x !== this.puIcon.cell.x || headCell.y !== this.puIcon.cell.y) return;
    this.pu.activate(this.puIcon.kind);
    AudioManager.play('power-up');
    this.hud.setPowerUp(this.pu.active!.kind, this.pu.active!.remainingMs, this.pu.active!.remainingMs);
    this.puIcon.gfx.destroy();
    this.puIcon = null;
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
    this.headContainer?.destroy();
    this.segments = this.snake.body.map((c, i) => {
      const p = this.cellCenterPx(c);
      const radius = i === 0 ? 12 : 11;
      const color = i === 0 ? THEME.colors.snakeDark : THEME.colors.snakeLight;
      return this.add.circle(p.x, p.y, radius, color);
    });
    // Build head decoration (eyes) as a container we'll rotate
    const headP = this.cellCenterPx(this.snake.body[0]);
    this.headContainer = this.add.container(headP.x, headP.y);
    const lEye = this.add.circle(3, -3, 2, 0x1a1a1a);
    const rEye = this.add.circle(3, 3, 2, 0x1a1a1a);
    this.headContainer.add([lEye, rEye]);
    this.updateHeadRotation();
  }

  private updateHeadRotation() {
    if (!this.headContainer) return;
    const map = { right: 0, down: Math.PI/2, left: Math.PI, up: -Math.PI/2 };
    this.headContainer.setRotation(map[this.snake.direction]);
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
    // Drain power-up timer by the ACTUAL elapsed tick interval. tickEvent.delay
    // already reflects slow-mo (we adjust it at the end of each tick), so this
    // gives the real-world duration the spec promises.
    const elapsed = this.tickEvent?.delay ?? this.currentTickMs;
    const beforeKind = this.pu.active?.kind ?? null;
    this.pu.tick(elapsed);
    if (beforeKind && !this.pu.active) this.hud.setPowerUp(null);
    else if (this.pu.active) this.hud.tickRing(this.pu.active.remainingMs);

    // Power-up icon expiry on the board
    if (this.puIcon && this.time.now - this.puIcon.spawnedAt >= CONFIG.powerUps.iconLifetimeMs) {
      this.puIcon.gfx.destroy(); this.puIcon = null;
    }

    // Apply buffered direction for this tick
    const nextDir = this.input2.consumeDirection();
    this.snake.setDirection(nextDir);

    // Compute proposed new head
    const v = { up:{x:0,y:-1}, down:{x:0,y:1}, left:{x:-1,y:0}, right:{x:1,y:0} }[this.snake.direction];
    let newHead = { x: this.snake.head.x + v.x, y: this.snake.head.y + v.y };
    const ghosting = this.pu.isActive('ghost');
    let wrapped = false;

    // Wall handling
    if (!this.grid.inBounds(newHead)) {
      if (ghosting) {
        newHead = this.grid.wrap(newHead);
        wrapped = true;
      } else if (this.time.now >= this.invulnerableUntil) {
        this.loseLife();
        return;
      } else {
        // INVULNERABLE collision: do not move into the illegal cell.
        // Skipping the tick keeps state legal; player still steers next tick.
        return;
      }
    }

    // Body / obstacle handling (obstacles still kill even in ghost mode)
    const intoBody = !ghosting && this.snake.body.some((c, i) => i > 0 && c.x === newHead.x && c.y === newHead.y);
    const intoObstacle = this.obstacles.some(o => o.x === newHead.x && o.y === newHead.y);
    if (intoBody || intoObstacle) {
      if (this.time.now >= this.invulnerableUntil) { this.loseLife(); return; }
      // INVULNERABLE: skip the move (same rationale as wall case)
      return;
    }

    // Apply movement. We compute the head ourselves (so wrap/ghost are honored
    // in one place) and shift the body manually rather than calling advance().
    const willEat = !!this.food && newHead.x === this.food.cell.x && newHead.y === this.food.cell.y;
    this.snake.body.unshift(newHead);
    const shouldGrow = willEat && this.snake.length <= CONFIG.snake.maxLength;
    if (!shouldGrow) this.snake.body.pop();

    this.tweenSegmentsToBody();
    if (wrapped) {
      // Don't tween the head across the entire board. Snap it to the wrapped
      // cell instead. (Body segments tween normally — only the head jumps.)
      const headPx = this.cellCenterPx(this.snake.body[0]);
      this.tweens.killTweensOf(this.segments[0]);
      this.segments[0].setPosition(headPx.x, headPx.y);
      if (this.headContainer) {
        this.tweens.killTweensOf(this.headContainer);
        this.headContainer.setPosition(headPx.x, headPx.y);
      }
    }

    this.collectPowerUpIfHere(newHead);

    if (willEat && this.food) {
      const baseGrant = { apple: 10, berry: 30, star: 50 }[this.food.kind];
      const grant = this.pu.isActive('double') ? baseGrant * 2 : baseGrant;
      this.score += grant;
      AudioManager.play(this.food.kind === 'apple' ? 'chomp' : this.food.kind === 'berry' ? 'pop' : 'chime');
      this.hud.setScore(this.score);
      const p = this.cellCenterPx(this.food.cell);
      const foodColor = ({apple:THEME.colors.apple, berry:THEME.colors.berry, star:THEME.colors.star}[this.food.kind]);
      showScorePopup(this, p.x, p.y, `+${grant}!`, foodColor);
      sparkleAt(this, p.x, p.y, foodColor, 10);
      this.foodGfx?.destroy(); this.foodGfx = undefined; this.food = null;
      this.fruitsEaten++;
      const newLevel = levelForFruits(this.fruitsEaten);
      if (newLevel !== this.level) {
        this.level = newLevel;
        this.hud.setLevel(newLevel);
        this.currentTickMs = tickMsForLevel(newLevel);
        this.startTickLoop();
        showLevelBanner(this, newLevel);
        AudioManager.play('level-up');
        const desired = obstacleCountForLevel(newLevel);
        if (desired > this.obstacles.length) this.addObstacles(desired);
      }
      this.spawnFood();
      this.maybeDropPowerUp();
    }

    // Apply slow-mo by scaling next interval (drain in the next tick reads this back)
    if (this.tickEvent) {
      const newDelay = this.pu.isActive('slowmo') ? this.currentTickMs * CONFIG.powerUps.slowmoFactor : this.currentTickMs;
      this.tickEvent.reset({ delay: newDelay, loop: true, callback: () => this.tick(), callbackScope: this });
    }
  }

  private loseLife() {
    AudioManager.play('oof');
    this.lives--;
    this.hud.setLives(this.lives);
    this.flow.send({ type: 'HIT', livesAfter: this.lives });
    // Flash snake red
    for (const seg of this.segments) {
      this.tweens.add({ targets: seg, fillColor: 0xff4d6d, duration: 80, yoyo: true, repeat: 1, onComplete: () => seg.setFillStyle(THEME.colors.snakeLight) });
    }
    if (this.lives <= 0) {
      this.tickEvent?.destroy();
      AudioManager.play('game-over');
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

  override update(_time: number, _delta: number) {
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
    if (this.headContainer) {
      const hp = this.cellCenterPx(body[0]);
      this.tweens.add({ targets: this.headContainer, x: hp.x, y: hp.y, duration: dur, ease: THEME.easings.snakeMove });
      this.updateHeadRotation();
    }
  }
}
