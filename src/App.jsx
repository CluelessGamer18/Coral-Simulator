import { useState, useEffect } from 'react'
import './styles/App.css'

import RangeSlider from './RangeSlider.jsx'
import ToggleBox from './ToggleBox.jsx'
import TestGame from './TestGame.jsx'
import TitleScreen from "./TitleScreen/TitleScreen.jsx"
import OptionsDialog from './TitleScreen/OptionsDialog.jsx'
import SimInfoDisplay from './SimInfoDisplay.jsx'
import SimBubblePopUp from './SimBubblePopUp.jsx'
import SimEndPopUp from './SimEndPopUp.jsx'
import SimTutorial from './SimTutorial.jsx'

import { Routes, Route } from 'react-router'
import About from './About.jsx'
import { asset } from './assetUrl';

const EMPTY_HISTORY = { stress: [], temp: [], light: [], poll: [] };

function App() {
  const [temperatureValue, setTemperatureValue] = useState(27);
  const [lightValue, setLightValue] = useState(500);
  const [pollutionValue, setPollutionValue] = useState(1);
  const [stressValue, setStressValue] = useState(0);
  const [timeAdvanced, setTimeAdvanced] = useState(0);

  const [bubbleCollision, setBubbleCollision] = useState(false);
  const [collisionType, setCollisionType] = useState("None");
  const [score, setScore] = useState(0);

  const [scene, setScene] = useState(null); // This ends up being an instance of our scene class
  const [simEnd, setSimEnd] = useState(false);
  const [reefDead, setReefDead] = useState(false);
  const [history, setHistory] = useState(EMPTY_HISTORY);

  const [showTitleScreen, setShowTitleScreen] = useState(true);

  const [musicVolume, setMusicVolume] = useState(0.5);
  const [sfxVolume, setSfxVolume] = useState(1.0);
  const [showOptions, setShowOptions] = useState(false);

  const [showTutorial, setShowTutorial] = useState(true);
  const [eventNotice, setEventNotice] = useState(null);


  let initialValue;
  if (scene){
    switch (collisionType) {
      case "temp":
        initialValue = temperatureValue;
        break;

      case "light":
        initialValue = lightValue;
        break;

      case "poll":
        initialValue = pollutionValue;
        break;
    }
  }

  // Called by the bubble popup's Apply button. The scene emits "stats-changed" afterwards,
  // which updates the values and closes the popup.
  const applyBubble = (value) => {
    const type = scene.collisionType;
    if (type === 'temp') {
      scene.updateTemperature(value);
    } else if (type === 'light') {
      scene.updateLight(value);
    } else if (type === 'poll') {
      scene.updatePollution(value);
    }
    scene.freeFish(false);
  };

  // Called by the bubble popup's Cancel button: frees the fish and puts the bubble back
  const cancelBubble = () => {
    scene.freeFish(true);
  };

  const dismissEventNotice = () => {
    setEventNotice(null);
  };

  useEffect(() => {
    if (!eventNotice) return;

    const timeoutId = window.setTimeout(() => {
      setEventNotice(null);
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [eventNotice]);

 
  useEffect(() => {
    if (!scene) return;

    scene.setMusicVolume?.(musicVolume);
    scene.setSfxVolume?.(sfxVolume);
  }, [scene, musicVolume, sfxVolume]);

  // The scene sends "stats-changed" whenever one of these values changes, so React only updates when something happens
  useEffect(() => {
    if (!scene) return;

    const events = scene.game.events; // kept so cleanup still works after the game is destroyed
    const onStats = (stats) => {
      setStressValue(stats.stress)
      setLightValue(stats.light)
      setTemperatureValue(stats.temperature)
      setPollutionValue(stats.pollution)
      setTimeAdvanced(stats.timeJump)
      setBubbleCollision(stats.bubbleCollision)
      setCollisionType(stats.collisionType)
      setSimEnd(stats.simEnd)
      setReefDead(stats.reefDead)
      setScore(stats.score)
      setHistory(stats.history)
    };

    // The scene sends the selected event's title and message when the event bubble is collected.
    const onRandomEvent = ({ title, message }) => {
      setEventNotice({ title, message });
    };

    const onPredatorAppeared = () => {
      setEventNotice({
        title: 'Predator Alert',
        message: 'A predator has appeared in the reef!',
      });
    };

    events.on("stats-changed", onStats);
    events.on("random-event", onRandomEvent);
    events.on("predator-appeared", onPredatorAppeared);
    return () => {
      events.off("stats-changed", onStats);
      events.off("random-event", onRandomEvent);
      events.off("predator-appeared", onPredatorAppeared);
    };
  }, [scene]);

  useEffect(() => {
    if (!scene) {return}
    if(!showTutorial){scene.unlockFish()}
  }, [scene, showTutorial])

  // Pause the game behind the Options dialog: movement, tweens, timers and clicks all stop until it closes.
  useEffect(() => {
    if (!scene || !showOptions) return;

    scene.scene.pause();

    return () => {
      // "Return to Title" closes the dialog while the game is being torn down, so skip a scene that is no longer paused or already destroyed.
      // Resuming one that is about to be destroyed is harmless: Phaser destroys the game before the scene's next update.
      if (!scene.sys?.isPaused()) return;
      scene.scene.resume();
    };
  }, [scene, showOptions]);

  // Phaser blocks the arrow keys, Space, Shift and WASD on the whole page while playing. Let them through while a
  // dialog with sliders or buttons is open, so it works from the keyboard (arrows move sliders, Space presses buttons).
  const keyboardDialogOpen = showOptions || bubbleCollision || simEnd || showTutorial;
  useEffect(() => {
    if (!scene || !keyboardDialogOpen) return;

    const keyboard = scene.input.keyboard;
    keyboard.disableGlobalCapture();

    return () => {
      // the keyboard has no manager once the game has been destroyed (Return to Title / Resources)
      if (keyboard.manager) keyboard.enableGlobalCapture();
    };
  }, [scene, keyboardDialogOpen]);

  // Puts the React side back to a fresh sim. Leaving the game (Return to Title / Resources) only needs this,
  // because TestGame unmounts and destroys the whole Phaser game, so there is no scene left to restart.
  const resetSimState = () => {
    setTemperatureValue(27);
    setLightValue(500);
    setPollutionValue(1);
    setStressValue(0);
    setTimeAdvanced(0);
    setBubbleCollision(false);
    setSimEnd(false);
    setReefDead(false);
    setScore(0);
    setHistory(EMPTY_HISTORY);
    setEventNotice(null);
  }

  // "Restart Sim" on the end screen: the game keeps running, so restart the scene as well
  const endSim = () => {
    scene.RestartSim();
    resetSimState();
  }

  return (
  <Routes>
    <Route path="/" element={
      <>
        {/*<RangeSlider onChange={setStressValue}/>*/}
        {scene && simEnd ? (
          <SimEndPopUp stress={history.stress}
            temp={history.temp}
            light={history.light}
            poll={history.poll}
            onClose={endSim}
            dead={reefDead}
          ></SimEndPopUp>) : null}
        {scene && !showTitleScreen && showTutorial ? <SimTutorial closeTutorial={() => setShowTutorial(false)}/>:null}
        {eventNotice ? (
          <aside className="EventNotice" role="status" aria-live="polite" aria-labelledby="event-notice-title">
              <div className="EventNoticeHeading">
              <h2 id="event-notice-title">{eventNotice.title}</h2>
              <button type="button" onClick={dismissEventNotice} aria-label="Dismiss event notification">Close</button>
              </div>
              <p>{eventNotice.message}</p>
          </aside>
        ) : null}
        {scene && bubbleCollision ? <SimBubblePopUp key={collisionType} type={collisionType}
        initialValue={initialValue}
        onApply={applyBubble}
        onCancel={cancelBubble} /> : null}
        {scene && !showTitleScreen  ? <SimInfoDisplay timejump={timeAdvanced} light={lightValue} temp={temperatureValue} stress={stressValue} poll={pollutionValue} score={score}/> : null}
        {showOptions ? <OptionsDialog
          setShowOptions={setShowOptions}
          setShowTitleScreen={setShowTitleScreen}
          resetSimState={resetSimState}
          setScene={setScene}
          scene={scene}
          musicVolume={musicVolume}
          setMusicVolume={setMusicVolume}
          sfxVolume={sfxVolume}
          setSfxVolume={setSfxVolume}
        /> : null}
        {showTitleScreen ? <TitleScreen setShowTitleScreen={setShowTitleScreen}/> : (
        <>
        <main className="MainContent">
        {scene ? <button className="OptionsButtonIcon" aria-label="Open settings" onClick={(()=>setShowOptions(true))}><img src={asset("settings.svg")} alt="" width="45" height="45"></img>
        </button> : null}
          <div className="GameContainer">
              <TestGame onSceneReady={setScene} />
          </div>
      </main>

      </>
    )}

    </>
    } />

    <Route path="/about" element={<About/>} />
  </Routes>
)

}

export default App
