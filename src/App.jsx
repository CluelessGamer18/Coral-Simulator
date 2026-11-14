import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import { createPortal } from 'react-dom'
import './styles/App.css'

// The game's and the end screen's styles stay in the main stylesheet, in the order they've always had, so that
// loading those components later (see below) doesn't change which rule wins where stylesheets overlap
import './styles/TestScene.css'
import './styles/CoralPopup.css'
import './styles/TutorialBanner.css'
import TitleScreen from "./TitleScreen/TitleScreen.jsx"
import OptionsDialog from './TitleScreen/OptionsDialog.jsx'
import { LiveSimInfoDisplay } from './SimInfoDisplay.jsx'
import './styles/SimEndPopUp.css'
import Notices from './Notices.jsx'
import GoalReminder from './GoalReminder.jsx'

import { Routes, Route, useLocation, useNavigate } from 'react-router'
import About from './About.jsx'
import { asset } from './assetUrl';
import { loadControlScheme, saveControlScheme } from './controlScheme';
import { loadOceanSounds, saveOceanSounds } from './oceanSoundsSetting';
import { loadAudioSettings, saveAudioSettings } from './audioSettings';

// Phaser and every scene (about 340 KB gzipped) and Chart.js are fetched separately, so the title screen doesn't
// have to wait for them. The game is fetched as soon as the title is up; the charts when a game ends.
const loadGame = () => import('./TestGame.jsx');
const TestGame = lazy(loadGame);
const SimEndPopUp = lazy(() => import('./SimEndPopUp.jsx'));

