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

function App() {
  const [temperatureValue, setTemperatureValue] = useState(0);
  const [lightLevel, setLightLevel] = useState(50);
  const [stressValue, setStressValue] = useState(0);
  const [timeAdvanced, setTimeAdvanced] = useState(0);

  const [bubbleCollision, setBubbleCollision] = useState(false);

  const [scene, setScene] = useState(null); // This ends up being an instance of our scene class
  const [simEnd, setSimEnd] = useState(false);

  const [showTitleScreen, setShowTitleScreen] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  const [sceneRunning, setSceneRunning] = useState(false);

  useEffect(() => {
    if (!scene) return;

    let frameId;

    const loop = () => {
      setTemperatureValue(scene.temperature)
      setStressValue(scene.stress)
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
    if (!bubbleCollision){
      scene.freeFish()
    }
  },[bubbleCollision])

  // Average Coral Reef Temperature is 22 - 29 Celcius
  // Rarely 20 - 32 Celcius
  // A temp range interval could be defined as [8,20) U [20,32] U (32,44]
  // https://naturefins.com/what-is-the-average-temperature-in-the-coral-reef-biome/

  const endSim = () => {
    scene.RestartSim();
    setSceneRunning(false);
    setSimTime('0');
  }

  return (
    <>
        {bubbleCollision ? <SimBubblePopUp type={scene.collisionType} onChange={setTemperatureValue} setCollision={setBubbleCollision}/> : null}
        {scene && !showTitleScreen ? <SimInfoDisplay timejump={timeAdvanced} light={lightLevel} temp={temperatureValue}/> : null}
        {showOptions ? <OptionsDialog setShowOptions={setShowOptions} setShowTitleScreen={setShowTitleScreen} endSim={endSim} setScene={setScene}/> : null}
        {showTitleScreen ? <TitleScreen setShowTitleScreen={setShowTitleScreen}/> : (
        <>
        <main className="MainContent">
        {scene ? <button className="OptionsButtonIcon" onClick={(()=>setShowOptions(true))}>⚙️</button> : null}
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
