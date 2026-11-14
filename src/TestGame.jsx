import {useRef, useEffect, useCallback} from "react";
import Phaser from "phaser";
import TestScene from "./scenes/TestScene.js";
import Boot from "./scenes/Boot.js";
import Preloader from "./scenes/Preloader.js";
import Tutorial from "./scenes/Tutorial.js";
import './styles/TestScene.css';
import { useState } from "react";
import CoralPopup from './CoralPopup.jsx';
import TutorialBanner from './TutorialBanner.jsx';
import ProblemScreen from './ProblemScreen.jsx';


// started is false while the game is loading behind the title screen, and true once the player has pressed Start
function TestGame({started, onSceneReady}){
    const sceneRef = useRef(null);
    const [selectedCoral, setSelectedCoral] = useState(null);
    const [tutorialStep, setTutorialStep] = useState(null);
    const [tutorialPraise, setTutorialPraise] = useState(null);
    const [problem, setProblem] = useState(null); // "load" or "graphics" when the game can't carry on

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
            backgroundColor: "#0292A5",
            render: { powerPreference: "high-performance" }, // on laptops with two graphics chips, ask for the fast one
            scale: { mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.NO_CENTER, // .GameContainer is already the canvas's exact size (App.css)
                
                width: 1440, height: 1024 }
            
        });

        sceneRef.current = sim;

    // A file that still won't load after the Preloader's retries, or the browser taking the graphics away
    // (it does this when the computer is short of graphics memory). Phaser gets the graphics back by itself
    // when the browser allows, so that message clears if it does.
    sim.events.on("game-problem", setProblem);
    sim.events.once(Phaser.Core.Events.READY, () => {
      sim.renderer.on?.(Phaser.Renderer.Events.LOSE_WEBGL, () => setProblem("graphics"));
      sim.renderer.on?.(Phaser.Renderer.Events.RESTORE_WEBGL, () => setProblem(null));
    });

    sim.events.on("scene-ready", (sceneInstance) => {
      setSelectedCoral(null);
      setTutorialPraise(null);
      onSceneReadyRef.current(sceneInstance);
    });

    return () => {
      sim.destroy(true);
      sceneRef.current = null;
    };
  }, []);


  // The loading scene (Preloader.js) holds the game there until this is set. It also stops the game's frame loop
  // once everything has loaded, so nothing is drawn behind the title screen; this starts it again.
  useEffect(() => {
    const sim = sceneRef.current;
    if (!sim) return;

    sim.registry.set("started", started);
    if (started) sim.loop.wake();
  }, [started]);

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


    const closeCoralPopup = useCallback(() => {
        setSelectedCoral(null);
        // the tutorial has a coral to click too, so tell whichever scene is running
        sceneRef.current?.scene.getScenes(true).forEach(scene => scene.closeCoralPopup?.());
    }, []);

    return (
        <>
            <div id="phaserContainer" className="phaserContainer">
                {/* add overlays here */}
                <TutorialBanner step={tutorialStep} praise={tutorialPraise}
                    onPraiseEnd={() => setTutorialPraise(null)}
                    onButton={() => sceneRef.current?.scene.getScene("Tutorial").finish()}
                />
                {problem === "load" ? <ProblemScreen title="The game couldn't finish loading" message="Some of its files didn't download. Check your internet connection, then try again." /> : null}
                {problem === "graphics" ? <ProblemScreen title="The graphics stopped" message="Your browser paused the game's graphics. Closing other tabs can help." /> : null}
                <CoralPopup className="coralPopup"
                    coral={selectedCoral} 
                    onClose={closeCoralPopup}
                />
            </div>
        </>
    )
}

export default TestGame;