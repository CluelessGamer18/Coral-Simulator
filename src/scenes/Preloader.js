import Phaser from "phaser";

export class Preloader extends Phaser.Scene {
    constructor() {
        super('Preloader');
    }

init() {
  const { width, height } = this.scale;
  this.failedFiles = [];
  this.loadingDone = false;

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

  // Phaser tries a file three times before giving up on it and reporting it here. Without this the game would
  // start anyway, with black boxes where the missing pictures should be.
  this.load.on('loaderror', (file) => {
    this.failedFiles.push(file.key);
  });

  this.load.on('complete', () => {
    if (this.failedFiles.length === 0) {
      this.loadingDone = true;
    } else {
      // React shows a message with a Reload button (GameProblem in TestGame.jsx)
      console.error("Could not load:", this.failedFiles.join(", "));
      this.game.events.emit("game-problem", "load");
    }
  });
}

/* 
The update function is called every frame. 
It moves the progress bar smoothly towards how much has loaded, at the same pace whatever the frame rate.
- Transitions to the game as soon as loading is complete and the player has pressed Start.
*/
update(time, delta) {
  const ease = 1 - Math.pow(1 - 0.08, Math.min(delta, 50) / (1000 / 60));
  this.displayProgress = Phaser.Math.Linear(this.displayProgress, this.actualProgress, ease);
  this.bar.width = 460 * this.displayProgress;

  if (!this.loadingDone) return;

  // The game starts loading behind the title screen. If it finishes before the player presses Start, stop
  // drawing frames until they do (TestGame.jsx wakes the loop), then go straight in.
  if (!this.registry.get('started')) {
    this.game.loop.sleep();
    return;
  }

  this.scene.start('Tutorial');
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
        this.load.image("grouper", "fish/grouper.png");

        // health hearts shown above the fish
        this.load.svg("heartFull", "health/heart_full.svg", { width: 33, height: 30 });
        this.load.svg("heartHalf", "health/heart_half.svg", { width: 33, height: 30 });
        this.load.svg("heartDead", "health/heart_dead.svg", { width: 33, height: 30 });

        // triggerfish home building: glowing pieces to collect, and the nest crater they go in
        // (pixel art, so sizes are whole multiples of the SVG grid to keep the pixels crisp)
        this.load.svg("homePebble", "home/material_pebble.svg", { width: 48, height: 48 });
        this.load.svg("homeShell", "home/material_shell_fragment.svg", { width: 48, height: 48 });
        this.load.svg("homeCoralRubble", "home/material_coral_rubble.svg", { width: 48, height: 48 });
        this.load.svg("homeStage1", "home/home_stage1.svg", { width: 216, height: 90 });
        this.load.svg("homeStage2", "home/home_stage2.svg", { width: 288, height: 120 });
        this.load.svg("homeStage3", "home/home_stage3.svg", { width: 360, height: 156 });

        // bubbles
        this.load.image("TempBubble","bubbles/tempBubble.png")
        this.load.image("LightBubble","bubbles/light_levelBubble.png")

        // spritesheet for the fish schools
        this.load.spritesheet('fishTypes', 'fish/fishSpriteSheet.png', { frameWidth: 239, frameHeight: 239 });
        // food: shellfish the fish can eat to heal and grow
        this.load.image("isabellaCowrie", "shells/Isabella_cowrie.png");
        this.load.image("honeyCowrie", "shells/honey_cowrie.png");
        this.load.image("fleaCone", "shells/flea_cone.png");
        this.load.image("mulberryDrupe", "shells/mulberry_drupe.png");

        // corals
        // made from the full-size art in assets-src/corals by scripts/build-art.py
        this.load.image("Columnar-1", "corals/Columnar-1.png");
        this.load.image("Columnar-2", "corals/Columnar-2.png");
        this.load.image("Columnar-3", "corals/Columnar-3.png");
        this.load.image("Columnar-4", "corals/Columnar-4.png");
        this.load.image("Digitate-1", "corals/Digitate-1.png");
        this.load.image("Digitate-2", "corals/Digitate-2.png");
        this.load.image("Digitate-3", "corals/Digitate-3.png");
        this.load.image("Digitate-4", "corals/Digitate-4.png");
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

        // sound effects
        this.load.audio('bubblePop', ['audio/BubblePOP.mp3']);
        this.load.audio('foodCrunch', ['audio/FoodCrunch.mp3']);
        this.load.audio('nestPiece', ['audio/NestPiece.mp3']);
        this.load.audio('bleachingWarning', ['audio/BleachingWarning.wav']);
        // The music is streamed (MusicPlayer.js) and the Ocean Sounds recordings load when that mode is turned on
        // (OceanSounds.js), so only the short sound effects are loaded and decoded here.
    }

    create() {
        //  When all the assets have loaded, global objects can be declared here that the rest of the game can use.
        //  For example, you can define global animations here, so they can be used in other scenes.
    }
}

export default Preloader;