import Phaser from "phaser";
import { getCoralInfo } from "../coralKinds.js";
import { getBleachStage, getBleachStageKeys, prepareBleachStages } from "../bleachStages.js";
import { describeBleachingYears } from "../bleachingSchedule.js";
import { bleachingNotice } from "../Climate.js";
import { CLOUDY_BUBBLE, createCloudyBubble, placeBubbleLabel } from "../BubbleManager.js";
import { NestBuilding } from "../NestBuilding.js";
import { PlayerFish } from "../PlayerFish.js";
import { Hearts } from "../Hearts.js";
import { Stamina } from "../Stamina.js";
import { addShellfish, eatShellfish } from "../Food.js";
import { facePredator } from "../Predators.js";
import { exposeForDebugging } from "../debug.js";
import { SOUNDS, TEXTURES } from "../assetKeys.js";
import { GAME_EVENTS, SCENE_KEYS } from "../gameEvents.js";
import { getEffectiveVolumes } from "../../settings.js";
import {
    COLORS,
    DEPTH,
    FISH_SPEED,
    FONT_FAMILY,
    FOOD_GROWTH,
    FOOD_MAX_Y,
    FOOD_SIZE,
    FRAME_MS_AT_60FPS,
    GAME_YEARS,
    HIDE_DISTANCE,
    MAX_FRAME_MS,
    MAX_HEALTH,
    NORMAL_LIGHT,
    NORMAL_TEMPERATURE,
    PREDATOR_ESCAPE_MARGIN,
    PREDATOR_SCALE,
    PREDATOR_SPEED,
    SPRINT_MULTIPLIER,
    STARTING_POLLUTION,
    SUMMER_PEAK_LIGHT,
} from "../gameConfig.js";

const PRAISE_DURATION = 2000; // ms the "well done" message shows before moving on (keep in sync with TutorialBanner.css)
const TUTORIAL_PREDATOR_SPEED = PREDATOR_SPEED * 0.6; // slower than the real one, to give time to read the banner
const TUTORIAL_BITE_INTERVAL = 2000; // ms between bites, half as often as the main game, as the player may still be reading
const TUTORIAL_MIN_HEALTH = 2; // bites stop at one full heart, so the fish can't die in the tutorial
const SWIM_KEY_TIME = 400; // ms each direction has to be held to finish the first lesson
const BLEACH_PREP_MS_PER_FRAME = 6; // time each frame spends making the main game's coral bleach stages in the background
const SKIP_BUTTON_MARGIN = 24;

// One of each kind of nest piece, spread out on either side of the nest
const TUTORIAL_PIECES = [
    { type: "pebble", x: 200 },
    { type: "shell", x: 420 },
    { type: "coral", x: 1240 },
];

// The heatwave lesson: the coral bleaches until a Cloudy bubble shades it, then recovers in winter
const CORAL_VARIANT = "tabular1";
const HEATWAVE_TEMPERATURE_RISE = 5; // °C, the main game's summers add 3 to 7 (see bleachingSchedule.js)
const CLOUDY_LIGHT_DROP = 400;
const HEATWAVE_STRESS_PER_SECOND = 18;
const SHADED_STRESS_PER_SECOND = HEATWAVE_STRESS_PER_SECOND / 4; // the Cloudy bubble slows bleaching, it doesn't stop the heat
const HEATWAVE_MAX_STRESS = 85; // "Bleached", but never dead
const HEAT_STEP_STRESS = 40; // how far the coral bleaches before the Cloudy bubble shows up
const WINTER_RECOVERY_PER_SECOND = 30;
const LESSON_NOTICE_ID = "tutorial-lesson"; // the notices that stay until closed, as the lesson waits for them

