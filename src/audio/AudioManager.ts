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
    try {
      bgm = game.sound.add('bgm', { loop: true, volume: CONFIG.audio.bgmVolume });
      bgm.play();
    } catch { /* asset missing — fail silently */ }
  },
  duckBgm() { if (bgm && 'volume' in bgm) (bgm as { volume: number }).volume = CONFIG.audio.bgmDuckedVolume; },
  unduckBgm() { if (bgm && 'volume' in bgm) (bgm as { volume: number }).volume = CONFIG.audio.bgmVolume; },
  play(key: string) {
    if (!unlocked || !soundOn || !game) return;
    try { game.sound.play(key); } catch { /* asset missing — silent */ }
  }
};
