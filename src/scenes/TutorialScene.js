import Phaser from "phaser";
import { createBleachStages } from "./CoralManager.js";
import {
    THRESHOLDS,
    evaluateThreshold,
    MAX_HEARTS,
    HEART_SPACING,
    HEART_OFFSET_Y,
    FOOD_GROWTH,
    PREDATOR_SPEED,
    PREDATOR_BITE_INTERVAL,
    REEF_HIDE_DISTANCE,
    PREDATOR_ESCAPE_MARGIN,
} from "./TestScene.js";

const FISH_SPEED = 6.75; // same as the main game
const FISH_SCALE = 1.3 / 1.5; // the fish's size in the main game before it grows
const SWIM_DISTANCE = 800; // px the fish has to swim to finish the first step
const TUTORIAL_PREDATOR_SPEED = PREDATOR_SPEED * 0.6; // slower than the real one, to give time to read the hint
const STEP_DELAY = 1200; // ms the "well done" message shows before the next step

// The instructions React shows in its tutorial panel, in the order the player meets them.
// The "year" text is filled in once the player has picked a temperature.
const STEPS = {
    swim: {
        title: "Swim Around",
        text: "You are a fish living on a coral reef. Use the W, A, S and D keys to swim around.",
        keys: ["W", "A", "S", "D"],
    },
    bubble: {
        title: "Change the Environment",
        text: "Bubbles change the light, temperature and pollution of the reef. Swim into the temperature bubble to pop it, then choose a new water temperature.",
    },
    year: {
        title: "One Year Later",
        continueLabel: "Continue",
    },
    food: {
        title: "Eat to Grow",
        text: "Swim into the algae orb to eat it. Food restores your health and helps your fish grow bigger.",
    },
    predator: {
        title: "Watch Out for Predators",
        text: "A predator is hunting you! Swim close to the coral and press Z to hide until it swims away.",
        keys: ["Z"],
    },
    done: {
        title: "You're Ready!",
        text: "Pop bubbles to shape the reef's future, keep your fish fed and safe, and see if your coral survives. Have fun exploring!",
        finishLabel: "Let's Go!",
    },
};
const STEP_ORDER = Object.keys(STEPS);

// A small, single-screen reef where the player tries out each mechanic of the main game in turn.
// React shows the current step's instructions (sent with "tutorial-step") and the bubble popup (sent with
// "tutorial-bubble"), and calls finish() when the player is done or skips the tutorial.
class TutorialScene extends Phaser.Scene {
    constructor() {
        super("TutorialScene");
    }

    create() {
        const { width, height } = this.scale;

        this.health = MAX_HEARTS * 2;
        this.fishGrowth = 1;
        this.temperature = 27;
        this.isHiding = false;
        this.bubbleOpen = false;
        this.distanceSwum = 0;
        this.sfxVolume ??= 1;

        this.cameras.main.setBackgroundColor("#8ACFC9");
        this.add.image(0, -10, "surface").setOrigin(0, 0).setDepth(-4);
        [["floor_layer3", 1], ["floor_layer2", 2], ["floor_layer1", 5], ["floor_layer0", 6]].forEach(([key, depth]) => {
            const layer = this.add.image(0, 0, key).setOrigin(0, 0).setDepth(depth);
            layer.y = height - layer.height;
        });

        this.createCoral(width * 0.72, height - 120);

        this.guide = this.add.image(300, 450, "Guide").setDepth(9999).setScale(FISH_SCALE);
        this.guide.preFX?.addShadow(0, -8, 0.009, 1, 0x333333, 5);

        this.hearts = [];
        for (let i = 0; i < MAX_HEARTS; i++) {
            this.hearts.push(this.add.image(0, 0, "heartFull").setDepth(9999.5));
        }

        this.moveKeys = this.input.keyboard.addKeys("W,A,S,D");
        this.hideKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);

        this.setStep("swim");

