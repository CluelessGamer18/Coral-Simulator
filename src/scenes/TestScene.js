import Phaser from "phaser";
import { createFishSchools } from "./FishSchools.js";
import { createCorals, cullCorals, swayCorals, updateCoralStress, resetCorals, countLivingCorals, CORAL_KIND_IDS } from "./CoralManager.js";
import { EventManager } from "./Events.js";
import { createHomeBuilding, updateHomeBuilding, updateNestCamera, HOME_STAGES } from "./HomeBuilding.js";
import { addGlow, removeGlow, addShadow } from "./Glow.js";
import { SUMMER_TEMPERATURE_RISE } from "./BleachingSchedule.js";
import {
    createReef, stepReef, isOver, isHeatwave, getYearsElapsed, getCalendarYear, getHeatwaveRise, getHeatSeverity,
    getPollutionMultiplier, getSecondsLeftInSeason, NORMAL_LIGHT, MAX_SHADE,
} from "./reefModel.js";
import { Objectives, YEAR_PLANS, getChapter, newYearStats } from "./Objectives.js";
import {
    createWinterJobs, startWinterJob, endWinterJob, updateWinterJobs, spawnFragments, findNearestDeadCoral,
    isPipeOpen, PIPE_MOUTH, PIPE_FROM_YEAR, PIPE_ROCKS_NEEDED,
} from "./WinterJobs.js";
import { EdgeIndicators } from "./EdgeIndicators.js";
import { createPointerControls, readMovement, takeVirtualKey, listenForPress } from "./PointerControls.js";
import { OceanSounds } from "./OceanSounds.js";
import { MusicPlayer } from "./MusicPlayer.js";
import { exposeForDebugging } from "./debug.js";
import { asset } from "../assetUrl.js";
import { loadOceanSounds } from "../oceanSoundsSetting.js";
import { getEffectiveVolumes } from "../audioSettings.js";
import { getSettings, RELAXED_PACE } from "../settings.js";
import {
    GAME_YEARS, YEAR_DURATION_MS, MAX_FRAME_MS,
    FISH_SPEED, MAX_HEARTS, HEART_SPACING, HEART_OFFSET_Y,
} from "./gameConfig.js";

export const PREDATOR_SPEED = 3.375;
const PREDATOR_DASH_SPEED = 10;
const PREDATOR_DASH_DURATION = 450;
const PREDATOR_DASH_COOLDOWN = 3000;
const PREDATOR_DASH_RANGE = 400;
const PREDATOR_NERVOUS_DISTANCE = 500;
const PREDATOR_SCARE_DISTANCE = 250;
export const REEF_HIDE_DISTANCE = 150;
export const PREDATOR_ESCAPE_MARGIN = 50;

const LOW_HEALTH_PULSE_THRESHOLD = 2;
// Years into the game when a grouper turns up: the calm summer of year 3, the winter of year 5, the middle of
// the year 8 heatwave (hide, or shade the reef?) and the winter of year 10
const PREDATOR_SPAWN_YEARS = [2.1, 4.6, 7.2, 9.6];
const TIME_UI_UPDATE_MS = 250;
const STRESS_WARNING_THRESHOLDS = [40, 60, 80];
const CRITICAL_STRESS_BEEP_INTERVAL = 1000;
const CRITICAL_STRESS_BEEPS = 3; // the alarm sounds this many times, then leaves its banner to do the nagging
// With fewer living corals than this share of the reef, too few are left to rebuild it and the game is lost
const REEF_COLLAPSE_SHARE = 0.2;
const YEAR_CARD_DELAY = 4800; // the first year's card waits for the "Survive all 10 years!" card to go

const PREDATOR_BITE_INTERVAL = 1000; // ms of touching the predator per half heart lost
// A bite lands when the grouper's mouth reaches the fish's body. Both are circles, so the grouper doesn't get a
// bigger reach by turning, and the fish isn't easier to bite after it has grown.
const PREDATOR_MOUTH_OFFSET = 85; // from the middle of the grouper to its mouth, in px on screen
const PREDATOR_MOUTH_RADIUS = 42;
const FISH_BODY_RADIUS = 32;
const PREDATOR_WANDER_SPEED = PREDATOR_SPEED * 0.4; // while it can't find a fish hiding in the coral

const HISTORY_SAMPLES_PER_YEAR = 8; // points per year on the end screen's charts
const OVERLAY_FADE = 0.06; // how much of the way the light, shade and pipe overlays move to their target each frame
const SHADE_TINT = 0x1d4a66; // shade is a cool blue-grey wash, light enough that the reef stays easy to see
const MAX_SHADE_ALPHA = 0.2;

// Food is shellfish (snails and clams), which triggerfish crack open with their strong jaws.
// They live on the sea floor, so they're scattered along the band of sand the fish can still reach (it's clamped to y <= 850).
const FOOD_COUNT = 5; // shellfish on a healthy reef, and how many it takes for the fish to reach full size
export const FOOD_GROWTH = 1.1; // each shellfish eaten makes the fish 10% bigger, up to FOOD_COUNT of them
const FOOD_SHELLS = ["isabellaCowrie", "honeyCowrie", "fleaCone", "mulberryDrupe"];
export const FOOD_SIZE = 44; // on-screen size of an average shellfish, as the square root of its area, since the shell images are all different sizes
const FOOD_SIZE_VARIATION = 0.2; // each shellfish is up to 20% smaller or bigger than that
export const FOOD_GLOW_COLOR = 0xff7a59; // coral orange: green and red are kept for the state of the reef
const FOOD_MIN_Y = 790;
export const FOOD_MAX_Y = 845;
const FOOD_NEST_CLEARANCE = 300; // keep food out of the nest in the middle of the sandbar

const JUVENILES = 5; // young triggerfish that follow the player in the last year, if the nest was finished

class TestScene extends Phaser.Scene {
    constructor() {
        super("TestScene");

        this.camVelX = 0;
        this.tutorialComplete = false;
    }

    // The tutorial (or the loading scene, when the tutorial has been done before) starts this one with
    // { tutorialComplete: true }
    init(data) {
        if (data?.tutorialComplete) this.tutorialComplete = true;
    }

    // The climate and the reef's stress live in the reef model (reefModel.js). These let the rest of the game
    // read them from the scene, as it always has.
    get stressValue() { return this.reef.stress; }
    get temperature() { return this.reef.temperature; }
    get lightLevel() { return this.reef.light; }
    get pollutionValue() { return this.reef.pollution; }
    get season() { return this.reef.season; }
    get elapsedSimMs() { return this.reef.elapsedMs; }
    get yearsElapsed() { return getYearsElapsed(this.reef); }
    get tempStressSeverity() { return Math.min(getHeatSeverity(this.reef.temperature), 1); }

    setupSimulationState() {
        this.reef = createReef();
        this.yearStats = newYearStats(); // what has happened this year, for the goals and the year's report
        this.yearReports = [];           // one for each finished year: { year, peak, lost, met, total }
        this.lastReportedYear = 0;
        this.totalLost = 0;
        this.totalReplanted = 0;
        this.totalPlumesHit = 0;
        this.bubbleNoticesShown = {};

        // What the end screen's charts show: one sample HISTORY_SAMPLES_PER_YEAR times a year (see recordHistory),
        // and the moments bubbles were popped and corals died
        this.history = { years: [], stress: [], temp: [], light: [], alive: [] };
        this.marks = { pops: [], deaths: [] };
        this.nextHistorySample = 0; // index of the next sample to take
        this.peakStress = 0;

        this.reefDeadStress = false;
        this.stressWarningLevel = 0;
        this.criticalStressAlarmActive = false;
        this.criticalStressAlarm = null;

        this.simEnd = false;
        this.timeUiElapsedMs = 0;
        this.coralInfoOpen = false;
        this.isHiding = false;
        this.isHidingInHome = false;
        this.predators = [];
        this.nextPredatorSpawnIndex = 0;
        this.collectedCorals = new Set(); // ids of the kinds of coral the player has opened (see CoralManager.js)
        this.health = MAX_HEARTS * 2;
        this.fishDead = false;
        this.foodEaten = 0;
        this.fishGrowth = 1; // size multiplier from eating food, applied in update()
        this.touchingPredator = false;
        this.predatorContactTime = 0; // time since the last bite while touching the predator, in ms
        this.juveniles = [];

        this.WORLD_WIDTH = 5720;
        this.WORLD_HEIGHT = 1024;
    }

