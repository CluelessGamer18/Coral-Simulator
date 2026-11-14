import Phaser from "phaser";
import { prepareBleachStages } from "./CoralManager.js";
import { createPointerControls, readMovement, takeVirtualKey, listenForPress } from "./PointerControls.js";
import { saveSettings } from "../settings.js";
import { createHome, addPiece, updateHomeControls, updateNestCamera } from "./HomeBuilding.js";
import { addGlow, removeGlow, addShadow } from "./Glow.js";
import {
    FOOD_GROWTH,
    FOOD_GLOW_COLOR,
    FOOD_SIZE,
    FOOD_MAX_Y,
    PREDATOR_SPEED,
    REEF_HIDE_DISTANCE,
    PREDATOR_ESCAPE_MARGIN,
} from "./TestScene.js";
import { exposeForDebugging } from "./debug.js";
import { getEffectiveVolumes } from "../audioSettings.js";
import { MAX_FRAME_MS, FISH_SPEED, MAX_HEARTS, HEART_SPACING, HEART_OFFSET_Y } from "./gameConfig.js";

const FISH_SCALE = 1.3 / 1.5; // the fish's size in the main game before it grows
const PRAISE_DURATION = 2000; // ms the "well done" message shows before moving on (keep in sync with TutorialBanner.css)
const TUTORIAL_PREDATOR_SPEED = PREDATOR_SPEED * 0.6; // slower than the real one, to give time to read the banner
const TUTORIAL_BITE_INTERVAL = 2000; // ms between bites, half as often as the main game, as the player may still be reading
const TUTORIAL_MIN_HEALTH = 2; // bites stop at one full heart, so the fish can't die in the tutorial
const SWIM_KEY_TIME = 400; // ms each direction has to be held to finish the first lesson
const BLEACH_PREP_MS_PER_FRAME = 6; // time each frame spends making the main game's coral bleach stages in the background

// One of each kind of nest piece, spread out on either side of the nest
const TUTORIAL_PIECES = [
    { type: "pebble", x: 200 },
    { type: "shell", x: 420 },
    { type: "coral", x: 1240 },
];

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
        text: "Swim down to the glowing shell to eat it. Triggerfish crack open snails and clams from the sea floor. Food refills your hearts and helps your fish grow.",
        image: "tutorial/tutorial_food.svg",
        imageAlt: "A fish swimming toward a glowing red shell, then growing bigger",
        praise: "Complete!",
    },
    {
        id: "home",
        title: "Build Your Nest",
        // text is filled in by emitHomeStep() so it can show how many pieces are in the nest
        image: "tutorial/tutorial_home.svg",
        imageAlt: "The Q key beside a fish carrying a glowing pebble to its nest in the sand",
        praise: "Nice nest!",
    },
    {
        id: "predator",
        title: "Watch Out for Predators",
        text: "Swim to your nest and press E to hide. A grouper is hunting you! Stay hidden until the All Clear message appears. (Coral hides you too, but the grouper waits nearby.)",
        image: "tutorial/tutorial_predator.svg",
        imageAlt: "The E key beside a fish hiding in its nest while a grouper swims past",
        praise: "Complete!",
    },
    {
        id: "done",
        title: "Let's Get Started!",
        // text is filled in by emitDoneStep() so it can name the keys that move the camera
        image: "tutorial/tutorial_4.png",
        imageAlt: "A fish ready to explore the reef",
        buttonLabel: "Let's Go!",
    },
];

// An empty stretch of reef (just the sand and background) where the player learns to swim, eat, build and hide: about
// a minute. The reef's side of the game (heatwaves, bubbles, checking on coral) is taught in the first years of the
// game itself, by each year's goals. Finishing or skipping it is remembered, so Start goes straight to the game next time.
// React shows the current lesson with "tutorial-step" and the praise message with "tutorial-praise".
// The nest, coral popup, notices and predator alert are the main game's, so this scene answers to the same
// calls and events (closeCoralPopup(), eventNoticeClosed(), "stats-changed", "coralInfo", "reef-warning", "random-event",
// "predator-appeared").
class Tutorial extends Phaser.Scene {
    constructor() {
        super("Tutorial");
    }