const MAX_TOASTS = 3;

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const isAboutPage = location.pathname === "/about";
  const [scene, setScene] = useState(null); // This ends up being an instance of our scene class
  const inTutorial = scene?.scene.key === "Tutorial"; // the tutorial scene only shares the settings button with the main game
  // The numbers that change all through a game go straight to the HUD (LiveSimInfoDisplay), so this component,
  // and everything under it, is only drawn again when something here changes: a notice, a menu, the game ending.
  const [simEnd, setSimEnd] = useState(false);
  const [result, setResult] = useState(null); // the scene's last stats, for the end screen

  const [showTitleScreen, setShowTitleScreen] = useState(true);
  const [hasStartedGame, setHasStartedGame] = useState(false);
  // The game is put on the page, hidden, while the title screen is still showing, so its code and assets download
  // while the player reads the title. It waits on its loading scene until Start is pressed (hasStartedGame).
  const [gameMounted, setGameMounted] = useState(false);

  // Saved in the browser, like the two settings below (audioSettings.js)
  const [savedAudio] = useState(loadAudioSettings);
  const [musicVolume, setMusicVolume] = useState(savedAudio.musicVolume);
  const [sfxVolume, setSfxVolume] = useState(savedAudio.sfxVolume);
  const [musicMuted, setMusicMuted] = useState(savedAudio.musicMuted);
  const [sfxMuted, setSfxMuted] = useState(savedAudio.sfxMuted);
  const [showOptions, setShowOptions] = useState(false);
  const [controlScheme, setControlScheme] = useState(loadControlScheme);
  const [oceanSounds, setOceanSounds] = useState(loadOceanSounds);

  // Notices come in two lanes (see Notices.jsx). banners[0] is the one showing; the rest wait their turn.
  const [banners, setBanners] = useState([]);
  const [toasts, setToasts] = useState([]);
  const noticeCount = useRef(0);
  const [showGoal, setShowGoal] = useState(false);

  const skipSceneResume = useRef(false);
  const resumeAfterAbout = useRef(false);
  // Set by goToResources below, so the About page knows there's a game to go back to
  const aboutBackLabel = location.state?.fromGame ? "Resume Game" : "Back to Title";

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

  // A notice timed out, or the player clicked its Close button (which the tutorial's lessons wait for)
  const closeNotice = useCallback((key, byPlayer) => {
    setBanners((list) => list.filter((notice) => notice.key !== key));
    setToasts((list) => list.filter((notice) => notice.key !== key));
    if (byPlayer) scene?.eventNoticeClosed?.();
  }, [scene]);

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
    saveAudioSettings({ musicVolume, sfxVolume, musicMuted, sfxMuted });
    if (!scene) return;

    scene.setMusicVolume?.(musicMuted ? 0 : musicVolume);
    scene.setSfxVolume?.(sfxMuted ? 0 : sfxVolume);
  }, [scene, musicVolume, musicMuted, sfxVolume, sfxMuted]);

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
      setSimEnd(stats.simEnd) // React skips the redraw when this hasn't changed, which is nearly always
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
        const others = list.filter((old) => notice.id ? old.id !== notice.id : Boolean(old.id));
        return notice.bleaching ? [banner, ...others] : [...others, banner];
      });
    };

    const onReefWarningCleared = (id) => {
      setBanners((list) => list.filter((notice) => notice.id !== id));
    };

    const onPredatorAppeared = () => addToast({
      title: 'Predator Alert',
      message: 'A predator has appeared in the reef! Press E at your nest to hide.',
      warning: true,
    });

    const onPredatorLeft = () => addToast({
      title: 'All Clear',
      message: 'The predator has left. You can come out now!',
      good: true,
    });

    const onGoalReminder = () => setShowGoal(true);

    events.on("stats-changed", onStats);
    events.on("random-event", addToast);
    events.on("reef-warning", onReefWarning);
    events.on("reef-warning-cleared", onReefWarningCleared);
    events.on("predator-appeared", onPredatorAppeared);
    events.on("predator-left", onPredatorLeft);
    events.on("goal-reminder", onGoalReminder);
    return () => {
      events.off("stats-changed", onStats);
      events.off("random-event", addToast);
      events.off("reef-warning", onReefWarning);
      events.off("reef-warning-cleared", onReefWarningCleared);
      events.off("predator-appeared", onPredatorAppeared);
      events.off("predator-left", onPredatorLeft);
      events.off("goal-reminder", onGoalReminder);
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
      ) return;

      const muteAll = !(musicMuted && sfxMuted);
      setMusicMuted(muteAll);
      setSfxMuted(muteAll);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [scene, showTitleScreen, simEnd, musicMuted, sfxMuted]);

  // Coming back from the Resources page carries on with the game that was paused to visit it
  useEffect(() => {
    if (isAboutPage || !resumeAfterAbout.current) return;

    resumeAfterAbout.current = false;
    if (scene?.sys?.isPaused()) scene.scene.resume();
  }, [isAboutPage, scene]);

  // Puts the React side back to a fresh sim. Return to Title preserves the scene; this is for a new game or leaving for Resources.
  const resetSimState = () => {
    setSimEnd(false);
    setResult(null);
    setShowGoal(false);
    clearNotices();
  }

  // "Play Again" on the end screen: the game keeps running, so restart the scene as well
  const endSim = () => {
    scene.RestartSim();
    resetSimState();
  }

  const goToTutorial = () => {
    if (!scene) return;

    skipSceneResume.current = true;
    setShowOptions(false);
    resetSimState();
    scene.scene.start("Tutorial");
  }

  const returnToTitle = () => {
    skipSceneResume.current = true;
    setShowOptions(false);
    setShowTitleScreen(true);
  }

  const resumeGame = () => {
    if (scene?.sys?.isPaused()) scene.scene.resume();
    setShowTitleScreen(false);
  }

  const startNewGame = () => {
    resetSimState();
    setShowTitleScreen(false);
    if (scene) {
      scene.scene.start("Tutorial");
    } else {
      setGameMounted(true);
      setHasStartedGame(true);
    }
  }

  const goToResources = () => {
    skipSceneResume.current = true;
    resumeAfterAbout.current = true;
    setShowOptions(false);
    navigate("/about#resources", { state: { fromGame: true } });
  }

  // In the tutorial the notices sit under the banner, inside the game, however tall the banner is
  const tutorialNoticeSlot = inTutorial ? document.getElementById("tutorialNoticeSlot") : null;
  const notices = <Notices banners={banners} toasts={toasts} inSlot={Boolean(tutorialNoticeSlot)} onClose={closeNotice} />;
  const playing = !showTitleScreen && scene;

  return (
  <>
    <Routes>
      <Route path="/" element={
        <>
        {playing && simEnd && result ? (
          <Suspense fallback={null}>
            <SimEndPopUp
              history={result.history}
              corals={result.corals}
              yearsElapsed={result.yearsElapsed}
              onClose={endSim}
              dead={result.reefDead}
              fishDead={result.fishDead}
            />
          </Suspense>) : null}
        {!showTitleScreen ? (tutorialNoticeSlot ? createPortal(notices, tutorialNoticeSlot) : notices) : null}
        {playing && showGoal && !simEnd ? <GoalReminder onDone={hideGoal} /> : null}
        {playing && !inTutorial ? <LiveSimInfoDisplay scene={scene} /> : null}
        {showOptions ? <OptionsDialog
          setShowOptions={setShowOptions}
          goToTutorial={goToTutorial}
          returnToTitle={returnToTitle}
          goToResources={goToResources}
          musicVolume={musicVolume}
          setMusicVolume={setMusicVolume}
          musicMuted={musicMuted}
          setMusicMuted={setMusicMuted}
          sfxVolume={sfxVolume}
          setSfxVolume={setSfxVolume}
          sfxMuted={sfxMuted}
          setSfxMuted={setSfxMuted}
          oceanSounds={oceanSounds}
          setOceanSounds={changeOceanSounds}
          controlScheme={controlScheme}
          setControlScheme={changeControlScheme}
        /> : null}
        {showTitleScreen ? <TitleScreen
          hasExistingGame={hasStartedGame && !!scene}
          onStartNewGame={startNewGame}
          onResume={resumeGame}
        /> : null}

        </>
      } />

      <Route path="/about" element={<About backLabel={aboutBackLabel} />} />
    </Routes>
    {gameMounted ? (
      <main
        className="MainContent"
        style={{ visibility: isAboutPage || showTitleScreen ? "hidden" : "visible" }}
        aria-hidden={isAboutPage || showTitleScreen}
      >
        {playing ? (
          <button className="OptionsButtonIcon" aria-label="Open settings" onClick={() => setShowOptions(true)}>
            <img src={asset("settings.svg")} alt="" width="45" height="45" />
          </button>
        ) : null}
        <div className="GameContainer">
          <Suspense fallback={<p className="GameLoading" role="status">Loading…</p>}>
            <TestGame started={hasStartedGame} onSceneReady={setScene} />
          </Suspense>
        </div>
      </main>
    ) : null}
  </>
)

}

export default App
