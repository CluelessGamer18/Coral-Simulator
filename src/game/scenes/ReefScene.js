import Phaser from "phaser";
import { createFishSchools } from "../fishSchools.js";
import { CoralReef } from "../CoralReef.js";
import { CORAL_KIND_IDS } from "../coralKinds.js";
import { BubbleManager } from "../BubbleManager.js";
import { BLEACHING_NOTICE_ID, Climate } from "../Climate.js";
import { NestBuilding } from "../NestBuilding.js";
import { PlayerFish } from "../PlayerFish.js";
import { Hearts } from "../Hearts.js";
import { Stamina } from "../Stamina.js";
import { FOOD_INTERVAL_MS, Food } from "../Food.js";
import { Predators } from "../Predators.js";
import { OceanSounds } from "../OceanSounds.js";
import { MusicPlayer } from "../MusicPlayer.js";
import { exposeForDebugging } from "../debug.js";
import { TEXTURES } from "../assetKeys.js";
import { GAME_EVENTS, SCENE_KEYS } from "../gameEvents.js";
import { asset } from "../../assetUrl.js";
import { getEffectiveVolumes, loadOceanSounds } from "../../settings.js";
import {
    COLORS,
    DEPTH,
    FISH_SPEED,
    FOOD_GROWTH,
    FRAME_MS_AT_60FPS,
    GAME_DURATION_MS,
    GAME_HEIGHT,
    GAME_WIDTH,
    GAME_YEARS,
    HIDE_DISTANCE,
    MAX_FRAME_MS,
    MAX_POLLUTION,
    NORMAL_LIGHT,
    PLAY_AREA,
    SPRINT_MULTIPLIER,
    STARTING_POLLUTION,
    SUMMER_DURATION_MS,
    WORLD_HEIGHT,
    WORLD_WIDTH,
    YEAR_DURATION_MS,
} from "../gameConfig.js";

const STATS_INTERVAL_MS = 250; // how often React hears the clock move on
const HISTORY_SAMPLES_PER_YEAR = 8; // points per year on the end screen's charts

// The camera follows the fish when it swims near the side of the screen, as well as moving with the other set of keys
const EDGE_SCROLL_ZONE = 300; // px from the side of the screen where the camera starts to scroll
const CAMERA_SMOOTHING = 0.15;
const CAMERA_KEYS = { acceleration: 0.06, drag: 0.0005, maxSpeed: 1.0 };

// The screen brightens or darkens with the light, a red frame closes in as stress rises, and a second sewage pipe
// starts running as pollution rises. Each overlay eases toward its target a little every frame.
const OVERLAY_FADE = 0.06; // how much of the way each overlay moves to its target per 60fps frame
const BRIGHT_OVERLAY = { range: 3000, max: 0.1 }; // light above normal, and how bright it can get
const DARK_OVERLAY = { range: 500, max: 0.6 }; // light below normal, and how dark it can get
const STRESS_OUTLINE_FROM = 60; // stress at which the red frame starts to show
const STRESS_OUTLINE_OVERHANG = 95; // px the blurred frame reaches past each edge of the screen
const SECOND_PIPE_FROM = 3; // pollution at which the second pipe starts to run
const PIPE_RAISE = 60; // px the pipes sit above the bottom of the world
const PIPE_ANGLE = -15;

/*
The main game: ten years on the reef. Runs the clock, the fish and the camera, and ties together the systems that each
look after one part of the reef (Climate, CoralReef, BubbleManager, NestBuilding, Food, Predators). React hears about
it through game.events (see the README) and calls the set... methods below when the player changes a setting.
*/
class ReefScene extends Phaser.Scene {
    constructor() {
        super(SCENE_KEYS.reef);
        this.tutorialComplete = false;
    }

    // The tutorial starts this scene with { tutorialComplete: true } once the player has finished it
    init(data) {
        if (data?.tutorialComplete) this.tutorialComplete = true;
    }

