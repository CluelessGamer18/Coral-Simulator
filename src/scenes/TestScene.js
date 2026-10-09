import Phaser from "phaser";
import { createFishSchools } from "./FishSchools.js";
import { createCorals, updateCoralStress, resetCorals } from "./CoralManager.js";

let oval;

// One entry per bubble. `type` is the collisionType React reads to decide which popup to show.
const BUBBLE_TYPES = [
    { type: 'temp', texture: 'TempBubble', ease: 'Power1' },
    { type: 'light', texture: 'LightBubble', ease: 'Sine.inOut' },
    { type: 'poll', texture: 'PollutionBubble', ease: 'Sine.inOut' },
    { type: 'tempEvent', texture: 'TempBubble', ease: 'Power1', inverted: true },
];

// [a, b) and (c, d] are the stressed ranges; at or beyond a or d the reef dies; between b and c is healthy
const THRESHOLDS = {
    temperature: { a: 25, b: 27, c: 29, d: 31 },
    pollution: { a: 0, b: 1, c: 3, d: 5 },
    light: { a: 141, b: 200, c: 1100, d: 1839 },
};

const PREDATOR_SPEED = 3.375;
const PREDATOR_SPAWN_DELAY = 10000;
const REEF_HIDE_DISTANCE = 150;
const PREDATOR_ESCAPE_MARGIN = 50;

// Health is counted in half hearts, so 3 hearts = 6
const MAX_HEARTS = 3;
const HEART_SPACING = 36;
const HEART_OFFSET_Y = 30; // gap between the top of the fish and the hearts

const PREDATOR_BITE_INTERVAL = 1000; // ms of touching the predator per half heart lost

const FOOD_COUNT = 5; // algae orbs sprinkled around the map at the start of each game

function evaluateThreshold(value, { a, b, c, d }) {
    const stressed = (value >= a && value < b) || (value > c && value <= d);
    const dead = !stressed && (value <= a || value >= d);
    return { poor: stressed ? 30 : 0, dead };
}

class TestScene extends Phaser.Scene {
    constructor() {
        super("TestScene");

        this.deltaTimer = 0;
        this.simStart = false;

        this.collisionType = "None";
        this.camVelX = 0;
        this.tutorialComplete = false;
        // If (tutorialComplete)   
    }

    setupSimulationState() {
        this.lightLevel = 500; // Default
        this.temperature = 27; // Default
        this.pollutionValue = 1; // Default
        this.stressValue = 0; // Will range from 0 - 100
        // 0 means healthy
        // 30 means slightly stressed
        // 60 means more stressed
        // 90 means bleached
        // 100 means death

        // saved history for end result graphs
        this.tempHistory = []
        this.lightHistory = []
        this.pollutionHistory = []
        this.stressHistory = []

        //Individual Flags
        this.poorTemp = 0;
        this.poorLight = 0;
        this.poorPollution = 0;

        this.reefDeadTemp = false;
        this.reefDeadLight = false;
        this.reefDeadPollution = false;

        this.simEnd = false;
        this.timeJump = 0;
        this.bubbleCollision = false;
        this.coralInfoOpen = false;
        this.isHiding = false;
        this.predatorFleeing = false;
        this.predatorEscaped = false;
        this.score = 0;
        this.health = MAX_HEARTS * 2;
        this.fishDead = false;
        this.touchingPredator = false;
        this.predatorContactTime = 0; // time since the last bite while touching the predator, in ms

        this.WORLD_WIDTH = 2860;
        this.WORLD_HEIGHT = 1024;
    }

