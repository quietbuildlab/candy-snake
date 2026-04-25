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
