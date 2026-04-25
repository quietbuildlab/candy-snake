# Candy Snake Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Candy Snake — a polished, browser-based snake game for ages 9–12 with progression, lives, power-ups, and a Candy Pop visual style — per the spec at `docs/superpowers/specs/2026-04-25-candy-snake-design.md`.

**Architecture:** Vite + TypeScript + Phaser 3.90, deployed as a static site. Game logic lives in `src/game/` (engine-agnostic, unit-tested with Vitest). Phaser scenes in `src/scenes/` consume that logic and own visuals. Input adapters in `src/input/` emit a unified `DirectionChange` event. Single sources of truth: `config.ts` for numbers, `theme.ts` for colors/easings. XState is used narrowly for `GameFlowMachine` only: legal runtime flow transitions (`playing`, `paused`, life-loss substates, `gameOver`). Do **not** model per-tick movement, collision math, food spawning, tweens, or Phaser rendering in XState.

**Tech Stack:** Phaser 3.90, XState 5, Vite 5+, TypeScript 5+, Vitest for unit tests, Nunito (Google Fonts), CC0 audio assets.

---

## File map

| File | Responsibility |
|---|---|
| `index.html` | Vite entry, font preload, root `#game` div |
| `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts` | Tooling |
| `src/main.ts` | Phaser game config + bootstrap |
| `src/config.ts` | Numeric constants (grid, ticks, weights, durations) |
| `src/theme.ts` | Color tokens, fonts, easings |
| `src/types.ts` | Shared types |
| `src/storage.ts` | localStorage wrappers |
| `src/game/Grid.ts` | Cell ↔ pixel helpers, neighbor math |
| `src/game/Snake.ts` | Snake state, movement, collision tests, respawn placement |
| `src/game/Progression.ts` | Level → tickMs, obstacle count |
| `src/game/FoodSpawner.ts` | Weighted food picker, power-up drop logic |
| `src/game/PowerUps.ts` | Active power-up state machine |
| `src/game/GameFlowMachine.ts` | XState machine for GameScene runtime flow only |
| `src/scenes/BootScene.ts` | Asset loading |
| `src/scenes/MenuScene.ts` | Logo, Play, high score, sound toggle |
| `src/scenes/GameScene.ts` | Playfield orchestration |
| `src/scenes/PauseScene.ts` | Translucent overlay; owns ESC-to-resume |
| `src/scenes/GameOverScene.ts` | Modal final-score screen |
| `src/ui/HUD.ts` | Hearts, score, level, power-up timer ring |
| `src/ui/ScorePopup.ts` | Floating "+10!" tween |
| `src/ui/LevelBanner.ts` | "Level N" slide-in/out |
| `src/input/KeyboardInput.ts` | Arrow/WASD + buffered input rule |
| `src/input/SwipeInput.ts` | Touch swipe with min-distance |
| `src/audio/AudioManager.ts` | Gating, sound toggle, BGM, SFX dispatch |
| `tests/**` | Vitest unit tests for `src/game/*` and `src/storage.ts` |
| `public/audio/` | 8 audio files (CC0) |

---

## Task 1: Bootstrap Vite + TypeScript project

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `.gitignore`, `src/main.ts`
- Working dir: `/Users/ming/projects/snake-kids`

- [ ] **Step 1: Initialize git and create scaffold**

```bash
cd /Users/ming/projects/snake-kids
git init
```

Create `.gitignore`:
```
node_modules
dist
.DS_Store
.superpowers/brainstorm/
*.local
```

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "candy-snake",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "phaser": "^3.90.0",
    "xstate": "^5.20.1"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vite": "^5.4.0",
    "vitest": "^2.1.0",
    "@types/node": "^22.0.0"
  }
}
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitOverride": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client"],
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 4: Create `vite.config.ts` and `vitest.config.ts`**

`vite.config.ts`:
```ts
import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  resolve: { alias: { '@': '/src' } },
  build: { target: 'es2022' }
});
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
  resolve: { alias: { '@': '/src' } }
});
```

