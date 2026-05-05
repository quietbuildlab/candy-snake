# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Vite dev server at http://localhost:5173
- `npm run build` — `tsc -b` (type-check) then `vite build` into `dist/`. CI also runs this.
- `npm test` — Vitest, runs once. CI uses this.
- `npm run test:watch` — Vitest in watch mode
- `npx vitest run tests/Snake-movement.test.ts` — run a single test file
- `npx vitest run -t "rejects 180"` — run tests matching a name pattern

CI (`.github/workflows/deploy.yml`) runs `npm ci && npm test && npm run build` on push to `main` and deploys `dist/` to Cloudflare Pages (project `candy-snake`).

## Architecture

Phaser 3 + Vite + TypeScript. The deliberate split is **engine-agnostic logic vs. Phaser glue** — keep that boundary intact:

- `src/game/*`, `src/storage.ts`, `src/input/KeyboardInput.ts` — **no Phaser imports**, pure logic, fully unit-tested under `tests/`.
- `src/scenes/*`, `src/ui/*`, `src/audio/*`, `src/input/SwipeInput.ts` — Phaser-coupled, not unit-tested.

When adding mechanics, push the rule into `src/game/` and let the scene call into it. Don't put game rules inside scene methods.

### The tick loop is in one place

`GameScene.tick()` (`src/scenes/GameScene.ts`) is the heart of the game. Every per-step concern goes through it: drain power-up timer, consume buffered direction, compute new head, resolve wall/body/obstacle collisions (with ghost-mode and invulnerability branches), apply movement, eat food, level up, drop power-ups, then re-arm `tickEvent` (the slow-mo factor is applied here by changing the next interval, not by scaling delta).

If you change movement or collision rules, edit `tick()` — don't shadow logic into `update()`. `update()` is only used for time-based food expiry.

### XState flow machine

`src/game/GameFlowMachine.ts` (XState v5) tracks the high-level state — `active.playing` / `active.lifeLost.{flash,respawnDelay,invulnerable}` / `paused` / `gameOver`. `GameScene` owns an actor and sends events (`HIT`, `FLASH_DONE`, `RESPAWN_DONE`, `INVULNERABLE_DONE`, `PAUSE`, `RESUME`, `GAME_OVER`). The machine guards game-over off `livesAfter <= 0`. Pause uses a deep history state so resume re-enters the correct sub-state.

### Direction buffering — second-order rule

`DirectionBuffer.tryQueue` (in `src/input/KeyboardInput.ts`) compares against the **buffered** direction if one exists, otherwise the current. This prevents a fast double-tap (e.g. right→down→left in one tick) from sneaking a 180° reversal in. `SwipeInput` writes into the same buffer so keyboard and touch share one queue.

### `boardBlockedCells()` is the spawn invariant

Any new spawn (food, power-up, obstacle) **must** start from `GameScene.boardBlockedCells()` and pass the resulting `Set<string>` to `findEmptyCell` from `src/game/FoodSpawner.ts`. Bypassing it causes overlap bugs. The set always includes snake body, obstacles, and the uncollected power-up icon; callers add the food cell themselves when relevant.

### Per-run state reset in `create()`

Phaser reuses scene instances across `scene.start('GameScene')`, so **field initializers fire only once**. `GameScene.create()` resets every per-run field at the top — score, lives, level, obstacles, power-ups, tick interval, segments, etc. When you add new per-run state, reset it in `create()` or "Play Again" will inherit stale values (this exact bug was fixed in commit `5c7b476`).

### Tunables

`src/config.ts` is the single source of truth for tick speeds, food weights, lifetimes, power-up durations, drop rates, lives, swipe threshold, and responsive breakpoint. Prefer editing this over hardcoding in scenes. `src/theme.ts` holds colors/fonts/easings. `src/types.ts` defines `Direction`, `FoodKind`, `PowerUpKind`, `Cell`, plus `OPPOSITE` and `DIR_VECTORS` lookup tables.

### Audio

`AudioManager` is a module-level singleton (not a class). Browser autoplay policy means BGM won't play until the first user gesture — `MenuScene` calls `AudioManager.unlock()` on the first pointer/key event. `BootScene.preload` loads MP3s from `public/audio/`; missing files fail silently in `play()`. `public/audio/` ships silent placeholders — replace with real CC0 SFX before shipping.

## TypeScript

- Strict mode plus `noUnusedLocals`, `noUnusedParameters`, `noImplicitOverride`. Phaser scene methods that override base methods (`update`, `preload`) need `override`.
- Path alias `@/*` → `src/*` (configured in both `tsconfig.json` and `vite.config.ts` / `vitest.config.ts`).
- ESM only (`"type": "module"`).

## Project memory

`.junie/memory/` (errors, feedback, tasks, language) is for the Junie agent — leave it alone unless explicitly asked. Specs and plans live under `docs/superpowers/`.
