# Candy Snake — Design Spec

**Status:** Approved (pending user review of this document)
**Date:** 2026-04-25
**Target audience:** Players ages 9–12

---

## 1. Summary

Candy Snake is a polished, browser-based snake game aimed at ages 9–12. It runs on desktop and tablet/phone, with a "Candy Pop" pastel visual style. Gameplay is classic snake plus a 3-lives system, level-based progression, three food types, and three power-ups.

The game is built with **Phaser 3.90 + Vite + TypeScript** and deploys as a static site.

## 2. Goals & non-goals

**Goals**
- Feels polished and modern — kids should think "this looks like a real game."
- Real challenge: progression ramps speed and adds obstacles, but lives system keeps a single mistake from ending the run.
- Single-codebase support for keyboard (desktop) and swipe (touch) controls.
- Persist a single local high score across sessions.

**Non-goals**
- No accounts, no online leaderboards, no backend of any kind.
- No multiplayer.
- No unlockables, achievements, or skin selection (could come later).
- No tutorial scene; controls are explained on the menu screen.

## 3. Stack

| Layer | Choice |
|---|---|
| Engine | Phaser 3.90 |
| Language | TypeScript |
| Build | Vite |
| Hosting | Any static host (Netlify, Vercel, GitHub Pages, plain S3) |
| Persistence | `localStorage` |
| Audio | Phaser's WebAudioSound, with CC0 assets |
| Fonts | Nunito (Google Fonts) |

## 4. Scenes & flow

```
Boot → Menu ⇄ Game ⇄ PauseScene
              Game → GameOver → Menu
```

| Scene | Purpose |
|---|---|
| `BootScene` | Loads audio, fonts, sets scaling. Transitions to Menu when ready. |
| `MenuScene` | Game logo, "Play" button, current high score, sound on/off toggle, brief one-line controls hint. |
| `GameScene` | The playfield. Owns Snake, FoodSpawner, PowerUps, Progression, HUD. |
| `PauseScene` | Translucent overlay launched on top of GameScene. "Resume" / "Restart" / "Quit to menu". |
| `GameOverScene` | Modal overlay: final score, "New best!" badge if applicable, "Play again" / "Menu". |

## 5. Core mechanics

### 5.1 Grid & movement

- Grid is **20 cells × 20 cells**. Each cell ~28px on desktop; the play card scales to fit on tablet/phone (with 16px viewport margin).
- Movement is **tick-based**. Every `tickMs` (level-dependent), the snake's head advances one cell and the body follows.
- Snake segments **tween** smoothly between cells (animation duration < `tickMs`) — they never visibly "jump."
- Direction can change at any time but is only applied at the next tick. Buffered input: between two ticks, the *last* valid input wins.
- 180° reversal is rejected (cannot turn directly into your own neck).
- **Buffered input validity is checked against the previously buffered direction, not the current direction of travel.** Example: snake is moving right; player presses up (buffered, valid vs. right) then left within the same tick interval — left is rejected because it is the 180° opposite of the *buffered* up, even though it is valid against right. This prevents two queued inputs from chaining into a self-collision.

### 5.2 Lives system

- Player starts with **3 hearts**.
- A heart is lost on: hitting a wall, hitting any of the snake's own body segments, or hitting an obstacle.
- On heart loss: snake briefly flashes red ("ouch" SFX), short pause (~600ms), then the snake respawns **with the same length** it had before the hit, subject to the cap and trim rules below.
- **Grid coordinates are zero-indexed** (cells `0..19` on each axis); the "center" prefers row/column **10**.
- **Max snake length cap:** the snake length is capped at `gridW = 20` segments. Once at the cap, eating still scores points but does **not** add a segment. This guarantees a straight-line respawn always fits along a row or column.
- **Respawn placement rule (deterministic):**
  1. Try to place the snake horizontally along the center row (`y = 10`), head at column `min(gridW - 1, floor(gridW/2 + length/2 - 1))`, tail extending left, facing right.
  2. If any required cell overlaps an obstacle, the food, or extends out of bounds, fall back to vertical placement on the center column (`x = 10`), tail extending up, facing down.
  3. If both center placements are blocked, scan the grid in row-major order for the first contiguous empty horizontal or vertical run of `length` cells.
  4. **Defensive fallback** (not reachable under current rules: max 4 obstacles + 1 food + length cap 20 always leaves at least one fully empty row or column on a 20×20 board, so steps 1–3 are guaranteed to find a placement). Documented in case the configuration changes: if no placement of full length fits, the snake respawns **trimmed** to the longest contiguous run that does fit (minimum 3 segments); the trim is permanent for that run.
  5. The food piece is **not** displaced; obstacles are never displaced.
