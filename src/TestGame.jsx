import {useRef, useEffect} from "react";
import Phaser from "phaser";
import TestScene from "./scenes/TestScene.js";
import Boot from "./scenes/Boot.js";
import Preloader from "./scenes/Preloader.js";
import './styles/TestScene.css';
import { useState } from "react";



function TestGame({onSceneReady}){
    const sceneRef = useRef(null);
    const [loaded, setLoaded] = useState(false);
    console.log(window.innerWidth);
    const widthSize = window.innerWidth;

    useEffect(() => {
        if (sceneRef.current) return

        const sim = new Phaser.Game({

            type: Phaser.AUTO,
            parent: "phaserContainer",
            scene: [Boot,Preloader,TestScene],
            physics: { default: 'arcade', arcade: { debug: false }},
            backgroundColor: "#ADD8E6",
            scale: { mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.NO_CENTER, 
                width: 1440, height: 1024 }
            
        });

        sceneRef.current = sim;


        // This is the bridge
        sim.events.on("scene-ready", (sceneInstance) => {
            onSceneReady(sceneInstance);
            setLoaded(true); // add overlay img after preloader completes
        });



        return () => {
            sim.destroy(true);
            sceneRef.current = null;
        };

    }, []);
    return (
        <>
            <div id="phaserContainer" className="phaserContainer">
                {/* add overlays here */}
                {/*<img style={{ opacity: loaded ? 1 : 0 }} draggable="false" onContextMenu={(e) => e.preventDefault()} id="timelineImage" src="/assets/wireframe1/timeline_1390x88_wireframe1.png"></img>*/}
            </div>
        </>
    )
}

export default TestGame;