    create() {
        this.finished = false;
        this.stepIndex = -1;
        this.fishGrowth = 1;
        this.health = MAX_HEARTS * 2 - 1; // half a heart short, so eating shows the hearts filling up
        this.isHiding = false;
        this.coralInfoOpen = false;
        this.sfxVolume ??= getEffectiveVolumes().sfx;

        this.setupWorld();
        this.setupFish();
        createPointerControls(this);
        this.setupKeys();

        // The main game needs every coral's bleach stages, which take seconds to make all at once.
        // Making them a few at a time while the player learns means the main game starts without freezing.
        this.bleachStagePrep = prepareBleachStages(this);

        this.nextStep();

        exposeForDebugging(this);
        // Tells React about the scene, so the settings button can pause it and the popups can talk to it
        this.game.events.emit("scene-ready", this);
        this.emitStats();
    }

    setupWorld() {
        const { width, height } = this.scale;
        this.cameras.main.setBackgroundColor("#8ACFC9");
        this.cameras.main.setBounds(0, 0, width, height); // keeps the view on the scene while it zooms in on the nest

        // Same layers as the main game, but no coral, schools or pipes
        const addLayer = (key, depth, bottomAligned = true) => {
            const layer = this.add.image(0, 0, key).setOrigin(0, 0).setDepth(depth);
            layer.y = bottomAligned ? height - layer.height : -10;
        };
        addLayer("floor_layer3", 1);
        addLayer("floor_layer2", 2);
        addLayer("floor_layer1", 5);
        addLayer("floor_layer0", 6);
        addLayer("surface", -4, false);
    }

    setupFish() {
        this.guide = this.add.image(300, 450, "Guide")
            .setDepth(9999)
            .setScale(FISH_SCALE);
        addShadow(this, this.guide);

        this.shadow = this.add.ellipse(this.guide.x, 950, 100, 10, 0x000000, 0.5).setDepth(6);

        this.hearts = [];
        for (let i = 0; i < MAX_HEARTS; i++) {
            this.hearts.push(this.add.image(0, 0, "heartFull").setDepth(9999.5));
        }
        this.refreshHeartTextures();
    }

    setupKeys() {
        // Only the keys that swim do anything here, as this scene fits on one screen and has no camera to move.
        // Q (nest building) is added by createHome() when the nest lesson starts.
        this.wasdKeys = this.input.keyboard.addKeys({ up: "W", left: "A", down: "S", right: "D" });
        this.arrowKeys = this.input.keyboard.addKeys({ up: "UP", left: "LEFT", down: "DOWN", right: "RIGHT" });
        this.hideKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        listenForPress(this, this.hideKey, "hide");

        // Restarting removes the keys, so they're handed out again here. React sets the scheme on a new scene.
        this.setControlScheme(this.controlScheme ?? "wasd");
    }

    // Called by App when the choice changes, which can be part way through a lesson that names the keys
    setControlScheme(scheme) {
        this.controlScheme = scheme;
        this.moveKeys = scheme === "arrows" ? this.arrowKeys : this.wasdKeys;

        // A key held during the switch would otherwise stay down
        [...Object.values(this.wasdKeys), ...Object.values(this.arrowKeys)].forEach(key => key.reset());

        if (this.stepId === "swim") this.emitSwimStep(this.shownDirectionsDone);
        if (this.stepId === "done") this.emitDoneStep();
    }

    get stepId() {
        return STEPS[this.stepIndex]?.id;
    }

    emitStep(overrides = {}) {
        this.game.events.emit("tutorial-step", { ...STEPS[this.stepIndex], ...overrides });
    }

