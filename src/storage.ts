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
