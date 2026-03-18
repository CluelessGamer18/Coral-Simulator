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
        this.reefDead = false;

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

    showPopUpMessage() {
        const overlay = this.add.rectangle(this.sys.game.config.width / 2, this.sys.game.config.height / 2, this.sys.game.config.width, this.sys.game.config.height, 0x000000, 0.05);
        overlay.setOrigin(0.5);

        overlay.setInteractive();

        const message = this.add.text(512, 384, 'Overlay/Popup Test', {
            fontFamily: 'Arial',
            fontSize: 48,
            color: '#ffffff'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: message,
            scale: { from: 0.5, to: 1 },
            alpha: { from: 0, to: 1 },
            duration: 500,
            ease: 'Back.Out'
        });


        

        overlay.on('pointerdown', () => {
            message.destroy();
            overlay.destroy();
            // this.restartGame(); //instead restart, remove overlay
        });
    }
    


    create(){

        this.WORLD_WIDTH = 2860;
        this.WORLD_HEIGHT = 1024;


        this.cameras.main.setBackgroundColor("#8ACFC9");

        const cam = this.cameras.main;
        // const coral2 = this.add.image(200,cam.height - 160,"Coral2").setVisible(true).setScrollFactor(1, 0.5).setInteractive(); //scroll factor changes movement along y axis relative to camera
        


        // const bgGradient = this.add.image(0, 0, "bg_gradient")
        // .setOrigin(0, 0)
        // .setScrollFactor(0) //background does not move
        // .setScale(0.26)
        // .setTint(0x07c5ff); //tinted darker


        const floorLayer3 = this.add.image(0, 0, "floor_layer3")
        .setOrigin(0, 0).setDepth(1)
        
        // Calculation for full width parallax: (layerWidth - viewportWidth) / (worldWidth - viewportWidth)
        .setScrollFactor((1440 - cam.width) / (this.WORLD_WIDTH - cam.width), 1);
        
        floorLayer3.y = this.WORLD_HEIGHT - floorLayer3.height;

        const floorLayer2 = this.add.image(0, 0, "floor_layer2")
        .setOrigin(0, 0).setDepth(2)
        .setScrollFactor((2072 - cam.width) / (this.WORLD_WIDTH - cam.width), 1);
        floorLayer2.y = this.WORLD_HEIGHT - floorLayer2.height;

        const pipe = this.add.image(0, 0, "pipe")
        .setOrigin(0, 0).setDepth(6)
        .setScrollFactor((2072 - cam.width) / (this.WORLD_WIDTH - cam.width), 1);
        pipe.y = this.WORLD_HEIGHT - pipe.height - 40;

        //educated fish (schools)
        createFishSchools(this);

        createCorals(this); 


        updateCoralStress(this, 0);
        

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



        // const bgCoverGradient = this.add.image(0, 0, "bg_gradient")
        // .setOrigin(0, 0)
        // .setScrollFactor(0) //background does not move
        // .setScale(0.26)
        // .setTint(0x07c5ff) //tinted darker
        // .setAlpha(0.08); //tinted darker



        this.fish = this.add.image(200,500,"Fish").setScale(0.25)

        this.guide = this.physics.add.image(300,300,"Guide")
        this.guide.setInteractive();
        this.guide.setDepth(9999);
        
        this.spawnBubbles();
        this.isDraggingGuide = false; 
        this.input.on("pointerdown", () => { 
            this.isDraggingGuide = true; 
            }); 
        this.input.on("pointerup", () => { 
            this.isDraggingGuide = false; 
            });

        this.trashbag1 = this.add.image(310,370,"Trash").setScale(0.1).setVisible(false)
        this.trashbag2 = this.add.image(370,370,"Trash").setScale(0.1).setVisible(false)
        // this.coral = this.add.image(140,cam.height - 130,"Coral").setScale(0.07).setVisible(true).setScrollFactor(1, 0.7);

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
        ).setScrollFactor(0).setInteractive().setAlpha(0.05);

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
        ).setScrollFactor(0).setInteractive().setAlpha(0.05);

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

        // coral mouse detection
        // coral2.setInteractive();

        // coral2.on('pointerdown', () => {
        //     this.tweens.add({
        //         targets: coral2,
        //         scale: { from: coral2.scale, to: coral2.scale * 1.025 },
        //         duration: 100,
        //         yoyo: true,
        //         ease: 'Sine.Out'
        //     });

        //     this.showPopUpMessage();
        // });

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

    // Reattach overlap handlers
    this.physics.add.overlap(
        this.guide,
        this.tempBubble,
        () => this.handleBubbleCollect('temp'),
        null,
        this
    );

    this.physics.add.overlap(
        this.guide,
        this.lightBubble,
        () => this.handleBubbleCollect('light'),
        null,
        this
    );

    this.physics.add.overlap(
        this.guide,
        this.pollutionBubble,
        () => this.handleBubbleCollect('poll'),
        null,
        this
    );

        this.bubbleIdle(this.tempBubble);
        this.bubbleIdle(this.lightBubble);
        this.bubbleIdle(this.pollutionBubble);
    }

    handleBubbleCollect(type) {
        if (type == 'temp'){
            this.bubbleCollision = true;
            this.collisionType = type;
        } else if (type == 'light'){
            this.bubbleCollision = true;
            this.collisionType = type;
        } else if (type == 'poll'){
            this.bubbleCollision = true;
            this.collisionType = type;
        }
    }
    // Conditional Rendering w/ Phaser
    updateFishVisibility(show){
        if(this.fish){
            this.fish.setVisible(show)
        }
    }

    moveFishX(x){
        if(this.fish){
            this.fish.x = x
        }
    }

    startRandomFishIdle() {
    const trigger = () => {
        this.fishOneIdle();
        const nextDelay = Phaser.Math.Between(10000, 16000);
        this.time.delayedCall(nextDelay, trigger);
    };

    trigger();
}

    fishOneIdle(){
        this.tweens.add({
            targets: this.fish,
            x: 100,         
            duration: 3000,
            yoyo: true,      
            ease: "Linear",
            onYoyo: () => {
                this.fish.flipX = !this.fish.flipX;
                },
            onComplete: () => {
            this.fish.flipX = !this.fish.flipX;
                }
        })
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

        

            const minScale = 0.7;   // guide scale at the top
            const maxScale = 1.5;   // guide scale at the bottom

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
            oval.fillEllipse(this.guide.x, 950, this.guide.scale*100, 10);
    }

    startTimer(){
        this.timerRunning = true;
        this.simTime = 0;
    }
    startSim(){
        this.simStart = true;
        console.log(this.simStart)
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

    RestartSim(){this.scene.restart();}

    updateTemperature(temp){
        this.temperature = temp;
        const stressedA = 25; const stressedB = 27; // First Bleaching Interval [a,b]
        const stressedC = 29; const stressedD = 31; // Second Bleaching Interval [c,d]

        if(this.temperature >= stressedA && this.temperature < stressedB){
            this.poorTemp = 1;
            this.reefDead = false;
        } else if (this.temperature > stressedC && this.temperature <= stressedD){
            this.poorTemp = 1;
            this.reefDead = false;
        } else if (this.temperature <= stressedA){
            this.reefDead = true; // Reef is Dead
        } else if (this.temperature >= stressedD){
            this.reefDead = true;
        } else {
            this.poorTemp = 0;
            this.reefDead = false;
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
            this.reefDead = false;
        } else if (this.pollutionValue > stressedC && this.pollutionValue <= stressedD){
            this.poorPollution = 1;
            this.reefDead = false;
        } else if (this.pollutionValue <= stressedA){
            this.reefDead = true; // Reef is Dead
        } else if (this.pollutionValue >= stressedD){
            this.reefDead = true;
        } else {
            this.poorPollution = 0;
            this.reefDead = false;
        }

        this.updateStress()
        this.updateHistory()
    }

    updateLight(light){
        this.lightLevel = light;
        const stressedA = 141; const stressedB = 200; 
        const stressedC = 1100; const stressedD = 1839; 

        if(this.lightLevel >= stressedA && this.lightLevel < stressedB){
            this.poorLight = 1;
            this.reefDead = false;
        } else if (this.lightLevel > stressedC && this.lightLevel <= stressedD){
            this.poorLight = 1;
            this.reefDead = false;
        } else if (this.lightLevel <= stressedA){
            this.reefDead = true; // Reef is Dead
        } else if (this.lightLevel >= stressedD){
            this.reefDead = true;
        } else {
            this.poorLight = 0;
            this.reefDead = false;
        }

        this.updateStress()
        this.updateHistory()
    }

    updateStress(){
        if(this.reefDead){
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
    }
}

export default TestScene;