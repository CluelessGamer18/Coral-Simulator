import Phaser from "phaser";
import { createBleachStages } from "./CoralManager.js";
import {
    THRESHOLDS,
    evaluateThreshold,
    FOOD_GROWTH,
    PREDATOR_SPEED,
    REEF_HIDE_DISTANCE,
    PREDATOR_ESCAPE_MARGIN,
} from "./TestScene.js";

const FISH_SPEED = 6.75; // same as the main game
const FISH_SCALE = 1.3 / 1.5; // the fish's size in the main game before it grows
const PRAISE_DURATION = 2000; // ms the "well done" message shows before moving on (keep in sync with TutorialBanner.css)
const TUTORIAL_PREDATOR_SPEED = PREDATOR_SPEED * 0.6; // slower than the real one, to give time to read the banner
const CORAL_VISIT_DISTANCE = 200; // how close the fish has to swim to the coral to check on it

// The lessons React shows in the banner at the top of the screen, in the order the player meets them.
// Each one is started by start<Id>() below and completed by doing what it says.
const STEPS = [
    {
        id: "swim",
        title: "Swim Around",
        text: "You are a fish living on a coral reef. Use the W, A, S and D keys to swim around.",
        image: "tutorial/tutorial_wasd.png",
        imageAlt: "The W, A, S and D keys beside a fish swimming toward the coral reef",
        praise: "Great swimming!",
    },
    {
        id: "food",
        title: "Eat to Grow",
        text: "Swim into the algae orb to eat it. Food restores your health and helps your fish grow bigger.",
        image: "tutorial/tutorial_food.png",
        imageAlt: "A fish swimming toward an algae orb",
        praise: "Complete!",
    },
    {
        id: "bubble",
        title: "Changing the Environment",
        text: "Bubbles change the light, temperature and pollution of the reef. Swim into the temperature bubble to pop it, then choose a new water temperature.",
        image: "tutorial/tutorial_2.png",
        imageAlt: "A fish swimming toward a bubble",
        praise: "Complete!",
    },
    {
        id: "time",
        title: "Advancing Time",
        // text is filled in by startTime() once the player has picked a temperature
        image: "tutorial/tutorial_3.png",
        imageAlt: "Corals on the reef",
        praise: "Complete!",
    },
    {
        id: "predator",
        title: "Watch Out for Predators",
        text: "A predator is hunting you! Swim close to the coral and press Z to hide until it swims away.",
        image: "tutorial/tutorial_predator.png",
        imageAlt: "The Z key beside a fish hiding in the coral while a barracuda swims past",
        praise: "Complete!",
    },
    {
        id: "done",
        title: "Let's Get Started!",
        text: "Pop bubbles to shape the reef's future, keep your fish fed and safe, and see if your coral survives. Have fun exploring!",
        image: "tutorial/tutorial_4.png",
        imageAlt: "A fish ready to explore the reef",
        buttonLabel: "Let's Go!",
    },
];

// An empty stretch of reef (just the sand and background) where the player learns each part of the main game in turn.
// React shows the current lesson with "tutorial-step" and the praise message with "tutorial-praise".
// The bubble popup and predator alert are the main game's, so this scene answers to the same calls from App
// (updateTemperature(), freeFish(), "stats-changed", "predator-appeared"/"predator-left").
class Tutorial extends Phaser.Scene {
    constructor() {
        super("Tutorial");
    }

    create() {
        this.fishGrowth = 1;
        this.temperature = 27;
        this.bubbleCollision = false;
        this.collisionType = "None";
        this.isHiding = false;
        this.sfxVolume ??= 1;

        this.setupWorld();
        this.setupFish();
        this.setupKeys();

        this.stepIndex = -1;
        this.nextStep();

        window.gameScene = this;
        // Tells React about the scene, so the settings button can pause it and the bubble popup can talk to it
        this.game.events.emit("scene-ready", this);
        this.emitStats();
    }

    setupWorld() {
        const { height } = this.scale;
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
    }

    setupFish() {
        this.guide = this.add.image(300, 450, "Guide")
            .setDepth(9999)
            .setScale(FISH_SCALE);
        // preFX only exists under WebGL; on the Canvas fallback renderer it's null, so skip the shadow there
        this.guide.preFX?.addShadow(0, -8, 0.009, 1, 0x333333, 5);

        this.shadow = this.add.graphics({ fillStyle: { color: 0x000000 } }).setDepth(6).setAlpha(0.5);
    }

    setupKeys() {
        // WASD only, the same as the main game (where the arrow keys move the camera)
        this.moveKeys = this.input.keyboard.addKeys("W,A,S,D");
        this.hideKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
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
            bubble: () => this.startBubble(),
            time: () => this.startTime(),
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
        this.game.events.emit("tutorial-step", null);
        this.scene.start("TestScene", { tutorialComplete: true });
    }

    setSfxVolume(value) {
        this.sfxVolume = value;
    }

    // The same values the main game sends, so App can show the real bubble popup for the tutorial's bubble
    emitStats() {
        this.game.events.emit("stats-changed", {
            stress: 0,
            light: 500,
            temperature: this.temperature,
            pollution: 1,
            timeJump: 0,
            bubbleCollision: this.bubbleCollision,
            collisionType: this.collisionType,
            simEnd: false,
            reefDead: false,
            fishDead: false,
            score: 0,
            history: { stress: [], temp: [], light: [], poll: [] },
        });
    }