    create() {
        const camera = this.cameras.main;
        camera.fadeIn(600, 0, 0, 0);

        this.setupState();
        this.climate = new Climate(this);
        this.setupWorld();
        this.setupPlayer();
        this.setupOverlays();
        this.setupAudio(); // after the player: Ocean Sounds needs to know where the fish is
        this.setupControls(camera);
        this.recordHistory();

        this.food = new Food(this);
        this.nestBuilding = new NestBuilding(this, WORLD_WIDTH / 2);
        this.bubbles = new BubbleManager(this);
        this.predators = new Predators(this);

        // Start at the nest
        const { nest } = this.nestBuilding;
        this.player.setPosition(nest.x, nest.y - 100);
        this.hearts.follow(this.player);
        camera.scrollX = Phaser.Math.Clamp(nest.x - camera.width / 2, 0, WORLD_WIDTH - camera.width);

        exposeForDebugging(this);
        // Only tell React about the scene once everything above has been set up
        this.game.events.emit(GAME_EVENTS.sceneReady, this);
        // After a restart React is already listening, so send it the reset values
        this.emitStats();
        // React shows the "Survive all 10 years!" card at the start of every game
        if (this.tutorialComplete) this.game.events.emit(GAME_EVENTS.goalReminder);
    }

    setupState() {
        this.simEnd = false;
        this.fishDead = false;
        this.elapsedSimMs = 0;
        this.yearsElapsed = 0;
        this.season = "summer";
        this.lastSeason = "summer";
        this.statsTimer = 0;
        this.coralInfoOpen = false;
        this.isHiding = false;
        this.isHidingInNest = false;
        this.hidePrompt = "";
        this.foodEaten = 0;
        this.nextFoodIntervalMs = FOOD_INTERVAL_MS; // when the fish next gets hungrier and a shellfish turns up
        this.cameraVelocityX = 0;

        // What the end screen's charts show: one sample HISTORY_SAMPLES_PER_YEAR times a year (see recordHistory)
        this.history = { years: [], stress: [], temperature: [], light: [], pollution: [] };
        this.nextHistorySample = 0; // index of the next sample to take
    }

    setupWorld() {
        this.cameras.main.setBackgroundColor(COLORS.seaBackground);

        // Each background layer is two copies of its image side by side, and scrolls just fast enough to show all of
        // it across the world: the wider the layer, the nearer it looks
        const addLayer = (key, depth, bottomAligned = true) => {
            const imageWidth = this.textures.getFrame(key).width;
            const scrollFactorX = (imageWidth * 2 - GAME_WIDTH) / (WORLD_WIDTH - GAME_WIDTH);
            for (let i = 0; i < 2; i++) {
                const layer = this.add
                    .image(i * imageWidth, 0, key)
                    .setOrigin(0, 0)
                    .setDepth(depth)
                    .setScrollFactor(scrollFactorX, 1);
                layer.y = bottomAligned ? WORLD_HEIGHT - layer.height : -10;
            }
        };

        addLayer(TEXTURES.seaFloorFar, DEPTH.seaFloorFar);
        addLayer(TEXTURES.seaFloorMiddle, DEPTH.seaFloorMiddle);
        createFishSchools(this);
        this.reef = new CoralReef(this);

        // Sewage pipes: the second one fades in over the first as pollution rises (see updateOverlays)
        const addPipe = (frame, alpha) => {
            const pipe = this.add
                .image(0, 0, TEXTURES.sewagePipe, frame)
                .setOrigin(0, 0)
                .setDepth(DEPTH.sewagePipe)
                .setAngle(PIPE_ANGLE)
                .setAlpha(alpha);
            pipe.y = WORLD_HEIGHT - pipe.height - PIPE_RAISE;
            return pipe;
        };
        this.pipe = addPipe(1, 1);
        this.secondPipe = addPipe(0, 0);

        addLayer(TEXTURES.seaFloorNear, DEPTH.seaFloorNear);
        addLayer(TEXTURES.seaFloorFront, DEPTH.seaFloorFront);
        addLayer(TEXTURES.surface, DEPTH.surface, false);
    }

    setupPlayer() {
        this.player = new PlayerFish(this, 300, 300);
        this.player.setInteractive(); // so a click on the fish doesn't open the coral behind it
        this.hearts = new Hearts(this, { pulseWhenLow: true });
        this.stamina = new Stamina(this);
    }