// How the lessons talk about the keys for each control scheme. The other set of keys moves the camera.
const CONTROL_TEXT = {
    wasd: {
        swimKeys: "W, A, S and D keys",
        lookKeys: "arrow keys",
        image: "tutorial/tutorial_wasd.png",
        imageAlt: "The W, A, S and D keys beside a fish swimming toward the coral reef",
    },
    arrows: {
        swimKeys: "arrow keys",
        lookKeys: "W, A, S and D keys",
        image: "tutorial/tutorial_arrows.svg",
        imageAlt: "The four arrow keys beside a fish swimming toward the coral reef",
    },
};

// The lessons React shows in the banner at the top of the screen, in the order the player meets them.
// Each one is started by start<Id>() below (if it has one) and completed by doing what it says.
const STEPS = [
    {
        id: "swim",
        title: "Swim Around",
        // text and image are filled in by emitSwimStep() so they can show the player's keys and how many directions are done
        praise: "Great swimming!",
    },
    {
        id: "food",
        title: "Eat to Grow",
        text: "Triggerfish crack open shellfish like snails and clams that live on the sea floor. Swim down to the glowing shell to eat it. Food refills the hearts above your fish and helps it grow bigger. Your fish gets hungry and loses half a heart at every dot on the timeline, and a new shell turns up at the far end of the reef each time, so keep looking!",
        image: "tutorial/tutorial_food.svg",
        imageAlt: "A fish swimming toward a glowing red shell, then growing bigger",
        praise: "Complete!",
    },
    {
        id: "nest",
        title: "Build Your Nest",
        // text is filled in by emitNestStep() so it can show how many pieces are in the nest
        image: "tutorial/tutorial_home.svg",
        imageAlt: "The Q key beside a fish carrying a glowing pebble to its nest in the sand",
        praise: "Nice nest!",
    },
    {
        id: "heat",
        title: "Summer Heatwaves",
        text: `Each year has a summer and a winter. Bleaching heatwaves occur in years ${describeBleachingYears()}, and rising pollution makes them worse. Swim over to your coral to see what happens.`,
        image: "tutorial/tutorial_heatwave.png",
        imageAlt: "Corals on the reef",
        praise: "Oh no, it's bleaching!",
    },
    {
        id: "cloudy",
        title: "Shade the Reef",
        text: "Bright summer light makes heat bleach coral even faster. During heatwaves, green Cloudy bubbles appear at different spots across the reef. Swim into one to shade the reef and slow the bleaching.",
        image: "tutorial/tutorial_cloudy.svg",
        imageAlt: "A fish swimming toward a green Cloudy bubble",
        praise: "Complete!",
    },
    {
        id: "coral",
        title: "Check On Your Coral",
        text: "In winter the water cools and stressed coral can recover. Click on your coral to learn about it and see how it's doing. Every new kind of coral you open is added to your collection. Can you find them all?",
        image: "tutorial/tutorial_click_coral.png",
        imageAlt: "A computer mouse beside a fish swimming toward the coral reef",
        praise: "Complete!",
    },
    {
        id: "predator",
        title: "Watch Out for Predators",
        text: "A grouper is hunting you! Swim to your nest and press E to hide. Stay there until the All Clear message appears. (Coral hides you too, but the grouper will wait nearby.)",
        image: "tutorial/tutorial_predator.svg",
        imageAlt: "The E key beside a fish hiding in its nest while a grouper swims past",
        praise: "Complete!",
    },
    {
        id: "done",
        title: "Let's Get Started!",
        // text is filled in by emitDoneStep() so it can name the keys that move the camera
        image: "tutorial/tutorial_ready.png",
        imageAlt: "A fish ready to explore the reef",
        buttonLabel: "Let's Go!",
    },
];

/*
An empty stretch of reef (just the sand and background) where the player learns each part of the main game in turn.
React shows the current lesson with "tutorial-step" and the praise message with "tutorial-praise". The fish, nest,
shellfish, Cloudy bubble, coral popup, notices and predator alert are the main game's, so this scene answers to the
same calls and events as ReefScene (closeCoralPopup(), onLessonNoticeClosed(), "stats-changed", "coral-selected",
"reef-warning", "random-event", "predator-appeared").
*/
class Tutorial extends Phaser.Scene {
    constructor() {
        super(SCENE_KEYS.tutorial);
    }

