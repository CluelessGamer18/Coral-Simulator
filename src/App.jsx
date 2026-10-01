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

function App() {
  const [temperatureValue, setTemperatureValue] = useState(27);
  const [lightValue, setLightValue] = useState(500);
  const [pollutionValue, setPollutionValue] = useState(1);
  const [stressValue, setStressValue] = useState(0);
  const [timeAdvanced, setTimeAdvanced] = useState(0);

  const [bubbleCollision, setBubbleCollision] = useState(false);
  const [score, setScore] = useState(0);

  const [scene, setScene] = useState(null); // This ends up being an instance of our scene class
  const [simEnd, setSimEnd] = useState(false);

  const [showTitleScreen, setShowTitleScreen] = useState(true);

  const [musicVolume, setMusicVolume] = useState(0.5);
  const [sfxVolume, setSfxVolume] = useState(1.0);
  const [showOptions, setShowOptions] = useState(false);

  const [showTutorial, setShowTutorial] = useState(true);
  const [eventNotice, setEventNotice] = useState(null);


  let initialValue;
  if (scene){
    switch (scene.collisionType) {
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
      setSimEnd(stats.simEnd)
      setScore(stats.score)
    };

    // The scene sends "temp-event" when the fish pops the temperature event bubble
    const onTempEvent = ({ previousTemperature, newTemperature }) => {
      setEventNotice({
        title: 'Temperature Event',
        message: `The event raised the temperature from ${previousTemperature}°C to ${newTemperature}°C.\n\n
      This will increase the stress on the coral reef. Please adjust the temperature to mitigate the effects of this event.`,
      });
    };

    events.on("stats-changed", onStats);
    events.on("temp-event", onTempEvent);
    return () => {
      events.off("stats-changed", onStats);
      events.off("temp-event", onTempEvent);
    };
  }, [scene]);

  useEffect(() => {
    if (!scene) {return}
    if(!showTutorial){scene.unlockFish()}
  })

  const endSim = () => {
    scene.RestartSim();
    setTemperatureValue(27);
    setLightValue(500);
    setPollutionValue(1);
    setStressValue(0);
    setTimeAdvanced(0);
    setBubbleCollision(false);
    setSimEnd(false);
    setScore(0);
  }

  return (
  <Routes>
    <Route path="/" element={
      <>
        {/*<RangeSlider onChange={setStressValue}/>*/}
        {scene && simEnd && Array.isArray(scene.stressHistory) ? (
          <SimEndPopUp stress={scene.stressHistory}
            temp={scene.tempHistory}
            light={scene.lightHistory}
            poll={scene.pollutionHistory}
            onClose={endSim}
            dead={scene.reefDeadTemp || scene.reefDeadLight || scene.reefDeadPollution}
          ></SimEndPopUp>) : null}
        {scene && !showTitleScreen && showTutorial ? <SimTutorial closeTutorial={setShowTutorial}/>:null}
        {eventNotice ? (
          <aside className="EventNotice" role="status" aria-live="polite" aria-labelledby="event-notice-title">
              <div className="EventNoticeHeading">
              <h2 id="event-notice-title">{eventNotice.title}</h2>
              <button type="button" onClick={dismissEventNotice} aria-label="Dismiss event notification">Close</button>
              </div>
              <p>{eventNotice.message}</p>
          </aside>
        ) : null}
        {scene && bubbleCollision ? <SimBubblePopUp type={scene.collisionType} 
        initialValue={initialValue}
        onApply={applyBubble}
        onCancel={cancelBubble} /> : null}
        {scene && !showTitleScreen  ? <SimInfoDisplay timejump={timeAdvanced} light={lightValue} temp={temperatureValue} stress={stressValue} poll={pollutionValue} score={score}/> : null}
        {showOptions ? <OptionsDialog
          setShowOptions={setShowOptions}
          setShowTitleScreen={setShowTitleScreen}
          endSim={endSim}
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
