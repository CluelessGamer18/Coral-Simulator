import './styles/SimEndPopUp.css'
import Chart from './StressChart.jsx'
import { useState } from 'react';
import { asset } from './assetUrl';
import { BLEACHING_YEARS } from './scenes/BleachingSchedule.js';

const CHARTS = [
    { button: "Stress", title: "Coral Stress", series: "stress", yRange: [0, 100] },
    { button: "Temp", title: "Temperature (°C)", series: "temp", yRange: [18, 35] },
    { button: "Light", title: "Light Level", series: "light", yRange: [0, 2000] },
    { button: "Pollution", title: "Pollution", series: "poll", yRange: [0, 5] },
];

// The end of a game: how it ended, a few numbers that sum it up, and charts of the whole ten years.
// history is what the scene recorded (TestScene.js, recordHistory); corals is the player's collection.
function SimEndPopUp({history, corals, yearsElapsed, onClose, dead = null, fishDead = false}){

    const [currentChart, setCurrentChart] = useState(0);
    const [minimized, setMinimized] = useState(false);

    if (!history) return null;

    const survived = !dead && !fishDead;
    const chart = CHARTS[currentChart];
    const yearsSurvived = survived ? 10 : Math.floor(yearsElapsed * 10) / 10;

    return(
        <>
        {!minimized ? <>            
                <div className="SimEndPopUp" role="dialog" aria-modal="true" aria-labelledby="sim-end-title">
                <span className="SimEndPopUpTitle" id="sim-end-title">{dead ? "Your Reef Died..." : fishDead ? "Your Fish Died..." : "Your Reef Lived!"}</span> 
                <button className="SimEndPopUpRestartButton" onClick={onClose}>Play Again</button>
                <button className="SimEndPopUpMinimizeButton" aria-label="Minimize results" onClick={() => setMinimized(!minimized)}>-</button>
                <dl className="SimEndSummary">
                    <div className={survived ? "good" : ""}>
                        <dt>Years survived</dt>
                        <dd>{yearsSurvived}<small>/10</small></dd>
                    </div>
                    <div className={corals.total > 0 && corals.collected.length === corals.total ? "good" : ""}>
                        <dt>Corals collected</dt>
                        <dd>{corals.collected.length}<small>/{corals.total}</small></dd>
                    </div>
                    <div>
                        <dt>Highest stress</dt>
                        <dd>{Math.round(history.peakStress)}<small>%</small></dd>
                    </div>
                </dl>
                <Chart years={history.years} values={history[chart.series]} title={chart.title} yRange={chart.yRange} bleachingYears={BLEACHING_YEARS} />
                <p className="SimEndLegend"><span className="SimEndLegendSwatch" />Bleaching summers</p>
                <div className="SimEndPopUpButtonContainer">
                        <p className="SimEndPopUpText">View: </p>
                        {CHARTS.map(({ button }, i) => (
                            <button
                                key={button}
                                className={`SimEndPopUpChartButton${i === currentChart ? " selected" : ""}`}
                                aria-pressed={i === currentChart}
                                onClick={() => setCurrentChart(i)}
                            >{button}</button>
                        ))}
                </div>
            </div></> : <button className="SimEndPopUpExpandButton" aria-label="Show results" onClick={() => setMinimized(!minimized)}>
                <img src={asset("dialogarrow.png")} alt="" /></button>}

        </>
    )
}

export default SimEndPopUp;
