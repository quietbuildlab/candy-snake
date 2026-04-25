import Phaser from 'phaser';
export class GameScene extends Phaser.Scene {
    constructor() { super('GameScene'); }
    create() {
        this.add.text(20, 20, 'GameScene (stub)', { color: '#000' });
    }
}
