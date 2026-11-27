import { useCallback, useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import CoralPopup from "./CoralPopup.jsx";
import ProblemScreen from "./ProblemScreen.jsx";
import TutorialBanner from "./TutorialBanner.jsx";
import Preloader from "../game/scenes/Preloader.js";
import ReefScene from "../game/scenes/ReefScene.js";
import Tutorial from "../game/scenes/Tutorial.js";
import { GAME_EVENTS, REGISTRY_KEYS, SCENE_KEYS } from "../game/gameEvents.js";
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from "../game/gameConfig.js";
import "../styles/PhaserGame.css";

// What the problem screen says when the game can't carry on
const PROBLEMS = {
    load: {
        title: "The game couldn't finish loading",
        message: "Some of its files didn't download. Check your internet connection, then try again.",
    },
    graphics: {
        title: "The graphics stopped",
        message: "Your browser paused the game's graphics. Closing other tabs can help.",
    },
};

/**
 * The Phaser game, and the React overlays that sit on it: the tutorial's banner, the coral popup and the problem
 * screen.
 * @param {object} props
 * @param {boolean} props.started false while the game loads behind the title screen, true once Start is pressed
 * @param {(scene: Phaser.Scene) => void} props.onSceneReady called with each scene as it starts
 * @param {(slot: HTMLElement | null) => void} props.onNoticeSlotChange given the space under the tutorial's banner,
 *   where App puts the notices during the tutorial
 */
function PhaserGame({ started, onSceneReady, onNoticeSlotChange }) {
    const containerRef = useRef(null);
    const gameRef = useRef(null);
    const [selectedCoral, setSelectedCoral] = useState(null);
    const [tutorialStep, setTutorialStep] = useState(null);
    const [tutorialPraise, setTutorialPraise] = useState(null);
    const [problem, setProblem] = useState(null); // a key of PROBLEMS when the game can't carry on

    // keep the latest onSceneReady without re-running the effect below, which would destroy and recreate the game
    const onSceneReadyRef = useRef(onSceneReady);
    useEffect(() => {
        onSceneReadyRef.current = onSceneReady;
    });

    useEffect(() => {
        if (gameRef.current) return;

        const game = new Phaser.Game({
            type: Phaser.AUTO,
            parent: containerRef.current,
            scene: [Preloader, Tutorial, ReefScene],
            backgroundColor: COLORS.brandTeal,
            render: { powerPreference: "high-performance" }, // on laptops with two graphics chips, ask for the fast one
            scale: {
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.NO_CENTER, // .GameContainer is already the canvas's exact size (App.css)
                width: GAME_WIDTH,
                height: GAME_HEIGHT,
            },
        });
        gameRef.current = game;

        // A file that still won't load after the Preloader's retries, or the browser taking the graphics away (it does
        // this when the computer is short of graphics memory). Phaser gets the graphics back by itself when the
        // browser allows, so that message clears if it does.
        game.events.on(GAME_EVENTS.gameProblem, setProblem);
        game.events.once(Phaser.Core.Events.READY, () => {
            game.renderer.on?.(Phaser.Renderer.Events.LOSE_WEBGL, () => setProblem("graphics"));
            game.renderer.on?.(Phaser.Renderer.Events.RESTORE_WEBGL, () => setProblem(null));
        });

        game.events.on(GAME_EVENTS.sceneReady, (scene) => {
            setSelectedCoral(null);
            setTutorialPraise(null);
            onSceneReadyRef.current(scene);
        });
        game.events.on(GAME_EVENTS.coralSelected, setSelectedCoral);
        game.events.on(GAME_EVENTS.tutorialStep, setTutorialStep);
        game.events.on(GAME_EVENTS.tutorialPraise, setTutorialPraise);

        // Destroying the game removes every listener above
        return () => {
            game.destroy(true);
            gameRef.current = null;
        };
    }, []);

    // The loading scene (Preloader.js) holds the game there until this is set. It also stops the game's frame loop
    // once everything has loaded, so nothing is drawn behind the title screen; this starts it again.
    useEffect(() => {
        const game = gameRef.current;
        if (!game) return;

        game.registry.set(REGISTRY_KEYS.started, started);
        if (started) game.loop.wake();
    }, [started]);

    const closeCoralPopup = useCallback(() => {
        setSelectedCoral(null);
        // the tutorial has a coral to click too, so tell whichever scene is running
        gameRef.current?.scene.getScenes(true).forEach((scene) => scene.closeCoralPopup?.());
    }, []);

    return (
        <div ref={containerRef} className="PhaserGame">
            <TutorialBanner
                step={tutorialStep}
                praise={tutorialPraise}
                onPraiseEnd={() => setTutorialPraise(null)}
                onButton={() => gameRef.current?.scene.getScene(SCENE_KEYS.tutorial).finish()}
                noticeSlotRef={onNoticeSlotChange}
            />
            {problem ? <ProblemScreen {...PROBLEMS[problem]} /> : null}
            <CoralPopup coral={selectedCoral} onClose={closeCoralPopup} />
        </div>
    );
}

export default PhaserGame;
