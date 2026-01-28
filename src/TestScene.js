import Phaser from "phaser";
class TestScene extends Phaser.Scene{
    constructor(){
        super("TestScene");
    }

    preload(){
        this.load.image("Fish", "./SampleFish.jpg")
        this.load.image("Coral", "./coral1.png")
        this.load.image("Coral2", "./coral2.png")
    }

    create(){


        const cam = this.cameras.main;
         this.coral2 = this.add.image(200,cam.height - 160,"Coral2").setScale(0.13).setVisible(true).setScrollFactor(1, 0.5); //scroll factor changes movement along y axis relative to camera
         this.fish = this.add.image(50,250,"Fish").setScale(0.25).setVisible(false)
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


    update (time, delta) 
    {
        this.controls.update(delta);
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