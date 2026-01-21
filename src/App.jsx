import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

import RangeSlider from './RangeSlider.jsx'
import ToggleBox from './ToggleBox.jsx'
function App() {
  const [count, setCount] = useState(0)
  

  const [sliderValue, setSliderValue] = useState(1);
  const [boxValue, setBoxValue] = useState(false);

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
      </div>
      <RangeSlider onChange={setSliderValue}/>
      <p>Slider value: {sliderValue}</p>
      <ToggleBox onChange={setBoxValue}/>
      <p>Box Active: {boxValue ? "True" : "False"}</p>
    </>
  )
}

export default App
