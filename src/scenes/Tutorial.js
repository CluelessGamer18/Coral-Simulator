import Phaser from "phaser";
import { createBleachStages, getBleachStage, getCoralInfo } from "./CoralManager.js";
import { EVENTS } from "./Events.js";
import { createHome, addPiece, updateHomeControls } from "./HomeBuilding.js";
import { addGlow, removeGlow } from "./Glow.js";
import {
    FOOD_GROWTH,
    FOOD_GLOW_COLOR,
    FOOD_SCALE,
    FOOD_MAX_Y,
    PREDATOR_SPEED,
    REEF_HIDE_DISTANCE,
    PREDATOR_ESCAPE_MARGIN,
} from "./TestScene.js";

const FISH_SPEED = 6.75; // same as the main game
const FISH_SCALE = 1.3 / 1.5; // the fish's size in the main game before it grows
const PRAISE_DURATION = 2000; // ms the "well done" message shows before moving on (keep in sync with TutorialBanner.css)
const TUTORIAL_PREDATOR_SPEED = PREDATOR_SPEED * 0.6; // slower than the real one, to give time to read the banner
const CORAL_VISIT_DISTANCE = 200; // how close the fish has to swim to the coral to check on it

// Hearts above the fish, laid out the same as the main game. Health is counted in half hearts.
const MAX_HEARTS = 3;
const HEART_SPACING = 36;
const HEART_OFFSET_Y = 30;

// One of each kind of nest piece, spread out on either side of the nest
const TUTORIAL_PIECES = [
    { type: "pebble", x: 200 },
    { type: "shell", x: 420 },
    { type: "coral", x: 1240 },
];

// The heatwave lesson: the coral bleaches until a Cloudy bubble shades it, then recovers in winter
const CORAL_TYPE = "tabular1";
const CORAL_KEY = "Tabular-1";
const HEATWAVE_TEMPERATURE_RISE = 5; // °C, the main game's summers add 2 to 8
const SUMMER_LIGHT = 1500;
const CLOUDY_LIGHT_DROP = 400;
const HEATWAVE_STRESS_PER_SECOND = 18;
const SHADED_STRESS_PER_SECOND = HEATWAVE_STRESS_PER_SECOND / 4; // the Cloudy bubble slows bleaching, it doesn't stop the heat
const HEATWAVE_MAX_STRESS = 85; // "Bleached", but never dead
const HEAT_STEP_STRESS = 40; // how far the coral bleaches before the Cloudy bubble shows up
const WINTER_RECOVERY_PER_SECOND = 30;
const CLOUDY_EVENT = EVENTS.find(event => event.id === "shade");

// The lessons React shows in the banner at the top of the screen, in the order the player meets them.
// Each one is started by start<Id>() below (if it has one) and completed by doing what it says.
const STEPS = [
    {
        id: "swim",
        title: "Swim Around",
        text: "You are a triggerfish living on a coral reef. Use the W, A, S and D keys to swim around.",
        image: "tutorial/tutorial_wasd.png",
        imageAlt: "The W, A, S and D keys beside a fish swimming toward the coral reef",
        praise: "Great swimming!",
    },
    {
        id: "food",
        title: "Eat to Grow",
        text: "Triggerfish crack open shellfish like snails and clams that live on the sea floor. Swim down to the glowing shell to eat it. Food refills the hearts above your fish and helps it grow bigger.",
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
        id: "heat",
        title: "Summer Heatwaves",
        text: "Each year has a summer and a winter. From the second year on, every summer brings a heatwave that stresses your coral, and rising pollution makes it worse. Swim over to your coral to see what happens.",
        image: "tutorial/tutorial_3.png",
        imageAlt: "Corals on the reef",
        praise: "Oh no, it's bleaching!",
    },
    {
        id: "cloudy",
        title: "Shade the Reef",
        text: "Bright summer light makes heat bleach coral even faster. During heatwaves, green Cloudy bubbles appear near you. Swim into one to shade the reef and slow the bleaching.",
        image: "tutorial/tutorial_cloudy.svg",
        imageAlt: "A fish swimming toward a green Cloudy bubble",
        praise: "Complete!",
    },
    {
        id: "coral",
        title: "Check On Your Coral",
        text: "In winter the water cools and stressed coral can recover. Click on your coral to learn about it and see how it's doing. Looking at corals earns you points!",
        image: "tutorial/tutorial_1.png",
        imageAlt: "A computer mouse beside a fish swimming toward the coral reef",
        praise: "Complete!",
    },
    {
        id: "predator",
        title: "Watch Out for Predators",
        text: "A lionfish is hunting you, and every bite costs half a heart! Swim close to your coral and press E to hide until it swims away. Once you've eaten 3 shellfish, you're big enough to scare predators off.",
        image: "tutorial/tutorial_predator.svg",
        imageAlt: "The E key beside a fish hiding in the coral while a lionfish swims past",
        praise: "Complete!",
    },
    {
        id: "done",
        title: "Let's Get Started!",
        text: "Look after your reef for 10 years. Keep your fish fed and safe, build your nest, pop Cloudy bubbles during heatwaves, and use the arrow keys to look around the reef. Have fun exploring!",
        image: "tutorial/tutorial_4.png",
        imageAlt: "A fish ready to explore the reef",
        buttonLabel: "Let's Go!",
    },
];