    setupWorld(cam) {
        this.cameras.main.setBackgroundColor("#8ACFC9");

        const addWorldLayer = (key, imageWidth, depth, bottomAligned = true) => {
            const totalLayerWidth = imageWidth * 2;
            const scrollFactorX = (totalLayerWidth - cam.width) / (this.WORLD_WIDTH - cam.width);

            for (let i = 0; i < 2; i++) {
                const layer = this.add.image(i * imageWidth, 0, key)
                    .setOrigin(0, 0)
                    .setDepth(depth)
                    .setScrollFactor(scrollFactorX, 1);

                layer.y = bottomAligned ? this.WORLD_HEIGHT - layer.height : -10;
            }
        }

        addWorldLayer("floor_layer3", 1440, 1);
        addWorldLayer("floor_layer2", 2072, 2);

        createFishSchools(this); //educated fish (schools)
        createCorals(this);
        this.coralsAlive = this.corals.length;

        this.pipeA = this.add.image(0, 0, "pipe")
            .setOrigin(0, 0).setDepth(6)
            .setScrollFactor(1, 1)
            .setAngle(-15);
        this.pipeA.y = this.WORLD_HEIGHT - this.pipeA.height - 60;

        this.pipeB = this.add.image(0, 0, "pipe")
            .setOrigin(0, 0).setDepth(6)
            .setScrollFactor(1, 1)
            .setAngle(-15)
            .setAlpha(0);
        this.pipeB.y = this.WORLD_HEIGHT - this.pipeB.height - 60;

        this.pipeA.setFrame(1);
        this.pipeB.setFrame(0);

        addWorldLayer("floor_layer1", 2860, 5);
        addWorldLayer("floor_layer0", 2860, 6);
        addWorldLayer("surface", 1440, -4, false);
    }

