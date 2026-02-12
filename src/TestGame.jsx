import {useRef, useEffect} from "react";
import Phaser from "phaser";
import TestScene from "./TestScene.js";
import Boot from "./scenes/Boot.js";
import Preloader from "./scenes/Preloader.js";
import './TestScene.css';

function TestGame({onSceneReady}){
    const sceneRef = useRef(null);

    useEffect(() => {
        if (sceneRef.current) return

        const sim = new Phaser.Game({

            type: Phaser.AUTO,
            parent: "phaserContainer",
            scene: [Boot,Preloader,TestScene],
            backgroundColor: "#ADD8E6",
            scale: { mode: Phaser.Scale.RESIZE, 
                autoCenter: Phaser.Scale.CENTER_BOTH, 
                width: "100%", height: "100%" }
            
        });

        sceneRef.current = sim;

        // This is the bridge
        sim.events.on("scene-ready", (sceneInstance) => {
            onSceneReady(sceneInstance);
        });



        return () => {
            sim.destroy(true);
            sceneRef.current = null;
        };

    }, []);
    return (
        <div id="phaserContainer" className="phaserContainer"></div>
    )
}

export default TestGame;