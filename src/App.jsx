import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Route, Routes, useLocation, useNavigate } from "react-router";
import About from "./components/About.jsx";
import GoalReminder from "./components/GoalReminder.jsx";
import Notices from "./components/Notices.jsx";
import OptionsDialog from "./components/OptionsDialog.jsx";
import { LiveSimInfoDisplay } from "./components/SimInfoDisplay.jsx";
import TitleScreen from "./components/TitleScreen.jsx";
import { asset } from "./assetUrl.js";
import { GAME_EVENTS, SCENE_KEYS } from "./game/gameEvents.js";
import {
    getEffectiveVolumes,
    loadAudioSettings,
    loadControlScheme,
    loadOceanSounds,
    saveAudioSettings,
    saveControlScheme,
    saveOceanSounds,
} from "./settings.js";
import "./styles/App.css";
// The lazy-loaded components' styles (below) are in the main stylesheet too, so they're there from the start rather
// than arriving with their component
import "./styles/PhaserGame.css";
import "./styles/CoralPopup.css";
import "./styles/TutorialBanner.css";
import "./styles/SimEndPopup.css";
import "./styles/HistoryChart.css";

// Phaser and every scene (about 340 KB gzipped) and Chart.js are fetched separately, so the title screen doesn't
// have to wait for them. The game is fetched as soon as the title is up; the charts when a game ends.
const PhaserGame = lazy(() => import("./components/PhaserGame.jsx"));
const SimEndPopup = lazy(() => import("./components/SimEndPopup.jsx"));

const MAX_TOASTS = 3;

