import Phaser from "phaser";
class TestScene extends Phaser.Scene{
    constructor(){
        super("TestScene");
        this.lightLevel = 50;
        this.temperature = 26;
        this.polutionValue = 0;
        this.nutrients = 50;
        this.stress = 0;
        this.stressRate = 0;
        this.maxStress = 1000;
        this.meanTemp = 26;
        this.stdDevTemp = 10.39;

        this.meanLight = 50;
        this.stdDevLight = 28.57;
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

        this.cameras.main.setBackgroundColor("#1d5986");

        const cam = this.cameras.main;
        const coral2 = this.add.image(200,cam.height - 160,"Coral2").setScale(0.13).setVisible(true).setScrollFactor(1, 0.5).setInteractive(); //scroll factor changes movement along y axis relative to camera
        this.fish = this.add.image(200,550,"Fish").setScale(0.25)
        this.trashbag1 = this.add.image(310,370,"Trash").setScale(0.1).setVisible(false)
        this.trashbag2 = this.add.image(370,370,"Trash").setScale(0.1).setVisible(false)
        this.coral = this.add.image(140,cam.height - 130,"Coral").setScale(0.07).setVisible(true).setScrollFactor(1, 0.7);

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

        cam.setBounds(0, -1000, 0, cam.height + 1000);
        this.onSimTimeUpdate = null;
        this.game.events.emit("scene-ready", this);



        // coral mouse detection
        coral2.setInteractive();

        coral2.on('pointerdown', () => {
            this.tweens.add({
                targets: coral2,
                scale: { from: coral2.scale, to: coral2.scale * 1.025 },
                duration: 100,
                yoyo: true,
                ease: 'Sine.Out'
            });

            this.showPopUpMessage();
        });

        // coral2.on('pointerout', function (pointer)
        // {

        //     this.clearTint();

        // });

        // coral2.on('pointerup', function (pointer)
        // {

        //     this.clearTint();

        // });

    }

    updateBackgroundColor() {
        if (this.lightLevel <= 10){
            this.cameras.main.setBackgroundColor("#06121a");
        } else if (this.lightLevel > 10 && this.lightLevel <= 20){
            this.cameras.main.setBackgroundColor("#0b2232");
        } else if (this.lightLevel > 20 && this.lightLevel <= 30){
            this.cameras.main.setBackgroundColor("#11364f");
        } else if (this.lightLevel > 30 && this.lightLevel <= 40){
            this.cameras.main.setBackgroundColor("#174767");
        } else if (this.lightLevel > 40 && this.lightLevel <= 50){
            this.cameras.main.setBackgroundColor("#1d5986");
        } else if (this.lightLevel > 50 && this.lightLevel <= 60){
            this.cameras.main.setBackgroundColor("#216498");
        } else if (this.lightLevel > 60 && this.lightLevel <= 70){
            this.cameras.main.setBackgroundColor("#2572ad");
        } else if (this.lightLevel > 70 && this.lightLevel <= 80){
            this.cameras.main.setBackgroundColor("#2b85c9");
        } else if (this.lightLevel > 80 && this.lightLevel <= 90){
            this.cameras.main.setBackgroundColor("#3192dc");
        } else if (this.lightLevel > 90 && this.lightLevel <= 100){
            this.cameras.main.setBackgroundColor("#36a8ff");
        } 
    }

    updatePollutionLevel(){
        if (this.pollutionValue <= 33) {
            this.trashbag1.setVisible(false)
            this.trashbag2.setVisible(false)
        } else if (this.pollutionValue > 33 && this.pollutionValue <= 66){
            this.trashbag1.setVisible(true)
            this.trashbag2.setVisible(false)
        } else if (this.pollutionValue > 66){
            this.trashbag1.setVisible(true)
            this.trashbag2.setVisible(true)
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

    update(time, delta) {
        if (this.timerRunning) {
            this.simTime += delta;

            if (this.onSimTimeUpdate) {
                this.onSimTimeUpdate(this.getSimTime());
            }
        }

        this.stress = Phaser.Math.Clamp(
            this.stress + (this.stressRate * delta) / 1000,
            0,
            this.maxStress
        );

        console.log(this.stress)
        this.controls.update(delta);
    }


    updateStressRate(){
        const zTemp = (this.temperature - this.meanTemp) / this.stdDevTemp;
        const zLight = (this.lightLevel - this.meanLight) / this.stdDevLight;
        this.stressRate = zTemp + zLight;
    }

    startTimer(){
        this.timerRunning = true;
        this.simTime = 0;
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
}

export default TestScene;

/** Useful Notes:
 * 
 * Here we are creating a class called TestScene by extending phaser's built
 * in scene class. 
 * 
 * A scene is similar to a specific screen or game state.
 * 
 * constructor(): class constructor, similar to __init__ in python
 * 
 * super("SceneKey") Registers the scene with phaser with the provided key in 
 * this case: TestScene
 * 
 * Assets used for simulation do in fact go under preload. (Lifecycle method)
 * 
 * create() (Lifecycle method). Essentially creates the scene. 
 * this (refers to this class)
 * .add Phasers method of adding objects to the scene
 * .text(Self explantory)
 * 
 * 
 * 
 */