    create() {
        this.finished = false;
        this.stepIndex = -1;
        this.temperature = NORMAL_TEMPERATURE;
        this.light = NORMAL_LIGHT;
        this.isHiding = false;
        this.coralInfoOpen = false;
        this.lessonNoticeClosed = false;
        this.hidePrompt = "";
        this.sfxVolume ??= getEffectiveVolumes().sfx;

        this.setupWorld();
        this.setupFish();
        this.setupKeys();
        this.setupSkipButton();

        // The main game needs every coral's bleach stages, which take seconds to make all at once.
        // Making them a few at a time while the player learns means the main game starts without freezing.
        this.bleachStagePrep = prepareBleachStages(this);

        this.nextStep();

        exposeForDebugging(this);
        // Tells React about the scene, so the settings button can pause it and the popups can talk to it
        this.game.events.emit(GAME_EVENTS.sceneReady, this);
        this.emitStats();
    }

    setupWorld() {
        const { width, height } = this.scale;
        this.cameras.main.setBackgroundColor(COLORS.seaBackground);
        this.cameras.main.setBounds(0, 0, width, height); // keeps the view on the scene while it zooms in on the nest

        // Same layers as the main game, but no coral, schools or pipes
        const addLayer = (key, depth, bottomAligned = true) => {
            const layer = this.add.image(0, 0, key).setOrigin(0, 0).setDepth(depth);
            layer.y = bottomAligned ? height - layer.height : -10;
        };
        addLayer(TEXTURES.seaFloorFar, DEPTH.seaFloorFar);
        addLayer(TEXTURES.seaFloorMiddle, DEPTH.seaFloorMiddle);
        addLayer(TEXTURES.seaFloorNear, DEPTH.seaFloorNear);
        addLayer(TEXTURES.seaFloorFront, DEPTH.seaFloorFront);
        addLayer(TEXTURES.surface, DEPTH.surface, false);

        // Warm glow over the reef during the heatwave lesson
        this.heatGlow = this.add
            .rectangle(0, 0, width, height, 0xff7a2f)
            .setOrigin(0, 0)
            .setDepth(DEPTH.heatGlow)
            .setAlpha(0);
    }

    setupFish() {
        this.player = new PlayerFish(this, 300, 450);
        this.hearts = new Hearts(this, { health: MAX_HEALTH - 1 }); // half a heart short, so eating shows them filling up
        this.stamina = new Stamina(this);
    }

    setupKeys() {
        // Only the keys that swim do anything here, as this scene fits on one screen and has no camera to move.
        // Q (nest building) is added with the nest when that lesson starts.
        this.wasdKeys = this.input.keyboard.addKeys({ up: "W", left: "A", down: "S", right: "D" });
        this.arrowKeys = this.input.keyboard.addKeys({ up: "UP", left: "LEFT", down: "DOWN", right: "RIGHT" });
        this.hideKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.sprintKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // Restarting removes the keys, so they're handed out again here. React sets the scheme on a new scene.
        this.setControlScheme(this.controlScheme ?? "wasd");
    }

    /**
     * Called by App when the choice changes, which can be part way through a lesson that names the keys.
     * @param {"wasd" | "arrows"} scheme the keys that swim
     */
    setControlScheme(scheme) {
        this.controlScheme = scheme;
        this.moveKeys = scheme === "arrows" ? this.arrowKeys : this.wasdKeys;

        // A key held during the switch would otherwise stay down
        [...Object.values(this.wasdKeys), ...Object.values(this.arrowKeys)].forEach((key) => key.reset());

        if (this.stepId === "swim") this.emitSwimStep(this.shownDirectionsDone);
        if (this.stepId === "done") this.emitDoneStep();
    }