        this.game.events.emit("tutorial-ready", this);
    }

    // One coral to watch bleach and to hide in, using the same bleach stages as the corals in the main game
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

    // The step React is showing. Read once when the scene is ready, then sent with "tutorial-step" on every change.
    getStep() {
        return this.step;
    }

    setStep(id, overrides = {}) {
        this.stepId = id;
        this.step = {
            ...STEPS[id],
            ...overrides,
            number: STEP_ORDER.indexOf(id) + 1,
            total: STEP_ORDER.length,
        };
        this.game.events.emit("tutorial-step", this.step);
    }

    // Shows a "well done" message above the fish, then moves on. Nothing in the old step reacts in the meantime.
    completeStep(message, next) {
        this.stepId = null;
        this.showHint(null);

        const text = this.add.text(this.guide.x, this.guide.y - 80, message, {
            fontSize: "36px",
            fontFamily: "Poppins, sans-serif",
            fontStyle: "bold",
            color: "#ffffff",
            stroke: "#005566",
            strokeThickness: 5
        }).setOrigin(0.5, 1).setDepth(10000);

        this.tweens.add({
            targets: text,
            y: text.y - 60,
            alpha: 0,
            delay: 400,
            duration: 900,
            ease: "Cubic.out",
            onComplete: () => text.destroy()
        });

        this.time.delayedCall(STEP_DELAY, next);
    }

    // A pulsing ring that points out what the current step is about. Pass null to remove it.
    showHint(target, radius = 90) {
        this.hint?.destroy();
        this.hint = null;
        if (!target) return;

        this.hint = this.add.circle(target.x, target.y, radius)
            .setStrokeStyle(5, 0xffffff)
            .setDepth(9997);
        this.tweens.add({
            targets: this.hint,
            scale: 1.2,
            alpha: 0.3,
            duration: 700,
            yoyo: true,
            repeat: -1,
            ease: "Sine.inOut"
        });
    }

    // Somewhere on the other side of the screen from the fish, so the next target makes it swim across
    getSpotAwayFromFish(y) {
        return { x: this.guide.x < this.scale.width / 2 ? 1000 : 440, y };
    }

    update(time, delta) {
        const frameScale = Math.min(delta, 50) / (1000 / 60);

        const hidePressed = Phaser.Input.Keyboard.JustDown(this.hideKey);
        if (hidePressed) this.hideFish();

        const moved = this.moveFish(frameScale, hidePressed);
        this.guide.setScale(FISH_SCALE * this.fishGrowth);
        this.updateHearts();

        if (this.stepId === "swim") {
            this.distanceSwum += moved;
            if (this.distanceSwum >= SWIM_DISTANCE) {
                this.completeStep("Nice swimming!", () => this.startBubbleStep());
            }
        } else if (this.stepId === "bubble" && !this.bubbleOpen && this.touching(this.bubble)) {
            this.popBubble();
        } else if (this.stepId === "food" && this.touching(this.orb)) {
            this.eatFood();
        } else if (this.stepId === "predator") {
            this.updatePredator(delta, frameScale);
        }
    }

    // Same controls as the main game. Returns how far the fish moved this frame.
    moveFish(frameScale, hidePressed) {
        if (this.bubbleOpen) return 0;

        const horizontal = (this.moveKeys.D.isDown ? 1 : 0) - (this.moveKeys.A.isDown ? 1 : 0);
        const vertical = (this.moveKeys.S.isDown ? 1 : 0) - (this.moveKeys.W.isDown ? 1 : 0);
        const movementLength = Math.hypot(horizontal, vertical);
        if (movementLength === 0) return 0;

        if (this.isHiding) {
            if (hidePressed) return 0;
            this.leaveHiding();
        }

        const startX = this.guide.x;
        const startY = this.guide.y;
        const speed = FISH_SPEED * frameScale;
        this.guide.x += (horizontal / movementLength) * speed;
        this.guide.y += (vertical / movementLength) * speed;

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

        this.guide.x = Phaser.Math.Clamp(this.guide.x, 100, this.scale.width - 100);
        this.guide.y = Phaser.Math.Clamp(this.guide.y, 120, 850);

        return Phaser.Math.Distance.Between(startX, startY, this.guide.x, this.guide.y);
    }

    touching(target) {
        return target?.visible && Phaser.Geom.Intersects.RectangleToRectangle(
            this.guide.getBounds(),
            target.getBounds()
        );
    }

    updateHearts() {
        const y = this.guide.y - this.guide.displayHeight / 2 - HEART_OFFSET_Y;
        const startX = this.guide.x - ((this.hearts.length - 1) * HEART_SPACING) / 2;
        this.hearts.forEach((heart, i) => heart.setPosition(startX + i * HEART_SPACING, y));
    }

    refreshHeartTextures() {
        this.hearts.forEach((heart, i) => {
            const halves = Phaser.Math.Clamp(this.health - i * 2, 0, 2);
            heart.setTexture(["heartDead", "heartHalf", "heartFull"][halves]);
        });
    }

    // The fish can get hurt, but never dies in the tutorial
    loseHalfHeart() {
        this.health = Math.max(this.health - 1, 1);
        this.refreshHeartTextures();

        this.guide.setTint(0xff6666);
        this.time.delayedCall(150, () => this.guide.clearTint());
    }

    /* Step 2: pop a bubble and pick a value in the real bubble popup */

    startBubbleStep() {
        const { x, y } = this.getSpotAwayFromFish(380);
        this.bubble = this.add.image(x, y, "TempBubble").setDepth(8);
        this.bubbleIdle(this.bubble);
        this.showHint(this.bubble);
        this.setStep("bubble");
    }

    bubbleIdle(target) {
        this.tweens.add({
            targets: target,
            y: target.y - 20,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: "Sine.inOut"
        });
    }

    popBubble() {
        this.bubble.setVisible(false);
        this.hint?.setVisible(false);
        this.sound.play("bubblePop", { volume: this.sfxVolume });

        this.bubbleOpen = true;
        this.game.events.emit("tutorial-bubble", { type: "temp", initialValue: this.temperature });
    }

    // Called by the bubble popup's Apply button. Shows what that temperature would do to the coral after a year.
    applyBubble(value) {
        this.closeBubble();
        this.bubble.destroy();
        this.bubble = null;

        this.temperature = value;
        const { poor, dead } = evaluateThreshold(value, THRESHOLDS.temperature);
        // the same stage the main game would show for this temperature on its own
        const stage = dead ? 4 : Math.floor((poor / 100) * 4);
        this.coral.setTexture(this.coralStages[stage]);
        this.loseHalfHeart();
        this.showHint({ x: this.coral.x, y: this.coral.y - this.coral.displayHeight / 2 }, 160);

        let outcome;
        if (dead) {
            outcome = `At ${value}°C the water was too extreme, and your coral bleached and died. In the real game that ends the simulation, so choose carefully!`;
        } else if (poor) {
            outcome = `At ${value}°C your coral is stressed and has started to lose its colour.`;
        } else {
            outcome = `At ${value}°C your coral stays healthy and colourful.`;
        }
        this.setStep("year", {
            text: `${outcome} Every bubble you pop moves the reef forward one year, and each year costs your fish half a heart.`
        });
    }

    // Called by the bubble popup's Cancel button: the bubble comes back somewhere else so the fish doesn't pop it again straight away
    cancelBubble() {
        this.closeBubble();

        const { x, y } = this.getSpotAwayFromFish(380);
        this.tweens.killTweensOf(this.bubble);
        this.bubble.setPosition(x, y).setVisible(true);
        this.bubbleIdle(this.bubble);
        this.showHint(this.bubble);
    }

    closeBubble() {
        this.bubbleOpen = false;
        this.game.events.emit("tutorial-bubble", null);
    }

    // Called by the Continue button on steps that only explain something
    next() {
        if (this.stepId === "year") this.startFoodStep();
    }

    /* Step 4: eat food to heal and grow */

    startFoodStep() {
        const { x, y } = this.getSpotAwayFromFish(500);
        this.orb = this.add.image(x, y, "algaeOrb").setDepth(8).setScale(1.5);
        this.bubbleIdle(this.orb);
        this.showHint(this.orb, 60);
        this.setStep("food");
    }

    eatFood() {
        this.orb.destroy();
        this.orb = null;
        this.sound.play("bubblePop", { volume: this.sfxVolume });

        this.health = Math.min(this.health + 1, MAX_HEARTS * 2);
        this.refreshHeartTextures();
        this.tweens.add({
            targets: this,
            fishGrowth: FOOD_GROWTH,
            duration: 300,
            ease: "Back.out"
        });

        this.completeStep("Yum!", () => this.startPredatorStep());
    }

    /* Step 5: hide from the predator in the coral */

    startPredatorStep() {
        // the player has to hide once the predator is coming, not before
        if (this.isHiding) this.leaveHiding();

        // looks the same as the predator in the main game
        this.predator = this.add.rectangle(this.scale.width + PREDATOR_ESCAPE_MARGIN, 300, 40, 40, 0x9b2c2c)
            .setDepth(9998);
        this.predatorContactTime = 0;
        this.touchingPredator = false;
        // points at the area the fish can hide from (near the base of the coral)
        this.showHint({ x: this.coral.x, y: this.coral.y - 60 }, REEF_HIDE_DISTANCE);
        this.setStep("predator");
    }

    updatePredator(delta, frameScale) {
        if (this.isHiding) {
            // Swims off whichever side of the screen is closer
            const direction = this.predator.x <= this.scale.width / 2 ? -1 : 1;
            this.predator.x += direction * PREDATOR_SPEED * frameScale;

            if (this.predator.x <= -PREDATOR_ESCAPE_MARGIN || this.predator.x >= this.scale.width + PREDATOR_ESCAPE_MARGIN) {
                this.predator.destroy();
                this.predator = null;
                this.completeStep("It swam away!", () => this.setStep("done"));
            }
            return;
        }

        const distance = Phaser.Math.Distance.Between(this.predator.x, this.predator.y, this.guide.x, this.guide.y);
        if (distance > 0) {
            const step = Math.min(TUTORIAL_PREDATOR_SPEED * frameScale, distance);
            this.predator.x += ((this.guide.x - this.predator.x) / distance) * step;
            this.predator.y += ((this.guide.y - this.predator.y) / distance) * step;
        }

        // Bites like the real predator: half a heart on contact, then one every second it stays in contact
        if (!this.touching(this.predator)) {
            this.touchingPredator = false;
            return;
        }
        if (!this.touchingPredator) {
            this.touchingPredator = true;
            this.predatorContactTime = 0;
            this.loseHalfHeart();
        } else {
            this.predatorContactTime += delta;
            if (this.predatorContactTime >= PREDATOR_BITE_INTERVAL) {
                this.predatorContactTime -= PREDATOR_BITE_INTERVAL;
                this.loseHalfHeart();
            }
        }
    }

    hideFish() {
        if (this.bubbleOpen || this.isHiding) return;

        // same rule as the main game: close enough to the base of the coral
        if (Phaser.Math.Distance.Between(this.guide.x, this.guide.y, this.coral.x, this.coral.y) > REEF_HIDE_DISTANCE) return;

        this.isHiding = true;
        this.guide.setPosition(
            this.coral.x,
            Phaser.Math.Clamp(this.coral.y - this.coral.displayHeight * 0.45, 120, 850)
        );
        this.guide.setDepth(this.coral.depth - 0.1);
    }

    leaveHiding() {
        this.isHiding = false;
        this.guide.setDepth(9999);
    }

    setSfxVolume(value) {
        this.sfxVolume = value;
    }

    finish() {
        this.scene.start("TestScene", { tutorialComplete: true });
    }
}

export default TutorialScene;