- **Respawn invulnerability:** for **1.2s** after respawn, the snake cannot lose a heart. The snake renders with a visible blink/aura during this window. Inputs are still accepted normally.
- When hearts reach 0: GameScene transitions to GameOverScene.

### 5.3 Food

Exactly **one food piece** is on the board at any moment. When eaten, a new piece spawns in a random empty cell.

| Food | Spawn weight | Score | Grow? | Lifetime | Visual |
|---|---|---|---|---|---|
| Apple | 80% | +10 | yes (+1 segment) | infinite | red/pink with green stem |
| Berry | 15% | +30 | yes (+1 segment) | 6s, then becomes an apple | purple with pulsing halo |
| Star | 5% | +50 | **no** | 4s, then becomes an apple | yellow with sparkle |

### 5.4 Power-ups

When any food is eaten, there's a **10% chance** a power-up icon spawns in a different empty cell. The icon stays for **8 seconds** before disappearing. **At most one uncollected power-up icon may exist on the board at a time** — if a roll succeeds while an icon is already present, the roll is skipped (no new icon spawns and the existing one is unaffected). Only **one power-up effect can be active at a time**; collecting a new one replaces the current one.

| Power-up | Effect | Duration |
|---|---|---|
| Slow-mo (❄️) | `tickMs` × 1.6 | 5s |
| Ghost mode (👻) | Walls wrap (head exits one side, reappears opposite). All self-body cells are passable (entire body, not just tail). **Obstacles still kill.** Eating food still works normally. | 4s |
| Double points (✨) | All score gains × 2 | 8s |

The HUD shows the active power-up as a circular icon with a shrinking conic-gradient ring (timer).

### 5.5 Progression

| Level | Trigger | Effect |
|---|---|---|
| 1 | Start | `tickMs = 180` |
| Level up | Every 5 fruits eaten | `tickMs -= 12`, floored at 70 |
| L4, L6, L8, L10 | Reaching that level | +1 static obstacle on the board (max 4) |

On level up: a "Level N" banner slides in from the left, holds ~700ms, slides out to the right. A soft chime plays.

Obstacles are placed in random empty cells (not occupied by snake or food) when the level threshold is crossed. They are **fixed for the rest of the run** — they persist across heart-loss respawns and only reset on a new run after game over.

### 5.6 Pause semantics

When the player pauses (ESC, on-screen pause button, or window/tab loses focus), **all time-based state is frozen**:

- The snake tick timer halts; the snake does not advance.
- Food lifetime countdowns (berry 6s, star 4s) halt and resume from where they were.
- Power-up icon expiry timer (8s on the board) halts.
- Active power-up effect duration timers (slow-mo 5s, ghost 4s, double 8s) halt.
- All Phaser tweens (snake movement tween, level banner, score popups, food spawn pop-in) halt and resume on unpause.
- The respawn invulnerability timer halts.
- Background music ducks to ~30% of its current volume during pause; SFX are not played.

