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
        this.add.text(width / 2, height / 2 - 20, hs > 0 ? `Best: ${hs}` : 'Press Space to play', { fontFamily: THEME.font.family, fontSize: '20px', color: '#6b6b8a' })
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