function App() {
    const location = useLocation();
    const navigate = useNavigate();
    const isAboutPage = location.pathname === "/about";

    // The Phaser scene that's running: the tutorial or the main game. Its settings and the notices go to it.
    const [scene, setScene] = useState(null);
    const inTutorial = scene?.scene.key === SCENE_KEYS.tutorial;
    // The numbers that change all through a game go straight to the HUD (LiveSimInfoDisplay), so this component,
    // and everything under it, is only drawn again when something here changes: a notice, a menu, the game ending.
    const [simEnd, setSimEnd] = useState(false);
    const [result, setResult] = useState(null); // the scene's last stats, for the end screen

    const [showTitleScreen, setShowTitleScreen] = useState(true);
    const [hasStartedGame, setHasStartedGame] = useState(false);
    // The game is put on the page, hidden, while the title screen is still showing, so its code and assets download
    // while the player reads the title. It waits on its loading scene until Start is pressed (hasStartedGame).
    const [gameMounted, setGameMounted] = useState(false);

    // Saved in the browser (settings.js)
    const [audio, setAudio] = useState(loadAudioSettings);
    const [controlScheme, setControlScheme] = useState(loadControlScheme);
    const [oceanSounds, setOceanSounds] = useState(loadOceanSounds);
    const [showOptions, setShowOptions] = useState(false);

    // Notices come in two lanes (see Notices.jsx). banners[0] is the one showing; the rest wait their turn.
    const [banners, setBanners] = useState([]);
    const [toasts, setToasts] = useState([]);
    const noticeCount = useRef(0);
    const [showGoal, setShowGoal] = useState(false);
    // The space under the tutorial's lesson banner, where the notices go during the tutorial (set by TutorialBanner)
    const [tutorialNoticeSlot, setTutorialNoticeSlot] = useState(null);

    const skipSceneResume = useRef(false);
    const resumeAfterAbout = useRef(false);
    // Set by goToResources below, so the About page knows there's a game to go back to
    const aboutBackLabel = location.state?.fromGame ? "Resume Game" : "Back to Title";

    // changes: the settings that change, or a function that works them out from the current ones
    const changeAudio = (changes) =>
        setAudio((current) => ({ ...current, ...(typeof changes === "function" ? changes(current) : changes) }));

    const changeOceanSounds = (enabled) => {
        setOceanSounds(enabled);
        saveOceanSounds(enabled);
    };

    const changeControlScheme = (scheme) => {
        setControlScheme(scheme);
        saveControlScheme(scheme);
    };

    const clearNotices = () => {
        setBanners([]);
        setToasts([]);
    };

    // A notice timed out or was closed. A tutorial lesson waiting on its notice moves on either way.
    const closeNotice = useCallback(
        (key, advanceTutorial = false) => {
            setBanners((list) => list.filter((notice) => notice.key !== key));
            setToasts((list) => list.filter((notice) => notice.key !== key));
            if (advanceTutorial) scene?.onLessonNoticeClosed?.();
        },
        [scene],
    );

    const hideGoal = useCallback(() => setShowGoal(false), []);

    useEffect(() => {
        // Not on the About page, which may be all the visitor came for, or when they've asked the browser to save data
        if (gameMounted || isAboutPage || navigator.connection?.saveData) return;

        // Once the browser is idle, so the title screen's own files and first paint come first
        const mountGame = () => setGameMounted(true);
        if (window.requestIdleCallback) {
            const id = window.requestIdleCallback(mountGame, { timeout: 2000 });
            return () => window.cancelIdleCallback(id);
        }
        const id = window.setTimeout(mountGame, 300);
        return () => window.clearTimeout(id);
    }, [gameMounted, isAboutPage]);

    useEffect(() => {
        saveAudioSettings(audio);
        if (!scene) return;

        const { music, sfx } = getEffectiveVolumes(audio);
        scene.setMusicVolume?.(music);
        scene.setSfxVolume?.(sfx);
    }, [scene, audio]);

    useEffect(() => {
        scene?.setOceanSounds?.(oceanSounds);
    }, [scene, oceanSounds]);

    useEffect(() => {
        scene?.setControlScheme?.(controlScheme);
    }, [scene, controlScheme]);

    // The scene sends "stats-changed" whenever one of these values changes, so React only updates when something happens
    useEffect(() => {
        if (!scene) return;

        const events = scene.game.events; // kept so cleanup still works after the game is destroyed
        const onStats = (stats) => {
            setSimEnd(stats.simEnd); // React skips the redraw when this hasn't changed, which is nearly always
            // Nothing left over from the game should sit on top of the end screen
            if (stats.simEnd) {
                setResult(stats);
                setBanners([]);
                setToasts([]);
                setShowGoal(false);
            }
        };

        const nextKey = () => ++noticeCount.current;

        // Things that happen to the fish: stacked top right, newest last, the oldest dropped when there are too many
        const addToast = (notice) => {
            const toast = { ...notice, key: nextKey() };
            setToasts((list) => [...list, toast].slice(-MAX_TOASTS));
        };

        // The state of the reef: one banner at a time. The bleaching alert goes to the front of the queue, since it
        // opens the summer the others are about. A notice with an id replaces the one with the same id, and a new
        // plain warning replaces older plain warnings, which it has made out of date.
        const onReefWarning = (notice) => {
            const banner = { ...notice, key: nextKey() };
            setBanners((list) => {
                const others = list.filter((old) => (notice.id ? old.id !== notice.id : Boolean(old.id)));
                return notice.bleaching ? [banner, ...others] : [...others, banner];
            });
        };

        const onReefWarningCleared = (id) => {
            setBanners((list) => list.filter((notice) => notice.id !== id));
        };

        const onPredatorAppeared = () =>
            addToast({
                title: "Predator Alert",
                message: "A predator has appeared in the reef! Press E at your nest to hide.",
                warning: true,
            });

        const onPredatorLeft = () =>
            addToast({
                title: "All Clear",
                message: "The predator has left. You can come out now!",
                good: true,
            });

        const onGoalReminder = () => setShowGoal(true);

        const listeners = {
            [GAME_EVENTS.statsChanged]: onStats,
            [GAME_EVENTS.randomEvent]: addToast,
            [GAME_EVENTS.reefWarning]: onReefWarning,
            [GAME_EVENTS.reefWarningCleared]: onReefWarningCleared,
            [GAME_EVENTS.predatorAppeared]: onPredatorAppeared,
            [GAME_EVENTS.predatorLeft]: onPredatorLeft,
            [GAME_EVENTS.goalReminder]: onGoalReminder,
        };
        for (const [event, listener] of Object.entries(listeners)) events.on(event, listener);
        return () => {
            for (const [event, listener] of Object.entries(listeners)) events.off(event, listener);
        };
    }, [scene]);

    // Pause the game behind the Options dialog: movement, tweens, timers and clicks all stop until it closes.
    useEffect(() => {
        if (!scene || !showOptions) return;

        scene.scene.pause();

        return () => {
            if (skipSceneResume.current) {
                skipSceneResume.current = false;
                return;
            }

            // Some menu actions intentionally keep the scene paused or queue a scene switch while closing Options.
            if (!scene.sys?.isPaused()) return;
            scene.scene.resume();
        };
    }, [scene, showOptions]);

    // Phaser blocks the arrow keys, Space, Shift and WASD on the whole page while playing. Let them through while a
    // dialog with sliders or buttons is open, so it works from the keyboard (arrows move sliders, Space presses buttons).
    const keyboardDialogOpen = showOptions || simEnd;
    useEffect(() => {
        if (!scene || !keyboardDialogOpen) return;

        const keyboard = scene.input.keyboard;
        keyboard.disableGlobalCapture();

        return () => {
            // the keyboard has no manager once the game has been destroyed (Return to Title / Resources)
            if (keyboard.manager) keyboard.enableGlobalCapture();
        };
    }, [scene, keyboardDialogOpen]);

    // Escape opens and closes Options, and M mutes or unmutes everything
    useEffect(() => {
        if (!scene || showTitleScreen || simEnd) return;

        const handleKeyDown = (event) => {
            if (event.repeat) return;

            if (event.key === "Escape") {
                setShowOptions((isOpen) => !isOpen);
                return;
            }

            if (event.key.toLowerCase() !== "m") return;
            const target = event.target;
            if (
                target instanceof HTMLElement &&
                (target.isContentEditable || target.matches("input:not([type='range']), textarea, select"))
            ) {
                return;
            }

            const muteAll = !(audio.musicMuted && audio.sfxMuted);
            setAudio((current) => ({ ...current, musicMuted: muteAll, sfxMuted: muteAll }));
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [scene, showTitleScreen, simEnd, audio.musicMuted, audio.sfxMuted]);

    // Coming back from the Resources page carries on with the game that was paused to visit it
    useEffect(() => {
        if (isAboutPage || !resumeAfterAbout.current) return;

        resumeAfterAbout.current = false;
        if (scene?.sys?.isPaused()) scene.scene.resume();
    }, [isAboutPage, scene]);

    // Puts the React side back to a fresh game. Return to Title keeps the scene; this is for a new game or leaving
    // for Resources.
    const resetSimState = () => {
        setSimEnd(false);
        setResult(null);
        setShowGoal(false);
        clearNotices();
    };

    // "Play Again" on the end screen: the game keeps running, so restart the scene as well
    const playAgain = () => {
        scene.restartSim();
        resetSimState();
    };

    const goToTutorial = () => {
        if (!scene) return;

        skipSceneResume.current = true;
        setShowOptions(false);
        resetSimState();
        scene.scene.start(SCENE_KEYS.tutorial);
    };

    const returnToTitle = () => {
        skipSceneResume.current = true;
        setShowOptions(false);
        setShowTitleScreen(true);
    };

    const resumeGame = () => {
        if (scene?.sys?.isPaused()) scene.scene.resume();
        setShowTitleScreen(false);
    };

    const startNewGame = () => {
        resetSimState();
        setShowTitleScreen(false);
        if (scene) {
            scene.scene.start(SCENE_KEYS.tutorial);
        } else {
            setGameMounted(true);
            setHasStartedGame(true);
        }
    };

    const goToResources = () => {
        skipSceneResume.current = true;
        resumeAfterAbout.current = true;
        setShowOptions(false);
        navigate("/about#resources", { state: { fromGame: true } });
    };

    // In the tutorial the notices sit under the lesson banner, inside the game, however tall the banner is
    const noticeSlot = inTutorial ? tutorialNoticeSlot : null;
    const notices = <Notices banners={banners} toasts={toasts} inSlot={Boolean(noticeSlot)} onClose={closeNotice} />;
    const playing = !showTitleScreen && Boolean(scene);

    return (
        <>
            <Routes>
                <Route
                    path="/"
                    element={
                        <>
                            {playing && simEnd && result ? (
                                <Suspense fallback={null}>
                                    <SimEndPopup
                                        history={result.history}
                                        corals={result.corals}
                                        yearsElapsed={result.yearsElapsed}
                                        reefDead={result.reefDead}
                                        fishDead={result.fishDead}
                                        onPlayAgain={playAgain}
                                    />
                                </Suspense>
                            ) : null}
                            {!showTitleScreen ? (noticeSlot ? createPortal(notices, noticeSlot) : notices) : null}
                            {playing && showGoal && !simEnd ? <GoalReminder onDone={hideGoal} /> : null}
                            {playing && !inTutorial ? <LiveSimInfoDisplay scene={scene} /> : null}
                            {showOptions ? (
                                <OptionsDialog
                                    onClose={() => setShowOptions(false)}
                                    onGoToTutorial={goToTutorial}
                                    onReturnToTitle={returnToTitle}
                                    onGoToResources={goToResources}
                                    audio={audio}
                                    onAudioChange={changeAudio}
                                    oceanSounds={oceanSounds}
                                    onOceanSoundsChange={changeOceanSounds}
                                    controlScheme={controlScheme}
                                    onControlSchemeChange={changeControlScheme}
                                />
                            ) : null}
                            {showTitleScreen ? (
                                <TitleScreen
                                    hasExistingGame={hasStartedGame && Boolean(scene)}
                                    onStartNewGame={startNewGame}
                                    onResume={resumeGame}
                                />
                            ) : null}
                        </>
                    }
                />
                <Route path="/about" element={<About backLabel={aboutBackLabel} />} />
            </Routes>
            {gameMounted ? (
                <main
                    className="MainContent"
                    style={{ visibility: isAboutPage || showTitleScreen ? "hidden" : "visible" }}
                    aria-hidden={isAboutPage || showTitleScreen}
                >
                    {playing ? (
                        <button
                            type="button"
                            className="SettingsButton"
                            aria-label="Open settings"
                            onClick={() => setShowOptions(true)}
                        >
                            <img src={asset("settings.svg")} alt="" width="45" height="45" />
                        </button>
                    ) : null}
                    <div className="GameContainer">
                        <Suspense
                            fallback={
                                <p className="GameLoading" role="status">
                                    Loading…
                                </p>
                            }
                        >
                            <PhaserGame
                                started={hasStartedGame}
                                onSceneReady={setScene}
                                onNoticeSlotChange={setTutorialNoticeSlot}
                            />
                        </Suspense>
                    </div>
                </main>
            ) : null}
        </>
    );
}

export default App;