    // Fixed to the screen horizontally (scroll factor 0), but they move with the camera when it zooms in on the nest
    setupOverlays() {
        // A soft blur with no detail, so the image is a quarter of this size and stretched (see scripts/build-art.py)
        this.stressOutline = this.add
            .image(-STRESS_OUTLINE_OVERHANG, -STRESS_OUTLINE_OVERHANG, TEXTURES.stressOutline)
            .setOrigin(0, 0)
            .setDepth(DEPTH.stressOutline)
            .setAlpha(0)
            .setDisplaySize(GAME_WIDTH + STRESS_OUTLINE_OVERHANG * 2, GAME_HEIGHT + STRESS_OUTLINE_OVERHANG * 2)
            .setScrollFactor(0, 1);

        const addOverlay = (color) =>
            this.add
                .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, color, 1)
                .setOrigin(0, 0)
                .setDepth(DEPTH.lightOverlay)
                .setAlpha(0)
                .setScrollFactor(0, 1);
        this.brightOverlay = addOverlay(0xffffff);
        this.darkOverlay = addOverlay(0x000000);
    }

    setupAudio() {
        // Only read the saved volumes on the first run: a restart reuses this scene, and React won't send them again
        const volumes = getEffectiveVolumes();
        this.musicVolume ??= volumes.music;
        this.sfxVolume ??= volumes.sfx;

        // Streamed rather than loaded by Phaser, and stops itself when the scene shuts down (see MusicPlayer.js)
        this.musicPlayer = new MusicPlayer(this, asset("assets/audio/background_music.mp3"), this.musicVolume);

        // Read straight from the saved setting: React only sends it once this scene is ready, which would let the
        // music start first
        this.oceanSounds = new OceanSounds(this, this.musicVolume);
        this.setOceanSounds(loadOceanSounds());

        // The sound manager belongs to the whole game, not this scene, so sounds added here outlive a restart.
        // Destroy them whenever the scene shuts down (restart or stop) so a new copy isn't left behind each time.
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.musicPlayer = null;
            this.oceanSounds.destroy();
            this.oceanSounds = null;
        });
    }

    setupControls(camera) {
        this.arrowKeys = this.input.keyboard.createCursorKeys();
        this.wasdKeys = this.input.keyboard.addKeys({ up: "W", left: "A", down: "S", right: "D" });
        this.hideKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.sprintKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // Restarting removes the keys, so they're handed out again here. React sets the scheme on a new scene.
        this.setControlScheme(this.controlScheme ?? "wasd");

        camera.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    }

    /**
     * One set of keys swims and the other moves the camera. Called by App when the choice changes.
     * @param {"wasd" | "arrows"} scheme the keys that swim
     */
    setControlScheme(scheme) {
        this.controlScheme = scheme;
        const usesArrows = scheme === "arrows";
        this.moveKeys = usesArrows ? this.arrowKeys : this.wasdKeys;
        const { left, right, up, down } = usesArrows ? this.wasdKeys : this.arrowKeys;
        this.cameraKeys = new Phaser.Cameras.Controls.SmoothedKeyControl({
            camera: this.cameras.main,
            left,
            right,
            up,
            down,
            ...CAMERA_KEYS,
        });

        // A key held during the switch would otherwise stay down
        [...Object.values(this.wasdKeys), ...Object.values(this.arrowKeys)].forEach((key) => key.reset());
    }

    // The values React shows in the UI. Sent with emitStats() whenever one of them changes, so React doesn't have to
    // copy them from the scene every frame.
    getStats() {
        const { climate } = this;
        return {
            stress: climate.stress,
            light: climate.light,
            temperature: climate.temperature,
            pollution: climate.pollution,
            yearsElapsed: this.yearsElapsed,
            season: this.season,
            simEnd: this.simEnd,
            reefDead: climate.reefDead,
            fishDead: this.fishDead,
            corals: { collected: [...this.reef.collected], total: CORAL_KIND_IDS.length },
            // Only the end screen draws the charts, so the history is only copied out once the game is over
            history: this.simEnd ? this.getHistory() : null,
        };
    }

    // Copies, because the scene keeps its own arrays and React needs new ones to notice a change
    getHistory() {
        const { years, stress, temperature, light, pollution } = this.history;
        return {
            years: [...years],
            stress: [...stress],
            temperature: [...temperature],
            light: [...light],
            pollution: [...pollution],
            peakStress: this.climate.peakStress,
        };
    }

    emitStats() {
        this.game.events.emit(GAME_EVENTS.statsChanged, this.getStats());
    }

    /** @param {number} volume 0 to 1, already 0 if muted */
    setMusicVolume(volume) {
        this.musicVolume = volume;
        this.musicPlayer?.setVolume(volume);
        this.oceanSounds?.setVolume(volume);
    }

    /** @param {number} volume 0 to 1, already 0 if muted */
    setSfxVolume(volume) {
        this.sfxVolume = volume;
    }

    /**
     * Ocean Sounds and the music replace each other.
     * @param {boolean} enabled
     */
    setOceanSounds(enabled) {
        if (!this.oceanSounds) return; // React can still reach this scene just after it shuts down

        this.oceanSounds.setEnabled(enabled);
        if (enabled) {
            this.musicPlayer.pause();
        } else if (!this.musicPlayer.isPlaying) {
            this.musicPlayer.play();
        }
    }

    update(time, delta) {
        delta = Math.min(delta, MAX_FRAME_MS); // so the reef never ages faster than the fish can move
        this.oceanSounds.update(delta); // before the check below, so a dying reef still fades out behind the end screen
        this.reef.cull();
        this.reef.sway();
        this.updateOverlays(delta);

        // Freeze the fish, camera and clock once the end screen is showing
        if (this.simEnd) return;

        const clockIsRunning = this.tutorialComplete && !this.coralInfoOpen;
        if (clockIsRunning) {
            this.advanceClock(delta);
            if (this.simEnd) {
                this.endSim();
                return;
            }
            this.predators.updateSpawns(this.elapsedSimMs);

            this.statsTimer += delta;
            if (this.statsTimer >= STATS_INTERVAL_MS) {
                this.statsTimer %= STATS_INTERVAL_MS;
                this.emitStats();
            }
        }

        const frameScale = delta / FRAME_MS_AT_60FPS;
        this.bubbles.update(delta);
        this.updateFish(delta, frameScale);

        this.predators.update(delta, frameScale);
        this.predators.updateBites(delta);
        if (this.simEnd) this.endSim();
        if (this.tutorialComplete) this.checkFood();

        this.updateCamera(delta, frameScale);
        this.player.updateFloorShadow(!this.isHiding);
        this.hearts.follow(this.player);
        this.updateHidePrompt();
        this.nestBuilding.update(delta, clockIsRunning, this.hidePrompt);
    }

    // Moves the game's clock on, and everything that happens with it: the seasons, the climate, the fish's hunger
    advanceClock(delta) {
        this.elapsedSimMs = Math.min(this.elapsedSimMs + delta, GAME_DURATION_MS);
        this.yearsElapsed = this.elapsedSimMs / YEAR_DURATION_MS;
        this.season = this.elapsedSimMs % YEAR_DURATION_MS < SUMMER_DURATION_MS ? "summer" : "winter";
        if (this.season !== this.lastSeason) this.startSeason(this.season);

        this.climate.update(delta);
        if (this.climate.reefDead) {
            this.simEnd = true;
            this.reef.killAll();
        }
        this.recordHistory();
        this.advanceHunger(); // can starve the fish, which ends the game
        if (this.elapsedSimMs >= GAME_DURATION_MS) this.simEnd = true;
    }

    startSeason(season) {
        if (season === "summer" && Math.floor(this.yearsElapsed) === GAME_YEARS / 2) {
            this.game.events.emit(GAME_EVENTS.randomEvent, {
                title: "Halfway There",
                message: `${GAME_YEARS / 2} years down, ${GAME_YEARS / 2} to go. Survive all ${GAME_YEARS} years!`,
                good: true,
            });
        }
        this.climate.startSeason(season);
        this.lastSeason = season;
        this.emitStats();
    }

    // Once an interval: the fish loses half a heart to hunger and one shellfish turns up to make up for it
    advanceHunger() {
        while (this.elapsedSimMs >= this.nextFoodIntervalMs && this.nextFoodIntervalMs < GAME_DURATION_MS) {
            this.nextFoodIntervalMs += FOOD_INTERVAL_MS;
            this.loseHalfHeart();
            if (this.simEnd) return;
            this.food.spawnFarFrom(this.player.x);
        }
    }

    // Swimming, sprinting and hiding, from the keys
    updateFish(delta, frameScale) {
        const hidePressed = Phaser.Input.Keyboard.JustDown(this.hideKey);
        if (hidePressed) this.hideFish();

        // Holding Space sprints while there's stamina
        const swimming =
            this.tutorialComplete && !this.isHiding && Object.values(this.moveKeys).some((key) => key.isDown);
        const sprinting = this.stamina.update(delta, swimming && this.sprintKey.isDown, this.player);
        this.fishSpeed = FISH_SPEED * (sprinting ? SPRINT_MULTIPLIER : 1);

        this.swimDirection = 0; // which way the fish swims along the screen, for the camera
        if (!this.tutorialComplete) return;

        const horizontal = (this.moveKeys.right.isDown ? 1 : 0) - (this.moveKeys.left.isDown ? 1 : 0);
        const vertical = (this.moveKeys.down.isDown ? 1 : 0) - (this.moveKeys.up.isDown ? 1 : 0);
        const moving = horizontal !== 0 || vertical !== 0;

        // Swimming away leaves the hiding place, except on the frame E was pressed
        if (this.isHiding && moving && !hidePressed) this.leaveHiding();
        if (this.isHiding) return;

        this.player.swim(horizontal, vertical, this.fishSpeed, frameScale, WORLD_WIDTH);
        this.swimDirection = horizontal;
    }

    // Scrolls with the fish when it swims toward either side of the screen, and with the camera keys
    updateCamera(delta, frameScale) {
        const camera = this.cameras.main;
        const { scrollX, width, zoom } = camera;
        const fishScreenX = (this.player.x - scrollX - width / 2) * zoom + width / 2; // the camera zooms around its center
        let targetSpeed = 0;
        if (this.swimDirection > 0 && fishScreenX >= width - EDGE_SCROLL_ZONE) targetSpeed = this.fishSpeed;
        else if (this.swimDirection < 0 && fishScreenX <= EDGE_SCROLL_ZONE) targetSpeed = -this.fishSpeed;

        // the same speed as the fish, so the camera keeps up with it
        this.cameraVelocityX = Phaser.Math.Linear(
            this.cameraVelocityX,
            targetSpeed,
            1 - Math.pow(1 - CAMERA_SMOOTHING, frameScale),
        );
        camera.scrollX = Phaser.Math.Clamp(camera.scrollX + this.cameraVelocityX * frameScale, 0, WORLD_WIDTH - width);

        // The other set of keys moves the camera, except while the fish hides in the nest, when the camera stays on it
        if (!this.isHidingInNest) this.cameraKeys.update(delta);
        this.nestBuilding.updateCamera(this.isHidingInNest, frameScale);
    }

    // Eating always uses up the shellfish, but only heals when the fish isn't already at full health. Every shellfish
    // makes the fish bigger, even at full health.
    checkFood() {
        const shellfish = this.food.findTouching(this.player);
        if (!shellfish || this.simEnd) return;

        this.food.eat(shellfish);
        if (!this.hearts.isFull) this.hearts.setHealth(this.hearts.health + 1);
        this.foodEaten++;
        this.player.growTo(FOOD_GROWTH ** this.foodEaten);
    }

    /** Hunger or a bite. Out of hearts, the fish dies and the game ends. */
    loseHalfHeart() {
        this.hearts.setHealth(this.hearts.health - 1);
        this.player.flashHurt();
        if (this.hearts.health <= 0) {
            this.fishDead = true;
            this.simEnd = true;
        }
    }

    // Everything that has to happen once, when the reef dies, the fish dies or the ten years are up
    endSim() {
        this.simEnd = true;
        this.recordHistory(true);
        this.climate.syncCriticalAlarm();
        this.game.events.emit(GAME_EVENTS.reefWarningCleared, BLEACHING_NOTICE_ID);
        this.emitStats();
    }

    /** Starts a new game in this scene. Called by App's Play Again. */
    restartSim() {
        this.scene.restart();
        this.musicPlayer.pause(); // silence it straight away; it's destroyed when the scene shuts down
    }

    // Adds to the end screen's charts whenever the next sample is due. Called every frame while the clock runs; final
    // is for the last moment of the game, which is recorded whenever it falls so the charts end where the game did.
    recordHistory(final = false) {
        const due = this.yearsElapsed * HISTORY_SAMPLES_PER_YEAR >= this.nextHistorySample;
        if (!due && !final) return;
        if (final && this.history.years.at(-1) === this.yearsElapsed) return;

        const { climate, history } = this;
        this.nextHistorySample = Math.floor(this.yearsElapsed * HISTORY_SAMPLES_PER_YEAR) + 1;
        history.years.push(this.yearsElapsed);
        history.stress.push(climate.stress);
        history.temperature.push(climate.temperature);
        history.light.push(climate.light);
        history.pollution.push(climate.pollution);
    }

    updateOverlays(delta) {
        const { light, stress, pollution } = this.climate;
        const ease = 1 - Math.pow(1 - OVERLAY_FADE, delta / FRAME_MS_AT_60FPS);
        const fade = (object, target) => {
            if (object.alpha === target) return;
            const alpha = Phaser.Math.Linear(object.alpha, target, ease);
            // Snap once it's close: Linear never quite arrives, and Phaser only skips drawing at exactly 0
            object.setAlpha(Math.abs(alpha - target) < 0.004 ? target : alpha);
        };

        fade(
            this.brightOverlay,
            Phaser.Math.Clamp((light - NORMAL_LIGHT) / BRIGHT_OVERLAY.range, 0, BRIGHT_OVERLAY.max),
        );
        fade(this.darkOverlay, Phaser.Math.Clamp((NORMAL_LIGHT - light) / DARK_OVERLAY.range, 0, DARK_OVERLAY.max));
        fade(this.stressOutline, stress >= STRESS_OUTLINE_FROM ? Phaser.Math.Clamp(stress / 100, 0, 1) : 0);
        fade(
            this.secondPipe,
            pollution >= SECOND_PIPE_FROM
                ? Phaser.Math.Clamp((pollution - STARTING_POLLUTION) / MAX_POLLUTION, 0, 1)
                : 0,
        );
    }

    // The hiding spot E would use right now (the nest, or the nearest coral in reach), or undefined
    findHideTarget() {
        if (!this.tutorialComplete || this.coralInfoOpen || this.isHiding || this.simEnd) return undefined;

        const { player } = this;
        const targets = this.reef.corals.map((coral) => ({
            x: coral.x,
            y: Phaser.Math.Clamp(coral.y - coral.displayHeight * 0.45, PLAY_AREA.top, PLAY_AREA.bottom),
            depth: coral.depth,
            distance: Phaser.Math.Distance.Between(player.x, player.y, coral.x, coral.y),
            inNest: false,
        }));
        const nest = this.nestBuilding.getHidePoint();
        targets.push({
            ...nest,
            distance: Phaser.Math.Distance.Between(player.x, player.y, nest.x, nest.y),
            inNest: true,
        });

        // The nest wins whenever it's in reach, since it's the only place that makes a predator leave
        return targets
            .filter(({ distance }) => distance <= HIDE_DISTANCE)
            .sort((a, b) => b.inNest - a.inNest || a.distance - b.distance)[0];
    }

    // "E: hide" above the fish. The nest always shows it; coral only while a predator is out, since corals are
    // everywhere and the hint would otherwise never go away.
    updateHidePrompt() {
        const target = this.findHideTarget();
        if (target?.inNest) this.hidePrompt = "E: hide in nest";
        else if (target && this.predators.hunting) this.hidePrompt = "E: hide";
        else this.hidePrompt = "";
    }

    hideFish() {
        const target = this.findHideTarget();
        if (!target) return;

        this.isHiding = true;
        this.isHidingInNest = target.inNest;
        this.player.hideAt(target);
        if (this.isHidingInNest) {
            this.predators.list.forEach((predator) => this.predators.startFleeing(predator));
        } else if (this.predators.hunting) {
            this.game.events.emit(GAME_EVENTS.randomEvent, {
                title: "Hidden in the Coral",
                message:
                    "The predator can't find you here, but it's waiting nearby. Only your nest makes it leave for good.",
            });
        }
    }

    leaveHiding() {
        this.isHiding = false;
        this.isHidingInNest = false;
        this.player.comeOut();
        this.predators.turnBack();
    }

    /** Called by PhaserGame when the coral popup closes. */
    closeCoralPopup() {
        this.coralInfoOpen = false;
    }
}

export default ReefScene;
