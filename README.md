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

41 unit tests cover the engine-agnostic game logic (`src/game/*`, `src/storage.ts`, `src/input/KeyboardInput.ts`).

## Controls

- **Desktop:** arrow keys / WASD; ESC pause; Space start/restart
- **Touch:** swipe on the play card; pause button (⏸) in HUD top-left

## Features

- Classic snake mechanics with a 3-lives system + brief invulnerability after respawn
- Three food types — apple (+10), berry (+30, 6s lifetime), star (+50, no growth, 4s lifetime)
- Three power-ups — slow-mo (❄), ghost mode (👻), double points (✨)
- Level progression every 5 fruits — snake speeds up, obstacles appear at L4/6/8/10
- Persistent high score and sound preference in `localStorage`
- Responsive layout for desktop, tablet, and phone

## Audio

`public/audio/` ships with **silent placeholder MP3s**. To finish the polish, replace them with real CC0 sound effects from [Pixabay](https://pixabay.com/sound-effects/), [Kenney](https://kenney.nl/), or [freesound.org](https://freesound.org). Filenames are documented in `public/audio/README.md`.

## Architecture

```
src/
├── main.ts                 # Phaser bootstrap
├── config.ts               # Tunable numbers (grid size, tick speeds, drop rates)
├── theme.ts                # Color tokens, fonts, easings
├── types.ts                # Direction, FoodKind, PowerUpKind, Cell
├── storage.ts              # localStorage wrappers
├── audio/AudioManager.ts   # BGM, SFX, gating, mute toggle
├── game/                   # Engine-agnostic game logic (unit-tested)
│   ├── Grid.ts             # Cell ↔ pixel mapping, bounds, wrap
│   ├── Snake.ts            # State, movement, collision, respawn placement
│   ├── Progression.ts      # Level → tickMs, obstacle count
│   ├── FoodSpawner.ts      # Weighted picker, drop roll, empty-cell finder
│   ├── PowerUps.ts         # Active power-up state machine
│   └── GameFlowMachine.ts  # XState v5 high-level flow (active/paused/gameOver)
├── input/                  # Adapters that emit unified DirectionChange events
│   ├── KeyboardInput.ts    # Arrow/WASD + buffered direction with second-order rule
│   └── SwipeInput.ts       # Touch swipe with min-distance threshold
├── ui/
│   ├── HUD.ts              # Hearts, score, level pill, power-up timer ring, pause btn
│   ├── ScorePopup.ts       # Floating "+10!" tween
│   └── LevelBanner.ts      # "Level N" slide-in/out
└── scenes/                 # Phaser scenes
    ├── BootScene.ts
    ├── MenuScene.ts
    ├── GameScene.ts
    ├── PauseScene.ts
    └── GameOverScene.ts
```

## Spec & plan

- Design: [`docs/superpowers/specs/2026-04-25-candy-snake-design.md`](docs/superpowers/specs/2026-04-25-candy-snake-design.md)
- Implementation plan: [`docs/superpowers/plans/2026-04-25-candy-snake.md`](docs/superpowers/plans/2026-04-25-candy-snake.md)
