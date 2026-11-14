import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import { createPortal } from 'react-dom'
import './styles/App.css'

// The game's styles stay in the main stylesheet, so that loading its components later (see below) doesn't
// change which rule wins where stylesheets overlap
import './styles/TestScene.css'
import './styles/CoralPopup.css'
import './styles/TutorialBanner.css'
import TitleScreen from "./TitleScreen/TitleScreen.jsx"
import OptionsDialog from './TitleScreen/OptionsDialog.jsx'
import { LiveHud } from './Hud.jsx'
import Notices from './Notices.jsx'
import GoalReminder from './GoalReminder.jsx'
import TouchControls from './TouchControls.jsx'

import { Routes, Route, useLocation, useNavigate } from 'react-router'
import About from './About.jsx'
import { loadControlScheme, saveControlScheme } from './controlScheme';
import { loadOceanSounds, saveOceanSounds } from './oceanSoundsSetting';
import { loadAudioSettings, saveAudioSettings } from './audioSettings';
import { getSettings, saveSettings, loadBest, saveBest, TEXT_SIZES } from './settings';
import { getStars } from './reportGrade';

// Phaser and every scene (about 340 KB gzipped) and Chart.js are fetched separately, so the title screen doesn't
// have to wait for them. The game is fetched as soon as the title is up; the charts when a game ends.
const loadGame = () => import('./TestGame.jsx');
const TestGame = lazy(loadGame);
const loadReportCard = () => import('./ReportCard.jsx');
const ReportCard = lazy(loadReportCard);

