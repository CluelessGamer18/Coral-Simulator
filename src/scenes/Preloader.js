import Phaser from "phaser";

export class Preloader extends Phaser.Scene {
    constructor() {
        super('Preloader');
    }

init() {
  const { width, height } = this.scale;

  this.add.rectangle(width / 2, height / 2, 468, 32).setStrokeStyle(2, 0xffffff);

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

/* 
The update function is called every frame. 
It smoothly animates the progress bar by interpolating between the current displayProgress and the actualProgress. 
- Transitions to the game when complete.
*/
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

/*
All assets for Phaser are preloaded here. This includes images, spritesheets, and audio. 
The loading progress is displayed with progress bar. See above.
*/
preload() {
        // every path below is relative to public/assets/ (respects Vite's base path)
        this.load.setPath(import.meta.env.BASE_URL + 'assets/');

        // cursor-following fish
        this.load.image("Guide","fish/fish.png")

        // health hearts shown above the fish
        this.load.svg("heartFull", "health/heart_full.svg", { width: 33, height: 30 });
        this.load.svg("heartHalf", "health/heart_half.svg", { width: 33, height: 30 });
        this.load.svg("heartDead", "health/heart_dead.svg", { width: 33, height: 30 });

        // food the fish can eat to heal
        this.load.svg("algaeOrb", "food/algae_orb.svg", { width: 30, height: 30 });

        // bubbles
        this.load.image("PollutionBubble","bubbles/pollutionBubble.png")
        this.load.image("TempBubble","bubbles/tempBubble.png")
        this.load.image("LightBubble","bubbles/light_levelBubble.png")

        // spritesheets for fishes and shells
        this.load.spritesheet('fishTypes', 'fish/fishSpriteSheet.png', { frameWidth: 239, frameHeight: 239 });
        this.load.spritesheet('shellTypes', 'shells/shellSpriteSheet.png', { frameWidth: 55, frameHeight: 55 });

        // corals
        this.load.spritesheet("acropora", "corals/acropora.png", { frameWidth: 180, frameHeight: 190 });
        this.load.spritesheet("acropora1", "corals/acropora1.png", { frameWidth: 186, frameHeight: 106 });
        this.load.spritesheet("acropora2", "corals/acropora2.png", { frameWidth: 190.66, frameHeight: 81.52 });
        this.load.spritesheet("acropora3", "corals/acropora3.png", { frameWidth: 180, frameHeight: 190 });
        this.load.spritesheet("montipora", "corals/montipora.png", { frameWidth: 180, frameHeight: 190 });
        this.load.spritesheet("staghorn1", "corals/staghorn1.png", { frameWidth: 180, frameHeight: 190 });
        this.load.spritesheet("staghorn2", "corals/staghorn2.png", { frameWidth: 180, frameHeight: 190 });
        this.load.image("columnarColourful", "corals/ColumnarColour.png");
        this.load.image("columnarBlue", "corals/ColumnarBlue.png");
        this.load.image("digitateBlue", "corals/DigitateBlue.png");
        this.load.image("digitatePurple", "corals/DigitatePurple.png");
        this.load.image("foliosBrown", "corals/FoliosBrown.png");
        this.load.image("foliosOrange", "corals/FoliosOrange.png");
        this.load.image("tabularBlue", "corals/TabularBlue.png");
        this.load.image("tabularGreen", "corals/TabularGreen.png");

        this.load.image("Columnar-1", "corals/Columnar-1.png");
        this.load.image("Columnar-2", "corals/Columnar-2.png");
        this.load.image("Columnar-3", "corals/Columnar-3.png");
        this.load.image("Columnar-4", "corals/Columnar-4.png");
        this.load.image("Digitate-1", "corals/Digitate-1.png");
        this.load.image("Digitate-2", "corals/Digitate-2.png");
        this.load.image("Digitate-3", "corals/Digitate-3.png");
        this.load.image("Digitate-4", "corals/Digitate-4.png");
        this.load.image("Digitate-5", "corals/Digitate-5.png");
        this.load.image("Flat-Tabular-1", "corals/Flat-Tabular-1.png");
        this.load.image("Flat-Tabular-2", "corals/Flat-Tabular-2.png");
        this.load.image("Flat-Tabular-3", "corals/Flat-Tabular-3.png");
        this.load.image("Folios-1", "corals/Folios-1.png");
        this.load.image("Folios-2", "corals/Folios-2.png");
        this.load.image("Tabular-1", "corals/Tabular-1.png");
        this.load.image("Tabular-2", "corals/Tabular-2.png");
        this.load.image("Tabular-3", "corals/Tabular-3.png");

        // background layers
        this.load.image("floor_layer0", "background/foreforeground_2860x161.png")
        this.load.image("floor_layer1", "background/foreground_2860x467.png")
        this.load.image("floor_layer2", "background/middleground_2072x691.png")
        this.load.image("floor_layer3", "background/farground_1440x804.png")
        this.load.image("surface", "background/surface_1440x155.png")

        this.load.image("badOutline", "background/endangeredCoralOutline.png")

        this.load.spritesheet("pipe", "background/sewage_spritesheet.png", { frameWidth: 577.93, frameHeight: 267.17 })

        // audio
        this.load.audio('bubblePop', ['audio/BubblePOP.mp3']);
        this.load.audio('background_music', ['audio/Background.mp3']);
    }

    create() {
        //  When all the assets have loaded, global objects can be declared here that the rest of the game can use.
        //  For example, you can define global animations here, so they can be used in other scenes.
    }
}

export default Preloader;