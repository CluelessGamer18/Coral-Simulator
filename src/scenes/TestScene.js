import Phaser from "phaser";
import { createFishSchools } from "./FishSchools.js";
import { createCorals, updateCoralStress } from "./CoralManager.js";

let oval;

class TestScene extends Phaser.Scene{
    constructor(){
        super("TestScene");
        this.lightLevel = 500; // Default
        this.temperature = 27; // Default
        this.pollutionValue = 1; // Default
        this.stressValue = 0; // Will range from 0 - 4 
        // 0 means healthy
        // 1 means slightly stressed
        // 2 means more stressed
        // 3 means bleached
        // 4 means death

        // Data Values
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

        this.deltaTimer = 0;
        this.simStart = false;
        this.timeJump = 0;
        this.bubbleCollision = false;
        this.collisionType = "None";
        this.camVelX = 0;
        this.moveCameraLeft = false;
        this.moveCameraRight = false;
        this.tutorialComplete = false;
        // If (tutorialComplete)
        
    }
    


    create(){
        this.WORLD_WIDTH = 2860;
        this.WORLD_HEIGHT = 1024;


        this.cameras.main.setBackgroundColor("#8ACFC9");

        const cam = this.cameras.main;

        const floorLayer3 = this.add.image(0, 0, "floor_layer3")
        .setOrigin(0, 0).setDepth(1)
        
        // Calculation for full width parallax: (layerWidth - viewportWidth) / (worldWidth - viewportWidth)
        .setScrollFactor((1440 - cam.width) / (this.WORLD_WIDTH - cam.width), 1);
        
        floorLayer3.y = this.WORLD_HEIGHT - floorLayer3.height;

        const floorLayer2 = this.add.image(0, 0, "floor_layer2")
        .setOrigin(0, 0).setDepth(2)
        .setScrollFactor((2072 - cam.width) / (this.WORLD_WIDTH - cam.width), 1);
        floorLayer2.y = this.WORLD_HEIGHT - floorLayer2.height;

        this.pipe = this.add.image(0, 0, "pipe")
        .setOrigin(0, 0).setDepth(6)
        .setScrollFactor(1, 1)
        .setAngle(-15);
        this.pipe.y = this.WORLD_HEIGHT - this.pipe.height - 60;

        this.pipe.setFrame(1);

        //educated fish (schools)
        createFishSchools(this);

        createCorals(this); 

        // this.load.audio('background_music', ['assets/sounds/background_music.mp3', 'assets/sounds/background_music.wav']);

        // backgroundMusic = game.add.audio('background_music');
        // backgroundMusic.loop = true;
        // backgroundMusic.play();

        

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

        this.guide = this.physics.add.image(300,300,"Guide")
        this.guide.setInteractive();
        this.guide.setDepth(9999);
        this.guide.preFX.addShadow(0, -8, 0.009, 1, 0x333333, 5);

        // const badOutline = this.add.image(-95, -95, "badOutline")
        // .setOrigin(0, 0).setDepth(10000)
        // .setScrollFactor((1440 - cam.width) / (this.WORLD_WIDTH - cam.width), 1);

        // const lightOverlay = this.add.rectangle(0, 0, 1440, 1024, 0x000000, 0.25)
        // .setOrigin(0, 0).setDepth(10000)
        // .setScrollFactor((1440 - cam.width) / (this.WORLD_WIDTH - cam.width), 1);
        
        this.spawnBubbles();
        this.isDraggingGuide = false; 
        this.input.on("pointerdown", () => { 
            this.isDraggingGuide = true; 
            }); 
        this.input.on("pointerup", () => { 
            this.isDraggingGuide = false; 
            });

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

            
        

        cam.setBounds(0, 0, this.WORLD_WIDTH, this.WORLD_HEIGHT);
        this.onSimTimeUpdate = null;
        this.game.events.emit("scene-ready", this);



        oval = this.add.graphics({ fillStyle: { color: 0x000000 } }).setDepth(100000).setAlpha(0.5);

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

        this.tweens.paused = true;

        if (type == 'temp'){
            this.bubbleCollision = true;
            this.tempBubble.destroy();
            this.collisionType = type;
        } else if (type == 'light'){
            this.bubbleCollision = true;
            this.collisionType = type;
            this.lightBubble.destroy();
        } else if (type == 'poll'){
            this.bubbleCollision = true;
            this.collisionType = type;
            this.pollutionBubble.destroy();
        }
        bubblePop.play();
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

        if (this.tutorialComplete && !this.bubbleCollision && Phaser.Math.Distance.Between(this.guide.x,this.guide.y,pointer.worldX,pointer.worldY) > 100) {
            
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
            this.guide.setScale((minScale + (maxScale - minScale) * easedT)/1.5);

            const angleDiff = Phaser.Math.Angle.Wrap(desiredRotation - this.guide.rotation);

            if (Math.abs(angleDiff) < 0.15) {
                this.guide.x += (pointer.worldX - this.guide.x) * speed;

                if (this.guide.y + ((pointer.worldY - this.guide.y) * speed) < 850) { // stay above shadow
                    this.guide.y += (pointer.worldY - this.guide.y) * speed;
                }

                
                const time = this.time.now;
                const wiggleAmount = 1;
                const wiggleSpeed = 0.01;
                const wiggle = Math.sin(time*wiggleSpeed)*wiggleAmount;

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

            this.deltaTimer+=delta;        
            this.controls.update(delta); 


            oval.clear();

            // Redraw oval at new position
            oval.fillEllipse(this.guide.x, 950, this.guide.scale*100, 10).setDepth(6);
    }

    // startTimer(){
    //     this.timerRunning = true;
    //     this.simTime = 0;
    // }
    // startSim(){
    //     this.simStart = true;
    //     console.log(this.simStart)
    // }

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

    RestartSim(){this.scene.restart();}

    updateTemperature(temp){
        this.temperature = temp;
        const stressedA = 25; const stressedB = 27; // First Bleaching Interval [a,b]
        const stressedC = 29; const stressedD = 31; // Second Bleaching Interval [c,d]

        if(this.temperature >= stressedA && this.temperature < stressedB){
            this.poorTemp = 1;
            this.reefDeadTemp = false;
        } else if (this.temperature > stressedC && this.temperature <= stressedD){
            this.poorTemp = 1;
            this.reefDeadTemp = false;
        } else if (this.temperature <= stressedA){
            this.reefDeadTemp = true; // Reef is Dead
        } else if (this.temperature >= stressedD){
            this.reefDeadTemp = true;
        } else {
            this.poorTemp = 0;
            this.reefDeadTemp = false;
        }

        this.updateStress()
        this.updateHistory()
    }

    updatePollution(poll){
        this.pollutionValue = poll;
        const stressedA = 0; const stressedB = 1; 
        const stressedC = 3; const stressedD = 5; 

        if(this.pollutionValue >= stressedA && this.pollutionValue < stressedB){
            this.poorPollution = 1;
            this.reefDeadPollution = false;
        } else if (this.pollutionValue > stressedC && this.pollutionValue <= stressedD){
            this.poorPollution = 1;
            this.reefDeadPollution = false;
        } else if (this.pollutionValue <= stressedA){
            this.reefDeadPollution = true; // Reef is Dead
        } else if (this.pollutionValue >= stressedD){
            this.reefDeadPollution = true;
        } else {
            this.poorPollution = 0;
            this.reefDeadPollution = false;
        }

        this.pipe.setFrame(0); // move this to where the pollution gets too high, set to 1 when pollution is lower (no pipe output)


        this.updateStress()
        this.updateHistory()
    }

    updateLight(light){
        this.lightLevel = light;
        const stressedA = 141; const stressedB = 200; 
        const stressedC = 1100; const stressedD = 1839; 

        if(this.lightLevel >= stressedA && this.lightLevel < stressedB){
            this.poorLight = 1;
            this.reefDeadLight = false;
        } else if (this.lightLevel > stressedC && this.lightLevel <= stressedD){
            this.poorLight = 1;
            this.reefDeadLight = false;
        } else if (this.lightLevel <= stressedA){
            this.reefDeadLight = true; // Reef is Dead
        } else if (this.lightLevel >= stressedD){
            this.reefDeadLight = true;
        } else {
            this.poorLight = 0;
            this.reefDeadLight = false;
        }

        this.updateStress()
        this.updateHistory()
    }

    updateStress(){
        if(this.reefDeadTemp || this.reefDeadLight || this.reefDeadPollutionch){
            this.stressValue = 4
        } else{
            this.stressValue = this.poorTemp + this.poorLight + this.poorPollution;
        }
        if(this.timeJump != 0){ //Avoid an index OOB error
            if(this.stressHistory[this.timeJump - 1] == 3 && this.stressValue == 3){
                this.stressValue = 4;
                this.reefDead = true;
            }
        }
        console.log("Stress after update =",this.stressValue)
        this.timeJump++;
        updateCoralStress(this, this.stressValue);
    }

    updateHistory(){
        this.tempHistory.push(this.temperature)
        this.lightHistory.push(this.lightLevel)
        this.pollutionHistory.push(this.pollutionValue)
        this.stressHistory.push(this.stressValue)

        console.table(this.tempHistory);
        console.table(this.lightHistory);
        console.table(this.pollutionHistory);
        console.table(this.stressHistory);
    }
    unlockFish(){this.tutorialComplete = true;}

    freeFish(){
        this.bubbleCollision = false;
        this.tempBubble.destroy();
        this.lightBubble.destroy();
        this.pollutionBubble.destroy();
        this.spawnBubbles();
        this.tweens.paused = false;
    }
}

export default TestScene;