    // Shows the lesson's praise once, then moves on to the next lesson after it has faded
    completeStep() {
        if (this.praised) return;
        this.praised = true;

        // The id makes React show it again even when it's the same text as the last one
        this.praiseCount = (this.praiseCount ?? 0) + 1;
        this.game.events.emit("tutorial-praise", { text: STEPS[this.stepIndex].praise, id: this.praiseCount });
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
            home: () => this.startHome(),
            predator: () => this.startPredator(),
            done: () => this.emitDoneStep(),
        }[this.stepId];
        if (start) {
            start();
        } else {
            this.emitStep();
        }
    }

    // Called by the "Let's Go!" button on the last lesson, and by Skip tutorial
    finish() {
        if (this.finished) return;
        this.finished = true;
        saveSettings({ tutorialDone: true });
        this.game.events.emit("tutorial-step", null);
        this.game.events.emit("reef-warning-cleared", LESSON_NOTICE_ID); // Skip can leave one open
        this.scene.start("TestScene", { tutorialComplete: true });
    }

    setSfxVolume(value) {
        this.sfxVolume = value;
    }

    // The HUD only needs to know there is no game to show yet
    emitStats() {
        this.game.events.emit("stats-changed", { simEnd: false });
    }

    update(time, delta) {
        this.continueBleachStagePrep();

        // Tuned at 60fps like the main game, and capped so a lag spike doesn't teleport the fish
        delta = Math.min(delta, MAX_FRAME_MS);
        const frameScale = delta / (1000 / 60);

        const hidePressed = takeVirtualKey(this, "hide");
        if (hidePressed && this.stepId === "predator") {
            if (this.isHiding) this.leaveHiding();
            else this.hideFish();
        }

        const { x: horizontal, y: vertical } = readMovement(this); // the keys, or towards the pointer
        const moving = horizontal !== 0 || vertical !== 0;

        // Swimming away leaves the nest, like in the main game
        if (this.isHiding && moving && !hidePressed) this.leaveHiding();

        if (!this.isHiding && moving) {
            this.swim(horizontal, vertical, frameScale);
            this.swamThisStep = true;
            if (this.stepId === "swim") this.trackSwimming(delta, horizontal, vertical);
        }
        this.guide.setScale(FISH_SCALE * this.fishGrowth);
        this.updateHearts();

        // Goals only count once the fish has swum during the lesson, so one it was already sitting on
        // isn't completed before the player has had a chance to read the banner
        if (this.swamThisStep && this.stepId === "food" && this.touching(this.shellfish)) this.eatFood();

        if (this.home) this.updateHome();

        if (this.predator) this.updatePredator(frameScale);

        updateNestCamera(this, this.isHiding, frameScale);

        this.shadow.setPosition(this.guide.x, 950).setScale(this.guide.scale, 1);
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

    // Same movement as the main game's fish
    swim(horizontal, vertical, frameScale) {
        const speed = FISH_SPEED * frameScale;
        this.guide.x += horizontal * speed;
        this.guide.y += vertical * speed;

        // Swimming straight up or down keeps the way the fish was facing, so it doesn't snap upside down
        const flip = Math.abs(horizontal) < 0.15 ? this.guide.flipY : horizontal < 0;
        this.guide.setFlipY(flip);
        this.guide.rotation = Phaser.Math.Angle.RotateTo(
            this.guide.rotation,
            Math.atan2(vertical, horizontal),
            0.5 * frameScale
        );

        const wiggle = Math.sin(this.time.now * 0.01) * frameScale;
        this.guide.x += Math.cos(this.guide.rotation + Math.PI / 2) * wiggle;
        this.guide.y += Math.sin(this.guide.rotation + Math.PI / 2) * wiggle;

        // Single screen, so keep the fish on it
        this.guide.x = Phaser.Math.Clamp(this.guide.x, 100, this.scale.width - 100);
        this.guide.y = Phaser.Math.Clamp(this.guide.y, 120, 850);
    }

    // Keeps the hearts centred above the fish
    updateHearts() {
        const y = this.guide.y - this.guide.displayHeight / 2 - HEART_OFFSET_Y;
        const startX = this.guide.x - ((this.hearts.length - 1) * HEART_SPACING) / 2;
        this.hearts.forEach((heart, i) => heart.setPosition(startX + i * HEART_SPACING, y));
    }

    // Shows full, half or empty hearts to match this.health
    refreshHeartTextures() {
        this.hearts.forEach((heart, i) => {
            const halves = Phaser.Math.Clamp(this.health - i * 2, 0, 2);
            heart.setTexture(["heartDead", "heartHalf", "heartFull"][halves]);
        });
    }

    touching(target) {
        return target && Phaser.Geom.Intersects.RectangleToRectangle(this.guide.getBounds(), target.getBounds());
    }

    bobUpAndDown(target) {
        this.tweens.add({
            targets: target,
            y: target.y - 20,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: "Sine.inOut"
        });
    }

    // Somewhere on the other side of the screen from the fish, so it has to swim across to reach it
    getSpotAwayFromFish(y) {
        return { x: this.guide.x < this.scale.width / 2 ? 1050 : 400, y };
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
            text: `Hold the ${swimKeys} to swim up, down, left and right, or press and hold on the water. You are a triggerfish living on a coral reef. Prefer the ${lookKeys}? Switch in Options. (${directionsDone}/4 directions)`,
            image,
            imageAlt,
        });
    }

    // Counts time spent heading each way rather than distance, so swimming into the edge of the screen still
    // counts, and so does steering with a mouse or a finger
    trackSwimming(delta, horizontal, vertical) {
        if (vertical < -0.5) this.swimTimes.up += delta;
        if (vertical > 0.5) this.swimTimes.down += delta;
        if (horizontal < -0.5) this.swimTimes.left += delta;
        if (horizontal > 0.5) this.swimTimes.right += delta;

        const directionsDone = Object.values(this.swimTimes).filter(time => time >= SWIM_KEY_TIME).length;
        if (directionsDone !== this.shownDirectionsDone) this.emitSwimStep(directionsDone);
        if (directionsDone === 4) this.completeStep();
    }

    emitDoneStep() {
        this.emitStep({
            text: `Look after your reef for 10 years. Each year's goals are listed beside the game, and the first heatwave arrives in year 2. Click any coral to learn about it, and use the ${CONTROL_TEXT[this.controlScheme].lookKeys} to look around.`
        });
    }

    /* Eat to Grow: one glowing shellfish on the sea floor in the middle of the scene, like the main game's food */

    startFood() {
        this.shellfish = this.add.image(this.scale.width / 2, FOOD_MAX_Y - 20, "fleaCone").setDepth(8);
        // a little bigger than in the main game, so it's easy to spot
        this.shellfish.setScale(FOOD_SIZE * 1.25 / Math.sqrt(this.shellfish.width * this.shellfish.height));
        addGlow(this, this.shellfish, FOOD_GLOW_COLOR);
        this.emitStep();
    }

    eatFood() {
        removeGlow(this.shellfish);
        this.shellfish.destroy();
        this.shellfish = null;
        this.sound.play("foodCrunch", { volume: this.sfxVolume });

        this.health = Math.min(this.health + 1, MAX_HEARTS * 2);
        this.refreshHeartTextures();

        // Grows the same amount as one shellfish in the main game
        this.tweens.add({
            targets: this,
            fishGrowth: FOOD_GROWTH,
            duration: 300,
            ease: "Back.out"
        });
        this.completeStep();
    }

    /* Build Your Nest: the main game's nest and Q controls, with one of each piece to bring to it */

    startHome() {
        createHome(this, this.scale.width / 2);
        for (const { type, x } of TUTORIAL_PIECES) addPiece(this, x, type);
        this.emitHomeStep();
    }

    emitHomeStep() {
        this.shownPiecesPlaced = this.homePiecesPlaced;
        this.emitStep({
            text: `Triggerfish build nests in the sand. Swim to a glowing piece and press Q to pick it up, then press Q again by the nest to drop it in. Every piece helps your nest grow. (${this.homePiecesPlaced}/${TUTORIAL_PIECES.length} placed)`
        });
    }

    updateHome() {
        const inLesson = this.stepId === "home";
        updateHomeControls(this, inLesson && !this.praised);
        if (!inLesson || this.homePiecesPlaced === this.shownPiecesPlaced) return;

        this.emitHomeStep();
        if (this.homePiecesPlaced >= TUTORIAL_PIECES.length) this.completeStep();
    }

    // Called by App when a notice's Close button is clicked
    eventNoticeClosed() {
        if (this.stepId === "predator" && !this.predator) this.completeStep();
    }

    /* Watch Out for Predators: a grouper chases the fish, and only leaves for good if it stays hidden in the nest */

    startPredator() {
        // the main game's grouper
        this.predator = this.add.image(this.scale.width + PREDATOR_ESCAPE_MARGIN, 300, "grouper")
            .setScale(0.4)
            .setDepth(9998);
        this.predatorFleeing = false;
        this.nextBiteAt = 0;
        this.game.events.emit("predator-appeared");
        this.emitStep();
    }

    updatePredator(frameScale) {
        if (this.predatorFleeing) {
            // Swims off whichever side of the screen is closer
            const direction = this.predator.x <= this.scale.width / 2 ? -1 : 1;
            this.predator.x += direction * PREDATOR_SPEED * frameScale;
            this.facePredator(direction, 0, frameScale);

            const margin = this.predator.displayWidth / 2 + PREDATOR_ESCAPE_MARGIN;
            if (this.predator.x <= -margin || this.predator.x >= this.scale.width + margin) {
                this.predator.destroy();
                this.predator = null;
                this.showAllClear();
            }
            return;
        }

        const distance = Phaser.Math.Distance.Between(this.predator.x, this.predator.y, this.guide.x, this.guide.y);
        if (distance > 0) {
            const directionX = (this.guide.x - this.predator.x) / distance;
            const directionY = (this.guide.y - this.predator.y) / distance;
            const step = Math.min(TUTORIAL_PREDATOR_SPEED * frameScale, distance);
            this.predator.x += directionX * step;
            this.predator.y += directionY * step;
            this.facePredator(directionX, directionY, frameScale);
        }

        // Flashes red while the predator is on it, and loses half a heart with each bite
        if (this.touching(this.predator)) {
            this.guide.setTint(0xff6666);
            if (this.time.now >= this.nextBiteAt) this.bite();
        } else {
            this.guide.clearTint();
        }
    }

    bite() {
        this.nextBiteAt = this.time.now + TUTORIAL_BITE_INTERVAL;
        this.health = Math.max(this.health - 1, TUTORIAL_MIN_HEALTH);
        this.refreshHeartTextures();
    }

    // Worded the same as the main game's notice, but it stays until closed, and the lesson waits for that,
    // so the player reads one message at a time
    showAllClear() {
        this.game.events.emit("reef-warning", {
            id: LESSON_NOTICE_ID,
            persistent: true,
            title: "All Clear",
            message: "The predator has left. You can come out now!",
        });
        this.emitStep({
            text: "The grouper has gone! Once your fish reaches its maximum size, it can scare predators off. Click Close to continue."
        });
    }

    // Same as the main game: the grouper artwork faces left, so mirror it to face right
    facePredator(directionX, directionY, frameScale) {
        const flip = directionX === 0 ? this.predator.flipX : directionX > 0;
        this.predator.setFlipX(flip);
        this.predator.rotation = Phaser.Math.Angle.RotateTo(
            this.predator.rotation,
            Math.atan2(directionY, directionX) - (flip ? 0 : Math.PI),
            0.5 * frameScale
        );
    }

    // Like the main game, the predator leaves while the fish stays in its nest. (The main game's corals hide the
    // fish too, but the predator only waits nearby, so the lesson teaches the nest.)
    hideFish() {
        this.pointerGoal = null;
        const hideY = Phaser.Math.Clamp(this.home.y - this.home.displayHeight * 0.45, 120, 850);
        const distance = Phaser.Math.Distance.Between(this.guide.x, this.guide.y, this.home.x, hideY);
        if (this.isHiding || distance > REEF_HIDE_DISTANCE) return;

        this.isHiding = true;
        this.guide.clearTint();
        this.guide.setPosition(this.home.x, hideY);
        this.guide.setDepth(this.home.depth - 0.1);

        this.predatorFleeing = true;
    }

    leaveHiding() {
        this.isHiding = false;
        this.guide.setDepth(9999);

        // Coming out too early makes the predator turn back, like the main game
        if (this.predator) {
            this.predatorFleeing = false;
            this.emitStep({ text: "Too soon! The grouper turned back. Hide in your nest and wait for the All Clear message." });
        }
    }
}

export default Tutorial;
