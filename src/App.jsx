import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

import RangeSlider from './RangeSlider.jsx'
import ToggleBox from './ToggleBox.jsx'
import TestGame from './TestGame.jsx'
import StressChart from './StressChart.jsx'

function App() {
  const [temperatureValue, setTemperatureValue] = useState(26);
  const [lightValue, setLightValue] = useState(50)
  const [pollutionValue, setPollutionValue] = useState(0);
  const [nutrientValue, setNutrientValue] = useState(1);
  const [coverageValue, setCoverageValue] = useState(0);

  const [boxValue, setBoxValue] = useState(false);

  const [scene, setScene] = useState(null); // This ends up being an instance of our scene class
  const [simStart, setSimStart] = useState(false);
  const [simEnd, setSimEnd] = useState(false);
  const [simTime, setSimTime] = useState('0');
  const [simStress, setSimStress] = useState(0);
  const [simStressRate, setSimStressRate] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(false);

  const array = [1,2,3,4,7,8,5,2,1,43,5,234,0]

  useEffect(() => {
    if(scene){
      scene.startTimer();
      scene.startRandomFishIdle();
      console.log("Simulation Started with time: " + scene.getSimTime())
      scene.updateStressRate();
      scene.startSim();
      const id = setInterval(() => {
      setSimTime(scene.getSimTime());
      setSimStress(scene.stress);
      setSimStressRate(scene.stressRate);
      }, 1000);
      return () => clearInterval(id); 
    }
  }, [simStart])

  useEffect(() => {
    if(scene){
      scene.lightLevel = lightValue;
      scene.coverageValue = coverageValue;
      scene.updateLightLevel();
      scene.updateStressRate();
    }
  },[lightValue, coverageValue])

  useEffect(() => {
    if(scene){
      scene.temperature = temperatureValue;
      scene.updateStressRate();
    }
  },[temperatureValue])

  useEffect(() => {
    if(scene){
      scene.pollutionValue = pollutionValue;
      scene.updatePollutionLevel();
      scene.updateStressRate();
    }
  },[pollutionValue])

  useEffect(() => {
    if(scene){
      scene.nutrientScalar = nutrientValue;
      scene.updateStressRate();
    }
  },[nutrientValue])
  // Average Coral Reef Temperature is 22 - 29 Celcius
  // Rarely 20 - 32 Celcius
  // A temp range interval could be defined as [8,20) U [20,32] U (32,44]
  // https://naturefins.com/what-is-the-average-temperature-in-the-coral-reef-biome/


  return (
    <>
      <div className="TopBar">
          <button className="DropDownToggle" onClick={(() => setControlsVisible(!controlsVisible))}>↕️</button>
          {!simStart ? (
          <button className="SimStartButton" onClick={(() => setSimStart(true))}>Start Simulation!</button>
          ): null}

          {simStart ? (
          <button className="SimEndButton" onClick={(() => setSimEnd(true))}>End Simulation!</button>
          ): null}
          <button className="SimTimer">Elapsed Time: {simTime}</button>

      </div>
    <TestGame onSceneReady={setScene}/>
      {controlsVisible ? ( 
        //Change to slider labels:
          <div className="SimSliders"> 
            <label className="SimControlText">Current Temperature: {temperatureValue}&deg; Celcius <RangeSlider min={8} max={44} middle={true} onChange={setTemperatureValue} /> </label> 
            <label className="SimControlText">Current Light Level: {lightValue}%  <RangeSlider min={1} max={100} middle={true} onChange={setLightValue} /> </label> 
            <label className="SimControlText">Current Pollution Level: {pollutionValue}%  <RangeSlider min={0} max={100} onChange={setPollutionValue} /> </label>
            <label className="SimControlText">Current Nutrient Scalar: {nutrientValue}  <RangeSlider min={1} max={3} onChange={setNutrientValue} /> </label>
            <label className="SimControlText">Current Cloud Coverage: {coverageValue}%  <RangeSlider min={0} max={100} onChange={setCoverageValue} /> </label>
            <label>Current Stress: {simStress}</label>
            <label>Current StressRate: {simStressRate}</label>
          </div>) : null}  
            {simEnd ? (
              <div className="ChartContainer">
                <StressChart data = {scene.stressData}/>
              </div>
            ): null}

        
    </>
  )
}

export default App