    setupWorld(cam) {
        this.cameras.main.setBackgroundColor("#8ACFC9");

        const floorLayer3 = this.add.image(0, 0, "floor_layer3")
            .setOrigin(0, 0).setDepth(1)
            // Calculation for full width parallax: (layerWidth - viewportWidth) / (worldWidth - viewportWidth)
            .setScrollFactor((1440 - cam.width) / (this.WORLD_WIDTH - cam.width), 1);
        floorLayer3.y = this.WORLD_HEIGHT - floorLayer3.height;

        const floorLayer2 = this.add.image(0, 0, "floor_layer2")
            .setOrigin(0, 0).setDepth(2)
            .setScrollFactor((2072 - cam.width) / (this.WORLD_WIDTH - cam.width), 1);
        floorLayer2.y = this.WORLD_HEIGHT - floorLayer2.height;

        createFishSchools(this); //educated fish (schools)
        createCorals(this);

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


        const floorLayer1 = this.add.image(0, 0, "floor_layer1")
            .setOrigin(0, 0).setDepth(5)
            .setScrollFactor((2860 - cam.width) / (this.WORLD_WIDTH - cam.width), 1);
        floorLayer1.y = this.WORLD_HEIGHT - floorLayer1.height;

        const floorLayer0 = this.add.image(0, 0, "floor_layer0")
            .setOrigin(0, 0).setDepth(6)
            .setScrollFactor((2860 - cam.width) / (this.WORLD_WIDTH - cam.width), 1);
        floorLayer0.y = this.WORLD_HEIGHT - floorLayer0.height;

        const surface = this.add.image(0, 0, "surface")
            .setOrigin(0, 0).setDepth(-4)
            .setScrollFactor((1440 - cam.width) / (this.WORLD_WIDTH - cam.width), 1);
        surface.y = -10;
    }