    setupSkipButton() {
        const button = this.add
            .text(this.scale.width - SKIP_BUTTON_MARGIN, SKIP_BUTTON_MARGIN, "Skip tutorial", {
                fontFamily: FONT_FAMILY,
                fontSize: "20px",
                color: "#ffffff",
                backgroundColor: COLORS.brandTeal,
                padding: { x: 14, y: 10 },
            })
            .setOrigin(1, 0)
            .setDepth(DEPTH.prompt)
            .setScrollFactor(0)
            .setInteractive({ useHandCursor: true });
        button.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () =>
            button.setStyle({ backgroundColor: COLORS.brandOrange }),
        );
        button.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () =>
            button.setStyle({ backgroundColor: COLORS.brandTeal }),
        );
        button.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.finish());
        this.skipButton = button;
    }

    // setScrollFactor(0) stops the camera moving the button, but not zooming it, so this undoes the zoom
    keepSkipButtonInPlace() {
        const { width, height } = this.scale;
        const { zoom } = this.cameras.main;
        this.skipButton
            .setScale(1 / zoom)
            .setPosition(
                width / 2 + (width / 2 - SKIP_BUTTON_MARGIN) / zoom,
                height / 2 + (SKIP_BUTTON_MARGIN - height / 2) / zoom,
            );
    }

    get stepId() {
        return STEPS[this.stepIndex]?.id;
    }

    emitStep(overrides = {}) {
        this.game.events.emit(GAME_EVENTS.tutorialStep, { ...STEPS[this.stepIndex], ...overrides });
    }

    // Shows the lesson's praise once, then moves on to the next lesson after it has faded
    completeStep() {
        if (this.praised) return;
        this.praised = true;

        // The id makes React show it again even when it's the same text as the last one
        this.praiseCount = (this.praiseCount ?? 0) + 1;
        this.game.events.emit(GAME_EVENTS.tutorialPraise, { text: STEPS[this.stepIndex].praise, id: this.praiseCount });
        this.time.delayedCall(PRAISE_DURATION, () => this.nextStep());
    }

    nextStep() {
        this.stepIndex++;
        this.praised = false;
        this.swamThisStep = false;
        if (this.stepIndex >= STEPS.length) {
            this.finish();
            return;
        }

        const start = {
            swim: () => this.startSwim(),
            food: () => this.startFood(),
            nest: () => this.startNest(),
            heat: () => this.startHeat(),
            cloudy: () => this.startCloudy(),
            coral: () => this.startCoral(),
            predator: () => this.startPredator(),
            done: () => this.emitDoneStep(),
        }[this.stepId];
        if (start) {
            start();
        } else {
            this.emitStep();
        }
    }

    /** Called by the "Let's Go!" button on the last lesson, and the Skip tutorial button */
    finish() {
        if (this.finished) return;
        this.finished = true;
        this.game.events.emit(GAME_EVENTS.tutorialStep, null);
        this.game.events.emit(GAME_EVENTS.reefWarningCleared, LESSON_NOTICE_ID); // Skip can leave one open
        this.scene.start(SCENE_KEYS.reef, { tutorialComplete: true });
    }

    /** @param {number} volume 0 to 1, already 0 if muted */
    setSfxVolume(volume) {
        this.sfxVolume = volume;
    }

    // The same values the main game sends, so App's state matches the tutorial
    emitStats() {
        this.game.events.emit(GAME_EVENTS.statsChanged, {
            stress: this.coralStress ?? 0,
            light: this.light,
            temperature: this.temperature,
            pollution: STARTING_POLLUTION,
            simEnd: false,
            reefDead: false,
            fishDead: false,
            corals: null,
            history: null,
        });
    }

    update(time, delta) {
        this.continueBleachStagePrep();

        // Tuned at 60fps like the main game, and capped so a lag spike doesn't teleport the fish
        delta = Math.min(delta, MAX_FRAME_MS);
        const frameScale = delta / FRAME_MS_AT_60FPS;

        const hidePressed = Phaser.Input.Keyboard.JustDown(this.hideKey);
        if (hidePressed && this.stepId === "predator") this.hideFish();

        const horizontal = (this.moveKeys.right.isDown ? 1 : 0) - (this.moveKeys.left.isDown ? 1 : 0);
        const vertical = (this.moveKeys.down.isDown ? 1 : 0) - (this.moveKeys.up.isDown ? 1 : 0);
        const moving = horizontal !== 0 || vertical !== 0;

        // Swimming away leaves the nest, like in the main game
        if (this.isHiding && moving && !hidePressed) this.leaveHiding();

        const swimming = !this.isHiding && moving;
        const sprinting = this.stamina.update(delta, swimming && this.sprintKey.isDown, this.player);
        if (swimming) {
            this.player.swim(
                horizontal,
                vertical,
                FISH_SPEED * (sprinting ? SPRINT_MULTIPLIER : 1),
                frameScale,
                this.scale.width,
            );
            this.swamThisStep = true;
            if (this.stepId === "swim") this.trackSwimming(delta);
        }
        this.hearts.follow(this.player);

        // Goals only count once the fish has swum during the lesson, so one it was already sitting on
        // isn't completed before the player has had a chance to read the banner
        if (this.swamThisStep) {
            if (this.stepId === "food" && this.touching(this.shellfish)) {
                this.eatFood();
            } else if (this.stepId === "heat" && !this.heatwave && this.touching(this.coral)) {
                this.startHeatwave();
            } else if (this.stepId === "cloudy" && this.touching(this.cloudBubble?.sprite)) {
                this.popCloudBubble();
            }
        }

        if (this.cloudBubble) placeBubbleLabel(this.cloudBubble);
        if (this.nestBuilding) {
            this.hidePrompt =
                this.stepId === "predator" && !this.isHiding && this.nestInHideReach() ? "E: hide in nest" : "";
            this.updateNest();
        }
        if (this.coral) this.updateCoral(delta);
        if (this.predator) this.updatePredator(frameScale);

        this.nestBuilding?.updateCamera(this.isHiding, frameScale);
        this.keepSkipButtonInPlace();
        this.player.updateFloorShadow();
    }

    // Does at least one step of the bleach stages, then more until this frame's time is used up
    continueBleachStagePrep() {
        if (!this.bleachStagePrep) return;

        const stopAt = performance.now() + BLEACH_PREP_MS_PER_FRAME;
        do {
            if (this.bleachStagePrep.next().done) {
                this.bleachStagePrep = null;
                return;
            }
        } while (performance.now() < stopAt);
    }

    touching(target) {
        return target && Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), target.getBounds());
    }

    // Somewhere on the other side of the screen from the fish, so it has to swim across to reach it
    getSpotAwayFromFish(y) {
        return { x: this.player.x < this.scale.width / 2 ? 1050 : 400, y };
    }

    /* Swim Around: each direction has to be held for a moment, so the player tries them all */

    startSwim() {
        this.swimTimes = { up: 0, left: 0, down: 0, right: 0 };
        this.emitSwimStep(0);
    }

    emitSwimStep(directionsDone) {
        this.shownDirectionsDone = directionsDone;
        const { swimKeys, lookKeys, image, imageAlt } = CONTROL_TEXT[this.controlScheme];
        this.emitStep({
            text: `You are a triggerfish living on a coral reef. Hold the ${swimKeys} to swim in every direction (hold Space to sprint). Prefer the ${lookKeys}? You can switch in Options. (${directionsDone}/4 directions)`,
            image,
            imageAlt,
        });
    }

    // Counts time held rather than distance, so swimming into the edge of the screen still counts
    trackSwimming(delta) {
        for (const direction in this.swimTimes) {
            if (this.moveKeys[direction].isDown) this.swimTimes[direction] += delta;
        }

        const directionsDone = Object.values(this.swimTimes).filter((time) => time >= SWIM_KEY_TIME).length;
        if (directionsDone !== this.shownDirectionsDone) this.emitSwimStep(directionsDone);
        if (directionsDone === 4) this.completeStep();
    }

    emitDoneStep() {
        this.emitStep({
            text: `Look after your reef for ${GAME_YEARS} years. Keep your fish fed and safe, build your nest, pop Cloudy bubbles during heatwaves, and use the ${CONTROL_TEXT[this.controlScheme].lookKeys} to look around the reef. Have fun exploring!`,
        });
    }

    /* Eat to Grow: one glowing shellfish on the sea floor in the middle of the scene, like the main game's food */

    startFood() {
        // a little bigger than in the main game, so it's easy to spot
        this.shellfish = addShellfish(this, this.scale.width / 2, FOOD_MAX_Y - 20, TEXTURES.fleaCone, {
            size: FOOD_SIZE * 1.25,
            depth: DEPTH.tutorialShellfish,
        });
        this.emitStep();
    }

    eatFood() {
        eatShellfish(this, this.shellfish);
        this.shellfish = null;
        this.hearts.setHealth(this.hearts.health + 1);
        this.player.growTo(FOOD_GROWTH); // the same as one shellfish in the main game
        this.completeStep();
    }

    /* Build Your Nest: the main game's nest and Q controls, with one of each piece to bring to it */

    startNest() {
        this.nestBuilding = new NestBuilding(this, this.scale.width / 2, { supply: false });
        for (const { type, x } of TUTORIAL_PIECES) this.nestBuilding.addPiece(x, type);
        this.emitNestStep();
    }

    emitNestStep() {
        this.shownPiecesPlaced = this.nestBuilding.piecesPlaced;
        this.emitStep({
            text: `Triggerfish build nests in the sand. Swim to a glowing piece and press Q to pick it up, then press Q again by the nest to drop it in. Every piece helps your nest grow. (${this.nestBuilding.piecesPlaced}/${TUTORIAL_PIECES.length} placed)`,
        });
    }

    updateNest() {
        const inLesson = this.stepId === "nest";
        this.nestBuilding.updateControls(inLesson && !this.praised, this.hidePrompt);
        if (!inLesson || this.nestBuilding.piecesPlaced === this.shownPiecesPlaced) return;

        this.emitNestStep();
        if (this.nestBuilding.piecesPlaced >= TUTORIAL_PIECES.length) this.completeStep();
    }

    /* Summer Heatwaves: the coral appears, and bleaches once the fish swims over to it */

    startHeat() {
        this.createCoral(this.scale.width * 0.72, this.scale.height - 120);
        this.emitStep();
    }

    // Uses the same bleach stages as the corals in the main game, so the player can see the heat's effect
    createCoral(x, y) {
        this.coralStages = getBleachStageKeys(this, CORAL_VARIANT);
        this.coralStress = 0;
        this.coralStage = 0;
        this.coralStressRate = 0; // stress per second: positive while bleaching, negative while recovering

        this.coral = this.add.image(x, y, CORAL_VARIANT).setOrigin(0.5, 1).setDepth(DEPTH.coralFrontRow);
        this.coral.setScale(Math.min(260 / this.coral.width, 220 / this.coral.height, 1.3));

        this.tweens.add({
            targets: this.coral,
            angle: { from: -3, to: 3 },
            duration: 3000,
            yoyo: true,
            repeat: -1,
            ease: "Sine.inOut",
        });
    }

    startHeatwave() {
        this.heatwave = true;
        this.temperature += HEATWAVE_TEMPERATURE_RISE;
        this.light = SUMMER_PEAK_LIGHT;
        this.coralStressRate = HEATWAVE_STRESS_PER_SECOND;
        this.tweens.add({ targets: this.heatGlow, alpha: 0.15, duration: 1500 });

        // The same warning sound and notice the main game shows when a summer heatwave starts. In the tutorial the
        // notice closes by itself after a few seconds (Notices.jsx), or when the player closes it.
        this.sound.play(SOUNDS.bleachingWarning, { volume: this.sfxVolume });
        this.game.events.emit(GAME_EVENTS.reefWarning, {
            id: LESSON_NOTICE_ID,
            persistent: true,
            advanceTutorialOnClose: true,
            warning: true,
            ...bleachingNotice(HEATWAVE_TEMPERATURE_RISE),
        });
        this.emitStep({
            text: "Your coral is heating up! Read the notice below, then pop a green Cloudy bubble to slow the bleaching.",
        });
        this.emitStats();
    }

    /** Called by App when a lesson's notice times out or its Close button is clicked */
    onLessonNoticeClosed() {
        this.lessonNoticeClosed = true;
        if (this.stepId === "predator" && !this.predator) this.completeStep();
    }

    updateCoral(delta) {
        const previousStress = this.coralStress;
        this.coralStress = Phaser.Math.Clamp(
            this.coralStress + (this.coralStressRate * delta) / 1000,
            0,
            HEATWAVE_MAX_STRESS,
        );
        if (this.coralStress !== previousStress) {
            const stage = getBleachStage(this.coralStress);
            if (stage !== this.coralStage) {
                this.coralStage = stage;
                this.coral.setTexture(this.coralStages[stage]);
            }
        }

        if (this.stepId === "heat" && this.lessonNoticeClosed && this.coralStress >= HEAT_STEP_STRESS) {
            this.completeStep();
        }
    }

    /* Shade the Reef: a green Cloudy bubble, the same as the main game's, slows the bleaching */

    startCloudy() {
        const { x, y } = this.getSpotAwayFromFish(380);
        this.cloudBubble = createCloudyBubble(this, x, y, CLOUDY_LIGHT_DROP);
        this.emitStep();
    }

    popCloudBubble() {
        const { sprite, label } = this.cloudBubble;
        this.tweens.killTweensOf([sprite, label]);
        sprite.destroy();
        label.destroy();
        this.cloudBubble = null;
        this.sound.play(SOUNDS.bubblePop, { volume: this.sfxVolume });

        const before = this.light;
        this.light -= CLOUDY_LIGHT_DROP;
        this.coralStressRate = SHADED_STRESS_PER_SECOND;
        this.tweens.add({ targets: this.heatGlow, alpha: 0.07, duration: 800 });

        // Worded the same as the notice the main game shows for this bubble
        this.game.events.emit(GAME_EVENTS.randomEvent, {
            title: CLOUDY_BUBBLE.title,
            message: `The light level fell from ${before} to ${this.light}. ${CLOUDY_BUBBLE.teach}`,
        });
        this.emitStats();
        this.completeStep();
    }

    /* Check On Your Coral: winter cools the reef, and the player clicks the coral to see how it's doing */

    startCoral() {
        this.heatwave = false;
        this.temperature -= HEATWAVE_TEMPERATURE_RISE;
        this.light = NORMAL_LIGHT;
        this.coralStressRate = -WINTER_RECOVERY_PER_SECOND;
        this.tweens.add({ targets: this.heatGlow, alpha: 0, duration: 2000 });

        // Clickable with the same hover tint as the main game's corals, just for this lesson
        this.coral
            .setInteractive({ useHandCursor: true })
            .on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => this.coral.setTint(COLORS.coralHover))
            .on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => this.coral.clearTint())
            .on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.openCoralInfo());

        this.emitStats();
        this.emitStep();
    }

    // Sends the coral's details to React's coral popup, like clicking a coral in the main game
    openCoralInfo() {
        if (this.coralInfoOpen) return;

        this.coralInfoOpen = true;
        this.coral.clearTint();
        this.game.events.emit(GAME_EVENTS.coralSelected, getCoralInfo(CORAL_VARIANT, this.coralStress));
    }

    /** Called by PhaserGame when the coral popup is closed */
    closeCoralPopup() {
        if (!this.coralInfoOpen) return;
        this.coralInfoOpen = false;
        this.coral.disableInteractive();
        this.completeStep();
    }

    /* Watch Out for Predators: a grouper chases the fish, and only leaves for good if it stays hidden in the nest */

    startPredator() {
        this.predator = this.add
            .image(this.scale.width + PREDATOR_ESCAPE_MARGIN, 300, TEXTURES.grouper)
            .setScale(PREDATOR_SCALE)
            .setDepth(DEPTH.predator);
        this.predatorFleeing = false;
        this.nextBiteAt = 0;
        this.game.events.emit(GAME_EVENTS.predatorAppeared);
        this.emitStep();
    }

    updatePredator(frameScale) {
        const { predator, player } = this;
        if (this.predatorFleeing) {
            // Swims off whichever side of the screen is closer
            const direction = predator.x <= this.scale.width / 2 ? -1 : 1;
            predator.x += direction * PREDATOR_SPEED * frameScale;
            facePredator(predator, direction, 0, frameScale);

            const margin = predator.displayWidth / 2 + PREDATOR_ESCAPE_MARGIN;
            if (predator.x <= -margin || predator.x >= this.scale.width + margin) {
                predator.destroy();
                this.predator = null;
                this.showAllClear();
            }
            return;
        }

        const distance = Phaser.Math.Distance.Between(predator.x, predator.y, player.x, player.y);
        if (distance > 0) {
            const directionX = (player.x - predator.x) / distance;
            const directionY = (player.y - predator.y) / distance;
            const step = Math.min(TUTORIAL_PREDATOR_SPEED * frameScale, distance);
            predator.x += directionX * step;
            predator.y += directionY * step;
            facePredator(predator, directionX, directionY, frameScale);
        }

        // Flashes red while the predator is on it, and loses half a heart with each bite
        if (this.touching(predator)) {
            player.setTint(COLORS.hurt);
            if (this.time.now >= this.nextBiteAt) this.bite();
        } else {
            player.clearTint();
        }
    }

    bite() {
        this.nextBiteAt = this.time.now + TUTORIAL_BITE_INTERVAL;
        this.hearts.setHealth(Math.max(this.hearts.health - 1, TUTORIAL_MIN_HEALTH));
    }

    // Worded the same as the main game's notice, while still allowing the tutorial lesson to advance on close
    showAllClear() {
        this.game.events.emit(GAME_EVENTS.reefWarning, {
            id: LESSON_NOTICE_ID,
            persistent: true,
            advanceTutorialOnClose: true,
            title: "All Clear",
            message: "The predator has left. You can come out now!",
        });
        this.emitStep({
            text: "The grouper has gone! Once your fish reaches its maximum size, it can scare predators off.",
        });
    }

    // Like the main game, the predator leaves while the fish stays in its nest. (The main game's corals hide the
    // fish too, but the predator only waits nearby, so the lesson teaches the nest.)
    nestInHideReach() {
        const { x, y } = this.nestBuilding.getHidePoint();
        return Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y) <= HIDE_DISTANCE;
    }

    hideFish() {
        if (this.isHiding || !this.nestInHideReach()) return;
        this.isHiding = true;
        this.player.hideAt(this.nestBuilding.getHidePoint());
        this.predatorFleeing = true;
    }

    leaveHiding() {
        this.isHiding = false;
        this.player.comeOut();

        // Coming out too early makes the predator turn back, like the main game
        if (this.predator) {
            this.predatorFleeing = false;
            this.emitStep({
                text: "Too soon! The grouper turned back. Hide in your nest and wait for the All Clear message.",
            });
        }
    }
}

export default Tutorial;