    setupAudio() {
        // Only read the saved volumes on the first run: a restart reuses this scene, and React won't send them again
        const volumes = getEffectiveVolumes();
        this.musicVolume ??= volumes.music;
        this.sfxVolume ??= volumes.sfx;

        // Streamed rather than loaded by Phaser, and stops itself when the scene shuts down (see MusicPlayer.js)
        this.bgMusic = new MusicPlayer(this, asset("assets/audio/Background.mp3"), this.musicVolume);

        // Read straight from the saved setting: React only sends it once this scene is ready, which would let the music start first
        this.oceanSounds = new OceanSounds(this, this.musicVolume);
        this.setOceanSounds(loadOceanSounds());

        // The sound manager belongs to the whole game, not this scene, so sounds added here outlive a restart.
        // Destroy them whenever the scene shuts down (restart or stop) so a new copy isn't left behind each time.
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.bgMusic = null;
            this.oceanSounds.destroy();
            this.oceanSounds = null;
        });
    }

    setupUI(cam) {
        this.guide = this.add.image(300, 300, "Guide")
        this.guide.setDepth(9999);
        addShadow(this, this.guide);

        // Hearts float above the fish and follow it around (positioned every frame in updateHearts())
        this.hearts = [];
        this.heartOutlines = [];
        for (let i = 0; i < MAX_HEARTS; i++) {
            this.heartOutlines.push(
                this.add.image(0, 0, "heartFull")
                    .setTintFill(0xff3333)
                    .setDepth(9999.4)
                    .setVisible(false)
            );
            this.hearts.push(this.add.image(0, 0, "heartFull").setDepth(9999.5));
        }
        this.lowHealthPulseActive = false;
        this.updateHearts();

        // "Hidden" over the spot the fish is hiding in, since the fish itself can't be seen there
        this.hiddenTag = this.add.text(0, 0, "Hidden", {
            fontFamily: "Poppins, sans-serif", fontSize: "18px", fontStyle: "bold",
            color: "#0b2e3a", backgroundColor: "#7fe3c4", padding: { x: 9, y: 3 },
        }).setOrigin(0.5, 1).setDepth(10002).setVisible(false);

        const parallax = (1440 - cam.width) / (this.WORLD_WIDTH - cam.width);
        this.lightOverlay = this.add.rectangle(0, 0, 1440, 1024, 0xFFFFFF, 1)
            .setOrigin(0, 0).setDepth(10000).setAlpha(0)
            .setScrollFactor(parallax, 1);

        // Shade from the Cloudy bubbles: a cool wash with a few soft cloud shadows drifting through it
        this.shadeOverlay = this.add.rectangle(0, 0, 1440, 1024, SHADE_TINT, 1)
            .setOrigin(0, 0).setDepth(10000).setAlpha(0)
            .setScrollFactor(parallax, 1);
        this.cloudShadows = [0, 1, 2].map(i =>
            this.add.ellipse(200 + i * 560, 260 + (i % 2) * 300, 620, 240, 0x0b2e3a, 1)
                .setDepth(10000).setAlpha(0).setScrollFactor(0));

        // Where each overlay is heading. They ease towards these every frame (see updateOverlays).
        this.overlayTargets = { light: 0, shade: 0, pipe: 0 };

        // the fish's shadow on the sea floor
        this.floorShadow = this.add.ellipse(this.guide.x, 950, 100, 10, 0x000000, 0.5).setDepth(6);
    }

    setupCamera(cam) {
        this.arrowKeys = this.input.keyboard.createCursorKeys();
        this.wasdKeys = this.input.keyboard.addKeys({ up: "W", left: "A", down: "S", right: "D" });
        this.hideKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        listenForPress(this, this.hideKey, "hide");

        // Restarting removes the keys, so they're handed out again here. React sets the scheme on a new scene.
        this.setControlScheme(this.controlScheme ?? "wasd");

        cam.setBounds(0, 0, this.WORLD_WIDTH, this.WORLD_HEIGHT);
    }

    // One set of keys swims and the other moves the camera. Called by App when the choice changes.
    setControlScheme(scheme) {
        this.controlScheme = scheme;
        const usesArrows = scheme === "arrows";
        this.moveKeys = usesArrows ? this.arrowKeys : this.wasdKeys;
        const { left, right, up, down } = usesArrows ? this.wasdKeys : this.arrowKeys;

        //camera presettings
        const controlConfig = {
            camera: this.cameras.main,
            left,
            right,
            up,
            down,
            acceleration: 0.06,
            drag: 0.0005,
            maxSpeed: 1.0
        };

        this.controls = new Phaser.Cameras.Controls.SmoothedKeyControl(controlConfig);

        // A key held during the switch would otherwise stay down
        [...Object.values(this.wasdKeys), ...Object.values(this.arrowKeys)].forEach(key => key.reset());
    }


    create() {
        const cam = this.cameras.main;
        cam.fadeIn(600, 0, 0, 0);

        this.setupSimulationState();
        this.setupWorld(cam);
        this.setupUI(cam);
        this.setupAudio(); // after setupUI: Ocean Sounds needs to know where the fish is
        createPointerControls(this);
        this.setupCamera(cam);
        this.recordHistory();
        this.food = []; // the shellfish still on the sea floor
        this.addFood(FOOD_COUNT);
        createHomeBuilding(this);
        createWinterJobs(this);
        this.objectives = new Objectives(this);
        this.objectives.startYear(1);
        this.eventManager = new EventManager(this);
        this.edgeIndicators = new EdgeIndicators(this);

        exposeForDebugging(this);
        // Only tell React about the scene once everything above has been set up
        this.game.events.emit("scene-ready", this);
        // After a restart React is already listening, so send it the reset values
        this.emitStats();
        if (this.tutorialComplete) {
            // React shows the "Survive all 10 years!" card at the start of every game, then the first year's goals
            this.game.events.emit("goal-reminder");
            this.time.delayedCall(YEAR_CARD_DELAY, () => { if (!this.simEnd && this.yearsElapsed < 1) this.showYearCard(null); });
        }
    }

    // The values React shows in the UI. Sent with emitStats() four times a second while the clock runs, and
    // whenever something changes that the player should see straight away.
    getStats() {
        const year = getCalendarYear(this.reef);
        const nextStage = HOME_STAGES[this.homeStage + 1];
        return {
            stress: this.reef.stress,
            trend: this.reef.stressDelta > 0.0005 ? "up" : this.reef.stressDelta < -0.0005 ? "down" : "flat",
            light: this.reef.light,
            temperature: this.reef.temperature,
            pollution: this.reef.pollution,
            pollutionMultiplier: getPollutionMultiplier(this.reef),
            shadeSeconds: Math.ceil(this.reef.shade / 40),
            coolingSeconds: Math.ceil(this.reef.cooling / 0.2),
            yearsElapsed: this.yearsElapsed,
            year,
            season: this.reef.season,
            secondsLeft: getSecondsLeftInSeason(this.reef),
            heatwave: isHeatwave(this.reef) ? getHeatwaveRise(this.reef) : 0,
            coralsAlive: this.coralsAlive,
            coralsTotal: this.corals.length,
            simEnd: this.simEnd,
            reefDead: this.reefDeadStress,
            fishDead: this.fishDead,
            corals: { collected: [...this.collectedCorals], total: CORAL_KIND_IDS.length },
            fish: { health: this.health, maxHealth: MAX_HEARTS * 2, meals: Math.min(this.foodEaten, FOOD_COUNT), mealsMax: FOOD_COUNT },
            nest: {
                stage: this.homeStage + 1,
                stages: HOME_STAGES.length,
                placed: this.homePiecesPlaced,
                needed: nextStage ? nextStage.piecesNeeded : null,
            },
            pipe: { open: isPipeOpen(this), rocks: this.pipeRocks, needed: PIPE_ROCKS_NEEDED, from: PIPE_FROM_YEAR },
            chapter: getChapter(year),
            goals: this.objectives.getList(),
            hiding: this.isHiding,
            actionAvailable: Boolean(this.actionAvailable),
            // Only the end screen draws the charts, so the history is only copied out once the game is over
            history: this.simEnd ? this.getHistory() : null,
            summary: this.simEnd ? this.getSummary() : null,
        };
    }

    // Copies, because the scene keeps its own arrays and React needs new ones to notice a change
    getHistory() {
        const { years, stress, temp, light, alive } = this.history;
        return {
            years: [...years], stress: [...stress], temp: [...temp], light: [...light], alive: [...alive],
            pops: [...this.marks.pops], deaths: [...this.marks.deaths],
            peakStress: this.peakStress,
        };
    }

    // The numbers the end screen's report card is written from
    getSummary() {
        const year = getCalendarYear(this.reef);
        const survived = !this.reefDeadStress && !this.fishDead;
        // The hottest heatwave the reef came through: every one before this year, and this year's too if the game was won
        const heatwaves = Object.entries(SUMMER_TEMPERATURE_RISE)
            .filter(([heatYear]) => Number(heatYear) < year || survived)
            .map(([, rise]) => rise);
        return {
            survived,
            endYear: year,
            coralsAlive: this.coralsAlive,
            coralsTotal: this.corals.length,
            lost: this.totalLost,
            replanted: this.totalReplanted,
            hottest: heatwaves.length ? Math.max(...heatwaves) : 0,
            nestStage: this.homeStage + 1,
            nestStages: HOME_STAGES.length,
            goalsMet: this.objectives.met,
            goalsTotal: this.objectives.total,
            years: this.yearReports,
            pipePlugged: this.pipeRocks >= PIPE_ROCKS_NEEDED,
            plumesHit: this.totalPlumesHit,
            bubblesPopped: this.marks.pops.filter(pop => pop.kind !== "plume").length,
        };
    }

    emitStats() {
        this.game.events.emit("stats-changed", this.getStats());
    }

    setMusicVolume(value) {
        this.musicVolume = value;
        if (this.bgMusic) {
            this.bgMusic.setVolume(value);
        }
        this.oceanSounds?.setVolume(value);
    }

    // Ocean Sounds and the music replace each other
    setOceanSounds(enabled) {
        if (!this.oceanSounds) return; // React can still reach this scene just after it shuts down

        this.oceanSounds.setEnabled(enabled);

        if (enabled) {
            this.bgMusic.pause();
        } else if (!this.bgMusic.isPlaying) {
            this.bgMusic.play();
        }
    }

    setSfxVolume(value) {
        this.sfxVolume = value;
    }

    playBleachingWarning() {
        this.sound.play('bleachingWarning', { volume: this.sfxVolume ?? 0.5 });
    }

    // Sounds while stress is high and still climbing, and stops as soon as it levels off
    isCriticalStressAlarmRequired() {
        return this.reef.stress >= 80 && this.reef.stressDelta > 0 && !this.simEnd;
    }

    syncCriticalStressAlarm() {
        const required = this.isCriticalStressAlarmRequired();
        if (required === this.criticalStressAlarmActive) return;

        this.criticalStressAlarmActive = required;
        if (required) {
            this.game.events.emit("reef-warning", {
                id: "critical-stress",
                persistent: true,
                warning: true,
                title: "Critical Reef Stress",
                message: "Pop every bubble you can reach. Fully bleached coral is starving, and it dies if the heat lasts.",
            });
            let beeps = 0;
            const beep = () => {
                this.playBleachingWarning();
                if (++beeps >= CRITICAL_STRESS_BEEPS) this.criticalStressAlarm?.remove();
            };
            beep();
            this.criticalStressAlarm = this.time.addEvent({ delay: CRITICAL_STRESS_BEEP_INTERVAL, loop: true, callback: beep });
        } else {
            this.criticalStressAlarm?.remove();
            this.criticalStressAlarm = null;
            this.game.events.emit("reef-warning-cleared", "critical-stress");
        }
    }

    // Scatters shellfish along the sea floor, anywhere but the nest
    addFood(count) {
        const shells = Phaser.Utils.Array.Shuffle([...FOOD_SHELLS]); // dealt in turn, so every kind appears before any repeats

        for (let i = 0; i < count; i++) {
            let x;
            do {
                x = Phaser.Math.Between(100, this.WORLD_WIDTH - 100);
            } while (Math.abs(x - this.WORLD_WIDTH / 2) < FOOD_NEST_CLEARANCE);

            const shellfish = this.add.image(x, Phaser.Math.Between(FOOD_MIN_Y, FOOD_MAX_Y), shells[i % shells.length]);
            this.food.push(shellfish);
            const size = FOOD_SIZE * Phaser.Math.FloatBetween(1 - FOOD_SIZE_VARIATION, 1 + FOOD_SIZE_VARIATION);

            shellfish
                .setDepth(7.5) // in front of the corals, like the nest pieces, so it's never hidden behind one
                .setScale(size / Math.sqrt(shellfish.width * shellfish.height))
                .setAngle(Phaser.Math.Between(-30, 30))
                .setFlipX(Math.random() < 0.5);
            addGlow(this, shellfish, FOOD_GLOW_COLOR);
        }
    }

    // Shellfish come back each winter, as many as the living coral can shelter: a healthy reef feeds its fish
    restockFood() {
        const supported = Math.round(FOOD_COUNT * this.coralsAlive / this.corals.length);
        this.addFood(Math.max(supported - this.food.length, 0));
    }

    // The fish eats any shellfish its body reaches. A few distance checks a frame, in place of a physics engine.
    checkFood() {
        const reach = this.guide.displayHeight / 2;
        for (const shellfish of this.food) {
            const distance = Phaser.Math.Distance.Between(this.guide.x, this.guide.y, shellfish.x, shellfish.y);
            if (distance <= reach + shellfish.displayWidth / 2) {
                this.eatFood(shellfish);
                return; // eatFood changed this.food, and one bite a frame is plenty
            }
        }
    }

    eatFood(shellfish) {
        if (this.simEnd) return;

        this.food = this.food.filter(other => other !== shellfish);
        removeGlow(shellfish); // stops the glow's tween, which would otherwise outlive the shellfish
        shellfish.destroy();
        this.sound.play('foodCrunch', { volume: this.sfxVolume });
        this.feedFish();
    }

    // A meal heals half a heart, and the first FOOD_COUNT of them each make the fish bigger. At full size it
    // can scare groupers off. Also called when the fish eats a coral-eating snail (WinterJobs.js).
    feedFish() {
        if (this.health < MAX_HEARTS * 2) {
            this.health++;
            this.refreshHeartTextures();
        }

        this.foodEaten++;
        this.yearStats.eaten++;
        if (this.foodEaten === FOOD_COUNT) {
            this.game.events.emit("random-event", {
                title: "Fully Grown",
                message: "Your triggerfish is big enough to scare groupers away. Swim at one and it will flee.",
                good: true,
            });
        }
        // Tweened so it grows smoothly instead of popping
        this.tweens.killTweensOf(this);
        this.tweens.add({
            targets: this,
            fishGrowth: FOOD_GROWTH ** Math.min(this.foodEaten, FOOD_COUNT),
            duration: 300,
            ease: "Back.out"
        });
    }

    // A short message that rises from a spot in the world and fades
    floatText(x, y, message, color = "#ffe3a3") {
        const text = this.add.text(x, y, message, {
            fontSize: "22px",
            fontFamily: "Poppins, sans-serif",
            fontStyle: "bold",
            color,
            stroke: "#0b2e3a",
            strokeThickness: 5,
        }).setOrigin(0.5, 1).setDepth(10002);
        text.x = Phaser.Math.Clamp(text.x, text.width / 2 + 10, this.WORLD_WIDTH - text.width / 2 - 10);
        this.tweens.add({ targets: text, y: y - 60, alpha: 0, duration: 1900, ease: "Cubic.out", onComplete: () => text.destroy() });
    }

    // Called by the bubbles (Events.js) when the fish pops one
    onBubblePopped(kind) {
        if (kind === "plume") {
            this.yearStats.plumesHit++;
            this.totalPlumesHit++;
        } else {
            this.yearStats[kind]++;
        }
        this.marks.pops.push({ year: this.yearsElapsed, kind, stress: this.reef.stress });
        this.updateGoals();
    }

    // Checks the year's goals and tells React. Called a few times a second, and straight after anything a goal counts.
    updateGoals() {
        if (this.objectives.update()) this.sound.play("nestPiece", { volume: this.sfxVolume * 0.6 });
        this.emitStats();
    }

    update(time, delta) {
        delta = Math.min(delta, MAX_FRAME_MS); // so the reef never ages faster than the fish can move (see gameConfig.js)
        this.oceanSounds.update(delta); // before the check below, so a dying reef still fades out behind the end screen
        cullCorals(this);
        swayCorals(this);
        this.updateOverlays(delta);

        // Freeze the fish, camera and timer once the end screen is showing
        if (this.simEnd) return;

        const clockIsRunning = this.tutorialComplete && !this.coralInfoOpen;

        if (clockIsRunning) {
            // "Relaxed pace" slows the years down, but not the fish
            this.advanceReef(delta * (getSettings().relaxedPace ? RELAXED_PACE : 1));
            if (this.simEnd) return;

            while (
                this.nextPredatorSpawnIndex < PREDATOR_SPAWN_YEARS.length &&
                this.elapsedSimMs >= PREDATOR_SPAWN_YEARS[this.nextPredatorSpawnIndex] * YEAR_DURATION_MS
            ) {
                this.spawnPredator();
                this.nextPredatorSpawnIndex++;
            }

            this.timeUiElapsedMs += delta;
            if (this.timeUiElapsedMs >= TIME_UI_UPDATE_MS) {
                this.timeUiElapsedMs %= TIME_UI_UPDATE_MS;
                this.updateGoals();
            }
        }

        // Movement values below were tuned at 60fps, so scale them by how long this frame actually took.
        const frameScale = delta / (1000 / 60);
        this.eventManager.update(delta, frameScale);

        // E, or the on-screen button, hides the fish and brings it back out
        const hidePressed = takeVirtualKey(this, "hide");
        if (hidePressed) {
            if (this.isHiding) this.leaveHiding();
            else this.hideFish();
        }

        let horizontal = 0;
        let vertical = 0;

        if (this.tutorialComplete && !this.coralInfoOpen) {
            ({ x: horizontal, y: vertical } = readMovement(this)); // the keys, or towards the pointer
            const moving = horizontal !== 0 || vertical !== 0;

            if (this.isHiding && moving && !hidePressed) {
                this.leaveHiding();
            }

            if (!this.isHiding && moving) {
                const speed = FISH_SPEED * frameScale; //This adjust the constant speed of the fish movement, regardless of direction.
                this.guide.x += horizontal * speed;
                this.guide.y += vertical * speed;

                const targetAngle = Math.atan2(vertical, horizontal);
                // Swimming straight up or down keeps the way the fish was facing, so it doesn't snap upside down
                const flip = Math.abs(horizontal) < 0.15 ? this.guide.flipY : horizontal < 0;
                this.guide.setFlipY(flip);

                this.guide.rotation = Phaser.Math.Angle.RotateTo(
                    this.guide.rotation,
                    targetAngle,
                    0.5 * frameScale
                );

                const wiggleAmount = 1; // Adjust the wiggle amount and speed as needed
                const wiggleSpeed = 0.01;
                const wiggle = Math.sin(this.time.now * wiggleSpeed) * wiggleAmount * frameScale;

                this.guide.x += Math.cos(this.guide.rotation + Math.PI / 2) * wiggle;
                this.guide.y += Math.sin(this.guide.rotation + Math.PI / 2) * wiggle;

                // Keeps the fish within the boundaries of the world. Clamped after the wiggle so it can't push the fish out either.
                this.guide.x = Phaser.Math.Clamp(this.guide.x, 100, this.WORLD_WIDTH - 100);
                this.guide.y = Phaser.Math.Clamp(this.guide.y, 120, 850);

                // for the last year's "visit both ends of your reef"
                if (this.guide.x < 600) this.yearStats.sawLeft = true;
                if (this.guide.x > this.WORLD_WIDTH - 600) this.yearStats.sawRight = true;
            }
        }

        // Set every frame (not just while swimming) so growing from food shows straight away
        this.guide.setScale(1.3 / 1.5 * this.fishGrowth);

        if (this.isHiding) {
            horizontal = 0;
            vertical = 0;
        }

        for (const predator of this.predators) {
            this.updatePredator(predator, delta, frameScale);
        }

        this.checkPredatorContact(delta);
        if (this.simEnd) return;
        if (this.tutorialComplete) this.checkFood();
        updateWinterJobs(this);

        const sideWidth = 300; // Adjust the width of the side areas where the camera starts moving when the fish is near the edge
        const edgeScrollSpeed = FISH_SPEED; // the same as the fish, so the camera keeps up with it at the screen edges
        const cameraSmoothing = 0.15;
        const { scrollX, width, zoom } = this.cameras.main;
        const fishScreenX = (this.guide.x - scrollX - width / 2) * zoom + width / 2; // the camera zooms around its centre
        const fishAtRightSide = horizontal > 0.1 && fishScreenX >= this.cameras.main.width - sideWidth;
        const fishAtLeftSide = horizontal < -0.1 && fishScreenX <= sideWidth;
        let targetCameraSpeed = 0;

        if (fishAtRightSide) {
            targetCameraSpeed = edgeScrollSpeed;
        } else if (fishAtLeftSide) {
            targetCameraSpeed = -edgeScrollSpeed;
        }

        this.camVelX = Phaser.Math.Linear(this.camVelX, targetCameraSpeed, 1 - Math.pow(1 - cameraSmoothing, frameScale));
        this.cameras.main.scrollX = Phaser.Math.Clamp(
            this.cameras.main.scrollX + this.camVelX * frameScale,
            0,
            this.WORLD_WIDTH - this.cameras.main.width
        );

        // The other set of keys moves the camera, except while the fish hides in the nest, when the camera stays on it
        if (!this.isHidingInHome) {
            this.controls.update(delta);
        }
        updateNestCamera(this, this.isHidingInHome, frameScale);

        this.floorShadow
            .setVisible(!this.isHiding)
            .setPosition(this.guide.x, 950)
            .setScale(this.guide.scale, 1);

        this.updateHearts();
        this.updateJuveniles(frameScale);
        updateHomeBuilding(this, delta, clockIsRunning);
        this.edgeIndicators.update(this.getEdgeTargets());
    }

    // Keeps the hearts centred above the fish
    updateHearts() {
        const y = this.guide.y - this.guide.displayHeight / 2 - HEART_OFFSET_Y;
        const startX = this.guide.x - ((this.hearts.length - 1) * HEART_SPACING) / 2;
        this.hearts.forEach((heart, i) => {
            const x = startX + i * HEART_SPACING;
            heart.setPosition(x, y);
            this.heartOutlines[i].setPosition(x, y);
        });
    }

    // Shows full, half or empty hearts to match this.health
    refreshHeartTextures() {
        this.hearts.forEach((heart, i) => {
            const halves = Phaser.Math.Clamp(this.health - i * 2, 0, 2);
            heart.setTexture(["heartDead", "heartHalf", "heartFull"][halves]);
        });
        this.updateLowHealthPulse();
    }

    updateLowHealthPulse() {
        const shouldPulse = this.health > 0 && this.health <= LOW_HEALTH_PULSE_THRESHOLD;
        if (shouldPulse === this.lowHealthPulseActive) return;

        this.lowHealthPulseActive = shouldPulse;
        this.hearts.forEach(heart => this.tweens.killTweensOf(heart));
        this.heartOutlines.forEach(outline => this.tweens.killTweensOf(outline));

        if (shouldPulse) {
            this.heartOutlines.forEach(outline => outline.setVisible(true));
            this.tweens.add({
                targets: this.hearts,
                scale: 1.2,
                duration: 450,
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut"
            });
            this.tweens.add({
                targets: this.heartOutlines,
                scale: 1.38,
                duration: 450,
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut"
            });
        } else {
            this.hearts.forEach(heart => heart.setScale(1));
            this.heartOutlines.forEach(outline => {
                outline.setScale(1.15);
                outline.setVisible(false);
            });
        }
    }

    loseHalfHeart() {
        this.health = Math.max(this.health - 1, 0);
        this.refreshHeartTextures();

        // Flash the fish red so it's clear it got hurt
        this.guide.setTint(0xff6666);
        this.time.delayedCall(150, () => this.guide.clearTint());

        // Out of hearts: the fish dies and the sim ends
        if (this.health <= 0) {
            this.fishDead = true;
            this.simEnd = true;
        }
    }

    // Where the grouper's mouth is. Its artwork faces left, and is mirrored to face right.
    getPredatorMouth({ sprite }) {
        const facing = sprite.flipX ? 1 : -1;
        return {
            x: sprite.x + Math.cos(sprite.rotation) * PREDATOR_MOUTH_OFFSET * facing,
            y: sprite.y + Math.sin(sprite.rotation) * PREDATOR_MOUTH_OFFSET * facing,
        };
    }

    // Half a heart the moment the predator's mouth reaches the fish, then another for every second it stays there
    checkPredatorContact(delta) {
        // No damage while a popup is open, since the fish can't move away, or while the fish is hidden:
        // the nest scares predators off, and in the coral they can't find it
        const paused = this.coralInfoOpen;
        const touching = !paused && !this.isHiding &&
            this.predators.some(predator => {
                if (!predator.spawned || predator.fleeing) return false;
                const mouth = this.getPredatorMouth(predator);
                return Phaser.Math.Distance.Between(mouth.x, mouth.y, this.guide.x, this.guide.y)
                    <= PREDATOR_MOUTH_RADIUS + FISH_BODY_RADIUS;
            });

        if (!touching) {
            if (!paused) this.touchingPredator = false;
            return;
        }

        if (!this.touchingPredator) {
            this.touchingPredator = true;
            this.predatorContactTime = 0;
            this.loseHalfHeart();
        } else {
            this.predatorContactTime += delta;
        }
        if (this.predatorContactTime >= PREDATOR_BITE_INTERVAL) {
            this.predatorContactTime -= PREDATOR_BITE_INTERVAL;
            this.loseHalfHeart();
        }

        if (this.simEnd) this.endSim();
    }

    // Everything that has to happen once, when the reef collapses, the fish dies or the ten years are up
    endSim() {
        this.simEnd = true;
        this.recordHistory(true);
        this.finishYear();
        this.syncCriticalStressAlarm();
        this.edgeIndicators.update([]);
        this.game.events.emit("reef-warning-cleared", "bleaching");
        this.emitStats();
    }

    RestartSim() {
        this.scene.restart();
        this.bgMusic.pause(); // silence it straight away; it's destroyed when the scene shuts down (see MusicPlayer.js)
        resetCorals(this);
    }

    // Moves the climate, the reef's stress and every coral on by deltaMs of game time
    advanceReef(deltaMs) {
        const seasonChanged = stepReef(this.reef, deltaMs);

        const died = updateCoralStress(this, this.reef.stressDelta, deltaMs);
        if (died > 0) {
            this.coralsAlive = countLivingCorals(this);
            this.yearStats.lost += died;
            this.totalLost += died;
            // One mark on the end screen's chart for corals that die close together
            const last = this.marks.deaths.at(-1);
            if (last && this.yearsElapsed - last.year < 0.06) last.count += died;
            else this.marks.deaths.push({ year: this.yearsElapsed, count: died, stress: this.reef.stress });
        }
        this.yearStats.peak = Math.max(this.yearStats.peak, this.reef.stress);
        this.peakStress = Math.max(this.peakStress, this.reef.stress);

        if (this.coralsAlive < this.corals.length * REEF_COLLAPSE_SHARE) {
            this.reefDeadStress = true;
            this.endSim();
            return;
        }
        if (isOver(this.reef)) {
            this.endSim();
            return;
        }

        if (seasonChanged) this.onSeasonChanged(seasonChanged);
        this.checkStressWarnings();
        this.recordHistory();
    }

    onSeasonChanged(season) {
        const year = getCalendarYear(this.reef);

        if (season === "winter") {
            this.game.events.emit("reef-warning-cleared", "bleaching");
            const plan = YEAR_PLANS[year];
            let message = "The water is cooling and your coral is recovering.";

            const pests = plan.winterJob ? startWinterJob(this, plan.winterJob) : 0;
            if (pests > 0) {
                this.objectives.add(plan.winterJob, Math.min(pests, 3));
                message = plan.winterJob === "algae"
                    ? "Graze the algae: swim into the green tufts growing on your weakest corals. Algae smothers coral that is trying to recover."
                    : "Eat the snails: coral-eating snails have gathered on your weakest corals. Swim into them before they do more damage.";
            }
            const fragments = spawnFragments(this);
            if (fragments > 0) {
                this.objectives.add("replant", Math.min(fragments, 2));
                message += " Replant: carry a glowing coral fragment (Q) to a dead coral to grow a new colony.";
            }
            this.restockFood();
            this.game.events.emit("reef-warning", { id: "season", title: `Winter, year ${year}`, message, good: true });
        } else {
            endWinterJob(this);
            const report = this.finishYear();
            this.yearStats = newYearStats();
            this.objectives.startYear(year);
            if (year === GAME_YEARS && this.homeStage >= HOME_STAGES.length - 1) this.hatchJuveniles();
            this.showYearCard(report);
            if (isHeatwave(this.reef)) this.playBleachingWarning();
        }
        this.updateGoals();
    }

    // Closes the books on the year that has just ended (or the one the game ended in). A year with every goal
    // met earns the fish a heart.
    finishYear() {
        const year = this.simEnd ? getCalendarYear(this.reef) : getCalendarYear(this.reef) - 1;
        if (year <= this.lastReportedYear) return null;
        this.lastReportedYear = year;

        const { met, total } = this.objectives.finishYear(this.reefDeadStress || this.fishDead);
        const report = { year, peak: Math.round(this.yearStats.peak), lost: this.yearStats.lost, met, total };
        this.yearReports.push(report);
        report.allMet = met === total && total > 0;
        if (report.allMet && !this.simEnd && this.health < MAX_HEARTS * 2) {
            this.health = Math.min(this.health + 2, MAX_HEARTS * 2);
            this.refreshHeartTextures();
        }
        return report;
    }

    // The card at the start of each year: how last year went, what this one brings and what to aim for
    showYearCard(report) {
        const year = getCalendarYear(this.reef);
        const chapter = getChapter(year);
        const heat = getHeatwaveRise(this.reef);
        this.game.events.emit("reef-warning", {
            id: "bleaching",
            card: true,
            bleaching: heat > 0,
            year,
            chapter: chapter.years[0] === year ? chapter : null,
            heat,
            brief: YEAR_PLANS[year].brief,
            goals: this.objectives.getList().map(goal => goal.text),
            report,
            // what a screen reader announces, and what the log keeps
            title: `Year ${year}: ${chapter.title}`,
            message: `${heat > 0 ? `Heatwave: the water is ${heat} °C hotter. ` : ""}${YEAR_PLANS[year].brief}`,
        });
    }

    // A banner as stress passes 40, 60 and 80, each saying what to do first
    checkStressWarnings() {
        const stress = this.reef.stress;
        const rearmedWarningLevel = STRESS_WARNING_THRESHOLDS.reduce(
            (level, threshold, index) => stress >= threshold - 5 ? index + 1 : level,
            0
        );
        this.stressWarningLevel = Math.min(this.stressWarningLevel, rearmedWarningLevel);
        const nextWarningLevel = STRESS_WARNING_THRESHOLDS.reduce(
            (level, threshold, index) => stress >= threshold ? index + 1 : level,
            0
        );
        if (nextWarningLevel > this.stressWarningLevel) {
            const warning = [
                null,
                {
                    title: "Coral Stress Building",
                    message: "Pop a Cloudy bubble to shade the reef. Hot water is stressing your coral, and bright light makes it worse.",
                },
                {
                    title: "Serious Bleaching Risk",
                    message: "Pop more bubbles before summer ends. Your most delicate corals, the table corals, are turning white.",
                },
                {
                    title: "Critical Reef Stress",
                    message: "Pop every bubble you can reach. Corals that stay fully bleached for long will starve.",
                },
            ][nextWarningLevel];
            this.playBleachingWarning();
            this.game.events.emit("reef-warning", { id: "stress", warning: true, ...warning });
        }
        this.stressWarningLevel = nextWarningLevel;
        this.syncCriticalStressAlarm();
    }

    // Adds to the end screen's charts whenever the next sample is due. Called every frame while the clock runs;
    // final is for the last moment of the game, which is recorded whenever it falls so the charts end where the game did.
    recordHistory(final = false) {
        const due = this.yearsElapsed * HISTORY_SAMPLES_PER_YEAR >= this.nextHistorySample;
        if (!due && !final) return;
        if (final && this.history.years.at(-1) === this.yearsElapsed) return;

        this.nextHistorySample = Math.floor(this.yearsElapsed * HISTORY_SAMPLES_PER_YEAR) + 1;
        this.history.years.push(this.yearsElapsed);
        this.history.stress.push(this.reef.stress);
        this.history.temp.push(this.reef.temperature);
        this.history.light.push(this.reef.light);
        this.history.alive.push(this.coralsAlive ?? 0);
    }

    // The screen brightens with the summer light and takes on a cool wash while Cloudy bubbles shade the reef,
    // and the pipe's second outflow shows while it is leaking badly. Each eases towards its target every frame.
    updateOverlays(delta) {
        const targets = this.overlayTargets;
        const shade = Phaser.Math.Clamp(this.reef.shade / (MAX_SHADE / 2), 0, 1);
        targets.light = Phaser.Math.Clamp((this.reef.light - NORMAL_LIGHT) / 3000, 0, 0.1);
        targets.shade = shade * MAX_SHADE_ALPHA;
        targets.pipe = this.reef.pollution >= 3 && this.pipeRocks < PIPE_ROCKS_NEEDED
            ? Phaser.Math.Clamp((this.reef.pollution - 1) / 5, 0, 1) : 0;

        const ease = 1 - Math.pow(1 - OVERLAY_FADE, delta / (1000 / 60));
        const fade = (object, target) => {
            if (object.alpha === target) return;
            const alpha = Phaser.Math.Linear(object.alpha, target, ease);
            // Snap once it's close: Linear never quite arrives, and Phaser only skips drawing at exactly 0
            object.setAlpha(Math.abs(alpha - target) < 0.004 ? target : alpha);
        };
        fade(this.lightOverlay, targets.light);
        fade(this.shadeOverlay, targets.shade);
        fade(this.pipeB, targets.pipe);

        const drifting = !getSettings().reducedMotion;
        for (const cloud of this.cloudShadows) {
            fade(cloud, shade * 0.1);
            if (cloud.alpha > 0 && drifting) {
                cloud.x += 0.35 * delta / (1000 / 60);
                if (cloud.x > 1440 + 320) cloud.x = -320;
            }
        }
    }

    // What the arrows on the edge of the view should point at right now (EdgeIndicators.js)
    getEdgeTargets() {
        const targets = [];
        const { guide } = this;
        const nearest = (items, getPoint = item => item) => {
            let best = null;
            let bestDistance = Infinity;
            for (const item of items) {
                const point = getPoint(item);
                const distance = Phaser.Math.Distance.Between(guide.x, guide.y, point.x, point.y);
                if (distance < bestDistance) {
                    best = point;
                    bestDistance = distance;
                }
            }
            return best;
        };

        const hunting = this.predators.filter(predator => predator.spawned && !predator.fleeing);
        hunting.forEach((predator, i) => {
            targets.push({ id: `predator${i}`, x: predator.sprite.x, y: predator.sprite.y, label: "Grouper", style: "danger" });
        });
        if (this.isHiding) return targets; // while hidden, all that matters is where the grouper is

        const carried = this.carriedPiece;
        const nestY = this.home.y - 40;
        if (hunting.length > 0 && this.foodEaten < FOOD_COUNT) {
            targets.push({ id: "nest", x: this.home.x, y: nestY, label: "Nest: press E to hide", style: "home" });
        } else if (carried && !carried.isFragment) {
            targets.push({ id: "nest", x: this.home.x, y: nestY, label: "Nest", style: "home" });
        }

        if (carried?.isFragment) {
            const dead = findNearestDeadCoral(this);
            if (dead) targets.push({ id: "replant", x: dead.x, y: dead.y - 60, label: "Replant here", style: "good" });
        } else if (!carried) {
            const fragment = nearest(this.homePieces.filter(piece => piece.isFragment));
            if (fragment) targets.push({ id: "fragment", x: fragment.x, y: fragment.y, label: "Coral fragment", style: "good" });
        }

        if (isPipeOpen(this) && (getCalendarYear(this.reef) === PIPE_FROM_YEAR || (carried && !carried.isFragment))) {
            targets.push({ id: "pipe", x: PIPE_MOUTH.x, y: PIPE_MOUTH.y, label: "Leaking pipe", style: "job" });
        }

        const bubbles = this.eventManager.active.filter(bubble => !bubble.resolving);
        const helpful = nearest(bubbles.filter(bubble => bubble.def.helpful), bubble => bubble.sprite);
        if (helpful) targets.push({ id: "bubble", x: helpful.x, y: helpful.y, label: "Bubble", style: "good" });
        bubbles.filter(bubble => !bubble.def.helpful).forEach((bubble, i) => {
            targets.push({ id: `plume${i}`, x: bubble.sprite.x, y: bubble.sprite.y, label: "Hot plume", style: "danger" });
        });

        const pest = nearest(this.pests, pest => pest.sprite);
        if (pest) targets.push({ id: "pest", x: pest.x, y: pest.y, label: this.pestJob === "algae" ? "Algae" : "Snail", style: "job" });

        if (this.health <= MAX_HEARTS) {
            const food = nearest(this.food);
            if (food) targets.push({ id: "food", x: food.x, y: food.y, label: "Food", style: "info" });
        }
        return targets;
    }

    // The last year, with the nest finished: the eggs hatch and the young follow the fish around the reef it saved
    hatchJuveniles() {
        for (let i = 0; i < JUVENILES; i++) {
            const young = this.add.image(this.home.x, this.home.y - 60, "Guide").setScale(0.24).setDepth(9998.5).setAlpha(0);
            this.tweens.add({ targets: young, alpha: 1, duration: 800, delay: i * 250 });
            this.juveniles.push(young);
        }
        this.game.events.emit("random-event", {
            title: "Your Eggs Have Hatched",
            message: "Young triggerfish have left the nest you built, and they're following you. Show them the reef you kept alive.",
            good: true,
        });
    }

    // Each young fish trails the one in front of it, the first one trailing the player
    updateJuveniles(frameScale) {
        let leader = this.guide;
        this.juveniles.forEach((young, i) => {
            const targetX = leader.x - Math.cos(leader.rotation) * (i === 0 ? 70 : 40);
            const targetY = leader.y - Math.sin(leader.rotation) * (i === 0 ? 70 : 40) + (i % 2 ? 14 : -10);
            const ease = 1 - Math.pow(1 - 0.07, frameScale);
            const dx = targetX - young.x;
            young.x += dx * ease;
            young.y += (targetY - young.y) * ease;
            if (Math.abs(dx) > 1) young.setFlipX(dx < 0);
            young.setVisible(!this.isHiding);
            leader = young;
        });
    }

    spawnPredator() {
        const sprite = this.add.image(0, 0, "grouper")
            .setScale(0.4)
            .setDepth(9998)
            .setVisible(true);
        const spawnX = this.WORLD_WIDTH - sprite.displayWidth / 2 - PREDATOR_ESCAPE_MARGIN;
        const spawnY = 300 + (this.predators.length % 3) * 120;
        sprite.setPosition(
            Phaser.Math.Clamp(spawnX, sprite.displayWidth / 2, this.WORLD_WIDTH - sprite.displayWidth / 2),
            Phaser.Math.Clamp(spawnY, sprite.displayHeight / 2, this.WORLD_HEIGHT - sprite.displayHeight / 2)
        );
        const predator = {
            sprite,
            spawned: true,
            fleeing: false,
            escaped: false,
            scared: false,
            nervous: false,
            retreatDirection: null,
            dashRemaining: 0,
            dashCooldown: 0,
            dashVelocityX: 0,
            dashVelocityY: 0,
            escapeDirection: 0,
        };
        this.predators.push(predator);

        if (this.isHidingInHome) this.startPredatorFlee(predator);
        this.game.events.emit("predator-appeared");
    }

    updatePredator(predator, delta, frameScale) {
        if (!predator.spawned) return;

        if (this.isHidingInHome && !predator.fleeing) {
            this.startPredatorFlee(predator);
        }

        if (predator.fleeing) {
            if (predator.scared && predator.dashRemaining > 0) {
                this.movePredator(
                    predator,
                    predator.dashVelocityX,
                    predator.dashVelocityY,
                    PREDATOR_DASH_SPEED,
                    frameScale
                );
                predator.dashRemaining = Math.max(0, predator.dashRemaining - delta);
            } else {
                this.movePredator(predator, predator.escapeDirection, 0, PREDATOR_SPEED, frameScale, false);
            }

            const { x, displayWidth } = predator.sprite;
            const escaped = predator.escapeDirection < 0
                ? x + displayWidth / 2 <= -PREDATOR_ESCAPE_MARGIN
                : x - displayWidth / 2 >= this.WORLD_WIDTH + PREDATOR_ESCAPE_MARGIN;
            if (escaped) {
                predator.sprite.destroy();
                predator.spawned = false;
                predator.escaped = true;
                predator.fleeing = false;
                if (!this.predators.some(({ spawned }) => spawned)) {
                    this.yearStats.grouperGone = 1;
                    this.game.events.emit("predator-left");
                    this.updateGoals();
                }
            }
        } else if (this.isHiding) {
            // Hidden in the coral: the predator can't find the fish, so it prowls around until the fish comes out.
            // (Hidden in the nest it flees instead, which is handled above.)
            this.wanderPredator(predator, delta, frameScale);
        } else if (!this.coralInfoOpen) {
            // The predator chases the fish unless an overlay is open.
            const predatorDistance = Phaser.Math.Distance.Between(
                predator.sprite.x,
                predator.sprite.y,
                this.guide.x,
                this.guide.y
            );
            const canScarePredator = this.foodEaten >= FOOD_COUNT;
            const scareDistance = PREDATOR_SCARE_DISTANCE / this.fishGrowth;
            const nervousDistance = PREDATOR_NERVOUS_DISTANCE / this.fishGrowth;
            if (
                canScarePredator &&
                !predator.nervous &&
                predatorDistance <= nervousDistance
            ) {
                predator.nervous = true;
                predator.retreatDirection = null;
                predator.dashRemaining = 0;
            }

            if (canScarePredator && predatorDistance <= scareDistance) {
                this.startPredatorFlee(predator, true);
            } else if (predator.nervous && predatorDistance > 0) {
                const awayX = (predator.sprite.x - this.guide.x) / predatorDistance;
                const awayY = (predator.sprite.y - this.guide.y) / predatorDistance;
                const outOfRoomToRetreat = awayX !== 0 &&
                    !this.canPredatorMove(predator, Math.sign(awayX), 0, frameScale);

                if (outOfRoomToRetreat) {
                    this.startPredatorFlee(predator, true);
                    return;
                }

                const retreatDirection = predator.retreatDirection;
                const retreatAlignment = retreatDirection
                    ? retreatDirection.x * awayX + retreatDirection.y * awayY
                    : -1;

                if (
                    !retreatDirection ||
                    retreatAlignment < -0.35 ||
                    !this.canPredatorMove(predator, retreatDirection.x, retreatDirection.y, frameScale)
                ) {
                    predator.retreatDirection = this.choosePredatorRetreatDirection(
                        predator,
                        awayX,
                        awayY,
                        frameScale
                    );
                }

                const direction = predator.retreatDirection;
                if (direction) {
                    this.movePredator(predator, direction.x, direction.y, PREDATOR_SPEED, frameScale);
                }
                predator.sprite.x = Phaser.Math.Clamp(
                    predator.sprite.x,
                    predator.sprite.displayWidth / 2,
                    this.WORLD_WIDTH - predator.sprite.displayWidth / 2
                );
                predator.sprite.y = Phaser.Math.Clamp(
                    predator.sprite.y,
                    predator.sprite.displayHeight / 2,
                    this.WORLD_HEIGHT - predator.sprite.displayHeight / 2
                );
            } else if (!predator.nervous && predatorDistance > 0) {
                const frameDelta = delta;
                if (predator.dashRemaining > 0) {
                    this.movePredator(
                        predator,
                        predator.dashVelocityX,
                        predator.dashVelocityY,
                        PREDATOR_DASH_SPEED,
                        frameScale
                    );
                    predator.dashRemaining = Math.max(0, predator.dashRemaining - frameDelta);
                } else {
                    predator.dashCooldown = Math.max(0, predator.dashCooldown - frameDelta);

                    if (predator.dashCooldown === 0 && predatorDistance <= PREDATOR_DASH_RANGE) {
                        predator.dashVelocityX =
                            ((this.guide.x - predator.sprite.x) / predatorDistance) * PREDATOR_DASH_SPEED;
                        predator.dashVelocityY =
                            ((this.guide.y - predator.sprite.y) / predatorDistance) * PREDATOR_DASH_SPEED;
                        this.facePredatorDirection(
                            predator,
                            predator.dashVelocityX,
                            predator.dashVelocityY,
                            frameScale
                        );
                        predator.dashRemaining = PREDATOR_DASH_DURATION;
                        predator.dashCooldown = PREDATOR_DASH_COOLDOWN;
                    } else {
                        const directionX = (this.guide.x - predator.sprite.x) / predatorDistance;
                        const directionY = (this.guide.y - predator.sprite.y) / predatorDistance;
                        this.movePredator(predator, directionX, directionY, PREDATOR_SPEED, frameScale);
                    }
                }
            }
        }
    }

    // Slow, lazy loops on the spot, a little wider than they are tall
    wanderPredator(predator, delta, frameScale) {
        predator.dashRemaining = 0;
        predator.wanderAngle = (predator.wanderAngle ?? Phaser.Math.FloatBetween(0, Math.PI * 2)) + delta * 0.0007;
        this.movePredator(
            predator,
            Math.cos(predator.wanderAngle),
            Math.sin(predator.wanderAngle) * 0.5,
            PREDATOR_WANDER_SPEED,
            frameScale,
            false
        );
        predator.sprite.x = Phaser.Math.Clamp(
            predator.sprite.x,
            predator.sprite.displayWidth / 2,
            this.WORLD_WIDTH - predator.sprite.displayWidth / 2
        );
    }

    hideFish() {
        if (
            !this.tutorialComplete ||
            this.coralInfoOpen ||
            this.isHiding
        ) {
            return;
        }

        const hideTargets = this.corals.map(coral => ({
            x: coral.x,
            y: Phaser.Math.Clamp(coral.y - coral.displayHeight * 0.45, 120, 850),
            depth: coral.depth,
            distance: Phaser.Math.Distance.Between(this.guide.x, this.guide.y, coral.x, coral.y),
            isHome: false,
        }));
        if (this.home) {
            const homeHideY = Phaser.Math.Clamp(this.home.y - this.home.displayHeight * 0.45, 120, 850);
            hideTargets.push({
                x: this.home.x,
                y: homeHideY,
                depth: this.home.depth,
                distance: Phaser.Math.Distance.Between(this.guide.x, this.guide.y, this.home.x, homeHideY),
                isHome: true,
            });
        }

        // The nest wins whenever it's in reach, since it's the only place that makes a predator leave
        const nearbyHideTarget = hideTargets
            .filter(({ distance }) => distance <= REEF_HIDE_DISTANCE)
            .sort((a, b) => (b.isHome - a.isHome) || (a.distance - b.distance))[0];

        if (!nearbyHideTarget) return;

        this.isHiding = true;
        this.isHidingInHome = nearbyHideTarget.isHome;
        this.pointerGoal = null;
        this.guide.setPosition(nearbyHideTarget.x, nearbyHideTarget.y);
        this.guide.setDepth(nearbyHideTarget.depth - 0.1);
        this.hiddenTag.setPosition(nearbyHideTarget.x, nearbyHideTarget.y - 100).setVisible(true);
        if (this.isHidingInHome) {
            this.predators.forEach(predator => this.startPredatorFlee(predator));
        } else if (this.predators.some(({ spawned, fleeing }) => spawned && !fleeing)) {
            this.game.events.emit("random-event", {
                title: "Hidden in the Coral",
                message: "The predator can't find you here, but it's waiting nearby. Only your nest makes it leave for good.",
            });
        }
    }

    startPredatorFlee(predator, awayFromFish = false) {
        if (!predator.spawned || predator.escaped) return;
        if (predator.scared && !awayFromFish) return;

        predator.scared ||= awayFromFish;
        predator.retreatDirection = null;
        predator.fleeing = true;
        predator.escapeDirection = predator.sprite.x <= this.WORLD_WIDTH / 2 ? -1 : 1;
        if (awayFromFish) {
            predator.dashVelocityX = predator.escapeDirection * PREDATOR_DASH_SPEED;
            predator.dashVelocityY = 0;
            predator.dashRemaining = PREDATOR_DASH_DURATION;
        }
        predator.sprite.clearTint();
    }

    facePredatorDirection(predator, directionX, directionY, frameScale) {
        // The grouper artwork faces left, so mirror horizontally to face right.
        const flip = directionX === 0 ? predator.sprite.flipX : directionX > 0;
        predator.sprite.setFlipX(flip);
        const targetAngle = Math.atan2(directionY, directionX) - (flip ? 0 : Math.PI);
        predator.sprite.rotation = Phaser.Math.Angle.RotateTo(
            predator.sprite.rotation,
            targetAngle,
            0.5 * frameScale
        );
    }

    movePredator(predator, directionX, directionY, speed, frameScale, addWiggle = true) {
        const directionLength = Math.hypot(directionX, directionY);
        if (directionLength === 0) return;

        const normalizedX = directionX / directionLength;
        const normalizedY = directionY / directionLength;
        const wiggle = addWiggle ? Math.sin(this.time.now * 0.01) * frameScale : 0;

        predator.sprite.x += normalizedX * speed * frameScale - normalizedY * wiggle;
        predator.sprite.y += normalizedY * speed * frameScale + normalizedX * wiggle;
        this.facePredatorDirection(predator, normalizedX, normalizedY, frameScale);
        // Kept inside the top and bottom of the world, allowing for the tallest it can be when turned
        const reach = predator.sprite.displayWidth / 2;
        predator.sprite.y = Phaser.Math.Clamp(predator.sprite.y, Math.min(reach, this.WORLD_HEIGHT / 2), Math.max(this.WORLD_HEIGHT - reach, this.WORLD_HEIGHT / 2));
    }

    canPredatorMove(predator, directionX, directionY, frameScale) {
        const directionLength = Math.hypot(directionX, directionY);
        if (directionLength === 0) return false;

        const normalizedX = directionX / directionLength;
        const normalizedY = directionY / directionLength;
        const wiggle = Math.sin(this.time.now * 0.01) * frameScale;
        const nextX = predator.sprite.x +
            normalizedX * PREDATOR_SPEED * frameScale - normalizedY * wiggle;
        const nextY = predator.sprite.y +
            normalizedY * PREDATOR_SPEED * frameScale + normalizedX * wiggle;
        const halfWidth = predator.sprite.displayWidth / 2;
        const halfHeight = predator.sprite.displayHeight / 2;

        return nextX >= halfWidth &&
            nextX <= this.WORLD_WIDTH - halfWidth &&
            nextY >= halfHeight &&
            nextY <= this.WORLD_HEIGHT - halfHeight;
    }

    choosePredatorRetreatDirection(predator, awayX, awayY, frameScale) {
        const candidates = [
            { x: awayX, y: awayY },
            { x: awayX, y: 0 },
            { x: 0, y: awayY },
            { x: 1, y: 0 },
            { x: -1, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: -1 },
        ];

        return candidates
            .filter(({ x, y }) => x !== 0 || y !== 0)
            .map(({ x, y }) => {
                const length = Math.hypot(x, y);
                return { x: x / length, y: y / length };
            })
            .filter(({ x, y }) => this.canPredatorMove(predator, x, y, frameScale))
            .sort((a, b) => (b.x * awayX + b.y * awayY) - (a.x * awayX + a.y * awayY))[0];
    }

    leaveHiding() {
        this.isHiding = false;
        this.isHidingInHome = false;
        this.guide.setDepth(9999);
        this.hiddenTag.setVisible(false);

        this.predators.forEach(predator => {
            if (predator.fleeing && !predator.escaped && !predator.scared) {
                predator.fleeing = false;
            }
        });
    }

    closeCoralPopup() {
        this.coralInfoOpen = false;
    }

}

export default TestScene;