On unpause, all timers resume from their paused values; nothing snaps forward. This is implemented by toggling `scene.scene.pause('GameScene')` (Phaser pauses the scene's update + tween loops together), plus an explicit pause flag for any timers managed outside Phaser's tween system.

**Input ownership when paused:** because pausing GameScene also halts its input listeners, ESC-to-resume and the Resume button must be owned by **PauseScene**. PauseScene is launched (`scene.launch('PauseScene')`) on top of the paused GameScene; its own ESC handler and button trigger `scene.resume('GameScene')` and stop PauseScene. GameScene only owns ESC-to-pause; PauseScene only owns ESC-to-resume.

**Tab-hidden auto-pause:** when the browser tab becomes hidden (`visibilitychange` → hidden), the game force-pauses. **Returning to the tab does not auto-resume** — the PauseScene stays up until the player explicitly clicks Resume or presses ESC. This is the kid-friendly default: it prevents losing a run because a parent walked into the room and the kid looked away.

## 6. Visual design — "Candy Pop"

### 6.1 Color tokens

| Token | Color | Use |
|---|---|---|
| `bg-gradient` | linear-gradient 135deg `#ffe9f3` → `#ffeede` → `#e6f3ff` | Page background |
| `surface` | `#fffbf7` | Play card |
| `snake` | gradient `#3ecf8e` → `#7be495` | Snake body (segments fade lighter toward tail) |
| `apple` | gradient `#ff4d6d` → `#ff7a8a` | Regular food |
| `berry` | gradient `#a855f7` → `#c084fc` | Bonus food |
| `star/obstacle` | gradient `#fbbf24` → `#fde68a` | Star food and obstacles (different shapes) |
| `accent-purple` | `#7a5cff` | Level pill, power-up timer ring |

### 6.2 Typography

- **Family:** Nunito (Google Fonts), with `system-ui, sans-serif` fallback.
- **Weights:** 800 for HUD numbers and titles, 600 for buttons/labels, 400 for body.

### 6.3 Layout

- **HUD** sits above the play card on a horizontal pill row: hearts (left), level pill (center), score pill + active power-up icon (right).
- **Play card** is a centered rounded surface (`24px` corner radius, soft drop shadow `0 24px 48px rgba(122,92,255,.18)`), with a subtle radial-dot grid pattern at low opacity.
- Snake segments are circles with size decreasing slightly from head (24px) to tail (~20px) and color fading lighter toward the tail.
- Snake head has two black eyes and faint pink blush — gives it a friendly face. The head rotates so the eyes always face the direction of travel.
- All food items have a soft drop shadow in their own hue and a small specular highlight.

### 6.4 Animations

| Event | Animation |
|---|---|
| Snake moves | Each segment tweens to its new cell (ease: `cubic.out`, duration 0.7 × `tickMs`) |
| Food spawned | Pop-in scale tween (0 → 1.1 → 1.0, ~250ms) |
| Berry on board | Continuous gentle pulse halo |
| Star on board | Continuous slow rotate + sparkle particles |
| Food eaten | Score popup (`+10!`, `+30!`, `+50!`) tweens upward and fades over ~700ms |
| Heart lost | Snake flashes red 2× over ~400ms; heart icon shrinks and fades out |
| Level up | Banner slides in from left, holds, slides out to right; chime SFX |
| Power-up active | Subtle aura/glow on the snake matching the power-up color |
| Game over | Snake fades and crumbles (segments scatter slightly), modal fades in |

## 7. Audio

- All SFX from CC0 sources (Pixabay, freesound.org, Kenney.nl).
- One soft, looping background track — chiptune-ish, kid-friendly, ~50% default volume.
- Sound on/off toggle on Menu and Pause screens; persisted in `localStorage`. Default: ON.
- **Audio gating:** browsers block audio playback before the first user gesture. The first qualifying gesture (Play button, sound toggle, any keypress on the menu) **unlocks** the audio context for the rest of the session. SFX are silent before that point.
  - If the unlocking gesture is the Play button or any keypress *and* sound is on: BGM starts audibly.
  - If the unlocking gesture is the sound toggle being switched **off** (sound was previously on, user turned it off as their first action): the audio context still unlocks, but BGM does **not** start audible playback. It will start when the user later toggles sound back on.
  - If sound was already off (persisted from a previous session): the first gesture still unlocks the context but BGM stays silent until the user enables sound.
- The sound toggle, when off, mutes everything (BGM and SFX); when toggled back on, BGM starts/resumes.

| SFX | Trigger |
|---|---|
| `chomp` | Eat apple |
| `pop` | Eat berry |
| `chime` | Eat star |
| `power-up` | Pick up any power-up |
| `level-up` | Cross a level threshold |
| `oof` | Lose a life |
| `game-over` | Game over (after final death) |
| `bgm` | Menu and Game scenes (loops) |

## 8. Controls

### 8.1 Desktop

- **Arrow keys** or **WASD** — change direction
- **ESC** — pause/resume
- **Space** — start (on Menu) / restart (on GameOver)

### 8.2 Touch

- **Swipe** anywhere on the play card — change direction. Minimum swipe distance 25px. The dominant axis (`abs(dx)` vs `abs(dy)`) determines whether the swipe is horizontal or vertical.
- **Pause button** — small icon in the top-left of HUD on touch devices.
- 180° reversal is blocked on both inputs.

## 9. Persistence

| Key | Type | Purpose | Default |
|---|---|---|---|
| `candy-snake:high-score` | number | Best score ever | 0 |
| `candy-snake:sound-on` | boolean | Sound preference | `true` |

That's all. No accounts, no backend.

## 10. Responsive layout

- **≥768px (desktop/tablet landscape):** 560px-wide play card centered; HUD inline above.
- **<768px (phone/tablet portrait):** play card scales to `min(viewportWidth - 32px, 480px)`; cell size scales accordingly; fonts reduce ~15%; HUD pills wrap to two rows if needed.

## 11. Architecture

### 11.1 File structure

```
snake-kids/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── public/
│   └── audio/                    # 8 SFX/music files
└── src/
    ├── main.ts                   # Phaser game config + bootstrap
    ├── config.ts                 # numeric constants
    ├── types.ts                  # shared types (Direction, FoodKind, PowerUpKind)
    ├── storage.ts                # localStorage wrappers
    ├── scenes/
    │   ├── BootScene.ts
    │   ├── MenuScene.ts
    │   ├── GameScene.ts
    │   ├── PauseScene.ts
    │   └── GameOverScene.ts
    ├── game/
    │   ├── Snake.ts              # head+body state, movement, collision tests
    │   ├── Grid.ts               # cell ↔ pixel helpers
    │   ├── FoodSpawner.ts        # weighted food kind picker, power-up drops
    │   ├── PowerUps.ts           # active power-up state machine
    │   └── Progression.ts        # level → tickMs, obstacle count
    ├── ui/
    │   ├── HUD.ts                # hearts, score, level, power-up timer ring
    │   ├── ScorePopup.ts         # "+10!" floating tween
    │   ├── LevelBanner.ts        # "Level N" slide-in/out
    │   └── theme.ts              # color tokens, font, easings
    └── input/
        ├── KeyboardInput.ts
        └── SwipeInput.ts
```

### 11.2 Boundaries

Three principles drive the structure:

1. **Game logic is separated from Phaser.** Modules in `src/game/` operate on grid state and emit events. They can be unit-tested without booting a Phaser scene. Scenes consume them.
2. **Single sources of truth.** `config.ts` holds all numeric tweaks (grid size, tick speeds, level curve, drop probabilities). `theme.ts` holds all colors, fonts, easings. Adjusting feel = editing one file.
3. **Input is an adapter.** `KeyboardInput` and `SwipeInput` both emit a unified `DirectionChange` event. `GameScene` listens to that event without knowing the source.

### 11.3 Key types

```ts
type Direction = 'up' | 'down' | 'left' | 'right';
type FoodKind = 'apple' | 'berry' | 'star';
type PowerUpKind = 'slowmo' | 'ghost' | 'double';
type Cell = { x: number; y: number };
```

## 12. Testing approach

- **Unit tests** (Vitest) for `src/game/` modules: snake movement, collision detection, food spawn weighting, level progression curve, power-up state machine.
- **No tests for `src/scenes/` and `src/ui/`** — these are visual/orchestration code; manual verification in the browser is more useful than testing Phaser scene plumbing.
- **Manual smoke test checklist** for each release: menu loads, play, eat each food kind, pick up each power-up, lose a heart, game over, high score persists across reload, swipe works on touch device.

## 13. Out of scope (future)

- Multiple game modes (Zen / Challenge)
- Unlockable snake skins
- Achievements panel
- Online leaderboard
- Tutorial / how-to-play scene
- Difficulty selector

## 14. Success criteria

- A 9–12 year old can open the URL, understand what to do without instructions, and play to a "game over" within 60 seconds.
- High score persists across browser sessions.
- Swipe controls work on iPad without registering a swipe as a tap or vice versa.
- All SFX play within 100ms of their trigger.
- No layout breaks at common viewports: 1440×900, 1024×768, 768×1024 (iPad portrait), 390×844 (iPhone 14).
