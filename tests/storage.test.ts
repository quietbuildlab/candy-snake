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