    setupAudio() {
        // Only default the volume on the first run: a restart reuses this scene, and React won't send the volume again
        this.musicVolume ??= 0.5;

        this.bgMusic = this.sound.add('background_music', {
            loop: true,
            volume: this.musicVolume
        });

        this.bgMusic.play();

        // The sound manager belongs to the whole game, not this scene, so sounds added here outlive a restart.
        // Destroy the music whenever the scene shuts down (restart or stop) so a new copy isn't left behind each time.
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.bgMusic.destroy();
            this.bgMusic = null;
        });
    }

    setupUI(cam) {
        this.guide = this.physics.add.image(300, 300, "Guide")
        this.guide.setInteractive();
        this.guide.setDepth(9999);
        // preFX only exists under WebGL; on the Canvas fallback renderer it's null, so skip the shadow there
        this.guide.preFX?.addShadow(0, -8, 0.009, 1, 0x333333, 5);

        // Hearts float above the fish and follow it around (positioned every frame in updateHearts())
        this.hearts = [];
        for (let i = 0; i < MAX_HEARTS; i++) {
            this.hearts.push(this.add.image(0, 0, "heartFull").setDepth(9999.5));
        }
        this.updateHearts();

        // Predator is hidden until the timer runs out, then it appears and starts chasing the fish.
        this.predator = this.add.rectangle(this.WORLD_WIDTH - 100, 300, 40, 40, 0x9b2c2c)
            .setDepth(9998)
            .setVisible(false);
        this.predatorSpawned = false;

        this.badOutline = this.add.image(-95, -95, "badOutline")
            .setOrigin(0, 0).setDepth(10001).setAlpha(0)
            .setScrollFactor((1440 - cam.width) / (this.WORLD_WIDTH - cam.width), 1);

        this.lightOverlay = this.add.rectangle(0, 0, 1440, 1024, 0xFFFFFF, 1)
            .setOrigin(0, 0).setDepth(10000)
            .setScrollFactor((1440 - cam.width) / (this.WORLD_WIDTH - cam.width), 1);

        this.darkOverlay = this.add.rectangle(0, 0, 1440, 1024, 0x000000, 1)
            .setOrigin(0, 0).setDepth(10000)
            .setScrollFactor((1440 - cam.width) / (this.WORLD_WIDTH - cam.width), 1);

        // guide shadow
        oval = this.add.graphics({ fillStyle: { color: 0x000000 } }).setDepth(100000).setAlpha(0.5);
    }

    setupMouseInput() {
        this.isDraggingGuide = false;
        this.input.on("pointerdown", () => {
            this.isDraggingGuide = true;
        });
        this.input.on("pointerup", () => {
            this.isDraggingGuide = false;
        });
    }

    setupCamera(cam) {
        const cursors = this.input.keyboard.createCursorKeys();
        this.moveKeys = this.input.keyboard.addKeys({
            W: Phaser.Input.Keyboard.KeyCodes.W,
            A: Phaser.Input.Keyboard.KeyCodes.A,
            S: Phaser.Input.Keyboard.KeyCodes.S,
            D: Phaser.Input.Keyboard.KeyCodes.D
        });
        this.hideKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);

        //camera presettings
        const controlConfig = {
            camera: this.cameras.main,
            left: cursors.left,
            right: cursors.right,
            up: cursors.up,
            down: cursors.down,
            //zoomIn: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
            //zoomOut: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
            acceleration: 0.06,
            drag: 0.0005,
            maxSpeed: 1.0
        };

        this.controls = new Phaser.Cameras.Controls.SmoothedKeyControl(controlConfig);

        cam.setBounds(0, 0, this.WORLD_WIDTH, this.WORLD_HEIGHT);
    }


    create() {
        const cam = this.cameras.main;

        this.setupSimulationState();
        this.setupWorld(cam);
        this.setupAudio();
        this.setupUI(cam);
        this.setupMouseInput();
        this.setupCamera(cam);
        this.updateHistory();
        this.spawnBubbles();
        this.spawnFood();

        // On a restart the tutorial has already been closed, so the predator timer starts straight away.
        // On the first run it starts from unlockFish() once the tutorial is closed.
        if (this.tutorialComplete) this.startPredatorTimer();

        this.onSimTimeUpdate = null;

        window.gameScene = this;
        // Only tell React about the scene once everything above has been set up
        this.game.events.emit("scene-ready", this);
        // After a restart React is already listening, so send it the reset values
        this.emitStats();
    }

    // The values React shows in the UI. Sent with emitStats() whenever one of them changes,
    // so React doesn't have to copy them from the scene every frame.
    getStats() {
        return {
            stress: this.stressValue,
            light: this.lightLevel,
            temperature: this.temperature,
            pollution: this.pollutionValue,
            timeJump: this.timeJump,
            bubbleCollision: this.bubbleCollision,
            collisionType: this.collisionType,
            simEnd: this.simEnd,
            reefDead: this.reefDeadTemp || this.reefDeadLight || this.reefDeadPollution,
            fishDead: this.fishDead,
            score: this.score,
            // copies, because the scene keeps pushing to its own arrays and React needs a new array to notice a change
            history: {
                stress: [...this.stressHistory],
                temp: [...this.tempHistory],
                light: [...this.lightHistory],
                poll: [...this.pollutionHistory],
            },
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
    }

    setSfxVolume(value) {
        this.sfxVolume = value;
    }

    // A random spot anywhere a bubble can be, at least 300px from the fish so it isn't popped straight away.
    // Shared by spawnBubbles() and returnBubble() so new and cancelled bubbles use the same area.
    getBubbleSpawnLocation() {
        let x;
        let y;
        do{
            x = Phaser.Math.Between(50, this.WORLD_WIDTH - 50);
            y = Phaser.Math.Between(50, this.WORLD_HEIGHT - 150);
        } while (Phaser.Math.Distance.Between(x, y, this.guide.x, this.guide.y) < 300);

        return { x, y };
    }

    spawnBubbles() {
        // Kept so the overlaps can be removed along with the bubbles in destroyBubbles()
        this.bubbleColliders = [];
        this.bubbles = {};

        for (const { type, texture, ease, inverted } of BUBBLE_TYPES) {
            const { x, y } = this.getBubbleSpawnLocation();
            const bubble = this.physics.add.image(x, y, texture).setDepth(7).setInteractive();

            // Change the colour of the tempEvent bubble so I don't need more assets.
            // preFX is WebGL-only, so on the Canvas renderer the bubble keeps its normal colour.
            if (inverted) {
                bubble.preFX?.addColorMatrix().negative();
            }

            this.bubbleColliders.push(this.physics.add.overlap(
                this.guide,
                bubble,
                () => {this.handleBubbleCollect(type);},
            ));

            bubble.on('pointerover', () => {
                this.tweens.add({ targets: bubble, scale: 1.15, duration: 200, ease });
            });
            bubble.on('pointerout', () => {
                this.tweens.add({ targets: bubble, scale: 1, duration: 200, ease });
            });

            this.bubbleIdle(bubble);
            this.bubbles[type] = bubble;
        }
    }

    // Sprinkles algae orbs at random spots the fish can reach. Eaten orbs don't come back.
    spawnFood() {
        this.food = this.physics.add.group();

        for (let i = 0; i < FOOD_COUNT; i++) {
            const { x, y } = this.getBubbleSpawnLocation();
            // Keep it inside the area the fish is clamped to, so every orb can be reached
            const orb = this.food.create(
                Phaser.Math.Clamp(x, 100, this.WORLD_WIDTH - 100),
                Phaser.Math.Clamp(y, 120, 850),
                "algaeOrb"
            ).setDepth(7);
            this.bubbleIdle(orb);
        }

        this.physics.add.overlap(this.guide, this.food, (guide, orb) => this.eatFood(orb));
    }

    // Eating always uses up the orb, but only heals when the fish isn't already at full health
    eatFood(orb) {
        if (this.simEnd) return;

        this.tweens.killTweensOf(orb);
        orb.destroy();
        this.sound.play('bubblePop', { volume: this.sfxVolume });

        if (this.health < MAX_HEARTS * 2) {
            this.health++;
            this.refreshHeartTextures();
        }
    }

    destroyBubbles() {
        // Remove the fish-vs-bubble overlaps too, otherwise the physics world keeps checking them every frame
        this.bubbleColliders.forEach(collider => collider.destroy());
        this.bubbleColliders = [];

        Object.values(this.bubbles).forEach(bubble => bubble.destroy());
    }

    handleBubbleCollect(type) {
        const bubble = this.bubbles[type];
        // Ignore other bubbles while a popup is open: the fish is frozen, but idle bubbles can still drift into it,
        // and that would switch the open popup to another type
        if (this.simEnd || this.bubbleCollision || !bubble) return;

        // Hide the bubble instead of destroying it, so it can be brought back if the popup is cancelled
        bubble.disableBody(true, true);
        this.sound.play('bubblePop', { volume: this.sfxVolume });

        // The temperature event applies straight away: no popup, and the fish keeps moving.
        // React listens for "temp-event" to show the notice.
        if (type === 'tempEvent') {
            const previousTemperature = this.temperature;
            const newTemperature = Math.min(previousTemperature + 2, 35);
            this.updateTemperature(newTemperature);
            this.game.events.emit("temp-event", { previousTemperature, newTemperature });
            return;
        }

        this.bubbleCollision = true;
        this.collisionType = type;
        this.emitStats();
    }


    bubbleIdle(bubble) {
        this.tweens.add({
            targets: bubble,
            y: bubble.y - 20,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: "Sine.inOut"
        });
    }


    update(time, delta) {
        // Freeze the fish, camera and timer once the end screen is showing
        if (this.simEnd) return;

        // Movement values below were tuned at 60fps, so scale them by how long this frame actually took.
        // Capped so a lag spike or returning to the tab doesn't teleport the fish.
        const frameScale = Math.min(delta, 50) / (1000 / 60);

        const hidePressed = Phaser.Input.Keyboard.JustDown(this.hideKey);
        if (hidePressed) {
            this.hideFish();
        }

        let horizontal = 0;
        let vertical = 0;

        if (this.tutorialComplete && !this.bubbleCollision) {
            horizontal = (this.moveKeys.D.isDown ? 1 : 0) - (this.moveKeys.A.isDown ? 1 : 0);
            vertical = (this.moveKeys.S.isDown ? 1 : 0) - (this.moveKeys.W.isDown ? 1 : 0);
            const movementLength = Math.hypot(horizontal, vertical);

            if (this.isHiding && movementLength > 0 && !hidePressed) {
                this.leaveHiding();
            }

            if (!this.isHiding && movementLength > 0) {
                const speed = 6.75 * frameScale; //This adjust the constant speed of the fish movement, regardless of direction.
                const moveX = (horizontal / movementLength) * speed;
                const moveY = (vertical / movementLength) * speed;

                this.guide.x += moveX;
                this.guide.y += moveY;

                const targetAngle = Math.atan2(vertical, horizontal);
                // Swimming straight up or down keeps the way the fish was facing, so it doesn't snap upside down
                const flip = horizontal === 0 ? this.guide.flipY : horizontal < 0;
                this.guide.setFlipY(flip);

                const offset = Phaser.Math.DegToRad(0);
                const desiredRotation = targetAngle + (flip ? -offset : offset);

                this.guide.rotation = Phaser.Math.Angle.RotateTo(
                    this.guide.rotation,
                    desiredRotation,
                    0.5 * frameScale
                );

                const minScale = 1.3;
                const maxScale = 1.3;
                const t = this.guide.y / this.cameras.main.height;
                const easedT = t * t;
                this.guide.setScale((minScale + (maxScale - minScale) * easedT) / 1.5);

                const wiggleAmount = 1; // Adjust the wiggle amount and speed as needed
                const wiggleSpeed = 0.01;
                const wiggle = Math.sin(this.time.now * wiggleSpeed) * wiggleAmount * frameScale;

                this.guide.x += Math.cos(this.guide.rotation + Math.PI / 2) * wiggle;
                this.guide.y += Math.sin(this.guide.rotation + Math.PI / 2) * wiggle;

                // Keeps the fish within the boundaries of the world. Clamped after the wiggle so it can't push the fish out either.
                this.guide.x = Phaser.Math.Clamp(this.guide.x, 100, this.WORLD_WIDTH - 100);
                this.guide.y = Phaser.Math.Clamp(this.guide.y, 120, 850);
            }
        }

        if (this.isHiding) {
            horizontal = 0;
            vertical = 0;
        }

        if (this.predatorSpawned && this.isHiding) {
            this.predatorFleeing = true;
        }

        if (this.predatorSpawned && this.predatorFleeing) {
            const escapeDirection = this.predatorEscapeDirection;
            this.predator.x += escapeDirection * PREDATOR_SPEED * frameScale;

            const escaped = escapeDirection < 0
                ? this.predator.x <= -PREDATOR_ESCAPE_MARGIN
                : this.predator.x >= this.WORLD_WIDTH + PREDATOR_ESCAPE_MARGIN;
            if (escaped) {
                this.predator.setVisible(false);
                this.predatorSpawned = false;
                this.predatorEscaped = true;
                this.predatorFleeing = false;
                this.game.events.emit("predator-left");
            }
        } else if (this.predatorSpawned && !this.bubbleCollision && !this.coralInfoOpen) {
            // The predator chases the fish unless the fish is hidden or an overlay is open.
            const predatorDistance = Phaser.Math.Distance.Between(
                this.predator.x,
                this.predator.y,
                this.guide.x,
                this.guide.y
            );
            if (predatorDistance > 0) {
                const predatorStep = Math.min(PREDATOR_SPEED * frameScale, predatorDistance);
                this.predator.x += ((this.guide.x - this.predator.x) / predatorDistance) * predatorStep;
                this.predator.y += ((this.guide.y - this.predator.y) / predatorDistance) * predatorStep;
            }
        }

        this.checkPredatorContact(delta);

        const sideWidth = 300; // Adjust the width of the side areas where the camera starts moving when the fish is near the edge
        const edgeScrollSpeed = 6.75; // Keep equal to the fish speed so the camera keeps up with the fish at the screen edges
        const cameraSmoothing = 0.15;
        const fishScreenX = this.guide.x - this.cameras.main.scrollX;
        const fishAtRightSide = horizontal > 0 && fishScreenX >= this.cameras.main.width - sideWidth;
        const fishAtLeftSide = horizontal < 0 && fishScreenX <= sideWidth;
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

        if (this.timerRunning) {
            this.simTime += delta;

            if (this.onSimTimeUpdate) {
                this.onSimTimeUpdate(this.getSimTime());
            }
        }

        this.deltaTimer += delta;
        // The arrow keys move the camera, but while the bubble popup is open they belong to its slider
        if (!this.bubbleCollision) {
            this.controls.update(delta);
        }

        oval.clear();
        oval.fillEllipse(this.guide.x, 950, this.guide.scale * 100, 10).setDepth(6);

        this.updateHearts();
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

    // Half a heart the moment the fish touches the predator, then another for every second it stays in contact
    checkPredatorContact(delta) {
        // No damage while a popup is open, since the fish can't move away
        const paused = this.bubbleCollision || this.coralInfoOpen;
        // A hiding fish is safe, even if the predator swims over it on the way out
        const touching = this.predatorSpawned && !paused && !this.isHiding && Phaser.Geom.Intersects.RectangleToRectangle(
            this.guide.getBounds(),
            this.predator.getBounds()
        );

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

        if (this.simEnd) this.emitStats();
    }
    getSimTime() {
        const totalSeconds = Math.floor(this.simTime / 1000);

        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        return [
            hours.toString().padStart(2, "0"),
            minutes.toString().padStart(2, "0"),
            seconds.toString().padStart(2, "0")
        ].join(":");
    }

    RestartSim() {
        this.scene.restart();
        this.bgMusic.stop(); // silence it straight away; the shutdown handler in setupAudio() destroys it
        resetCorals(this);
    }

    updateTemperature(temp) {
        this.temperature = temp;
        const { poor, dead } = evaluateThreshold(temp, THRESHOLDS.temperature);
        this.poorTemp = poor;
        this.reefDeadTemp = dead;
        this.updateStress();
        this.emitStats();
    }

    updatePollution(poll) {
        this.pollutionValue = poll;
        const { poor, dead } = evaluateThreshold(poll, THRESHOLDS.pollution);
        this.poorPollution = poor;
        this.reefDeadPollution = dead;
        this.updateStress();
        this.emitStats();
    }

    updateLight(light) {
        this.lightLevel = light;
        const { poor, dead } = evaluateThreshold(light, THRESHOLDS.light);
        this.poorLight = poor;
        this.reefDeadLight = dead;
        this.updateStress();
        this.emitStats();
    }

    updateStress() {
        // Once the sim is over, no more years can pass
        if (this.simEnd) return;

        if (this.reefDeadTemp || this.reefDeadLight || this.reefDeadPollution) {
            this.stressValue = 100;
            this.simEnd = true;
        } else {
            this.stressValue = this.poorTemp + this.poorLight + this.poorPollution;
        }

        if (this.stressHistory.length > 0) {
            const prev = this.stressHistory[this.stressHistory.length - 1];

            if (prev === 90 && this.stressValue === 90) {
                this.stressValue = 100;
                this.simEnd = true;
                this.reefDeadLight = true;
            }
        }

        this.updateHistory();

        this.timeJump++;
        // Every time jump costs the fish half a heart
        this.loseHalfHeart();

        if (this.timeJump >= 10) {
            this.simEnd = true;
        }

        // Only spawn new bubbles after every end condition has been checked
        this.destroyBubbles();
        if (!this.simEnd) {
            this.tweens.paused = false;
            this.spawnBubbles();
        }

        updateCoralStress(this, this.stressValue);
    }

    updateHistory() {
        this.tempHistory.push(this.temperature)
        this.lightHistory.push(this.lightLevel)
        this.pollutionHistory.push(this.pollutionValue)
        this.stressHistory.push(this.stressValue)

        console.table(this.tempHistory);
        console.table(this.lightHistory);
        console.table(this.pollutionHistory);
        console.table(this.stressHistory);

        /* tween light level overlays */
        const midpoint = 500;
        let brightAlpha = 0;
        let darkAlpha = 0;

        if (this.lightLevel > midpoint) {
            // Above 500 -> brighten
            brightAlpha = Phaser.Math.Clamp(
                (this.lightLevel - midpoint) / 3000, // scale factor
                0,
                0.1
            );
        }
        else if (this.lightLevel < midpoint) {
            // Below 500 -> darken
            darkAlpha = Phaser.Math.Clamp(
                (midpoint - this.lightLevel) / 500,
                0,
                0.6
            );
        }

        this.tweens.killTweensOf(this.lightOverlay);
        this.tweens.killTweensOf(this.darkOverlay);

        this.tweens.add({
            targets: this.lightOverlay,
            alpha: brightAlpha,
            duration: 800,
            ease: "Sine.easeInOut"
        });

        this.tweens.add({
            targets: this.darkOverlay,
            alpha: darkAlpha,
            duration: 800,
            ease: "Sine.easeInOut"
        });

        /* adjust red outline as stress increases or decreases */
        let outlineAlpha = 0;
        if (this.stressValue >= 60) {
            outlineAlpha = Phaser.Math.Clamp(
                (this.stressValue) / 100,
                0,
                1
            );
        }
        this.tweens.killTweensOf(this.badOutline);

        this.tweens.add({
            targets: this.badOutline,
            alpha: outlineAlpha,
            duration: 800,
            ease: "Sine.easeInOut"
        });

        /* adjust pipe output as pollution increases or decreases */
        let pollAlpha = 0;
        if (this.pollutionValue >= 3) {
            pollAlpha = Phaser.Math.Clamp(
                (this.pollutionValue - 1) / 5,
                0,
                1
            );
        }
        this.tweens.killTweensOf(this.pipeB);

        this.tweens.add({
            targets: this.pipeB,
            alpha: pollAlpha,
            duration: 800,
            ease: "Sine.easeInOut"
        });

    }
    unlockFish() {
        if (this.tutorialComplete) return;
        this.tutorialComplete = true;
        this.startPredatorTimer();
    }

    startPredatorTimer() {
        this.time.delayedCall(PREDATOR_SPAWN_DELAY, () => {
            if (this.simEnd) return;

            this.predatorSpawned = true;
            this.predator.setVisible(true);
            if (this.isHiding) {
                this.startPredatorFlee();
            }
            this.game.events.emit("predator-appeared");
        });
    }

    hideFish() {
        if (
            !this.tutorialComplete ||
            this.bubbleCollision ||
            this.coralInfoOpen ||
            this.isHiding
        ) {
            return;
        }

        const nearbyCoral = this.corals
            .map(coral => ({
                coral,
                distance: Phaser.Math.Distance.Between(this.guide.x, this.guide.y, coral.x, coral.y)
            }))
            .filter(({ distance }) => distance <= REEF_HIDE_DISTANCE)
            .sort((a, b) => a.distance - b.distance)[0]?.coral;

        if (!nearbyCoral) return;

        this.isHiding = true;
        this.guide.setPosition(
            nearbyCoral.x,
            Phaser.Math.Clamp(nearbyCoral.y - nearbyCoral.displayHeight * 0.45, 120, 850)
        );
        this.guide.setDepth(nearbyCoral.depth - 0.1);
        this.startPredatorFlee();
    }

    startPredatorFlee() {
        if (!this.predatorSpawned || this.predatorEscaped) return;

        this.predatorFleeing = true;
        this.predatorEscapeDirection = this.predator.x <= this.WORLD_WIDTH / 2 ? -1 : 1;
    }

    leaveHiding() {
        this.isHiding = false;
        this.guide.setDepth(9999);

        if (this.predatorFleeing && !this.predatorEscaped) {
            this.predatorFleeing = false;
        }
    }

    closeCoralPopup() {
        this.coralInfoOpen = false;
    }

    freeFish(cancelled) {
        this.bubbleCollision = false;
        if (cancelled) {
            this.returnBubble(this.collisionType);
        }
        this.emitStats();
    }

    // Brings a cancelled bubble back at a new random spot, away from the fish so it isn't popped again straight away
    returnBubble(type) {
        const bubble = this.bubbles[type];
        if (!bubble) return;

        const { x, y } = this.getBubbleSpawnLocation();

        this.tweens.killTweensOf(bubble);
        bubble.setScale(1);
        bubble.enableBody(true, x, y, true, true);
        this.bubbleIdle(bubble);
    }
}

export default TestScene;