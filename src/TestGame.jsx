import {useRef, useEffect} from "react";
import Phaser from "phaser";
import TestScene from "./scenes/TestScene.js";
import Boot from "./scenes/Boot.js";
import Preloader from "./scenes/Preloader.js";
import './styles/TestScene.css';
import { useState } from "react";
import CoralPopup from './CoralPopup.jsx';


function TestGame({onSceneReady}){
    const sceneRef = useRef(null);
    const [loaded, setLoaded] = useState(false);
    console.log(window.innerWidth);
    const widthSize = window.innerWidth;
    const [selectedCoral, setSelectedCoral] = useState(null);

    useEffect(() => {
        if (sceneRef.current) return

        const sim = new Phaser.Game({

            type: Phaser.AUTO,
            width: 1440,
            height: 1024,
            parent: "phaserContainer",
            scene: [Boot,Preloader,TestScene],
            physics: { default: 'arcade', arcade: { debug: false }},
            backgroundColor: "#0292A5",
            scale: { mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.NO_CENTER, 
                width: 1440, height: 1024 }
            
        });

        sceneRef.current = sim;

    sim.events.on("scene-ready", (sceneInstance) => {
      onSceneReady(sceneInstance);
      setLoaded(true);
    });

    return () => {
      sim.destroy(true);
      sceneRef.current = null;
    };
  }, []);


  // Listen for coral click to call popup
  useEffect(() => {
    if (!sceneRef.current) return;

    const sim = sceneRef.current;

    const handler = (data) => {
      setSelectedCoral(data);
    };

    sim.events.on("coralInfo", handler);

    return () => {
      sim.events.off("coralInfo", handler);
    };
  }, []);


    return (
        <>
            <div id="phaserContainer" className="phaserContainer">
                {/* add overlays here */}
                <CoralPopup className="coralPopup"
                    coral={selectedCoral} 
                    onClose={() => setSelectedCoral(null)} 
                />
            </div>
        </>
    )
}

export default TestGame;