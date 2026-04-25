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
        hist: { type: 'history', history: 'deep' },
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