// An empty stretch of reef (just the sand and background) where the player learns each part of the main game in turn.
// React shows the current lesson with "tutorial-step" and the praise message with "tutorial-praise".
// The nest, coral popup, notices and predator alert are the main game's, so this scene answers to the same
// calls and events (closeCoralPopup(), "stats-changed", "coralInfo", "reef-warning", "random-event",
// "predator-appeared"/"predator-left").
class Tutorial extends Phaser.Scene {
    constructor() {
        super("Tutorial");
    }

    create() {
        this.finished = false;
        this.fishGrowth = 1;
        this.health = MAX_HEARTS * 2 - 1; // half a heart short, so eating shows the hearts filling up
        this.temperature = 27;
        this.lightLevel = 500;
        this.score = 0;
        this.isHiding = false;
        this.coralInfoOpen = false;
        this.sfxVolume ??= 1;

        this.setupWorld();
        this.setupFish();
        this.setupKeys();
        this.setupSkipButton();

        this.stepIndex = -1;
        this.nextStep();

        window.gameScene = this;
        // Tells React about the scene, so the settings button can pause it and the popups can talk to it
        this.game.events.emit("scene-ready", this);
        this.emitStats();
    }

    setupWorld() {
        const { width, height } = this.scale;
        this.cameras.main.setBackgroundColor("#8ACFC9");

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

        // Warm glow over the reef during the heatwave lesson
        this.heatOverlay = this.add.rectangle(0, 0, width, height, 0xff7a2f)
            .setOrigin(0, 0)
            .setDepth(9000)
            .setAlpha(0);
    }

    setupFish() {
        this.guide = this.add.image(300, 450, "Guide")
            .setDepth(9999)
            .setScale(FISH_SCALE);
        // preFX only exists under WebGL; on the Canvas fallback renderer it's null, so skip the shadow there
        this.guide.preFX?.addShadow(0, -8, 0.009, 1, 0x333333, 5);

        this.shadow = this.add.graphics({ fillStyle: { color: 0x000000 } }).setDepth(6).setAlpha(0.5);

        this.hearts = [];
        for (let i = 0; i < MAX_HEARTS; i++) {
            this.hearts.push(this.add.image(0, 0, "heartFull").setDepth(9999.5));
        }
        this.refreshHeartTextures();
    }

    setupKeys() {
        // WASD only, the same as the main game (where the arrow keys move the camera).
        // Q (nest building) is added by createHome() when the nest lesson starts.
        this.moveKeys = this.input.keyboard.addKeys("W,A,S,D");
        this.hideKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    }

