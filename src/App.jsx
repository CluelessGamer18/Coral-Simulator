import { useState, useEffect } from 'react'
import './styles/App.css'

import RangeSlider from './RangeSlider.jsx'
import ToggleBox from './ToggleBox.jsx'
import TestGame from './TestGame.jsx'
import StressChart from './StressChart.jsx'
import TitleScreen from "./TitleScreen/TitleScreen.jsx"
import OptionsDialog from './TitleScreen/OptionsDialog.jsx'
import SimInfoDisplay from './SimInfoDisplay.jsx'
import SimBubblePopUp from './SimBubblePopUp.jsx'
import SimTutorial from './SimTutorial.jsx'

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
  const [showOptions, setShowOptions] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const [sceneRunning, setSceneRunning] = useState(false);
  const [cancelled, setCancelled] = useState(false);

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

    let frameId;

    const loop = () => {
      //setStressValue(scene.stress)
      setLightValue(scene.lightLevel)
      setTemperatureValue(scene.temperature)
      setPollutionValue(scene.pollutionValue)
      setTimeAdvanced(scene.timeJump)
      setBubbleCollision(scene.bubbleCollision)
      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(frameId);
  }, [scene]);

  useEffect(() => {
    if (!scene) {return}
    scene.updateTemperature(temperatureValue);
  },[temperatureValue]);

  useEffect(() => {
    if (!scene) {return}
    scene.updatePollution(pollutionValue);
  },[pollutionValue]);

  useEffect(() => {
    if (!scene) {return}
    scene.updateLight(lightValue);
  },[lightValue]);

  useEffect(() => {
    if (!scene) {return}
    if (!bubbleCollision){
      scene.freeFish(cancelled)
    }
  },[bubbleCollision])

  const endSim = () => {
    scene.RestartSim();
    setSceneRunning(false);
  }

  return (
    <>
        {/*<RangeSlider onChange={setStressValue}/>*/}
        {scene && !showTitleScreen && showTutorial ? <SimTutorial closeTutorial={setShowTutorial}/>:null}
        {bubbleCollision ? <SimBubblePopUp type={scene.collisionType} 
        initialValue={initialValue}
        onChange={handler} 
        setCollision={setBubbleCollision} 
        setCancelled={setCancelled}/> : null}
        {scene && !showTitleScreen  ? <SimInfoDisplay timejump={timeAdvanced} light={lightValue} temp={temperatureValue} stress={stressValue} poll={pollutionValue}/> : null}
        {showOptions ? <OptionsDialog setShowOptions={setShowOptions} setShowTitleScreen={setShowTitleScreen} endSim={endSim} setScene={setScene}/> : null}
        {showTitleScreen ? <TitleScreen setShowTitleScreen={setShowTitleScreen}/> : (
        <>
        <main className="MainContent">
        {scene ? <button className="OptionsButtonIcon" onClick={(()=>setShowOptions(true))}><img src="/settings.svg" alt="Description of the image" width="45" height="45"></img>
</button> : null}
          <div className="GameContainer">
              <TestGame onSceneReady={setScene} />
          </div>
      </main>
        {simEnd ? (
          <div className="ChartContainer">
            <StressChart data={scene.stressData} />
          </div>
        ) : null}
      </>
    )}

    </>
  )
}

export default App
