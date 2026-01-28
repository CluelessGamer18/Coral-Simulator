import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

import RangeSlider from './RangeSlider.jsx'
import ToggleBox from './ToggleBox.jsx'
import TestGame from './TestGame.jsx'
function App() {
  const [sliderValue, setSliderValue] = useState(50);
  const [boxValue, setBoxValue] = useState(false);
  const [scene, setScene] = useState(null); // This ends up being an instance of our scene class

  useEffect(() => {
    if(scene){
      scene.updateFishVisibility(boxValue)
    }
  }, [boxValue, scene])

  useEffect(() => {
    if(scene){
      scene.moveFishX(sliderValue)
    }
  }, [sliderValue, scene])

  return (
    <>
    <div style={{width: "400px", height: "400px"}}>
      <TestGame onSceneReady={setScene}/>
    </div>
      <RangeSlider onChange={setSliderValue}/>
      <p>Slider value: {sliderValue}</p>
      <ToggleBox onChange={setBoxValue}/>
      <p>Box Active: {boxValue ? "True" : "False"}</p>
      <p>Use arrow keys to move up and down</p>
    </>
  )
}

export default App
