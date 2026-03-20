/*
* Game assets are taken from: https://groovymcgee.itch.io/car-game-pixel-art
*/
export class Preloader extends Phaser.Scene {
    constructor() {
        super('Preloader');
    }

init() {
  const { width, height } = this.scale;

  this.add
    .rectangle(width / 2, height / 2, 468, 32)
    .setStrokeStyle(2, 0xffffff);

  this.bar = this.add.rectangle(
    width / 2 - 230,
    height / 2,
    4,
    28,
    0xffffff
  ).setOrigin(0, 0.5);

  this.displayProgress = 0;
  this.actualProgress = 0; 

  this.load.on('progress', (progress) => {
    this.actualProgress = progress;
  });
    this.load.on('complete', () => {
  this.loadingDone = true;
});
}


update() {
  this.displayProgress = Phaser.Math.Linear(
    this.displayProgress,
    this.actualProgress,
    0.08
  );

  this.bar.width = 460 * this.displayProgress;

          if (this.loadingDone && this.displayProgress > 0.95) {
        this.scene.start('TestScene');
        }
}

    preload() {
        this.load.image("Guide","./fish.png")
        this.load.image("Coral2", "/assets/wireframe1/pink_coral_wireframe1.png")
        this.load.image("PollutionBubble","/assets/wireframe4/pollutionBubble.png")
        this.load.image("TempBubble","/assets/wireframe4/tempBubble.png")
        this.load.image("LightBubble","/assets/wireframe4/light_levelBubble.png")

        

        //spritesheet
        this.load.spritesheet('orangeCoral', '/assets/wireframe1/orange-coral_180x190_5_wireframe1.png', { frameWidth: 180, frameHeight: 190 });
        this.load.spritesheet('fishTypes', '/assets/wireframe4/fishSpriteSheet.png', { frameWidth: 239, frameHeight: 239 });
        this.load.spritesheet('shellTypes', '/assets/wireframe4/shellSpriteSheet.png', { frameWidth: 55, frameHeight: 55 });

        //corals
        this.load.spritesheet("acropora", "/assets/corals/acropora.png", { frameWidth: 180, frameHeight: 190 });
        this.load.spritesheet("acropora1", "/assets/corals/acropora1.png", { frameWidth: 186, frameHeight: 106 });
        this.load.spritesheet("acropora2", "/assets/corals/acropora2.png", { frameWidth: 191, frameHeight: 82 });
        this.load.spritesheet("acropora3", "/assets/corals/acropora3.png", { frameWidth: 180, frameHeight: 190 });
        this.load.spritesheet("montipora", "/assets/corals/montipora.png", { frameWidth: 180, frameHeight: 190 });
        this.load.spritesheet("staghorn1", "/assets/corals/staghorn1.png", { frameWidth: 180, frameHeight: 190 });
        this.load.spritesheet("staghorn2", "/assets/corals/staghorn2.png", { frameWidth: 180, frameHeight: 190 });

        // wireframe assets
        this.load.image("floor_layer0", "/assets/wireframe4/foreforeground_2860x161.png")
        this.load.image("floor_layer1", "/assets/wireframe4/foreground_2860x467.png") //closest layer = 1
        this.load.image("floor_layer2", "/assets/wireframe4/middleground_2072x691.png")
        this.load.image("floor_layer3", "/assets/wireframe4/farground_1440x804.png") //farthest layer = 4
        this.load.image("surface", "/assets/wireframe4/surface_1440x155.png")

        this.load.image("pipe", "/assets/wireframe1/pipe_808x808.png")


        this.load.audio('bubblePop', [
            'assets/BubblePOP.mp3'
        ]);
    }

    create() {
        //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
        //  For example, you can define global animations here, so we can use them in other scenes.
    }
}

export default Preloader;