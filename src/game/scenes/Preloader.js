import Phaser from "phaser";
import { CORAL_VARIANTS, coralFileName } from "../coralKinds.js";
import { SOUNDS, TEXTURES } from "../assetKeys.js";
import { GAME_EVENTS, REGISTRY_KEYS, SCENE_KEYS } from "../gameEvents.js";
import { FRAME_MS_AT_60FPS, MAX_FRAME_MS } from "../gameConfig.js";

const BAR_WIDTH = 460;
const BAR_HEIGHT = 28;
const BAR_BORDER = 4; // between the bar and its outline, on each side
const BAR_SMOOTHING = 0.08; // how much of the way the bar moves toward the real progress each 60fps frame

/*
The first scene: loads every image and short sound the game needs, with a progress bar, then waits for the player to
press Start on the title screen. The music is streamed (MusicPlayer.js) and the Ocean Sounds recordings load when that
mode is turned on (OceanSounds.js), so neither is loaded here.
*/
class Preloader extends Phaser.Scene {
    constructor() {
        super(SCENE_KEYS.preloader);
    }

    init() {
        const { width, height } = this.scale;
        this.failedFiles = [];
        this.loadingDone = false;
        this.displayProgress = 0;
        this.actualProgress = 0;

        this.add
            .rectangle(width / 2, height / 2, BAR_WIDTH + BAR_BORDER * 2, BAR_HEIGHT + BAR_BORDER)
            .setStrokeStyle(2, 0xffffff);
        this.bar = this.add.rectangle(width / 2 - BAR_WIDTH / 2, height / 2, 0, BAR_HEIGHT, 0xffffff).setOrigin(0, 0.5);

        this.load.on(Phaser.Loader.Events.PROGRESS, (progress) => {
            this.actualProgress = progress;
        });

        // Phaser tries a file three times before giving up on it and reporting it here. Without this the game would
        // start anyway, with black boxes where the missing pictures should be.
        this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file) => {
            this.failedFiles.push(file.key);
        });

        this.load.on(Phaser.Loader.Events.COMPLETE, () => {
            if (this.failedFiles.length === 0) {
                this.loadingDone = true;
            } else {
                // React shows a message with a Reload button (ProblemScreen, from PhaserGame.jsx)
                console.error("Could not load:", this.failedFiles.join(", "));
                this.game.events.emit(GAME_EVENTS.gameProblem, "load");
            }
        });
    }

    preload() {
        // every path below is relative to public/assets/ (and respects Vite's base path)
        this.load.setPath(`${import.meta.env.BASE_URL}assets/`);

        this.load.image(TEXTURES.playerFish, "fish/player_fish.png");
        this.load.image(TEXTURES.grouper, "fish/grouper.png");
        this.load.spritesheet(TEXTURES.fishSchools, "fish/fish_schools.png", { frameWidth: 239, frameHeight: 239 });

        const heartSize = { width: 33, height: 30 };
        this.load.svg(TEXTURES.heartFull, "health/heart_full.svg", heartSize);
        this.load.svg(TEXTURES.heartHalf, "health/heart_half.svg", heartSize);
        this.load.svg(TEXTURES.heartEmpty, "health/heart_empty.svg", heartSize);

        this.load.image(TEXTURES.nest, "nest/nest.png");
        this.load.image(TEXTURES.nestPebble, "nest/pebble.png");
        this.load.image(TEXTURES.nestShell, "nest/shell.png");
        this.load.image(TEXTURES.nestCoralRubble, "nest/coral_rubble.png");

        this.load.image(TEXTURES.lightBubble, "bubbles/light_bubble.png");

        this.load.image(TEXTURES.isabellaCowrie, "shells/isabella_cowrie.png");
        this.load.image(TEXTURES.honeyCowrie, "shells/honey_cowrie.png");
        this.load.image(TEXTURES.fleaCone, "shells/flea_cone.png");
        this.load.image(TEXTURES.mulberryDrupe, "shells/mulberry_drupe.png");

        // made from the full-size art in assets-src/corals by scripts/build-art.py
        for (const variant of Object.keys(CORAL_VARIANTS)) {
            this.load.image(variant, `corals/${coralFileName(variant)}`);
        }

        this.load.image(TEXTURES.seaFloorFar, "background/sea_floor_far.png");
        this.load.image(TEXTURES.seaFloorMiddle, "background/sea_floor_middle.png");
        this.load.image(TEXTURES.seaFloorNear, "background/sea_floor_near.png");
        this.load.image(TEXTURES.seaFloorFront, "background/sea_floor_front.png");
        this.load.image(TEXTURES.surface, "background/surface.png");
        this.load.image(TEXTURES.stressOutline, "background/stress_outline.png");
        this.load.spritesheet(TEXTURES.sewagePipe, "background/sewage_pipe.png", { frameWidth: 578, frameHeight: 267 });

        this.load.audio(SOUNDS.bubblePop, "audio/bubble_pop.mp3");
        this.load.audio(SOUNDS.foodCrunch, "audio/food_crunch.mp3");
        this.load.audio(SOUNDS.nestPiece, "audio/nest_piece.mp3");
        this.load.audio(SOUNDS.bleachingWarning, "audio/bleaching_warning.wav");
    }

    // Moves the progress bar smoothly toward how much has loaded, at the same pace whatever the frame rate, then goes
    // into the tutorial as soon as everything has loaded and the player has pressed Start.
    update(time, delta) {
        const ease = 1 - Math.pow(1 - BAR_SMOOTHING, Math.min(delta, MAX_FRAME_MS) / FRAME_MS_AT_60FPS);
        this.displayProgress = Phaser.Math.Linear(this.displayProgress, this.actualProgress, ease);
        this.bar.width = BAR_WIDTH * this.displayProgress;

        if (!this.loadingDone) return;

        // The game starts loading behind the title screen. If it finishes before the player presses Start, stop
        // drawing frames until they do (PhaserGame.jsx wakes the loop), then go straight in.
        if (!this.registry.get(REGISTRY_KEYS.started)) {
            this.game.loop.sleep();
            return;
        }

        this.scene.start(SCENE_KEYS.tutorial);
    }
}

export default Preloader;
