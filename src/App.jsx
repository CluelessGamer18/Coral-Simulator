import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

import RangeSlider from './RangeSlider.jsx'
import ToggleBox from './ToggleBox.jsx'
import TestGame from './TestGame.jsx'

function App() {
  const [temperatureValue, setTemperatureValue] = useState(26);
  const [lightValue, setLightValue] = useState(50)
  const [pollutionValue, setPollutionValue] = useState(0);
  const [nutrientValue, setNutrientValue] = useState(1);

  const [boxValue, setBoxValue] = useState(false);

  const [scene, setScene] = useState(null); // This ends up being an instance of our scene class
  const [simStart, setSimStart] = useState(false);
  const [simTime, setSimTime] = useState('');
  const [simStress, setSimStress] = useState(0);
  const [simStressRate, setSimStressRate] = useState(0);

  useEffect(() => {
    if(scene){
      scene.startTimer();
      scene.startRandomFishIdle();
      console.log("Simulation Started with time: " + scene.getSimTime())
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
      scene.updateBackgroundColor();
      scene.updateStressRate();
    }
  },[lightValue])

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
    }
  },[pollutionValue])

  // Average Coral Reef Temperature is 22 - 29 Celcius
  // Rarely 20 - 32 Celcius
  // A temp range interval could be defined as [8,20) U [20,32] U (32,44]
  // https://naturefins.com/what-is-the-average-temperature-in-the-coral-reef-biome/


  return (
    <>
    <TestGame onSceneReady={setScene}/>
      {simStart ? ( 
        //Change to slider labels:
          <div className="SimSliders"> 
            <label className="SimControlText">Current Temperature: {temperatureValue}&deg; Celcius <RangeSlider min={8} max={44} middle={true} onChange={setTemperatureValue} /> </label> 
            <label className="SimControlText">Current Light Level: {lightValue}%  <RangeSlider min={1} max={100} middle={true} onChange={setLightValue} /> </label> 
            <label className="SimControlText">Current Pollution Level: {pollutionValue}%  <RangeSlider min={0} max={100} onChange={setPollutionValue} /> </label>
            <label className="SimControlText">Current Nutrient Scalar: {nutrientValue}  <RangeSlider min={1} max={10} onChange={setNutrientValue} /> </label>
            <label>Current Stress: {simStress}</label>
            <label>Current StressRate: {simStressRate}</label>
          </div>) : null}  
    {!simStart ? (
      <button className="SimStartButton" onClick={(setSimStart)}>Start Simulation!</button>
      ): null}
    <p className="SimTimer">Elapsed Time: {simTime}</p>

    </>
  )
}

export default App