const MAX_TOASTS = 3;
const LOG_LENGTH = 3;

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const isAboutPage = location.pathname === "/about";
  const [scene, setScene] = useState(null); // This ends up being an instance of our scene class
  const inTutorial = scene?.scene.key === "Tutorial";
  // The numbers that change all through a game go straight to the HUD (LiveHud), so this component,
  // and everything under it, is only drawn again when something here changes: a notice, a menu, the game ending.
  const [simEnd, setSimEnd] = useState(false);
  const [result, setResult] = useState(null); // the scene's last stats, for the report card

  const [showTitleScreen, setShowTitleScreen] = useState(true);
  const [hasStartedGame, setHasStartedGame] = useState(false);
  const [playTutorial, setPlayTutorial] = useState(false); // "Play tutorial" was chosen for the first start
  // The game is put on the page, hidden, while the title screen is still showing, so its code and assets download
  // while the player reads the title. It waits on its loading scene until Start is pressed (hasStartedGame).
  const [gameMounted, setGameMounted] = useState(false);

  // Saved in the browser, like the settings below (audioSettings.js)
  const [savedAudio] = useState(loadAudioSettings);
  const [musicVolume, setMusicVolume] = useState(savedAudio.musicVolume);
  const [sfxVolume, setSfxVolume] = useState(savedAudio.sfxVolume);
  const [musicMuted, setMusicMuted] = useState(savedAudio.musicMuted);
  const [sfxMuted, setSfxMuted] = useState(savedAudio.sfxMuted);
  const [showOptions, setShowOptions] = useState(false);
  const [controlScheme, setControlScheme] = useState(loadControlScheme);
  const [oceanSounds, setOceanSounds] = useState(loadOceanSounds);
  const [settings, setSettings] = useState(() => ({ ...getSettings() })); // accessibility and pace (settings.js)
  const [best, setBest] = useState(loadBest);

  // Notices come in two lanes (see Notices.jsx). banners[0] is the one showing; the rest wait their turn.
  // The last few of either kind are kept for the HUD's Log card.
  const [banners, setBanners] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [log, setLog] = useState([]);
  const noticeCount = useRef(0);
  const [showGoal, setShowGoal] = useState(false);

  const skipSceneResume = useRef(false);
  const resumeAfterAbout = useRef(false);
  // Set by goToResources below, so the About page knows there's a game to go back to
  const aboutBackLabel = location.state?.fromGame ? "Back to the game" : "Back to title";

  const changeOceanSounds = (enabled) => {
    setOceanSounds(enabled);
    saveOceanSounds(enabled);
  };

  const changeControlScheme = (scheme) => {
    setControlScheme(scheme);
    saveControlScheme(scheme);
  };

  // The scenes read the same saved settings when they need them (getSettings)
  const changeSettings = useCallback((changes) => setSettings({ ...saveSettings(changes) }), []);

  const allMuted = musicMuted && sfxMuted;
  const toggleMute = useCallback(() => {
    setMusicMuted(!allMuted);
    setSfxMuted(!allMuted);
  }, [allMuted]);

  const clearNotices = () => {
    setBanners([]);
    setToasts([]);
    setLog([]);
  };

  // A notice timed out, or the player clicked its Close button (which the tutorial's lessons wait for)
  const closeNotice = useCallback((key, byPlayer) => {
    setBanners((list) => list.filter((notice) => notice.key !== key));
    setToasts((list) => list.filter((notice) => notice.key !== key));
    if (byPlayer) scene?.eventNoticeClosed?.();
  }, [scene]);

  const hideGoal = useCallback(() => setShowGoal(false), []);

  // Text size, colours and motion apply to the whole page, so they go on the root element
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--text-scale", TEXT_SIZES[settings.textSize]);
    root.classList.toggle("colour-blind", settings.colourBlind);
    root.classList.toggle("reduce-motion", settings.reducedMotion);
  }, [settings]);

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

  // The scene's events. "stats-changed" arrives four times a second, but only the game ending matters here.
  useEffect(() => {
    if (!scene) return;

    const events = scene.game.events; // kept so cleanup still works after the game is destroyed
    const onStats = (stats) => {
      setSimEnd(Boolean(stats.simEnd)) // React skips the redraw when this hasn't changed, which is nearly always
      // Nothing left over from the game should sit on top of the report card
      if (stats.simEnd) {
        setResult(stats);
        setBanners([]);
        setToasts([]);
        setShowGoal(false);
        loadReportCard();
        // The best result is kept for the title screen
        if (stats.summary?.survived) {
          const { coralsAlive, coralsTotal } = stats.summary;
          saveBest({ alive: Math.round(coralsAlive / coralsTotal * 100), stars: getStars(stats.summary) });
          setBest(loadBest());
        }
      }
    };

    const nextKey = () => ++noticeCount.current;
    const addToLog = ({ key, title, message }) => setLog((list) => [{ key, title, message }, ...list].slice(0, LOG_LENGTH));

    // Things that happen to the fish: stacked top right, newest last, the oldest dropped when there are too many
    const addToast = (notice) => {
      const toast = { ...notice, key: nextKey() };
      setToasts((list) => [...list, toast].slice(-MAX_TOASTS));
      addToLog(toast);
    };

    // The state of the reef: one banner at a time. The card that opens a year goes to the front of the queue,
    // since the others are about the year it introduces. A notice with an id replaces the one with the same id.
    const onReefWarning = (notice) => {
      const banner = { ...notice, key: nextKey() };
      setBanners((list) => {
        const others = list.filter((old) => notice.id ? old.id !== notice.id : Boolean(old.id));
        return notice.card ? [banner, ...others.filter((old) => old.id !== "season")] : [...others, banner];
      });
      addToLog(banner);
    };

    const onReefWarningCleared = (id) => {
      setBanners((list) => list.filter((notice) => notice.id !== id || notice.card));
    };

    const onPredatorAppeared = () => addToast({
      title: 'Grouper!',
      message: 'Hide in your nest: swim there and press E. Follow the arrow.',
      warning: true,
    });

    const onPredatorLeft = () => addToast({
      title: 'All Clear',
      message: 'The grouper has gone. You can come out now.',
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
      // the keyboard has no manager once the game has been destroyed
      if (keyboard.manager) keyboard.enableGlobalCapture();
    };
  }, [scene, keyboardDialogOpen]);

  useEffect(() => {
    if (simEnd || isAboutPage) return;

    const handleKeyDown = (event) => {
      if (event.repeat) return;

      if (event.key === "Escape") {
        // On the title screen Escape only closes the settings; in the game it pauses and resumes
        setShowOptions((isOpen) => (showTitleScreen ? false : !isOpen));
        return;
      }

      if (event.key.toLowerCase() !== "m" || showTitleScreen) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || target.matches("input:not([type='range']), textarea, select"))
      ) return;
      toggleMute();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showTitleScreen, simEnd, isAboutPage, toggleMute]);

  // Coming back from the Resources page carries on with the game that was paused to visit it
  useEffect(() => {
    if (isAboutPage || !resumeAfterAbout.current) return;

    resumeAfterAbout.current = false;
    if (scene?.sys?.isPaused()) scene.scene.resume();
  }, [isAboutPage, scene]);

  // Puts the React side back to a fresh game
  const resetSimState = () => {
    setSimEnd(false);
    setResult(null);
    setShowGoal(false);
    clearNotices();
  }

  // "Play again" on the report card: the game keeps running, so restart the scene as well
  const playAgain = () => {
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

  // Start goes to the tutorial the first time, and straight to the game once it has been done (Preloader.js
  // makes the same choice when the game hasn't started yet)
  const startNewGame = (withTutorial) => {
    resetSimState();
    setShowTitleScreen(false);
    if (scene) {
      if (withTutorial || !getSettings().tutorialDone) scene.scene.start("Tutorial");
      else scene.scene.start("TestScene", { tutorialComplete: true });
    } else {
      setPlayTutorial(withTutorial);
      setGameMounted(true);
      setHasStartedGame(true);
    }
  }

  const goToResources = () => {
    skipSceneResume.current = true;
    resumeAfterAbout.current = !simEnd;
    setShowOptions(false);
    navigate("/about#resources", { state: { fromGame: true } });
  }

  // In the tutorial the notices sit under the banner, however tall the banner is
  const tutorialNoticeSlot = inTutorial ? document.getElementById("tutorialNoticeSlot") : null;
  const notices = <Notices banners={banners} toasts={toasts} inSlot={Boolean(tutorialNoticeSlot)} onClose={closeNotice} />;
  const playing = !showTitleScreen && scene;

  return (
  <>
    <Routes>
      <Route path="/" element={
        <>
        {playing && simEnd && result?.summary ? (
          <Suspense fallback={null}>
            <ReportCard result={result} onPlayAgain={playAgain} onResources={goToResources} />
          </Suspense>) : null}
        {showOptions ? <OptionsDialog
          inGame={Boolean(playing)}
          inTutorial={inTutorial}
          onClose={() => setShowOptions(false)}
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
          settings={settings}
          changeSettings={changeSettings}
        /> : null}
        {showTitleScreen ? <TitleScreen
          hasExistingGame={hasStartedGame && !!scene}
          tutorialDone={settings.tutorialDone || getSettings().tutorialDone}
          best={best}
          onStart={startNewGame}
          onResume={resumeGame}
          onOptions={() => setShowOptions(true)}
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
        <div className="Stage">
          {playing ? (
            <LiveHud
              key={scene.scene.key}
              scene={scene}
              inTutorial={inTutorial}
              log={log}
              controlScheme={controlScheme}
              onOpenOptions={() => setShowOptions(true)}
              muted={allMuted}
              onToggleMute={toggleMute}
              onSkipTutorial={() => scene.finish?.()}
            />
          ) : null}
          <div className="GameContainer">
            <Suspense fallback={<p className="GameLoading" role="status">Loading…</p>}>
              <TestGame started={hasStartedGame} playTutorial={playTutorial} onSceneReady={setScene} />
            </Suspense>
            {playing && !isAboutPage ? (tutorialNoticeSlot ? createPortal(notices, tutorialNoticeSlot) : notices) : null}
            {playing && showGoal && !simEnd ? <GoalReminder onDone={hideGoal} /> : null}
            {playing && !simEnd ? <TouchControls scene={scene} always={settings.touchButtons} /> : null}
          </div>
        </div>
      </main>
    ) : null}
  </>
)

}

export default App
