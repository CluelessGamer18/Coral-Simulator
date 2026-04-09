import './styles/SimEndPopUp.css'
import Chart from './StressChart.jsx'
import { useState } from 'react';


function SimEndPopUp({stress,temp,light,poll,onClose, dead = null}){

    const [currentChart, setCurrentChart] = useState(0);
    const [minimized, setMinimized] = useState(false);

    const changeChart = (i) => {
        setCurrentChart(i);
    }


    return(
        <>
        {!minimized ? <>            
                <div className="SimEndPopUp">
                <span className="SimEndPopUpTitle">Your Reef {dead ? "Died..." : "Lived!"}</span> 
                <button className="SimEndPopUpRestartButton" onClick={onClose}>Restart Sim</button>
                <button className="SimEndPopUpMinimizeButton" onClick={() => setMinimized(!minimized)}>-</button>
                {currentChart == 0 ? <Chart data={stress} title={"Stress"} yRange={[0, 100]}/> : null}
                {currentChart == 1 ? <Chart data={temp} title={"Temperature"} yRange={[18, 35]}/> : null}
                {currentChart == 2 ? <Chart data={light} title={"Light Level"} yRange={[0, 2000]}/> : null}
                {currentChart == 3? <Chart data={poll} title={"Pollution"} yRange={[0, 13]}/> : null}
                <div className="SimEndPopUpButtonContainer">
                        <p className="SimEndPopUpText">View: </p>
                        <button className="SimEndPopUpChartButton" onClick={() => changeChart(0)}>Stress</button>
                        <button className="SimEndPopUpChartButton" onClick={() => changeChart(1)}>Temp</button>
                        <button className="SimEndPopUpChartButton" onClick={() => changeChart(2)}>Light</button>
                        <button className="SimEndPopUpChartButton" onClick={() => changeChart(3)}>Pollution</button>
                </div>
            </div></> : <button className="SimEndPopUpExpandButton" onClick={() => setMinimized(!minimized)}>
                <img src="/dialogarrow.png"></img></button>}

        </>
    )
}

export default SimEndPopUp;