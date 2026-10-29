import {useRef, useEffect} from "react";
import Phaser from "phaser";
import TestScene from "./scenes/TestScene.js";
import Boot from "./scenes/Boot.js";
import Preloader from "./scenes/Preloader.js";
import Tutorial from "./scenes/Tutorial.js";
import './styles/TestScene.css';
import { useState } from "react";
import CoralPopup from './CoralPopup.jsx';
import TutorialBanner from './TutorialBanner.jsx';


function TestGame({onSceneReady}){
    const sceneRef = useRef(null);
    const [selectedCoral, setSelectedCoral] = useState(null);
    const [tutorialStep, setTutorialStep] = useState(null);
    const [tutorialPraise, setTutorialPraise] = useState(null);

    // keep the latest onSceneReady without re-running the effect below, which would destroy and recreate the game
    const onSceneReadyRef = useRef(onSceneReady);
    useEffect(() => {
        onSceneReadyRef.current = onSceneReady;
    });

    useEffect(() => {
        if (sceneRef.current) return

        const sim = new Phaser.Game({

            type: Phaser.AUTO,
            width: 1440,
            height: 1024,
            parent: "phaserContainer",
            scene: [Boot,Preloader,Tutorial,TestScene],
            physics: { default: 'arcade', arcade: { debug: false }},
            backgroundColor: "#0292A5",
            scale: { mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.NO_CENTER, 
                width: 1440, height: 1024 }
            
        });

        sceneRef.current = sim;

    sim.events.on("scene-ready", (sceneInstance) => {
      onSceneReadyRef.current(sceneInstance);
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

  // The tutorial scene sends its current instruction and a praise message when a step is done
  useEffect(() => {
    if (!sceneRef.current) return;

    const sim = sceneRef.current;

    sim.events.on("tutorial-step", setTutorialStep);
    sim.events.on("tutorial-praise", setTutorialPraise);

    return () => {
      sim.events.off("tutorial-step", setTutorialStep);
      sim.events.off("tutorial-praise", setTutorialPraise);
    };
  }, []);


    return (
        <>
            <div id="phaserContainer" className="phaserContainer">
                {/* add overlays here */}
                <TutorialBanner step={tutorialStep} praise={tutorialPraise}
                    onPraiseEnd={() => setTutorialPraise(null)}
                    onButton={() => sceneRef.current?.scene.getScene("Tutorial").finish()}
                />
                <CoralPopup className="coralPopup"
                    coral={selectedCoral} 
                    onClose={() => {
                        setSelectedCoral(null);
                        // the tutorial has a coral to click too, so tell whichever scene is running
                        sceneRef.current?.scene.getScenes(true).forEach(scene => scene.closeCoralPopup?.());
                    }}
                />
            </div>
        </>
    )
}

export default TestGame;