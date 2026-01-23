import Phaser from "phaser";
class TestScene extends Phaser.Scene{
    constructor(){
        super("TestScene");
    }

    preload(){
        this.load.image("Fish", "./SampleFish.jpg")
    }

    create(){
         this.fish = this.add.image(50,50,"Fish").setScale(0.25).setVisible(false)
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