- [ ] **Step 5: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no" />
    <title>Candy Snake</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;800&display=swap" rel="stylesheet" />
    <style>
      html, body { margin: 0; padding: 0; height: 100%; background: linear-gradient(135deg,#ffe9f3 0%,#ffeede 50%,#e6f3ff 100%); font-family: 'Nunito', system-ui, sans-serif; overflow: hidden; }
      #game { width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; }
    </style>
  </head>
  <body>
    <div id="game"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 6: Create stub `src/main.ts`**

```ts
console.log('Candy Snake — bootstrapped');
```

- [ ] **Step 7: Install and verify**

```bash
npm install
npm run dev
```

Expected: Vite serves on http://localhost:5173, console logs the bootstrap message. Stop with Ctrl-C.

```bash
npm run test
```

Expected: "No test files found" (we have none yet — exit code 1 is fine).

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "chore: bootstrap vite + typescript + phaser project"
```

---

## Task 2: Add `types.ts`, `config.ts`, `theme.ts`

**Files:**
- Create: `src/types.ts`, `src/config.ts`, `src/theme.ts`

- [ ] **Step 1: Create `src/types.ts`**

```ts
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
```

- [ ] **Step 2: Create `src/config.ts`**

```ts
export const CONFIG = {
  grid: { cols: 20, rows: 20, cellPx: 28 },
  snake: {
    initialLength: 3,
    maxLength: 20,
    initialDirection: 'right' as const,
    initialHeadCol: 4,
    initialHeadRow: 10,
    respawnInvulnerabilityMs: 1200,
    respawnPauseMs: 600
  },
  ticks: {
    initialMs: 180,
    perLevelDelta: 12,
    floorMs: 70,
    fruitsPerLevel: 5
  },
  food: {
    weights: { apple: 0.80, berry: 0.15, star: 0.05 } as const,
    berryLifetimeMs: 6000,
    starLifetimeMs: 4000,
    apple: { score: 10, grows: true },
    berry: { score: 30, grows: true },
    star: { score: 50, grows: false }
  },
  obstacles: {
    schedule: [4, 6, 8, 10] as const,
    max: 4
  },
  powerUps: {
    dropChance: 0.10,
    iconLifetimeMs: 8000,
    slowmoMs: 5000, slowmoFactor: 1.6,
    ghostMs: 4000,
    doubleMs: 8000
  },
  lives: { start: 3 },
  audio: { bgmVolume: 0.5, bgmDuckedVolume: 0.15 },
  swipe: { minDistancePx: 25 },
  responsive: { breakpointPx: 768, mobileMaxCardPx: 480, mobileMargin: 32 }
} as const;
```

- [ ] **Step 3: Create `src/theme.ts`**

```ts
export const THEME = {
  colors: {
    bgGradientStart: 0xffe9f3,
    bgGradientEnd: 0xe6f3ff,
    surface: 0xfffbf7,
    snakeDark: 0x3ecf8e,
    snakeLight: 0x7be495,
    apple: 0xff4d6d,
    appleLight: 0xff7a8a,
    berry: 0xa855f7,
    berryLight: 0xc084fc,
    star: 0xfbbf24,
    starLight: 0xfde68a,
    obstacle: 0xfbbf24,
    accentPurple: 0x7a5cff,
    text: 0x1a1a1a,
    blush: 0xff4d6d
  },
  font: {
    family: '"Nunito", system-ui, sans-serif',
    weightHud: 800,
    weightButton: 600,
    weightBody: 400
  },
  easings: {
    snakeMove: 'Cubic.easeOut',
    foodPop: 'Back.easeOut',
    bannerSlide: 'Quart.easeOut'
  }
} as const;
```

- [ ] **Step 4: Commit**

```bash
git add src/types.ts src/config.ts src/theme.ts
git commit -m "feat: add types, config, and theme tokens"
```

---

## Task 3: `storage.ts` with tests

**Files:**
- Create: `src/storage.ts`, `tests/storage.test.ts`

- [ ] **Step 1: Write failing tests at `tests/storage.test.ts`**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadHighScore, saveHighScore, loadSoundOn, saveSoundOn } from '../src/storage';

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(k: string) { return this.store.get(k) ?? null; }
  setItem(k: string, v: string) { this.store.set(k, v); }
  removeItem(k: string) { this.store.delete(k); }
  clear() { this.store.clear(); }
  key(_: number) { return null; }
  get length() { return this.store.size; }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', new MemoryStorage());
});

describe('high score', () => {
  it('returns 0 when missing', () => {
    expect(loadHighScore()).toBe(0);
  });
  it('round-trips a value', () => {
    saveHighScore(420);
    expect(loadHighScore()).toBe(420);
  });
  it('returns 0 for non-numeric corruption', () => {
    localStorage.setItem('candy-snake:high-score', 'banana');
    expect(loadHighScore()).toBe(0);
  });
});

describe('sound on', () => {
  it('defaults to true when missing', () => {
    expect(loadSoundOn()).toBe(true);
  });
  it('round-trips false', () => {
    saveSoundOn(false);
    expect(loadSoundOn()).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests; expect FAIL**

```bash
npm run test
```

Expected: failure — module not found.

- [ ] **Step 3: Implement `src/storage.ts`**

```ts
const KEY_HIGH_SCORE = 'candy-snake:high-score';
const KEY_SOUND_ON = 'candy-snake:sound-on';

export function loadHighScore(): number {
  try {
    const raw = localStorage.getItem(KEY_HIGH_SCORE);
    if (raw == null) return 0;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  } catch { return 0; }
}

export function saveHighScore(score: number): void {
  try { localStorage.setItem(KEY_HIGH_SCORE, String(Math.floor(score))); } catch {}
}

export function loadSoundOn(): boolean {
  try {
    const raw = localStorage.getItem(KEY_SOUND_ON);
    if (raw == null) return true;
    return raw === 'true';
  } catch { return true; }
}

export function saveSoundOn(on: boolean): void {
  try { localStorage.setItem(KEY_SOUND_ON, on ? 'true' : 'false'); } catch {}
}
```

- [ ] **Step 4: Run tests; expect PASS**

```bash
npm run test
```

- [ ] **Step 5: Commit**

```bash
git add src/storage.ts tests/storage.test.ts
git commit -m "feat: add localStorage wrappers for high score and sound preference"
```

---

## Task 4: `Grid.ts` with tests

**Files:**
- Create: `src/game/Grid.ts`, `tests/Grid.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { Grid } from '../src/game/Grid';

describe('Grid', () => {
  const g = new Grid(20, 20, 28);
  it('cellToPixel returns the cell center', () => {
    expect(g.cellToPixel({ x: 0, y: 0 })).toEqual({ x: 14, y: 14 });
    expect(g.cellToPixel({ x: 10, y: 10 })).toEqual({ x: 294, y: 294 });
  });
  it('inBounds rejects out-of-range cells', () => {
    expect(g.inBounds({ x: 0, y: 0 })).toBe(true);
    expect(g.inBounds({ x: 19, y: 19 })).toBe(true);
    expect(g.inBounds({ x: -1, y: 5 })).toBe(false);
    expect(g.inBounds({ x: 20, y: 5 })).toBe(false);
  });
  it('wrap brings out-of-bounds cells back inside', () => {
    expect(g.wrap({ x: -1, y: 5 })).toEqual({ x: 19, y: 5 });
    expect(g.wrap({ x: 20, y: 5 })).toEqual({ x: 0, y: 5 });
    expect(g.wrap({ x: 5, y: -1 })).toEqual({ x: 5, y: 19 });
  });
  it('cellsEqual compares by coords', () => {
    expect(Grid.cellsEqual({ x: 1, y: 2 }, { x: 1, y: 2 })).toBe(true);
    expect(Grid.cellsEqual({ x: 1, y: 2 }, { x: 2, y: 1 })).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests; expect FAIL**

```bash
npm run test
```

- [ ] **Step 3: Implement `src/game/Grid.ts`**

```ts
import type { Cell } from '../types';

export class Grid {
  constructor(public readonly cols: number, public readonly rows: number, public readonly cellPx: number) {}
  get widthPx(): number { return this.cols * this.cellPx; }
  get heightPx(): number { return this.rows * this.cellPx; }
  cellToPixel(c: Cell): { x: number; y: number } {
    return { x: c.x * this.cellPx + this.cellPx / 2, y: c.y * this.cellPx + this.cellPx / 2 };
  }
  inBounds(c: Cell): boolean { return c.x >= 0 && c.x < this.cols && c.y >= 0 && c.y < this.rows; }
  wrap(c: Cell): Cell { return { x: ((c.x % this.cols) + this.cols) % this.cols, y: ((c.y % this.rows) + this.rows) % this.rows }; }
  static cellsEqual(a: Cell, b: Cell): boolean { return a.x === b.x && a.y === b.y; }
}
```

- [ ] **Step 4: Run tests; expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/game/Grid.ts tests/Grid.test.ts
git commit -m "feat: add Grid helper with bounds, wrap, and pixel mapping"
```

---

## Task 5: `Snake.ts` — basic state and movement

**Files:**
- Create: `src/game/Snake.ts`, `tests/Snake-movement.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { Snake } from '../src/game/Snake';

describe('Snake movement', () => {
  it('starts with initial length facing right at given head', () => {
    const s = new Snake({ x: 4, y: 10 }, 'right', 3);
    expect(s.length).toBe(3);
    expect(s.head).toEqual({ x: 4, y: 10 });
    expect(s.direction).toBe('right');
    expect(s.body).toEqual([
      { x: 4, y: 10 }, { x: 3, y: 10 }, { x: 2, y: 10 }
    ]);
  });
  it('advances head one cell in current direction without growing', () => {
    const s = new Snake({ x: 4, y: 10 }, 'right', 3);
    s.advance({ grow: false });
    expect(s.head).toEqual({ x: 5, y: 10 });
    expect(s.length).toBe(3);
    expect(s.body[s.body.length - 1]).toEqual({ x: 3, y: 10 });
  });
  it('advance with grow=true increases length by 1', () => {
    const s = new Snake({ x: 4, y: 10 }, 'right', 3);
    s.advance({ grow: true });
    expect(s.length).toBe(4);
  });
  it('setDirection rejects 180° reversal', () => {
    const s = new Snake({ x: 4, y: 10 }, 'right', 3);
    expect(s.setDirection('left')).toBe(false);
    expect(s.direction).toBe('right');
    expect(s.setDirection('up')).toBe(true);
    expect(s.direction).toBe('up');
  });
});
```

- [ ] **Step 2: Run tests; expect FAIL**

- [ ] **Step 3: Implement `src/game/Snake.ts`**

```ts
import { Direction, Cell, OPPOSITE, DIR_VECTORS } from '../types';

export class Snake {
  body: Cell[];
  direction: Direction;
  constructor(headStart: Cell, dir: Direction, length: number) {
    this.direction = dir;
    const back = OPPOSITE[dir];
    const v = DIR_VECTORS[back];
    this.body = [];
    for (let i = 0; i < length; i++) {
      this.body.push({ x: headStart.x + v.x * i, y: headStart.y + v.y * i });
    }
  }
  get head(): Cell { return this.body[0]; }
  get length(): number { return this.body.length; }
  setDirection(next: Direction): boolean {
    if (next === OPPOSITE[this.direction]) return false;
    this.direction = next;
    return true;
  }
  advance(opts: { grow: boolean }): void {
    const v = DIR_VECTORS[this.direction];
    const newHead = { x: this.head.x + v.x, y: this.head.y + v.y };
    this.body.unshift(newHead);
    if (!opts.grow) this.body.pop();
  }
}
```

- [ ] **Step 4: Run tests; expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/game/Snake.ts tests/Snake-movement.test.ts
git commit -m "feat(snake): add state, advance, and direction guard"
```

---

## Task 6: Snake collision tests + max-length cap

**Files:**
- Modify: `src/game/Snake.ts`
- Create: `tests/Snake-collisions.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { Snake } from '../src/game/Snake';

describe('Snake collisions and growth cap', () => {
  it('hitsSelf detects head occupying any non-head body cell', () => {
    const s = new Snake({ x: 4, y: 10 }, 'right', 4);
    expect(s.hitsSelf()).toBe(false);
    // Force head onto a body cell
    s.body[0] = { x: 3, y: 10 };
    expect(s.hitsSelf()).toBe(true);
  });
  it('grow caps at maxLength=20', () => {
    const s = new Snake({ x: 0, y: 0 }, 'right', 19);
    s.advance({ grow: true, maxLength: 20 });
    expect(s.length).toBe(20);
    s.advance({ grow: true, maxLength: 20 });
    expect(s.length).toBe(20); // capped
  });
});
```

- [ ] **Step 2: Run tests; expect FAIL**

- [ ] **Step 3: Update `src/game/Snake.ts`**

Replace the `advance` method and add `hitsSelf`:

```ts
  advance(opts: { grow: boolean; maxLength?: number }): void {
    const v = DIR_VECTORS[this.direction];
    const newHead = { x: this.head.x + v.x, y: this.head.y + v.y };
    this.body.unshift(newHead);
    const cap = opts.maxLength ?? Infinity;
    const shouldGrow = opts.grow && this.body.length <= cap;
    if (!shouldGrow) this.body.pop();
  }
  hitsSelf(): boolean {
    const h = this.head;
    for (let i = 1; i < this.body.length; i++) {
      if (this.body[i].x === h.x && this.body[i].y === h.y) return true;
    }
    return false;
  }
```

Note: when `grow=true` but at cap, we still pop the tail (no net growth). When `grow=false`, always pop.

- [ ] **Step 4: Run tests; expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/game/Snake.ts tests/Snake-collisions.test.ts
git commit -m "feat(snake): add hitsSelf and max-length cap on growth"
```

---

## Task 7: Snake respawn placement

**Files:**
- Modify: `src/game/Snake.ts`
- Create: `tests/Snake-respawn.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { findRespawnPlacement } from '../src/game/Snake';

const grid = { cols: 20, rows: 20 };
const empty = new Set<string>(); // no obstacles, no food

function blocked(cells: Array<{x:number;y:number}>): Set<string> {
  return new Set(cells.map(c => `${c.x},${c.y}`));
}

describe('findRespawnPlacement', () => {
  it('places horizontally on center row when free', () => {
    const r = findRespawnPlacement(grid, 5, empty)!;
    expect(r.direction).toBe('right');
    expect(r.body.length).toBe(5);
    // head at center column area, on row 10
    expect(r.body[0].y).toBe(10);
    // body extends to the left of head
    for (let i = 1; i < r.body.length; i++) {
      expect(r.body[i].y).toBe(10);
      expect(r.body[i].x).toBe(r.body[0].x - i);
    }
  });
  it('falls back to vertical center column when row 10 blocked', () => {
    const cells: {x:number;y:number}[] = [];
    for (let x = 0; x < 20; x++) cells.push({ x, y: 10 });
    const r = findRespawnPlacement(grid, 5, blocked(cells))!;
    expect(r.direction).toBe('down');
    expect(r.body[0].x).toBe(10);
  });
  it('scans grid when both centers blocked', () => {
    const cells: {x:number;y:number}[] = [];
    for (let x = 0; x < 20; x++) cells.push({ x, y: 10 });
    for (let y = 0; y < 20; y++) cells.push({ x: 10, y });
    const r = findRespawnPlacement(grid, 5, blocked(cells));
    expect(r).not.toBeNull();
    // Sanity: none of the placed cells are blocked
    for (const c of r!.body) {
      expect(blocked(cells).has(`${c.x},${c.y}`)).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Run tests; expect FAIL**

- [ ] **Step 3: Add `findRespawnPlacement` export to `src/game/Snake.ts`**

Append to the file:

```ts
export interface RespawnResult { body: Cell[]; direction: Direction }

export function findRespawnPlacement(
  grid: { cols: number; rows: number },
  length: number,
  blocked: Set<string>
): RespawnResult | null {
  const isFree = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < grid.cols && y < grid.rows && !blocked.has(`${x},${y}`);

  const tryHorizontal = (row: number, length: number): RespawnResult | null => {
    // Try every starting column where snake fits within bounds
    for (let startCol = grid.cols - length; startCol >= 0; startCol--) {
      const cells: Cell[] = [];
      let ok = true;
      for (let i = 0; i < length; i++) {
        const x = startCol + (length - 1) - i; // head is rightmost
        if (!isFree(x, row)) { ok = false; break; }
        cells.push({ x, y: row });
      }
      if (ok) return { body: cells, direction: 'right' };
    }
    return null;
  };

  const tryVertical = (col: number, length: number): RespawnResult | null => {
    for (let startRow = 0; startRow + length <= grid.rows; startRow++) {
      const cells: Cell[] = [];
      let ok = true;
      for (let i = 0; i < length; i++) {
        const y = startRow + (length - 1) - i; // head is bottom
        if (!isFree(col, y)) { ok = false; break; }
        cells.push({ x: col, y });
      }
      if (ok) return { body: cells, direction: 'down' };
    }
    return null;
  };

  // 1. Center row (y=10) horizontal
  let r = tryHorizontal(10, length);
  if (r) return r;
  // 2. Center column (x=10) vertical
  r = tryVertical(10, length);
  if (r) return r;
  // 3. Scan all rows then all columns at requested length
  for (let y = 0; y < grid.rows; y++) {
    r = tryHorizontal(y, length);
    if (r) return r;
  }
  for (let x = 0; x < grid.cols; x++) {
    r = tryVertical(x, length);
    if (r) return r;
  }
  // 4. Defensive trim (unreachable under current rules)
  for (let trimmed = length - 1; trimmed >= 3; trimmed--) {
    r = tryHorizontal(10, trimmed) ?? tryVertical(10, trimmed);
    if (r) return r;
    for (let y = 0; y < grid.rows; y++) { r = tryHorizontal(y, trimmed); if (r) return r; }
    for (let x = 0; x < grid.cols; x++) { r = tryVertical(x, trimmed); if (r) return r; }
  }
  return null;
}
```

- [ ] **Step 4: Run tests; expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/game/Snake.ts tests/Snake-respawn.test.ts
git commit -m "feat(snake): add deterministic respawn placement with center-first fallback"
```

---

## Task 8: `Progression.ts` with tests

**Files:**
- Create: `src/game/Progression.ts`, `tests/Progression.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
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
```

- [ ] **Step 2: Run tests; expect FAIL**

- [ ] **Step 3: Implement `src/game/Progression.ts`**

```ts
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
```

- [ ] **Step 4: Run tests; expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/game/Progression.ts tests/Progression.test.ts
git commit -m "feat(progression): add level, tickMs, and obstacle-count curves"
```

---

## Task 9: `FoodSpawner.ts` — weighted picker and power-up drops

**Files:**
- Create: `src/game/FoodSpawner.ts`, `tests/FoodSpawner.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
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
```

- [ ] **Step 2: Run tests; expect FAIL**

- [ ] **Step 3: Implement `src/game/FoodSpawner.ts`**

```ts
import { CONFIG } from '../config';
import type { FoodKind, Cell } from '../types';

export function pickFoodKind(rng: () => number): FoodKind {
  const r = rng();
  const w = CONFIG.food.weights;
  if (r < w.apple) return 'apple';
  if (r < w.apple + w.berry) return 'berry';
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
```

- [ ] **Step 4: Run tests; expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/game/FoodSpawner.ts tests/FoodSpawner.test.ts
git commit -m "feat(food): add weighted picker, drop roll, and empty-cell finder"
```

---

## Task 10: `PowerUps.ts` — active state machine

**Files:**
- Create: `src/game/PowerUps.ts`, `tests/PowerUps.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { PowerUpController } from '../src/game/PowerUps';

describe('PowerUpController', () => {
  it('starts with no active effect', () => {
    const c = new PowerUpController();
    expect(c.active).toBeNull();
  });
  it('activate sets kind and remaining ms', () => {
    const c = new PowerUpController();
    c.activate('slowmo');
    expect(c.active?.kind).toBe('slowmo');
    expect(c.active?.remainingMs).toBe(5000);
  });
  it('tick decrements remaining and clears when zero', () => {
    const c = new PowerUpController();
    c.activate('ghost'); // 4000 ms
    c.tick(3500);
    expect(c.active?.remainingMs).toBe(500);
    c.tick(500);
    expect(c.active).toBeNull();
  });
  it('activate replaces previous power-up', () => {
    const c = new PowerUpController();
    c.activate('slowmo');
    c.activate('double');
    expect(c.active?.kind).toBe('double');
    expect(c.active?.remainingMs).toBe(8000);
  });
  it('isActive(kind) returns true only for the current kind', () => {
    const c = new PowerUpController();
    c.activate('ghost');
    expect(c.isActive('ghost')).toBe(true);
    expect(c.isActive('slowmo')).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests; expect FAIL**

- [ ] **Step 3: Implement `src/game/PowerUps.ts`**

```ts
import { CONFIG } from '../config';
import type { PowerUpKind } from '../types';

interface Active { kind: PowerUpKind; remainingMs: number }
const DURATIONS: Record<PowerUpKind, number> = {
  slowmo: CONFIG.powerUps.slowmoMs,
  ghost: CONFIG.powerUps.ghostMs,
  double: CONFIG.powerUps.doubleMs
};

export class PowerUpController {
  active: Active | null = null;
  activate(kind: PowerUpKind): void {
    this.active = { kind, remainingMs: DURATIONS[kind] };
  }
  tick(deltaMs: number): void {
    if (!this.active) return;
    this.active.remainingMs -= deltaMs;
    if (this.active.remainingMs <= 0) this.active = null;
  }
  isActive(kind: PowerUpKind): boolean {
    return this.active?.kind === kind;
  }
}
```

- [ ] **Step 4: Run tests; expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/game/PowerUps.ts tests/PowerUps.test.ts
git commit -m "feat(powerups): add active power-up state machine"
```

---

## Task 10.5: `GameFlowMachine.ts` — XState runtime flow

**Files:**
- Create: `src/game/GameFlowMachine.ts`, `tests/GameFlowMachine.test.ts`

This machine owns only high-level GameScene flow. It does **not** move the snake, compute collisions, spawn food, manage Phaser timers, or render anything. Phaser still owns time/tweens/scenes; the machine prevents illegal flow transitions like resuming during a life-loss flash or treating invulnerability as normal collision handling.

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { createActor } from 'xstate';
import { gameFlowMachine } from '../src/game/GameFlowMachine';

describe('GameFlowMachine', () => {
  it('starts playing and can pause/resume', () => {
    const actor = createActor(gameFlowMachine).start();
    expect(actor.getSnapshot().matches({ active: 'playing' })).toBe(true);
    actor.send({ type: 'PAUSE' });
    expect(actor.getSnapshot().matches('paused')).toBe(true);
    actor.send({ type: 'RESUME' });
    expect(actor.getSnapshot().matches({ active: 'playing' })).toBe(true);
  });

  it('runs the non-final hit flow through invulnerability back to playing', () => {
    const actor = createActor(gameFlowMachine).start();
    actor.send({ type: 'HIT', livesAfter: 2 });
    expect(actor.getSnapshot().matches({ active: { lifeLost: 'flash' } })).toBe(true);
    actor.send({ type: 'FLASH_DONE' });
    expect(actor.getSnapshot().matches({ active: { lifeLost: 'respawnDelay' } })).toBe(true);
    actor.send({ type: 'RESPAWN_DONE' });
    expect(actor.getSnapshot().matches({ active: { lifeLost: 'invulnerable' } })).toBe(true);
    actor.send({ type: 'INVULNERABLE_DONE' });
    expect(actor.getSnapshot().matches({ active: 'playing' })).toBe(true);
  });

  it('goes directly to gameOver when a hit consumes the final life', () => {
    const actor = createActor(gameFlowMachine).start();
    actor.send({ type: 'HIT', livesAfter: 0 });
    expect(actor.getSnapshot().matches('gameOver')).toBe(true);
  });

  it('ignores extra hits during invulnerability', () => {
    const actor = createActor(gameFlowMachine).start();
    actor.send({ type: 'HIT', livesAfter: 2 });
    actor.send({ type: 'FLASH_DONE' });
    actor.send({ type: 'RESPAWN_DONE' });
    actor.send({ type: 'HIT', livesAfter: 1 });
    expect(actor.getSnapshot().matches({ active: { lifeLost: 'invulnerable' } })).toBe(true);
  });

  it('pauses and resumes back to the life-loss substate it came from', () => {
    const actor = createActor(gameFlowMachine).start();
    actor.send({ type: 'HIT', livesAfter: 2 });
    actor.send({ type: 'FLASH_DONE' });
    actor.send({ type: 'PAUSE' });
    expect(actor.getSnapshot().matches('paused')).toBe(true);
    actor.send({ type: 'RESUME' });
    expect(actor.getSnapshot().matches({ active: { lifeLost: 'respawnDelay' } })).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests; expect FAIL**

- [ ] **Step 3: Implement `src/game/GameFlowMachine.ts`**

```ts
import { createMachine } from 'xstate';

export type GameFlowEvent =
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'HIT'; livesAfter: number }
  | { type: 'FLASH_DONE' }
  | { type: 'RESPAWN_DONE' }
  | { type: 'INVULNERABLE_DONE' }
  | { type: 'GAME_OVER' };

export const gameFlowMachine = createMachine({
  id: 'gameFlow',
  types: {} as { events: GameFlowEvent },
  initial: 'active',
  states: {
    active: {
      initial: 'playing',
      states: {
        hist: { type: 'history' },
        playing: {
          on: {
            HIT: [
              { guard: ({ event }) => event.livesAfter <= 0, target: '#gameFlow.gameOver' },
              { target: 'lifeLost.flash' }
            ]
          }
        },
        lifeLost: {
          initial: 'flash',
          states: {
            flash: {
              on: { FLASH_DONE: 'respawnDelay' }
            },
            respawnDelay: {
              on: { RESPAWN_DONE: 'invulnerable' }
            },
            invulnerable: {
              on: {
                HIT: { target: 'invulnerable' },
                INVULNERABLE_DONE: '#gameFlow.active.playing'
              }
            }
          }
        }
      },
      on: {
        PAUSE: '#gameFlow.paused',
        GAME_OVER: '#gameFlow.gameOver'
      }
    },
    paused: {
      on: {
        RESUME: '#gameFlow.active.hist',
        GAME_OVER: '#gameFlow.gameOver'
      }
    },
    gameOver: {
      type: 'final'
    }
  }
});
```

- [ ] **Step 4: Run tests; expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/game/GameFlowMachine.ts tests/GameFlowMachine.test.ts
git commit -m "feat(flow): add XState game flow machine"
```

---

## Task 11: `KeyboardInput.ts` — buffered direction with second-order rule

**Files:**
- Create: `src/input/KeyboardInput.ts`, `tests/KeyboardInput-buffer.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { DirectionBuffer } from '../src/input/KeyboardInput';

describe('DirectionBuffer', () => {
  it('queues last valid input', () => {
    const b = new DirectionBuffer('right');
    b.tryQueue('up');
    expect(b.consume()).toBe('up');
  });
  it('rejects 180° vs current when no buffered direction', () => {
    const b = new DirectionBuffer('right');
    b.tryQueue('left');
    expect(b.consume()).toBe('right');
  });
  it('rejects 180° vs already-buffered direction', () => {
    const b = new DirectionBuffer('right');
    b.tryQueue('up');     // valid
    b.tryQueue('down');   // 180° vs buffered up → rejected
    expect(b.consume()).toBe('up');
  });
  it('consume advances current and clears buffer', () => {
    const b = new DirectionBuffer('right');
    b.tryQueue('up');
    expect(b.consume()).toBe('up');
    expect(b.consume()).toBe('up'); // current is now 'up'
    b.tryQueue('down'); // 180° vs current → rejected
    expect(b.consume()).toBe('up');
  });
});
```

- [ ] **Step 2: Run tests; expect FAIL**

- [ ] **Step 3: Implement `src/input/KeyboardInput.ts` (buffer only for now)**

```ts
import { Direction, OPPOSITE } from '../types';

export class DirectionBuffer {
  private current: Direction;
  private buffered: Direction | null = null;
  constructor(initial: Direction) { this.current = initial; }
  tryQueue(d: Direction): boolean {
    const compareAgainst = this.buffered ?? this.current;
    if (d === OPPOSITE[compareAgainst]) return false;
    this.buffered = d;
    return true;
  }
  consume(): Direction {
    if (this.buffered) { this.current = this.buffered; this.buffered = null; }
    return this.current;
  }
  peekCurrent(): Direction { return this.current; }
}
```

- [ ] **Step 4: Run tests; expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/input/KeyboardInput.ts tests/KeyboardInput-buffer.test.ts
git commit -m "feat(input): add buffered direction with second-order reversal guard"
```

---

## Task 12: Phaser bootstrap + BootScene + MenuScene skeleton

**Files:**
- Modify: `src/main.ts`
- Create: `src/scenes/BootScene.ts`, `src/scenes/MenuScene.ts`

- [ ] **Step 1: Replace `src/main.ts`**

```ts
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { PauseScene } from './scenes/PauseScene';
import { GameOverScene } from './scenes/GameOverScene';
import { CONFIG } from './config';

const cardW = CONFIG.grid.cols * CONFIG.grid.cellPx;
const cardH = CONFIG.grid.rows * CONFIG.grid.cellPx;

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: cardW + 80,
  height: cardH + 160,
  backgroundColor: '#ffeede',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BootScene, MenuScene, GameScene, PauseScene, GameOverScene]
});
```

- [ ] **Step 2: Create `src/scenes/BootScene.ts`**

```ts
import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }
  preload() {
    // Audio assets are loaded here in a later task
  }
  create() {
    // Wait one frame, then go to Menu
    this.time.delayedCall(50, () => this.scene.start('MenuScene'));
  }
}
```

- [ ] **Step 3: Create `src/scenes/MenuScene.ts` (skeleton)**

```ts
import Phaser from 'phaser';
import { THEME } from '../theme';
import { loadHighScore } from '../storage';

export class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }
  create() {
    const { width, height } = this.scale;
    this.add.text(width / 2, height / 2 - 80, 'Candy Snake', {
      fontFamily: THEME.font.family, fontSize: '56px', fontStyle: '800',
      color: '#7a5cff'
    }).setOrigin(0.5);

    const hs = loadHighScore();
    this.add.text(width / 2, height / 2 - 20,
      hs > 0 ? `Best: ${hs}` : 'Press Space to play',
      { fontFamily: THEME.font.family, fontSize: '20px', color: '#6b6b8a' })
      .setOrigin(0.5);

    const playBtn = this.add.text(width / 2, height / 2 + 60, '▶  PLAY', {
      fontFamily: THEME.font.family, fontSize: '32px', fontStyle: '800',
      color: '#ffffff', backgroundColor: '#3ecf8e',
      padding: { x: 32, y: 12 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    playBtn.on('pointerdown', () => this.scene.start('GameScene'));
    this.input.keyboard?.on('keydown-SPACE', () => this.scene.start('GameScene'));
  }
}
```

- [ ] **Step 4: Create empty stub scenes (will fill in later tasks):**

`src/scenes/GameScene.ts`:
```ts
import Phaser from 'phaser';
export class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }
  create() {
    this.add.text(20, 20, 'GameScene (stub)', { color: '#000' });
  }
}
```

`src/scenes/PauseScene.ts`:
```ts
import Phaser from 'phaser';
export class PauseScene extends Phaser.Scene {
  constructor() { super('PauseScene'); }
}
```

`src/scenes/GameOverScene.ts`:
```ts
import Phaser from 'phaser';
export class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOverScene'); }
}
```

- [ ] **Step 5: Verify in browser**

```bash
npm run dev
```

Expected: visit http://localhost:5173 — Candy Snake title and PLAY button render. Click or press Space → GameScene stub appears.

- [ ] **Step 6: Commit**

```bash
git add src/main.ts src/scenes
git commit -m "feat(scenes): bootstrap phaser game with boot, menu, and stub scenes"
```

---

## Task 13: GameScene — render grid + snake at start

**Files:**
- Modify: `src/scenes/GameScene.ts`

- [ ] **Step 1: Implement initial GameScene**

Replace `src/scenes/GameScene.ts`:

```ts
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
```

- [ ] **Step 2: Verify in browser**

```bash
npm run dev
```

Expected: rounded cream play card appears, dotted with subtle purple. A 3-segment green snake sits horizontally near the left, head with two black eye dots.

- [ ] **Step 3: Commit**

```bash
git add src/scenes/GameScene.ts
git commit -m "feat(game): render play card and initial snake"
```

---

## Task 14: GameScene — tick movement with smooth tween

**Files:**
- Modify: `src/scenes/GameScene.ts`

- [ ] **Step 1: Add tick loop and tween-based rendering**

In `GameScene`, replace `renderSnake()` with a per-segment Phaser image approach so we can tween. Replace the relevant parts of the file:

Add fields:
```ts
  private segments: Phaser.GameObjects.Arc[] = [];
  private tickEvent?: Phaser.Time.TimerEvent;
  private currentTickMs = CONFIG.ticks.initialMs;
```

Replace `create()` with:
```ts
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
    this.startTickLoop();
  }
```

Replace/add methods:
```ts
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
```

- [ ] **Step 2: Verify in browser**

```bash
npm run dev
```

Expected: snake glides to the right one cell every ~180ms until it hits the wall (no game-over yet — that comes in a later task — it'll just go off-screen).

- [ ] **Step 3: Commit**

```bash
git add src/scenes/GameScene.ts
git commit -m "feat(game): tick-based movement with smooth segment tween"
```

---

## Task 15: GameScene — keyboard input and direction buffer

**Files:**
- Modify: `src/scenes/GameScene.ts`, `src/input/KeyboardInput.ts`

- [ ] **Step 1: Extend `src/input/KeyboardInput.ts` to wire to a Phaser scene**

Append:

```ts
export type DirEventListener = (d: Direction) => void;

export class KeyboardInput {
  private buffer: DirectionBuffer;
  constructor(private scene: Phaser.Scene, initial: Direction) {
    this.buffer = new DirectionBuffer(initial);
    const kb = scene.input.keyboard!;
    const map: Array<[string, Direction]> = [
      ['UP', 'up'], ['W', 'up'],
      ['DOWN', 'down'], ['S', 'down'],
      ['LEFT', 'left'], ['A', 'left'],
      ['RIGHT', 'right'], ['D', 'right']
    ];
    for (const [key, dir] of map) {
      kb.on(`keydown-${key}`, () => this.buffer.tryQueue(dir));
    }
  }
  consumeDirection(): Direction { return this.buffer.consume(); }
  setCurrent(_: Direction): void { /* not needed; buffer tracks via consume */ }
}
```

Add the import at top:
```ts
import Phaser from 'phaser';
```

- [ ] **Step 2: Wire it into `GameScene.tick()`**

Add field:
```ts
  private input2!: import('../input/KeyboardInput').KeyboardInput;
```

In `create()`, after `spawnSegments()`:
```ts
    const { KeyboardInput } = await import('../input/KeyboardInput');
    this.input2 = new KeyboardInput(this, this.snake.direction);
```

(Or import statically at top — static is simpler. Use the static form:)

At top:
```ts
import { KeyboardInput } from '../input/KeyboardInput';
```

In `create()`:
```ts
    this.input2 = new KeyboardInput(this, this.snake.direction);
```

In `tick()`, before `advance`:
```ts
    const nextDir = this.input2.consumeDirection();
    this.snake.setDirection(nextDir);
```

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```

Expected: arrow keys / WASD steer the snake. Pressing the opposite direction is rejected (the snake doesn't reverse into itself).

- [ ] **Step 4: Commit**

```bash
git add src/input/KeyboardInput.ts src/scenes/GameScene.ts
git commit -m "feat(input): wire keyboard input with buffered direction into game"
```

---

## Task 16: Food — render apple, eat, grow, score popup

**Files:**
- Create: `src/ui/ScorePopup.ts`
- Modify: `src/scenes/GameScene.ts`

- [ ] **Step 1: Create `src/ui/ScorePopup.ts`**

```ts
import Phaser from 'phaser';
import { THEME } from '../theme';

export function showScorePopup(scene: Phaser.Scene, x: number, y: number, text: string, color: number = THEME.colors.apple) {
  const t = scene.add.text(x, y, text, {
    fontFamily: THEME.font.family, fontSize: '20px', fontStyle: '800',
    color: '#' + color.toString(16).padStart(6, '0')
  }).setOrigin(0.5);
  scene.tweens.add({ targets: t, y: y - 36, alpha: 0, duration: 700, onComplete: () => t.destroy() });
}
```

- [ ] **Step 2: Add food state and rendering to `GameScene`**

Add imports at top:
```ts
import { pickFoodKind, findEmptyCell } from '../game/FoodSpawner';
import { showScorePopup } from '../ui/ScorePopup';
import type { FoodKind } from '../types';
```

Add fields:
```ts
  private food: { cell: Cell; kind: FoodKind; spawnedAt: number } | null = null;
  private foodGfx?: Phaser.GameObjects.Container;
  private score = 0;
  private rng = () => Math.random();
```

Add helpers:
```ts
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
```

Initialize in `create()` after `this.input2 = ...`:
```ts
    this.spawnFood();
```

Update `tick()` to handle eating:
```ts
  private tick() {
    const nextDir = this.input2.consumeDirection();
    this.snake.setDirection(nextDir);
    // Compute proposed head
    const willEat = this.food && (() => {
      const v = { up: {x:0,y:-1}, down: {x:0,y:1}, left: {x:-1,y:0}, right: {x:1,y:0} }[this.snake.direction];
      const nh = { x: this.snake.head.x + v.x, y: this.snake.head.y + v.y };
      return Grid.cellsEqual(nh, this.food.cell);
    })();
    this.snake.advance({ grow: !!willEat, maxLength: CONFIG.snake.maxLength });
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
```

- [ ] **Step 3: Verify in browser**

Steer the snake into the food. Snake grows; popup floats; new food spawns elsewhere.

- [ ] **Step 4: Commit**

```bash
git add src/ui/ScorePopup.ts src/scenes/GameScene.ts
git commit -m "feat(food): spawn, render, eat, grow, and score popup"
```

---

## Task 17: Berry/star timed lifetimes + revert to apple

**Files:**
- Modify: `src/scenes/GameScene.ts`

- [ ] **Step 1: Add lifetime check in update loop**

Override `update()`:
```ts
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
```

- [ ] **Step 2: Verify**

Spawn a berry (force temporarily by wrapping the picker — optional). Watch a berry/star auto-revert to apple after its lifetime if uneaten.

- [ ] **Step 3: Commit**

```bash
git add src/scenes/GameScene.ts
git commit -m "feat(food): berry/star revert to apple when their lifetime expires"
```

---

## Task 18: Walls and self-collision → lose a heart + respawn

**Files:**
- Modify: `src/scenes/GameScene.ts`

- [ ] **Step 1: Add lives, invulnerability, and respawn logic**

Add imports:
```ts
import { createActor } from 'xstate';
import { findRespawnPlacement } from '../game/Snake';
import { gameFlowMachine } from '../game/GameFlowMachine';
```

Add fields:
```ts
  private lives = CONFIG.lives.start;
  private invulnerableUntil = 0;
  private flow = createActor(gameFlowMachine);
```

In `create()`, create/start a fresh XState actor before the first tick loop starts, and stop it on scene shutdown. Phaser can reuse scene instances across restarts, so do not reuse an old actor:
```ts
    this.flow = createActor(gameFlowMachine);
    this.flow.start();
    this.events.once('shutdown', () => this.flow.stop());
```

Replace `tick()`'s pre-advance logic to detect collisions on the proposed head:

```ts
  private tick() {
    const nextDir = this.input2.consumeDirection();
    this.snake.setDirection(nextDir);

    const v = { up:{x:0,y:-1}, down:{x:0,y:1}, left:{x:-1,y:0}, right:{x:1,y:0} }[this.snake.direction];
    const newHead = { x: this.snake.head.x + v.x, y: this.snake.head.y + v.y };

    const outOfBounds = !this.grid.inBounds(newHead);
    const intoBody = this.snake.body.some((c, i) => i > 0 && c.x === newHead.x && c.y === newHead.y);

    if (outOfBounds || intoBody) {
      if (this.time.now >= this.invulnerableUntil) {
        this.loseLife();
        return;
      }
      // INVULNERABLE collision: do NOT advance into the illegal cell.
      // Skipping the tick keeps state legal; player still steers next tick.
      return;
    }

    const willEat = this.food && newHead.x === this.food.cell.x && newHead.y === this.food.cell.y;
    this.snake.advance({ grow: !!willEat, maxLength: CONFIG.snake.maxLength });
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
```

Update `GameOverScene` stub to receive score (Task 23 will polish):
`src/scenes/GameOverScene.ts`:
```ts
import Phaser from 'phaser';
import { THEME } from '../theme';

export class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOverScene'); }
  init(data: { score: number }) { (this as any).finalScore = data?.score ?? 0; }
  create() {
    const { width, height } = this.scale;
    this.add.text(width/2, height/2 - 40, 'Game Over', { fontFamily: THEME.font.family, fontSize: '48px', color: '#7a5cff' }).setOrigin(0.5);
    this.add.text(width/2, height/2 + 10, `Score: ${(this as any).finalScore}`, { fontFamily: THEME.font.family, fontSize: '24px', color: '#1a1a1a' }).setOrigin(0.5);
    this.add.text(width/2, height/2 + 60, '▶ Play again', { fontFamily: THEME.font.family, fontSize: '20px', color: '#3ecf8e' })
      .setOrigin(0.5).setInteractive({useHandCursor:true})
      .on('pointerdown', () => this.scene.start('GameScene'));
  }
}
```

- [ ] **Step 2: Verify**

Run into a wall → snake flashes red, brief pause, respawns at center horizontally; blinking during invulnerability. After 3 hits, GameOver shows.

- [ ] **Step 3: Commit**

```bash
git add src/scenes/GameScene.ts src/scenes/GameOverScene.ts
git commit -m "feat(lives): wall/self collision loses a heart, respawn with invulnerability"
```

---

## Task 19: Obstacles + level progression + level banner

**Files:**
- Create: `src/ui/LevelBanner.ts`
- Modify: `src/scenes/GameScene.ts`

- [ ] **Step 1: Create `src/ui/LevelBanner.ts`**

```ts
import Phaser from 'phaser';
import { THEME } from '../theme';

export function showLevelBanner(scene: Phaser.Scene, level: number) {
  const { width, height } = scene.scale;
  const t = scene.add.text(-200, height / 2, `Level ${level}!`, {
    fontFamily: THEME.font.family, fontSize: '64px', fontStyle: '800', color: '#7a5cff'
  }).setOrigin(0.5);
  scene.tweens.chain({
    targets: t,
    tweens: [
      { x: width / 2, duration: 350, ease: THEME.easings.bannerSlide },
      { x: width / 2, duration: 700 },
      { x: width + 300, duration: 350, ease: 'Cubic.easeIn' }
    ],
    onComplete: () => t.destroy()
  });
}
```

- [ ] **Step 2: Add obstacle and progression logic to `GameScene`**

Add imports:
```ts
import { levelForFruits, tickMsForLevel, obstacleCountForLevel } from '../game/Progression';
import { showLevelBanner } from '../ui/LevelBanner';
```

Add fields:
```ts
  private fruitsEaten = 0;
  private level = 1;
  private obstacles: Cell[] = [];
  private obstacleGfx: Phaser.GameObjects.Rectangle[] = [];
```

**Extend `boardBlockedCells()` to include obstacles** — replace the helper from Task 16 with:
```ts
  private boardBlockedCells(): Set<string> {
    const s = new Set<string>();
    for (const c of this.snake.body) s.add(`${c.x},${c.y}`);
    for (const c of this.obstacles) s.add(`${c.x},${c.y}`);
    return s;
  }
```

Helper to render an obstacle:
```ts
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
```

In `tick()`, after eating a fruit, add level-up logic:
```ts
    if (willEat && this.food) {
      // ... existing scoring/popup ...
      this.fruitsEaten++;
      const newLevel = levelForFruits(this.fruitsEaten);
      if (newLevel !== this.level) {
        this.level = newLevel;
        this.currentTickMs = tickMsForLevel(newLevel);
        this.startTickLoop(); // restart with new delay
        showLevelBanner(this, newLevel);
        const desired = obstacleCountForLevel(newLevel);
        if (desired > this.obstacles.length) this.addObstacles(desired);
      }
    }
```

In `tick()`'s collision check, also count obstacles as deadly:
```ts
    const intoObstacle = this.obstacles.some(o => o.x === newHead.x && o.y === newHead.y);
    if ((outOfBounds || intoBody || intoObstacle) && this.time.now >= this.invulnerableUntil) {
      this.loseLife();
      return;
    }
```

In `respawn()`, also add obstacles to the blocked set:
```ts
    for (const o of this.obstacles) blocked.add(`${o.x},${o.y}`);
```

- [ ] **Step 3: Verify**

Eat 5 apples → "Level 2!" banner slides through. By Level 4, an obstacle (yellow rock candy) appears. Collide with it → lose a heart. Obstacles persist across heart loss; reset on game over.

- [ ] **Step 4: Commit**

```bash
git add src/ui/LevelBanner.ts src/scenes/GameScene.ts
git commit -m "feat(progression): level-up banner, tick speedup, obstacles at L4/6/8/10"
```

---

## Task 20: Power-ups — drop, pick up, apply effects

**Files:**
- Modify: `src/scenes/GameScene.ts`

- [ ] **Step 1: Add power-up state to GameScene**

Add imports:
```ts
import { rollPowerUpDrop } from '../game/FoodSpawner';
import { PowerUpController } from '../game/PowerUps';
import type { PowerUpKind } from '../types';
```

Add fields:
```ts
  private pu = new PowerUpController();
  private puIcon: { kind: PowerUpKind; cell: Cell; spawnedAt: number; gfx: Phaser.GameObjects.Container } | null = null;
```

**Extend `boardBlockedCells()` again to include the power-up icon** — replace the helper from Task 19 with this final form:
```ts
  private boardBlockedCells(): Set<string> {
    const s = new Set<string>();
    for (const c of this.snake.body) s.add(`${c.x},${c.y}`);
    for (const c of this.obstacles) s.add(`${c.x},${c.y}`);
    if (this.puIcon) s.add(`${this.puIcon.cell.x},${this.puIcon.cell.y}`);
    return s;
  }
```
This ensures food, obstacles, and power-ups can never spawn on top of each other.

Add helpers:
```ts
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
    this.puIcon.gfx.destroy();
    this.puIcon = null;
  }
```

In `tick()`:
- After collision check passes, before/after `advance`, check for power-up collection on the new head cell.
- After scoring, call `maybeDropPowerUp()`.
- Apply effects:
  - **Slowmo:** when active, use `tickMs * slowmoFactor` for the next tick.
  - **Ghost:** in collision check, ignore body and wrap walls.
  - **Double:** multiply score grant by 2.

Concretely, replace `tick()` body. Three subtle correctness rules baked in here — read the comments.

```ts
  private tick() {
    // Drain power-up timer by the ACTUAL elapsed tick interval. tickEvent.delay
    // already reflects slow-mo (we adjust it at the end of each tick), so this
    // gives the real-world duration the spec promises.
    const elapsed = this.tickEvent?.delay ?? this.currentTickMs;
    this.pu.tick(elapsed);

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
    const willEat = this.food && newHead.x === this.food.cell.x && newHead.y === this.food.cell.y;
    this.snake.body.unshift(newHead);
    const shouldGrow = !!willEat && this.snake.length <= CONFIG.snake.maxLength;
    if (!shouldGrow) this.snake.body.pop();

    this.tweenSegmentsToBody();
    if (wrapped) {
      // Don't tween the head across the entire board. Snap it to the wrapped
      // cell instead. (Body segments tween normally — only the head jumps.)
      const headPx = this.cellCenterPx(this.snake.body[0]);
      this.tweens.killTweensOf(this.segments[0]);
      this.segments[0].setPosition(headPx.x, headPx.y);
    }

    this.collectPowerUpIfHere(newHead);

    if (willEat && this.food) {
      const baseGrant = { apple: 10, berry: 30, star: 50 }[this.food.kind];
      const grant = this.pu.isActive('double') ? baseGrant * 2 : baseGrant;
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
      this.maybeDropPowerUp();
    }

    // Apply slow-mo by scaling next interval (drain in the next tick reads this back)
    if (this.tickEvent && this.pu.isActive('slowmo')) {
      this.tickEvent.delay = this.currentTickMs * CONFIG.powerUps.slowmoFactor;
    } else if (this.tickEvent) {
      this.tickEvent.delay = this.currentTickMs;
    }
  }
```

- [ ] **Step 2: Verify**

Eat several fruits — occasionally a power-up icon appears. Pick it up: ❄ slows the snake; 👻 lets you pass through walls and your own body (but still die on obstacles); ✨ doubles the score popup.

- [ ] **Step 3: Commit**

```bash
git add src/scenes/GameScene.ts
git commit -m "feat(powerups): drop, collect, and apply slowmo / ghost / double"
```

---

## Task 21: HUD — hearts, score, level, power-up timer ring

**Files:**
- Create: `src/ui/HUD.ts`
- Modify: `src/scenes/GameScene.ts`

- [ ] **Step 1: Create `src/ui/HUD.ts`**

```ts
import Phaser from 'phaser';
import { THEME } from '../theme';
import type { PowerUpKind } from '../types';

export class HUD {
  private heartsContainer: Phaser.GameObjects.Container;
  private heartImgs: Phaser.GameObjects.Text[] = [];
  private levelText: Phaser.GameObjects.Text;
  private scoreText: Phaser.GameObjects.Text;
  private puContainer: Phaser.GameObjects.Container;
  private puRing: Phaser.GameObjects.Graphics;
  private puIconText: Phaser.GameObjects.Text;
  private puActive: { kind: PowerUpKind; totalMs: number; remainingMs: number } | null = null;

  constructor(private scene: Phaser.Scene, private boardLeft: number, private boardTop: number, private boardWidth: number, onPause?: () => void) {
    const y = boardTop - 56;
    // Pause button (top-left of board, always shown — useful on touch where ESC isn't available, harmless on desktop)
    if (onPause) {
      const pauseBtn = scene.add.text(boardLeft - 36, y, '⏸', {
        fontFamily: THEME.font.family, fontSize: '24px', color: '#7a5cff', fontStyle: '800',
        backgroundColor: '#ffffff', padding: { x: 8, y: 4 }
      }).setInteractive({ useHandCursor: true });
      pauseBtn.on('pointerdown', () => onPause());
    }
    // Hearts (left)
    this.heartsContainer = scene.add.container(boardLeft, y);
    for (let i = 0; i < 3; i++) {
      const h = scene.add.text(i * 22, 0, '♥', { fontFamily: THEME.font.family, fontSize: '24px', color: '#ff4d6d', fontStyle: '800' });
      this.heartsContainer.add(h);
      this.heartImgs.push(h);
    }
    // Level (center)
    this.levelText = scene.add.text(boardLeft + boardWidth / 2, y + 12, 'LEVEL 1', {
      fontFamily: THEME.font.family, fontSize: '18px', fontStyle: '800', color: '#7a5cff'
    }).setOrigin(0.5);
    // Score (right)
    this.scoreText = scene.add.text(boardLeft + boardWidth, y + 12, '⭐ 0', {
      fontFamily: THEME.font.family, fontSize: '18px', fontStyle: '800', color: '#3ecf8e'
    }).setOrigin(1, 0.5);
    // Power-up ring (right of score)
    this.puContainer = scene.add.container(boardLeft + boardWidth + 36, y + 12);
    this.puRing = scene.add.graphics();
    this.puIconText = scene.add.text(0, 0, '', { fontSize: '16px' }).setOrigin(0.5);
    this.puContainer.add([this.puRing, this.puIconText]);
    this.puContainer.setVisible(false);
  }
  setLives(n: number) {
    for (let i = 0; i < this.heartImgs.length; i++) {
      this.heartImgs[i].setAlpha(i < n ? 1 : 0.2);
    }
  }
  setScore(s: number) { this.scoreText.setText(`⭐ ${s}`); }
  setLevel(l: number) { this.levelText.setText(`LEVEL ${l}`); }
  setPowerUp(kind: PowerUpKind | null, totalMs = 0, remainingMs = 0) {
    if (!kind) { this.puActive = null; this.puContainer.setVisible(false); return; }
    this.puActive = { kind, totalMs, remainingMs };
    this.puIconText.setText({ slowmo: '❄', ghost: '👻', double: '✨' }[kind]);
    this.puContainer.setVisible(true);
    this.drawRing();
  }
  tickRing(remainingMs: number) {
    if (!this.puActive) return;
    this.puActive.remainingMs = remainingMs;
    this.drawRing();
  }
  private drawRing() {
    this.puRing.clear();
    if (!this.puActive) return;
    const pct = Phaser.Math.Clamp(this.puActive.remainingMs / this.puActive.totalMs, 0, 1);
    this.puRing.lineStyle(3, THEME.colors.accentPurple, 1);
    this.puRing.beginPath();
    this.puRing.arc(0, 0, 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct, false);
    this.puRing.strokePath();
  }
}
```

- [ ] **Step 2: Wire HUD into `GameScene`**

Add field:
```ts
  private hud!: HUD;
```

Add import:
```ts
import { HUD } from '../ui/HUD';
```

In `create()` after `drawBoard()`:
```ts
    // Pause callback is wired in Task 22 once pauseGame() exists. Leave it
    // undefined here so Task 21's commit compiles cleanly on its own.
    this.hud = new HUD(this, this.boardOriginX, this.boardOriginY, this.grid.widthPx);
    this.hud.setLives(this.lives);
    this.hud.setScore(0);
    this.hud.setLevel(1);
```

In `tick()`, add hud updates:
- After scoring: `this.hud.setScore(this.score);`
- After level change: `this.hud.setLevel(newLevel);`
- **For the power-up ring:** do NOT add a second `pu.tick()` call — Task 20 already drains the timer with the correct elapsed value. Instead, **wrap** the existing call to capture before/after state for the HUD. Replace the two existing lines at the top of `tick()`:

```ts
    // Was:
    //   const elapsed = this.tickEvent?.delay ?? this.currentTickMs;
    //   this.pu.tick(elapsed);
    // Replace with:
    const elapsed = this.tickEvent?.delay ?? this.currentTickMs;
    const beforeKind = this.pu.active?.kind ?? null;
    this.pu.tick(elapsed);
    if (beforeKind && !this.pu.active) this.hud.setPowerUp(null);
    else if (this.pu.active) this.hud.tickRing(this.pu.active.remainingMs);
```

When power-up is collected (in `collectPowerUpIfHere`), call:
```ts
    this.hud.setPowerUp(this.pu.active!.kind, this.pu.active!.remainingMs, this.pu.active!.remainingMs);
```

In `loseLife()`:
```ts
    this.hud.setLives(this.lives);
```

- [ ] **Step 3: Verify**

HUD shows three hearts, score, level pill, and a shrinking power-up ring when one is active. Hearts dim on life loss.

- [ ] **Step 4: Commit**

```bash
git add src/ui/HUD.ts src/scenes/GameScene.ts
git commit -m "feat(ui): add HUD with hearts, score, level, and power-up timer ring"
```

---

## Task 22: Pause — ESC, on-screen button, tab-hidden, PauseScene owns resume

**Files:**
- Modify: `src/scenes/GameScene.ts`, `src/scenes/PauseScene.ts`

- [ ] **Step 1: Implement `src/scenes/PauseScene.ts`**

```ts
import Phaser from 'phaser';
import { THEME } from '../theme';

export class PauseScene extends Phaser.Scene {
  constructor() { super('PauseScene'); }
  create() {
    const { width, height } = this.scale;
    // Translucent backdrop. Made interactive so it captures (swallows) clicks
    // and they don't fall through to the GameScene under it. NOTE: do NOT
    // resume on background click — that's too easy to trigger by accident on
    // touch devices. Resume is only via the explicit Resume button or ESC.
    const bg = this.add.rectangle(0, 0, width, height, 0x000000, 0.45).setOrigin(0).setInteractive();
    bg.on('pointerdown', () => { /* swallow only */ });

    const card = this.add.rectangle(width/2, height/2, 320, 240, THEME.colors.surface, 1).setStrokeStyle(0).setOrigin(0.5);
    card.setInteractive(); // swallow clicks on the card
    this.add.text(width/2, height/2 - 60, 'Paused', { fontFamily: THEME.font.family, fontSize: '32px', fontStyle: '800', color: '#7a5cff' }).setOrigin(0.5);

    const mkBtn = (y: number, label: string, onClick: () => void) => {
      const t = this.add.text(width/2, y, label, { fontFamily: THEME.font.family, fontSize: '20px', fontStyle: '600', color: '#1a1a1a' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      t.on('pointerdown', onClick);
    };
    mkBtn(height/2 - 10, '▶  Resume', () => this.resumeGame());
    mkBtn(height/2 + 30, '↺  Restart', () => { this.scene.stop('PauseScene'); this.scene.stop('GameScene'); this.scene.start('GameScene'); });
    mkBtn(height/2 + 70, '⌂  Menu', () => { this.scene.stop('PauseScene'); this.scene.stop('GameScene'); this.scene.start('MenuScene'); });

    this.input.keyboard?.on('keydown-ESC', () => this.resumeGame());
  }
  private resumeGame() {
    const game = this.scene.get('GameScene') as Phaser.Scene & { resumeFromPause?: () => void };
    game.resumeFromPause?.();
    this.scene.stop('PauseScene');
  }
}
```

- [ ] **Step 2: Wire pause triggers in `GameScene`**

Add to `create()`:
```ts
    this.input.keyboard?.on('keydown-ESC', () => this.pauseGame());
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.events.once('shutdown', () => document.removeEventListener('visibilitychange', this.onVisibilityChange));
```

Add field:
```ts
  private onVisibilityChange = () => { if (document.hidden && !this.scene.isPaused()) this.pauseGame(); };
```

Add method:
```ts
  private pauseGame() {
    if (this.scene.isPaused()) return;
    this.flow.send({ type: 'PAUSE' });
    this.scene.pause();
    this.scene.launch('PauseScene');
  }

  public resumeFromPause() {
    this.flow.send({ type: 'RESUME' });
    this.scene.resume();
  }
```

**Update HUD construction to wire the pause button** (the HUD already accepts an `onPause` callback from Task 21; here we finally pass it). Change the line in `create()`:

```ts
// Before (from Task 21):
//   this.hud = new HUD(this, this.boardOriginX, this.boardOriginY, this.grid.widthPx);
// After:
this.hud = new HUD(this, this.boardOriginX, this.boardOriginY, this.grid.widthPx, () => this.pauseGame());
```
This activates the ⏸ button in the HUD — essential for touch devices where ESC is unavailable.

- [ ] **Step 3: Verify**

Press ESC mid-game → frosted overlay, "Paused" card. Snake halts. Resume / Restart / Menu work. Switching tabs auto-pauses; returning leaves it paused until user resumes.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/PauseScene.ts src/scenes/GameScene.ts
git commit -m "feat(pause): ESC + tab-hidden auto-pause; PauseScene owns resume input"
```

---

## Task 23: GameOverScene — high score persistence + "New best!"

**Files:**
- Modify: `src/scenes/GameOverScene.ts`

- [ ] **Step 1: Replace `src/scenes/GameOverScene.ts`**

```ts
import Phaser from 'phaser';
import { THEME } from '../theme';
import { loadHighScore, saveHighScore } from '../storage';

export class GameOverScene extends Phaser.Scene {
  private finalScore = 0;
  constructor() { super('GameOverScene'); }
  init(data: { score: number }) { this.finalScore = data?.score ?? 0; }
  create() {
    const { width, height } = this.scale;
    const prev = loadHighScore();
    const isBest = this.finalScore > prev;
    if (isBest) saveHighScore(this.finalScore);

    this.add.rectangle(0,0,width,height,0x000000,0.4).setOrigin(0);
    const card = this.add.rectangle(width/2, height/2, 360, 280, THEME.colors.surface, 1).setOrigin(0.5);
    card.setStrokeStyle(0);

    this.add.text(width/2, height/2 - 90, 'Game Over', { fontFamily: THEME.font.family, fontSize: '40px', fontStyle: '800', color: '#7a5cff' }).setOrigin(0.5);
    this.add.text(width/2, height/2 - 30, `${this.finalScore}`, { fontFamily: THEME.font.family, fontSize: '56px', fontStyle: '800', color: '#3ecf8e' }).setOrigin(0.5);
    if (isBest) {
      this.add.text(width/2, height/2 + 16, '🏆 New Best!', { fontFamily: THEME.font.family, fontSize: '20px', fontStyle: '800', color: '#ff4d6d' }).setOrigin(0.5);
    } else {
      this.add.text(width/2, height/2 + 16, `Best: ${prev}`, { fontFamily: THEME.font.family, fontSize: '16px', color: '#6b6b8a' }).setOrigin(0.5);
    }

    const mkBtn = (y: number, label: string, color: string, bg: string, onClick: () => void) => {
      const t = this.add.text(width/2, y, label, {
        fontFamily: THEME.font.family, fontSize: '18px', fontStyle: '800',
        color, backgroundColor: bg, padding: { x: 18, y: 8 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      t.on('pointerdown', onClick);
    };
    mkBtn(height/2 + 60, '▶  Play again', '#fff', '#3ecf8e', () => this.scene.start('GameScene'));
    mkBtn(height/2 + 100, '⌂  Menu', '#1a1a1a', '#fff', () => this.scene.start('MenuScene'));

    this.input.keyboard?.on('keydown-SPACE', () => this.scene.start('GameScene'));
  }
}
```

- [ ] **Step 2: Verify**

Lose all hearts → GameOver shows your score; if best ever, "🏆 New Best!" appears. Play again resets cleanly. High score persists across reload.

- [ ] **Step 3: Commit**

```bash
git add src/scenes/GameOverScene.ts
git commit -m "feat(gameover): persist high score and show new-best badge"
```

---

## Task 24: Touch swipe input

**Files:**
- Create: `src/input/SwipeInput.ts`
- Modify: `src/scenes/GameScene.ts`

- [ ] **Step 1: Create `src/input/SwipeInput.ts`**

```ts
import Phaser from 'phaser';
import { CONFIG } from '../config';
import type { Direction } from '../types';
import type { DirectionBuffer } from './KeyboardInput';

export class SwipeInput {
  private start: { x: number; y: number } | null = null;
  constructor(scene: Phaser.Scene, private buffer: DirectionBuffer) {
    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.start = { x: p.x, y: p.y };
    });
    scene.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (!this.start) return;
      const dx = p.x - this.start.x;
      const dy = p.y - this.start.y;
      this.start = null;
      const ax = Math.abs(dx), ay = Math.abs(dy);
      if (Math.max(ax, ay) < CONFIG.swipe.minDistancePx) return;
      let dir: Direction;
      if (ax >= ay) dir = dx > 0 ? 'right' : 'left';
      else dir = dy > 0 ? 'down' : 'up';
      this.buffer.tryQueue(dir);
    });
  }
}
```

- [ ] **Step 2: Refactor `KeyboardInput` to expose its buffer**

In `src/input/KeyboardInput.ts`, add:
```ts
  getBuffer(): DirectionBuffer { return this.buffer; }
```

- [ ] **Step 3: Wire `SwipeInput` into `GameScene`**

Add import:
```ts
import { SwipeInput } from '../input/SwipeInput';
```

In `create()` after `KeyboardInput`:
```ts
    new SwipeInput(this, this.input2.getBuffer());
```

- [ ] **Step 4: Verify on a touch device** (or use Chrome DevTools' device toolbar with touch emulation)

Swipes change direction. Short swipes (<25px) are ignored. Tap doesn't register.

- [ ] **Step 5: Commit**

```bash
git add src/input/SwipeInput.ts src/input/KeyboardInput.ts src/scenes/GameScene.ts
git commit -m "feat(input): add touch swipe with min-distance threshold"
```

---

## Task 25: Audio — gating, BGM, SFX, sound toggle

**Files:**
- Create: `src/audio/AudioManager.ts`, `public/audio/*.mp3` (acquired separately)
- Modify: `src/scenes/BootScene.ts`, `src/scenes/MenuScene.ts`, `src/scenes/GameScene.ts`

- [ ] **Step 1: Acquire CC0 audio assets**

Place 8 MP3 files in `public/audio/` (sourced from Pixabay or freesound.org under CC0):
- `chomp.mp3`, `pop.mp3`, `chime.mp3`, `power-up.mp3`, `level-up.mp3`, `oof.mp3`, `game-over.mp3`, `bgm.mp3`

Document attribution (if any) in `public/audio/README.md`. CC0 doesn't require attribution but it's polite.

- [ ] **Step 2: Update `src/scenes/BootScene.ts`**

```ts
import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }
  preload() {
    this.load.audio('chomp', 'audio/chomp.mp3');
    this.load.audio('pop', 'audio/pop.mp3');
    this.load.audio('chime', 'audio/chime.mp3');
    this.load.audio('power-up', 'audio/power-up.mp3');
    this.load.audio('level-up', 'audio/level-up.mp3');
    this.load.audio('oof', 'audio/oof.mp3');
    this.load.audio('game-over', 'audio/game-over.mp3');
    this.load.audio('bgm', 'audio/bgm.mp3');
  }
  create() { this.scene.start('MenuScene'); }
}
```

- [ ] **Step 3: Create `src/audio/AudioManager.ts` (singleton-ish)**

```ts
import Phaser from 'phaser';
import { CONFIG } from '../config';
import { loadSoundOn, saveSoundOn } from '../storage';

let unlocked = false;
let bgm: Phaser.Sound.BaseSound | null = null;
let soundOn = loadSoundOn();
let game: Phaser.Game | null = null;

export const AudioManager = {
  setGame(g: Phaser.Game) { game = g; },
  isOn(): boolean { return soundOn; },
  setOn(on: boolean) {
    soundOn = on;
    saveSoundOn(on);
    if (!game) return;
    game.sound.mute = !on;
    if (on && unlocked && !bgm?.isPlaying) this.startBgm();
  },
  unlock(scene: Phaser.Scene) {
    if (unlocked) return;
    unlocked = true;
    game = scene.game;
    game.sound.mute = !soundOn;
    if (soundOn) this.startBgm();
  },
  startBgm() {
    if (!game) return;
    if (bgm?.isPlaying) return;
    bgm = game.sound.add('bgm', { loop: true, volume: CONFIG.audio.bgmVolume });
    bgm.play();
  },
  duckBgm() { if (bgm && 'volume' in bgm) (bgm as any).volume = CONFIG.audio.bgmDuckedVolume; },
  unduckBgm() { if (bgm && 'volume' in bgm) (bgm as any).volume = CONFIG.audio.bgmVolume; },
  play(key: string) {
    if (!unlocked || !soundOn || !game) return;
    game.sound.play(key);
  }
};
```

- [ ] **Step 4: Wire into MenuScene**

In `MenuScene.create()`, after creating buttons, add unlock triggers:
```ts
    AudioManager.setGame(this.game);
    const unlock = () => AudioManager.unlock(this);
    playBtn.on('pointerdown', unlock);
    this.input.keyboard?.on('keydown', unlock);
    // Sound toggle. ORDER MATTERS: flip state BEFORE unlock so that if the
    // user's first action is muting, AudioManager.unlock() reads soundOn=false
    // and never starts BGM audibly. Spec §7 audio-gating last bullet.
    const toggle = this.add.text(20, 20, AudioManager.isOn() ? '🔊' : '🔇', { fontSize: '28px' }).setInteractive({ useHandCursor: true });
    toggle.on('pointerdown', () => {
      const newState = !AudioManager.isOn();
      AudioManager.setOn(newState);  // 1) update soundOn (and saved pref)
      unlock();                      // 2) NOW unlock; if newState=false, BGM stays silent
      toggle.setText(AudioManager.isOn() ? '🔊' : '🔇');
    });
```

Add import to MenuScene: `import { AudioManager } from '../audio/AudioManager';`.

- [ ] **Step 5: Wire SFX into GameScene events**

Add `import { AudioManager } from '../audio/AudioManager';` and call:
- `AudioManager.play('chomp')` on apple eaten
- `AudioManager.play('pop')` on berry eaten
- `AudioManager.play('chime')` on star eaten
- `AudioManager.play('power-up')` on power-up collection
- `AudioManager.play('level-up')` on level up
- `AudioManager.play('oof')` on life lost
- `AudioManager.play('game-over')` before scene transition

In `pauseGame()` add `AudioManager.duckBgm()`; in PauseScene's `resumeGame()` add `AudioManager.unduckBgm()` (export it so PauseScene can call too — or invoke via a Phaser event):
```ts
    this.events.on('resume', () => AudioManager.unduckBgm());
```
inside GameScene's `create()`.

- [ ] **Step 6: Verify**

Click Play → BGM starts. SFX play on actions. Toggle mute on/off; preference persists across reload. If first action is muting, BGM does not play audibly until user unmutes.

- [ ] **Step 7: Commit**

```bash
git add src/audio src/scenes public/audio
git commit -m "feat(audio): bgm, sfx, gating, mute toggle persisted across sessions"
```

---

## Task 26: Responsive layout

**Files:**
- Modify: `src/main.ts`, `src/scenes/GameScene.ts`, `src/scenes/MenuScene.ts`

- [ ] **Step 1: Adjust Phaser scale config to use viewport**

In `src/main.ts`, replace the fixed width/height with viewport-driven sizing:

```ts
const targetW = Math.min(window.innerWidth, 720);
const targetH = Math.min(window.innerHeight, 820);
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: targetW,
  height: targetH,
  backgroundColor: 'rgba(0,0,0,0)',
  transparent: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, MenuScene, GameScene, PauseScene, GameOverScene]
});
```

- [ ] **Step 2: Make GameScene scale the cell size to fit smaller screens**

In `GameScene.create()`, before constructing `Grid`, compute cell size:

```ts
    const isMobile = this.scale.width < CONFIG.responsive.breakpointPx;
    const margin = isMobile ? CONFIG.responsive.mobileMargin : 80;
    const maxBoardW = isMobile ? Math.min(this.scale.width - margin, CONFIG.responsive.mobileMaxCardPx) : CONFIG.grid.cols * CONFIG.grid.cellPx;
    const cellPx = Math.floor(maxBoardW / CONFIG.grid.cols);
    this.grid = new Grid(CONFIG.grid.cols, CONFIG.grid.rows, cellPx);
```

- [ ] **Step 3: Verify**

Resize the browser to a phone viewport (Chrome DevTools, iPhone 14 = 390×844). The play card scales down; HUD stays readable; touch swipe works.

- [ ] **Step 4: Commit**

```bash
git add src/main.ts src/scenes/GameScene.ts
git commit -m "feat(responsive): scale board cell size for tablet/phone viewports"
```

---

## Task 27: Snake head rotation + final visual polish

**Files:**
- Modify: `src/scenes/GameScene.ts`

- [ ] **Step 1: Make the head face the direction of travel**

Replace the head segment with a small container holding the head circle and eye dots. Rotate the container based on `snake.direction`:

In `spawnSegments()`, replace creation of segment 0:

```ts
  private headContainer?: Phaser.GameObjects.Container;
  // ...
  private spawnSegments() {
    for (const seg of this.segments) seg.destroy();
    this.headContainer?.destroy();
    this.segments = [];
    const body = this.snake.body;
    for (let i = 0; i < body.length; i++) {
      const p = this.cellCenterPx(body[i]);
      const radius = i === 0 ? 12 : 11;
      const color = i === 0 ? THEME.colors.snakeDark : THEME.colors.snakeLight;
      const c = this.add.circle(p.x, p.y, radius, color);
      this.segments.push(c);
    }
    // Build head decoration (eyes) as a container we'll rotate
    const headP = this.cellCenterPx(body[0]);
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
```

In `tweenSegmentsToBody()`, also tween the head container to head pos and update rotation:

```ts
    if (this.headContainer) {
      const hp = this.cellCenterPx(body[0]);
      this.tweens.add({ targets: this.headContainer, x: hp.x, y: hp.y, duration: dur, ease: THEME.easings.snakeMove });
      this.updateHeadRotation();
    }
```

**Also extend the wrap-snap in `tick()` (added in Task 20) to snap the head container too** — otherwise the eyes will slide across the board during ghost-mode wrap. Right after the existing `if (wrapped) { ... }` block in `tick()`, add the headContainer snap:

```ts
    if (wrapped && this.headContainer) {
      const headPx = this.cellCenterPx(this.snake.body[0]);
      this.tweens.killTweensOf(this.headContainer);
      this.headContainer.setPosition(headPx.x, headPx.y);
    }
```

- [ ] **Step 2: Verify**

The head's eyes always face the direction of motion.

- [ ] **Step 3: Commit**

```bash
git add src/scenes/GameScene.ts
git commit -m "feat(visual): rotate snake head so eyes face direction of travel"
```

---

## Task 28: Final smoke test pass and README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Run the smoke test checklist**

Open the dev server and run through every item:

- [ ] Menu loads with title and Play button
- [ ] Press Space → game starts
- [ ] Eat an apple → score +10, snake grows
- [ ] Eat a berry (force by editing weights temporarily if needed) → score +30
- [ ] Eat a star → score +50, no growth
- [ ] Pick up a slow-mo → snake clearly slower for 5s
- [ ] Pick up ghost → can wrap walls and pass through body for 4s
- [ ] Pick up double → next score popup is doubled
- [ ] Hit a wall → red flash, brief pause, respawn at center, blink invulnerability
- [ ] Lose 3 lives → GameOver
- [ ] Score shown; "🏆 New Best!" if best
- [ ] Reload page → high score persists in Menu
- [ ] Press ESC mid-game → pause overlay, snake halts
- [ ] Switch tabs and back → still paused
- [ ] Toggle sound off in Menu → no audio; reload → still off

**Required viewport checklist** (per spec §14 success criteria — verify in Chrome DevTools device toolbar; check that the play card, HUD pills, and modals all render without overflow or clipping):

- [ ] **1440 × 900** (desktop) — board centered, full-size cells, HUD on one row
- [ ] **1024 × 768** (small laptop / iPad landscape) — same layout still fits, no clipping
- [ ] **768 × 1024** (iPad portrait) — board scales down, HUD pills may wrap to two rows but stay readable
- [ ] **390 × 844** (iPhone 14) — touch swipe works, board scales to viewport-32px, no horizontal scroll

Additional invulnerability + ghost smoke checks (added based on review):

- [ ] Lose a heart, then immediately steer back into the wall during the invulnerability window — the snake stops in place rather than entering an illegal cell, and no further hearts are lost
- [ ] Activate ghost mode and run off the right edge — snake reappears on the left, head does NOT visually slide across the entire board
- [ ] During slow-mo, time the effect with a stopwatch — duration is ~5s real-time (not longer)
- [ ] On the Pause screen, click the dimmed background — game does NOT resume; only the Resume button or ESC resumes
- [ ] XState flow sanity: while paused, gameplay stays frozen until `RESUME`; after a non-final hit, flow returns to playing only after flash → respawn delay → invulnerability completes

If anything fails, fix it inline and commit.

- [ ] **Step 2: Create `README.md`**

```markdown
# Candy Snake

A polished snake game for ages 9–12. Built with Phaser 3 + Vite + TypeScript.

## Run locally

```sh
npm install
npm run dev
```

Open http://localhost:5173.

## Build

```sh
npm run build
```

Output is in `dist/` — deploy as a static site (Netlify, Vercel, GitHub Pages, etc.).

## Tests

```sh
npm run test
```

## Controls

- Desktop: arrow keys / WASD; ESC pause; Space start/restart
- Touch: swipe on the play card; pause button in HUD

## Spec

Design at `docs/superpowers/specs/2026-04-25-candy-snake-design.md`.
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add readme with run/build/controls"
```

---

## Self-review

**Spec coverage check** — every section of the spec maps to at least one task:

- §3 Stack → Task 1
- §4 Scenes & flow → Tasks 10.5, 12, 18, 22, 23
- §5.1 Grid & movement → Tasks 4, 13, 14
- §5.1 Buffered input rule → Task 11, 15
- §5.2 Lives + respawn placement + invulnerability → Tasks 6, 7, 10.5, 18
- §5.3 Food + lifetimes → Tasks 9, 16, 17
- §5.4 Power-ups (state, drop limit, ghost semantics) → Tasks 9, 10, 20
- §5.5 Progression (level, tickMs, obstacles) → Tasks 8, 19
- §5.6 Pause semantics + tab-hidden + input ownership → Tasks 10.5, 22
- §6 Visual design — Candy Pop tokens, animations, head rotation → Tasks 2, 13, 16, 19, 21, 27
- §7 Audio (gating, toggle, all SFX, BGM) → Task 25
- §8 Controls (keyboard + swipe) → Tasks 11, 15, 24
- §9 Persistence → Task 3 (storage), Task 23 (high score), Task 25 (sound pref)
- §10 Responsive layout → Task 26
- §11 Architecture / file structure → Tasks 1, 2 (and enforced by every subsequent task's "Files" header)
- §12 Testing approach → Tasks 3–11 plus 10.5 (Vitest), Task 28 (manual)
- §14 Success criteria → verified in Task 28

No gaps found.

**Placeholder scan:** No "TBD", "TODO", "implement later", or "similar to Task N" patterns. Every code-changing step shows the actual code.

**Type consistency:** `Direction`, `FoodKind`, `PowerUpKind`, `Cell`, the `OPPOSITE` and `DIR_VECTORS` maps, the `Snake.advance({ grow, maxLength })` signature, the `findRespawnPlacement(grid, length, blocked)` signature, the `PowerUpController.activate(kind) / tick(deltaMs) / isActive(kind)` API, `gameFlowMachine` events (`PAUSE`, `RESUME`, `HIT`, `FLASH_DONE`, `RESPAWN_DONE`, `INVULNERABLE_DONE`, `GAME_OVER`), and HUD method names (`setLives`, `setScore`, `setLevel`, `setPowerUp`, `tickRing`) are used consistently from their introduction through every later task that references them.

---

## Execution

Plan complete and saved to `docs/superpowers/plans/2026-04-25-candy-snake.md`.

Two execution options:

1. **Subagent-driven** (recommended) — fresh subagent per task, two-stage review between tasks, fast iteration
2. **Inline execution** — execute tasks in this session with checkpoints

Which approach?
