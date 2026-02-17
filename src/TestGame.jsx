import {useRef, useEffect} from "react";
import Phaser from "phaser";
import TestScene from "./scenes/TestScene.js";
import Boot from "./scenes/Boot.js";
import Preloader from "./scenes/Preloader.js";
import './styles/TestScene.css';
import { useState } from "react";

function TestGame({onSceneReady}){
    const sceneRef = useRef(null);

    useEffect(() => {
        if (sceneRef.current) return

        const sim = new Phaser.Game({

            type: Phaser.AUTO,
            parent: "phaserContainer",
            scene: [Boot,Preloader,TestScene],
            backgroundColor: "#ADD8E6",
            scale: { mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.NO_CENTER, 
                width: 1440, height: 1024 }
            
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