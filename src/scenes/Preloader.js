/*
* Game assets are taken from: https://groovymcgee.itch.io/car-game-pixel-art
*/
export class Preloader extends Phaser.Scene {
    constructor() {
        super('Preloader');
    }

init() {
    const { width, height } = this.scale;

    // Outline
    this.add
        .rectangle(width / 2, height / 2, 468, 32)
        .setStrokeStyle(2, 0xffffff);

    // Progress bar
    const bar = this.add.rectangle(
        width / 2 - 230,    // left edge of outline
        height / 2,
        4,
        28,
        0xffffff
    ).setOrigin(0, 0.5); 

    this.load.on('progress', (progress) => {
        bar.width = 460 * progress;
    });
}

    preload() {
        this.load.image("Guide","./fish.png")
        this.load.image("Fish", "./fish2.png")
        this.load.image("Coral", "./coral1.png")
        this.load.image("Coral2", "/assets/wireframe1/pink_coral_wireframe1.png")
        this.load.image("Trash", "./trashbag.jpg")
        this.load.image("Bubble","./normalbubble.png")

        //spritesheet
        this.load.spritesheet('orangeCoral', '/assets/wireframe1/orange-coral_180x190_5_wireframe1.png', { frameWidth: 180, frameHeight: 190 });

        // wireframe assets
        this.load.image("floor_layer1", "/assets/wireframe2/floor_layer1_7000x512_wireframe2.png") //closest layer = 1
        this.load.image("floor_layer2", "/assets/wireframe2/floor_layer2_4050x650_wireframe2.png")
        this.load.image("floor_layer3", "/assets/wireframe2/floor_layer3_1919x507_wireframe2.png")
        this.load.image("bg_gradient", "./waterStockBg.jpg") //farthest layer = 4

    }

    create() {
        //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
        //  For example, you can define global animations here, so we can use them in other scenes.

        //  Move to the Game scene
        this.scene.start('TestScene');
    }
}

export default Preloader;