    update(time, delta) {
        // Tuned at 60fps like the main game, and capped so a lag spike doesn't teleport the fish
        const frameScale = Math.min(delta, 50) / (1000 / 60);

        const hidePressed = Phaser.Input.Keyboard.JustDown(this.hideKey);
        if (hidePressed && this.stepId === "predator") this.hideFish();

        // The fish stays put while the bubble popup is open
        if (!this.bubbleCollision) {
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
        }
        this.guide.setScale(FISH_SCALE * this.fishGrowth);

        // Goals only count once the fish has swum during the lesson, so one it was already sitting on
        // isn't completed before the player has had a chance to read the banner
        if (this.swamThisStep) {
            if (this.stepId === "food" && this.touching(this.orb)) {
                this.eatFood();
            } else if (this.stepId === "bubble" && !this.bubbleCollision && this.touching(this.bubble)) {
                this.popBubble();
            } else if (this.stepId === "time" && this.nearCoral(CORAL_VISIT_DISTANCE)) {
                this.completeStep();
            }
        }

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

    /* Eat to Grow: one algae orb in the middle of the scene */

    startFood() {
        this.orb = this.add.image(this.scale.width / 2, 450, "algaeOrb").setDepth(8).setScale(1.5);
        this.bobUpAndDown(this.orb);
        this.emitStep();
    }

    eatFood() {
        this.orb.destroy();
        this.orb = null;
        this.sound.play("bubblePop", { volume: this.sfxVolume });

        // Grows the same amount as one orb in the main game
        this.tweens.add({
            targets: this,
            fishGrowth: FOOD_GROWTH,
            duration: 300,
            ease: "Back.out"
        });
        this.completeStep();
    }

    /* Changing the Environment: the one coral appears, and the player pops a temperature bubble */

    startBubble() {
        this.createCoral(this.scale.width * 0.72, this.scale.height - 120);

        const { x, y } = this.getSpotAwayFromFish(380);
        this.bubble = this.add.image(x, y, "TempBubble").setDepth(8);
        this.bobUpAndDown(this.bubble);
        this.emitStep();
    }

    // Uses the same bleach stages as the corals in the main game, so the player can see what the temperature did
    createCoral(x, y) {
        const key = "Tabular-1";
        this.coralStages = createBleachStages(this, key);
        this.coral = this.add.image(x, y, key).setOrigin(0.5, 1).setDepth(7);
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

    popBubble() {
        this.bubble.setVisible(false);
        this.sound.play("bubblePop", { volume: this.sfxVolume });

        // App shows the bubble popup when it sees this, then calls updateTemperature() and/or freeFish()
        this.bubbleCollision = true;
        this.collisionType = "temp";
        this.emitStats();
    }

    // Called by the bubble popup's Apply button: shows what a year at that temperature does to the coral
    updateTemperature(value) {
        this.temperature = value;
        const { poor, dead } = evaluateThreshold(value, THRESHOLDS.temperature);
        // the stage the main game would show for this temperature on its own
        this.coralStage = dead ? 4 : Math.floor((poor / 100) * 4);
        this.coral.setTexture(this.coralStages[this.coralStage]);
    }

    // Called by the bubble popup after Apply (cancelled = false) or Cancel (cancelled = true)
    freeFish(cancelled) {
        this.bubbleCollision = false;
        this.collisionType = "None";
        this.emitStats();

        if (cancelled) {
            // Brings the bubble back somewhere else, so the fish doesn't pop it again straight away
            const { x, y } = this.getSpotAwayFromFish(380);
            this.tweens.killTweensOf(this.bubble);
            this.bubble.setPosition(x, y).setVisible(true);
            this.bobUpAndDown(this.bubble);
            return;
        }

        this.bubble.destroy();
        this.bubble = null;
        this.completeStep();
    }

    /* Advancing Time: swim over to the coral to see how the year went */

    startTime() {
        const value = this.temperature;
        let outcome;
        if (this.coralStage === 4) {
            outcome = `A year at ${value}°C was too extreme, and your coral bleached and died. In the main game that ends the simulation, so choose carefully!`;
        } else if (this.coralStage > 0) {
            outcome = `A year at ${value}°C has stressed your coral, and it has started to lose its colour.`;
        } else {
            outcome = `A year at ${value}°C has kept your coral healthy and colourful.`;
        }
        this.emitStep({
            text: `Every bubble you pop moves the reef forward one year. ${outcome} Swim over to your coral to see how it's doing.`
        });
    }

    /* Watch Out for Predators: a predator chases the fish until it hides in the coral */

    startPredator() {
        // looks the same as the predator in the main game
        this.predator = this.add.rectangle(this.scale.width + PREDATOR_ESCAPE_MARGIN, 300, 40, 40, 0x9b2c2c)
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

            if (this.predator.x <= -PREDATOR_ESCAPE_MARGIN || this.predator.x >= this.scale.width + PREDATOR_ESCAPE_MARGIN) {
                this.predator.destroy();
                this.predator = null;
                this.game.events.emit("predator-left");
            }
            return;
        }

        const distance = Phaser.Math.Distance.Between(this.predator.x, this.predator.y, this.guide.x, this.guide.y);
        if (distance > 0) {
            const step = Math.min(TUTORIAL_PREDATOR_SPEED * frameScale, distance);
            this.predator.x += ((this.guide.x - this.predator.x) / distance) * step;
            this.predator.y += ((this.guide.y - this.predator.y) / distance) * step;
        }

        // The fish can't get hurt in the tutorial, but flashes red while the predator is on it
        if (this.touching(this.predator)) {
            this.guide.setTint(0xff6666);
        } else {
            this.guide.clearTint();
        }
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
