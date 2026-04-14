import Phaser from "phaser";
import { createFishSchools, timeJumpAnimate } from "./FishSchools.js";
import { createCorals, updateCoralStress, resetCorals } from "./CoralManager.js";
import { createNodeImportMeta } from "vite/module-runner";

let oval;

class TestScene extends Phaser.Scene {
    constructor() {
        super("TestScene");

        this.deltaTimer = 0;
        this.simStart = false;

        this.collisionType = "None";
        this.camVelX = 0;
        this.moveCameraLeft = false;
        this.moveCameraRight = false;
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

        this.WORLD_WIDTH = 2860;
        this.WORLD_HEIGHT = 1024;
    }

    setupWorld(cam) {
        this.game.events.emit("scene-ready", this);

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
        this.musicVolume = 0.5;

        this.bgMusic = this.sound.add('background_music', {
            loop: true,
            volume: this.musicVolume
        });

        this.bgMusic.play();
    }

    setupUI(cam) {
        this.guide = this.physics.add.image(300, 300, "Guide")
        this.guide.setInteractive();
        this.guide.setDepth(9999);
        this.guide.preFX.addShadow(0, -8, 0.009, 1, 0x333333, 5);

        this.badOutline = this.add.image(-95, -95, "badOutline")
            .setOrigin(0, 0).setDepth(10001).setAlpha(0)
            .setScrollFactor((1440 - cam.width) / (this.WORLD_WIDTH - cam.width), 1);

        this.lightOverlay = this.add.rectangle(0, 0, 1440, 1024, 0xFFFFFF, 1)
            .setOrigin(0, 0).setDepth(10000)
            .setScrollFactor((1440 - cam.width) / (this.WORLD_WIDTH - cam.width), 1);

        this.darkOverlay = this.add.rectangle(0, 0, 1440, 1024, 0x000000, 1)
            .setOrigin(0, 0).setDepth(10000)
            .setScrollFactor((1440 - cam.width) / (this.WORLD_WIDTH - cam.width), 1);



        // move right on hover
        this.rectRight = this.add.rectangle(
            this.cameras.main.width - 50,
            this.cameras.main.height / 2,
            100,
            this.cameras.main.height, 0xFFFFFF
        ).setScrollFactor(0).setInteractive().setAlpha(0.05).setDepth(10);

        this.rectRight.on("pointerover", () => {
            this.moveCameraRight = true;
        });

        this.rectRight.on("pointerout", () => {
            this.moveCameraRight = false;
        });

        // move left on hover
        this.rectLeft = this.add.rectangle(
            50,
            this.cameras.main.height / 2,
            100,
            this.cameras.main.height, 0xFFFFFF
        ).setScrollFactor(0).setInteractive().setAlpha(0.05).setDepth(10);

        this.rectLeft.on("pointerover", () => {
            this.moveCameraLeft = true;
        });

        this.rectLeft.on("pointerout", () => {
            this.moveCameraLeft = false;
        });

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

        //camera presettings
        const controlConfig = {
            camera: this.cameras.main,
            left: cursors.left,
            right: cursors.right,
            up: cursors.up,
            down: cursors.down,
            zoomIn: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
            zoomOut: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
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

        this.onSimTimeUpdate = null;

        window.gameScene = this;
        this.game.events.emit("scene-ready", this);
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

    spawnBubbles() {
        const x1 = Phaser.Math.Between(50, 2000);
        const y1 = Phaser.Math.Between(50, 500);

        const x2 = Phaser.Math.Between(50, 2000);
        const y2 = Phaser.Math.Between(50, 500);

        const x3 = Phaser.Math.Between(50, 2000);
        const y3 = Phaser.Math.Between(50, 500);

        this.tempBubble = this.physics.add.image(x1, y1, 'TempBubble').setDepth(7);
        this.lightBubble = this.physics.add.image(x2, y2, 'LightBubble').setDepth(7);
        this.pollutionBubble = this.physics.add.image(x3, y3, 'PollutionBubble').setDepth(7);

        this.tempBubble.setInteractive();
        this.tempBubble.on('pointerdown', () => {
            this.handleBubbleCollect('temp');
        });
        this.tempBubble.on('pointerover', () => {
            this.tweens.add({
                targets: this.tempBubble,
                scale: 1.15,
                duration: 200,
                ease: 'Power1'
            });
        });
        this.tempBubble.on('pointerout', () => {
            this.tweens.add({
                targets: this.tempBubble,
                scale: 1,
                duration: 200,
                ease: 'Power1'
            });
        });

        this.lightBubble.setInteractive();
        this.lightBubble.on('pointerdown', () => {
            this.handleBubbleCollect('light');
        });
        this.lightBubble.on('pointerover', () => {
            this.tweens.add({
                targets: this.lightBubble,
                scale: 1.15,
                duration: 200,
                ease: 'Sine.inOut'
            });
        });
        this.lightBubble.on('pointerout', () => {
            this.tweens.add({
                targets: this.lightBubble,
                scale: 1,
                duration: 200,
                ease: 'Sine.inOut'
            });
        });

        this.pollutionBubble.setInteractive();
        this.pollutionBubble.on('pointerdown', () => {
            this.handleBubbleCollect('poll');
        });
        this.pollutionBubble.on('pointerover', () => {
            this.tweens.add({
                targets: this.pollutionBubble,
                scale: 1.15,
                duration: 200,
                ease: 'Sine.inOut'
            });
        });
        this.pollutionBubble.on('pointerout', () => {
            this.tweens.add({
                targets: this.pollutionBubble,
                scale: 1,
                duration: 200,
                ease: 'Sine.inOut'
            });
        });

        this.bubbleIdle(this.tempBubble);
        this.bubbleIdle(this.lightBubble);
        this.bubbleIdle(this.pollutionBubble);
    }

    handleBubbleCollect(type) {
        const bubblePop = this.sound.add('bubblePop');

        if (type == 'temp') {
            this.bubbleCollision = true;
            this.tempBubble.destroy();
            this.collisionType = type;
        } else if (type == 'light') {
            this.bubbleCollision = true;
            this.collisionType = type;
            this.lightBubble.destroy();
        } else if (type == 'poll') {
            this.bubbleCollision = true;
            this.collisionType = type;
            this.pollutionBubble.destroy();
        }
        this.sound.play('bubblePop', { volume: this.sfxVolume });
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


        const pointer = this.input.activePointer;

        if (this.tutorialComplete && !this.bubbleCollision && Phaser.Math.Distance.Between(this.guide.x, this.guide.y, pointer.worldX, pointer.worldY) > 100) {

            const speed = 0.05;

            const targetAngle = Phaser.Math.Angle.Between(
                this.guide.x, this.guide.y,
                pointer.worldX, pointer.worldY
            );


            // Decide if sprite should flip
            const flip = Math.cos(targetAngle) < 0;
            this.guide.setFlipY(flip);

            // Adjust offset depending on flip
            const offset = Phaser.Math.DegToRad(0);
            const desiredRotation = targetAngle + (flip ? -offset : offset);

            // Smooth rotation
            this.guide.rotation = Phaser.Math.Angle.RotateTo(
                this.guide.rotation,
                desiredRotation,
                0.5
            );



            const minScale = 1.3;   // guide scale at the top
            const maxScale = 1.3;   // guide scale at the bottom

            const t = this.guide.y / this.cameras.main.height;
            const easedT = t * t;   // easing
            this.guide.setScale((minScale + (maxScale - minScale) * easedT) / 1.5);

            const angleDiff = Phaser.Math.Angle.Wrap(desiredRotation - this.guide.rotation);

            if (Math.abs(angleDiff) < 0.15) {
                this.guide.x += (pointer.worldX - this.guide.x) * speed;

                if (this.guide.y + ((pointer.worldY - this.guide.y) * speed) < 850) { // stay above shadow
                    this.guide.y += (pointer.worldY - this.guide.y) * speed;
                }


                const time = this.time.now;
                const wiggleAmount = 1;
                const wiggleSpeed = 0.01;
                const wiggle = Math.sin(time * wiggleSpeed) * wiggleAmount;

                this.guide.x += Math.cos(this.guide.rotation + Math.PI / 2) * wiggle;
                if (this.guide.y + (Math.sin(this.guide.rotation + Math.PI / 2) * wiggle) < 850) {
                    this.guide.y += Math.sin(this.guide.rotation + Math.PI / 2) * wiggle;
                }
            }

            // Add in a different movement if fish is close to the cursor.
        }

        //mouse movement
        const accel = 0.6;
        const friction = 0.9;
        const maxSpeed = 15;

        if (this.moveCameraRight) {
            this.camVelX += accel;
        } else if (this.moveCameraLeft) {
            this.camVelX -= accel;
        } else {
            this.camVelX *= friction;
        }

        this.camVelX = Phaser.Math.Clamp(this.camVelX, -maxSpeed, maxSpeed);

        this.cameras.main.scrollX += this.camVelX;


        if (this.timerRunning) {
            this.simTime += delta;

            if (this.onSimTimeUpdate) {
                this.onSimTimeUpdate(this.getSimTime());
            }
        }

        this.deltaTimer += delta;
        this.controls.update(delta);


        oval.clear();

        // Redraw oval at new position
        oval.fillEllipse(this.guide.x, 950, this.guide.scale * 100, 10).setDepth(6);
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
        this.bgMusic.stop();
        resetCorals(this);
    }

    updateTemperature(temp) {
        this.temperature = temp;
        const stressedA = 25; const stressedB = 27; // First Bleaching Interval [a,b]
        const stressedC = 29; const stressedD = 31; // Second Bleaching Interval [c,d]

        if (this.temperature >= stressedA && this.temperature < stressedB) {
            this.poorTemp = 30;
            this.reefDeadTemp = false;
        } else if (this.temperature > stressedC && this.temperature <= stressedD) {
            this.poorTemp = 30;
            this.reefDeadTemp = false;
        } else if (this.temperature <= stressedA) {
            this.reefDeadTemp = true; // Reef is Dead
        } else if (this.temperature >= stressedD) {
            this.reefDeadTemp = true;
        } else {
            this.poorTemp = 0;
            this.reefDeadTemp = false;
        }

        this.updateStress()
    }

    updatePollution(poll) {
        this.pollutionValue = poll;
        const stressedA = 0; const stressedB = 1;
        const stressedC = 3; const stressedD = 5;

        if (this.pollutionValue >= stressedA && this.pollutionValue < stressedB) {
            this.poorPollution = 30;
            this.reefDeadPollution = false;
        } else if (this.pollutionValue > stressedC && this.pollutionValue <= stressedD) {
            this.poorPollution = 30;
            this.reefDeadPollution = false;
        } else if (this.pollutionValue <= stressedA) {
            this.reefDeadPollution = true; // Reef is Dead
        } else if (this.pollutionValue >= stressedD) {
            this.reefDeadPollution = true;
        } else {
            this.poorPollution = 0;
            this.reefDeadPollution = false;
        }

        this.updateStress()
    }

    updateLight(light) {
        this.lightLevel = light;
        const stressedA = 141; const stressedB = 200;
        const stressedC = 1100; const stressedD = 1839;

        if (this.lightLevel >= stressedA && this.lightLevel < stressedB) {
            this.poorLight = 30;
            this.reefDeadLight = false;
        } else if (this.lightLevel > stressedC && this.lightLevel <= stressedD) {
            this.poorLight = 30;
            this.reefDeadLight = false;
        } else if (this.lightLevel <= stressedA) {
            this.reefDeadLight = true; // Reef is Dead
        } else if (this.lightLevel >= stressedD) {
            this.reefDeadLight = true;
        } else {
            this.poorLight = 0;
            this.reefDeadLight = false;
        }
        this.updateStress()
    }

    updateStress() {
        if (this.reefDeadTemp || this.reefDeadLight || this.reefDeadPollution) {
            this.stressValue = 100;
            this.tempBubble.destroy();
            this.lightBubble.destroy();
            this.pollutionBubble.destroy();
            this.simEnd = true;
        } else {
            this.stressValue = this.poorTemp + this.poorLight + this.poorPollution;
            this.tempBubble.destroy();
            this.lightBubble.destroy();
            this.pollutionBubble.destroy();
            this.tweens.paused = false;
            this.spawnBubbles();
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

        if (this.timeJump === 10) {
            this.simEnd = true;
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
    unlockFish() { this.tutorialComplete = true; }

    freeFish(cancelled) {
        this.bubbleCollision = false;
        if (!cancelled) {

        }

    }
}

export default TestScene;