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

import { Routes, Route } from 'react-router-dom'
import About from './About.jsx'

function App() {
  const [temperatureValue, setTemperatureValue] = useState(27);
  const [lightValue, setLightValue] = useState(500);
  const [pollutionValue, setPollutionValue] = useState(1);
  const [stressValue, setStressValue] = useState(0);
  const [timeAdvanced, setTimeAdvanced] = useState(0);

  const [bubbleCollision, setBubbleCollision] = useState(false);

  const [scene, setScene] = useState(null); // This ends up being an instance of our scene class
  const [simEnd, setSimEnd] = useState(false);

  const [showTitleScreen, setShowTitleScreen] = useState(true);

  const [musicVolume, setMusicVolume] = useState(0.5);
  const [sfxVolume, setSfxVolume] = useState(1.0);
  const [showOptions, setShowOptions] = useState(false);

  const [showTutorial, setShowTutorial] = useState(true);
  const [bubbleCancelled, setBubbleCancelled] = useState(false);


  let handler, initialValue;
  if (scene){
    switch (scene.collisionType) {
      case "temp":
        handler = setTemperatureValue;
        initialValue = temperatureValue;
        break;

      case "light":
        handler = setLightValue;
        initialValue = lightValue;
        break;

      case "poll":
        handler = setPollutionValue;
        initialValue = pollutionValue;
        break;
    }
  }
 
  useEffect(() => {
    if (!scene) return;

    scene.setMusicVolume?.(musicVolume);
    scene.setSfxVolume?.(sfxVolume);
  }, [scene, musicVolume, sfxVolume]);

  useEffect(() => {
    if (!scene) return;

    let frameId;

    const loop = () => {
      setStressValue(scene.stressValue)
      setLightValue(scene.lightLevel)
      setTemperatureValue(scene.temperature)
      setPollutionValue(scene.pollutionValue)
      setTimeAdvanced(scene.timeJump)
      setBubbleCollision(scene.bubbleCollision)
      setSimEnd(scene.simEnd)
      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(frameId);
  }, [scene]);

  useEffect(() => {
    if (!scene) {return}
    if(bubbleCancelled){
      setBubbleCancelled(false);
      scene.freeFish(bubbleCancelled) 
      return;
    }
    if (!bubbleCollision){
      const type = scene.collisionType;
      if(type === 'temp') {
        console.log("Type == Temp, Updating Temp")
        scene.updateTemperature(temperatureValue)
      } else if (type === 'light'){
        console.log("Type == Light, Updating Light")
        scene.updateLight(lightValue);
      } else if (type === 'poll'){
        console.log("Type == Pollution, Updating Pollution")
        scene.updatePollution(pollutionValue);
      }
      scene.freeFish(bubbleCancelled)
    }
  },[bubbleCollision])

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
        {scene && bubbleCollision ? <SimBubblePopUp type={scene.collisionType} 
        initialValue={initialValue}
        onChange={handler} 
        setCollision={setBubbleCollision} 
        setCancelled={setBubbleCancelled} /> : null}
        {scene && !showTitleScreen  ? <SimInfoDisplay timejump={timeAdvanced} light={lightValue} temp={temperatureValue} stress={stressValue} poll={pollutionValue}/> : null}
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
        {scene ? <button className="OptionsButtonIcon" onClick={(()=>setShowOptions(true))}><img src="/settings.svg" alt="Description of the image" width="45" height="45"></img>
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
