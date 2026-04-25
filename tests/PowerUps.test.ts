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
