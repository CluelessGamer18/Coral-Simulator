import {useRef, useEffect} from "react";
import Phaser from "phaser";
import TestScene from "./TestScene.js";
import './TestScene.css';

function TestGame({onSceneReady}){
    const sceneRef = useRef(null);

    useEffect(() => {
        if (sceneRef.current) return

        const sim = new Phaser.Game({

            type: Phaser.AUTO,
            width: 400,
            height: 400,
            parent: "phaserContainer",
            scene: [TestScene],
            backgroundColor: "#ADD8E6"
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
        <div id="phaserContainer" className="phaserContainer">

        </div>
    )
}

export default TestGame;