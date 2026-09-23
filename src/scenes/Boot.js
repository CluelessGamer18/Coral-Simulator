import Phaser from "phaser";

export class Boot extends Phaser.Scene {
    constructor() {
        super('Boot');
    }

    preload() {
        //  The Boot Scene is used to load in any assets required for the Preloader, such as a game logo or background.
        //  The smaller the file size of the assets, the better, as the Boot Scene itself has no preloader.
    }

    create() {
        this.scene.start('Preloader');
    }
}


export default Boot;