    setupSkipButton() {
        this.add.text(this.scale.width - 24, 24, "Skip tutorial", {
            fontFamily: "Arial, sans-serif",
            fontSize: "20px",
            color: "#ffffff",
            backgroundColor: "#0292A5",
            padding: { x: 14, y: 10 }
        })
            .setOrigin(1, 0)
            .setDepth(10002)
            .setScrollFactor(0)
            .setInteractive({ useHandCursor: true })
            .on("pointerover", function () {
                this.setStyle({ backgroundColor: "#F86A1C" });
            })
            .on("pointerout", function () {
                this.setStyle({ backgroundColor: "#0292A5" });
            })
            .on("pointerdown", () => this.finish());
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
            food: () => this.startFood(),
            home: () => this.startHome(),
            heat: () => this.startHeat(),
            cloudy: () => this.startCloudy(),
            coral: () => this.startCoral(),
            predator: () => this.startPredator(),
        }[this.stepId];
        if (start) {
            start();
        } else {
            this.emitStep();
        }
    }

    // Called by the "Let's Go!" button on the last lesson
    finish() {
        if (this.finished) return;
        this.finished = true;
        this.game.events.emit("tutorial-step", null);
        this.scene.start("TestScene", { tutorialComplete: true });
    }

    setSfxVolume(value) {
        this.sfxVolume = value;
    }

    // The same values the main game sends, so App's state matches the tutorial (it never opens the bubble popup)
    emitStats() {
        this.game.events.emit("stats-changed", {
            stress: this.coralStress ?? 0,
            light: this.lightLevel,
            temperature: this.temperature,
            pollution: 1,
            bubbleCollision: false,
            collisionType: "None",
            simEnd: false,
            reefDead: false,
            fishDead: false,
            score: this.score,
            history: { stress: [], temp: [], light: [], poll: [] },
        });
    }

    update(time, delta) {
        // Tuned at 60fps like the main game, and capped so a lag spike doesn't teleport the fish
        const frameScale = Math.min(delta, 50) / (1000 / 60);

        const hidePressed = Phaser.Input.Keyboard.JustDown(this.hideKey);
        if (hidePressed && this.stepId === "predator") this.hideFish();

        const horizontal = (this.moveKeys.D.isDown ? 1 : 0) - (this.moveKeys.A.isDown ? 1 : 0);
        const vertical = (this.moveKeys.S.isDown ? 1 : 0) - (this.moveKeys.W.isDown ? 1 : 0);
        const movementLength = Math.hypot(horizontal, vertical);

        // Swimming away leaves the coral, like in the main game
        if (this.isHiding && movementLength > 0 && !hidePressed) this.leaveHiding();

        if (!this.isHiding && movementLength > 0) {
            this.swim(horizontal, vertical, movementLength, frameScale);
            this.swamThisStep = true;
            if (this.stepId === "swim") this.completeStep();
        }
        this.guide.setScale(FISH_SCALE * this.fishGrowth);
        this.updateHearts();

        // Goals only count once the fish has swum during the lesson, so one it was already sitting on
        // isn't completed before the player has had a chance to read the banner
        if (this.swamThisStep) {
            if (this.stepId === "food" && this.touching(this.shellfish)) {
                this.eatFood();
            } else if (this.stepId === "heat" && !this.heatwave && this.nearCoral(CORAL_VISIT_DISTANCE)) {
                this.startHeatwave();
            } else if (this.stepId === "cloudy" && this.touching(this.cloudBubble)) {
                this.popCloudBubble();
            }
        }

        if (this.home) this.updateHome();
        if (this.coral) this.updateCoral(delta);

        // Updated outside the predator lesson too, so it can finish swimming away after the lesson is complete
        if (this.predator) this.updatePredator(frameScale);

        this.shadow.clear();
        this.shadow.fillEllipse(this.guide.x, 950, this.guide.scale * 100, 10);
    }

    // Same movement as the main game's fish
    swim(horizontal, vertical, movementLength, frameScale) {
        const speed = FISH_SPEED * frameScale;
        this.guide.x += (horizontal / movementLength) * speed;
        this.guide.y += (vertical / movementLength) * speed;

        // Swimming straight up or down keeps the way the fish was facing, so it doesn't snap upside down
        const flip = horizontal === 0 ? this.guide.flipY : horizontal < 0;
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

    nearCoral(distance) {
        return Phaser.Math.Distance.Between(this.guide.x, this.guide.y, this.coral.x, this.coral.y) <= distance;
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

    /* Eat to Grow: one glowing shellfish on the sea floor in the middle of the scene, like the main game's food */

    startFood() {
        this.shellfish = this.add.image(this.scale.width / 2, FOOD_MAX_Y - 20, "shellTypes", 0)
            .setDepth(8)
            .setScale(FOOD_SCALE * 1.25); // a little bigger than in the main game, so it's easy to spot
        addGlow(this, this.shellfish, FOOD_GLOW_COLOR);
        this.emitStep();
    }

    eatFood() {
        removeGlow(this.shellfish);
        this.shellfish.destroy();
        this.shellfish = null;
        this.sound.play("bubblePop", { volume: this.sfxVolume });

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
            text: `Triggerfish build nests in the sand. Swim to a glowing piece and press Q to pick it up, then press Q again by the nest to drop it in. Every piece earns points and helps your nest grow. (${this.homePiecesPlaced}/${TUTORIAL_PIECES.length} placed)`
        });
    }

    updateHome() {
        const inLesson = this.stepId === "home";
        updateHomeControls(this, inLesson && !this.praised);
        if (!inLesson || this.homePiecesPlaced === this.shownPiecesPlaced) return;

        this.emitHomeStep();
        if (this.homePiecesPlaced >= TUTORIAL_PIECES.length) this.completeStep();
    }

    /* Summer Heatwaves: the coral appears, and bleaches once the fish swims over to it */

    startHeat() {
        this.createCoral(this.scale.width * 0.72, this.scale.height - 120);
        this.emitStep();
    }

    // Uses the same bleach stages as the corals in the main game, so the player can see the heat's effect
    createCoral(x, y) {
        this.coralStages = createBleachStages(this, CORAL_KEY);
        this.coralStress = 0;
        this.coralStage = 0;
        this.coralStressRate = 0; // stress per second: positive while bleaching, negative while recovering

        this.coral = this.add.image(x, y, CORAL_KEY).setOrigin(0.5, 1).setDepth(7);
        this.coral.setScale(Math.min(260 / this.coral.width, 220 / this.coral.height, 1.3));

        this.tweens.add({
            targets: this.coral,
            angle: { from: -3, to: 3 },
            duration: 3000,
            yoyo: true,
            repeat: -1,
            ease: "sine.inOut"
        });
    }

    startHeatwave() {
        this.heatwave = true;
        this.temperature += HEATWAVE_TEMPERATURE_RISE;
        this.lightLevel = SUMMER_LIGHT;
        this.coralStressRate = HEATWAVE_STRESS_PER_SECOND;
        this.tweens.add({ targets: this.heatOverlay, alpha: 0.15, duration: 1500 });

        // The same warning sound and notice the main game shows when a summer heatwave starts
        this.sound.play("bleachingWarning", { volume: this.sfxVolume });
        this.game.events.emit("reef-warning", {
            warning: true,
            title: "Temperature Bleaching Event",
            message: `The water temperature has risen by ${HEATWAVE_TEMPERATURE_RISE}°C. Keep the light levels lower to prevent a mass bleaching of your reef.`,
        });
        this.emitStats();
    }

    updateCoral(delta) {
        const previousStress = this.coralStress;
        this.coralStress = Phaser.Math.Clamp(
            this.coralStress + this.coralStressRate * delta / 1000,
            0,
            HEATWAVE_MAX_STRESS
        );
        if (this.coralStress !== previousStress) {
            const stage = getBleachStage(this.coralStress);
            if (stage !== this.coralStage) {
                this.coralStage = stage;
                this.coral.setTexture(this.coralStages[stage]);
            }
        }

        if (this.stepId === "heat" && this.coralStress >= HEAT_STEP_STRESS) this.completeStep();
    }

    /* Shade the Reef: a green Cloudy bubble, the same as the main game's, slows the bleaching */

    startCloudy() {
        const { x, y } = this.getSpotAwayFromFish(380);
        this.cloudBubble = this.add.image(x, y, "LightBubble").setDepth(8).setTint(0x44dd66);
        // The change label the main game's event bubbles carry
        this.cloudLabel = this.add.text(x, y - this.cloudBubble.displayHeight * 0.55, `−${CLOUDY_LIGHT_DROP}`, {
            fontSize: "18px",
            fontFamily: "Arial, sans-serif",
            fontStyle: "bold",
            color: "#123d24",
            stroke: "#ffffff",
            strokeThickness: 3,
        }).setOrigin(0.5, 1).setDepth(8);
        this.bobUpAndDown(this.cloudBubble);
        this.bobUpAndDown(this.cloudLabel);
        this.emitStep();
    }

    popCloudBubble() {
        this.tweens.killTweensOf([this.cloudBubble, this.cloudLabel]);
        this.cloudBubble.destroy();
        this.cloudLabel.destroy();
        this.cloudBubble = null;
        this.cloudLabel = null;
        this.sound.play("bubblePop", { volume: this.sfxVolume });

        const before = this.lightLevel;
        this.lightLevel -= CLOUDY_LIGHT_DROP;
        this.coralStressRate = SHADED_STRESS_PER_SECOND;
        this.tweens.add({ targets: this.heatOverlay, alpha: 0.07, duration: 800 });

        // Worded the same as the notice the main game shows for this bubble
        this.game.events.emit("random-event", {
            title: CLOUDY_EVENT.title,
            message: `The light level fell from ${before} to ${this.lightLevel}. ${CLOUDY_EVENT.teach}`,
        });
        this.emitStats();
        this.completeStep();
    }

    /* Check On Your Coral: winter cools the reef, and the player clicks the coral to see how it's doing */

    startCoral() {
        this.heatwave = false;
        this.temperature -= HEATWAVE_TEMPERATURE_RISE;
        this.lightLevel = 500;
        this.coralStressRate = -WINTER_RECOVERY_PER_SECOND;
        this.tweens.add({ targets: this.heatOverlay, alpha: 0, duration: 2000 });

        // Clickable with the same hover tint as the main game's corals, just for this lesson
        this.coral.setInteractive({ useHandCursor: true })
            .on("pointerover", () => this.coral.setTint(0xffcc88))
            .on("pointerout", () => this.coral.clearTint())
            .on("pointerdown", () => this.openCoralInfo());

        this.emitStats();
        this.emitStep();
    }

    // Sends the coral's details to React's coral popup, like clicking a coral in the main game
    openCoralInfo() {
        if (this.coralInfoOpen) return;

        this.coralInfoOpen = true;
        this.coral.clearTint();
        const { name, scientificName, status, info, img } = getCoralInfo(CORAL_TYPE, this.coralStress);
        this.game.events.emit("coralInfo", { name, scientificName, status, info, img });
    }

    // Called by TestGame when the coral popup is closed
    closeCoralPopup() {
        if (!this.coralInfoOpen) return;
        this.coralInfoOpen = false;
        this.coral.disableInteractive();
        this.completeStep();
    }

    /* Watch Out for Predators: a lionfish chases the fish until it hides in the coral */

    startPredator() {
        // the main game's lionfish
        this.predator = this.add.image(this.scale.width + PREDATOR_ESCAPE_MARGIN, 300, "lionfish")
            .setScale(0.5)
            .setDepth(9998);
        this.predatorFleeing = false;
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
                this.game.events.emit("predator-left");
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

        // The fish can't get hurt in the tutorial, but flashes red while the predator is on it
        if (this.touching(this.predator)) {
            this.guide.setTint(0xff6666);
        } else {
            this.guide.clearTint();
        }
    }

    // Same as the main game: the lionfish artwork faces left, so mirror it to face right
    facePredator(directionX, directionY, frameScale) {
        const flip = directionX === 0 ? this.predator.flipX : directionX > 0;
        this.predator.setFlipX(flip);
        this.predator.rotation = Phaser.Math.Angle.RotateTo(
            this.predator.rotation,
            Math.atan2(directionY, directionX) - (flip ? 0 : Math.PI),
            0.5 * frameScale
        );
    }

    // Same rule as the main game: close enough to the base of the coral
    hideFish() {
        if (this.isHiding || !this.nearCoral(REEF_HIDE_DISTANCE)) return;

        this.isHiding = true;
        this.guide.clearTint();
        this.guide.setPosition(
            this.coral.x,
            Phaser.Math.Clamp(this.coral.y - this.coral.displayHeight * 0.45, 120, 850)
        );
        this.guide.setDepth(this.coral.depth - 0.1);

        this.predatorFleeing = true;
        this.completeStep();
    }

    leaveHiding() {
        this.isHiding = false;
        this.guide.setDepth(9999);
    }
}

export default Tutorial;
