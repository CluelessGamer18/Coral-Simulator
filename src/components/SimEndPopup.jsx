import { useState } from "react";
import HistoryChart from "./HistoryChart.jsx";
import { asset } from "../assetUrl.js";
import { BLEACHING_YEARS } from "../game/bleachingSchedule.js";
import { GAME_YEARS } from "../game/gameConfig.js";
import "../styles/SimEndPopup.css";

// The charts the player can switch between. series is a key of the scene's history (ReefScene.recordHistory).
const CHARTS = [
    { button: "Stress", title: "Coral Stress", series: "stress", yRange: [0, 100] },
    { button: "Temp", title: "Temperature (°C)", series: "temperature", yRange: [18, 35] },
    { button: "Light", title: "Light Level", series: "light", yRange: [0, 2000] },
    { button: "Pollution", title: "Pollution", series: "pollution", yRange: [0, 5] },
];

/**
 * The end of a game: how it ended, a few numbers that sum it up, and charts of the whole ten years. Can be minimized
 * to look at the reef behind it.
 * @param {object} props
 * @param {object} props.history what the scene recorded (ReefScene.getHistory)
 * @param {{ collected: string[], total: number }} props.corals the player's coral collection
 * @param {number} props.yearsElapsed when the game ended
 * @param {boolean} props.reefDead
 * @param {boolean} props.fishDead
 * @param {() => void} props.onPlayAgain
 */
function SimEndPopup({ history, corals, yearsElapsed, reefDead = false, fishDead = false, onPlayAgain }) {
    const [currentChart, setCurrentChart] = useState(0);
    const [minimized, setMinimized] = useState(false);

    if (!history) return null;

    if (minimized) {
        return (
            <button
                type="button"
                className="SimEndPopupExpandButton"
                aria-label="Show results"
                onClick={() => setMinimized(false)}
            >
                <img src={asset("dialog_arrow.png")} alt="" />
            </button>
        );
    }

    const survived = !reefDead && !fishDead;
    const chart = CHARTS[currentChart];
    const yearsSurvived = survived ? GAME_YEARS : Math.floor(yearsElapsed * 10) / 10;
    let title = "Your Reef Lived!";
    if (reefDead) title = "Your Reef Died...";
    else if (fishDead) title = "Your Fish Died...";

    return (
        <div className="SimEndPopup" role="dialog" aria-modal="true" aria-labelledby="sim-end-title">
            <span className="SimEndPopupTitle" id="sim-end-title">
                {title}
            </span>
            <button type="button" className="SimEndPopupRestartButton" onClick={onPlayAgain}>
                Play Again
            </button>
            <button
                type="button"
                className="SimEndPopupMinimizeButton"
                aria-label="Minimize results"
                onClick={() => setMinimized(true)}
            >
                −
            </button>
            <dl className="SimEndSummary">
                <div className={survived ? "isGood" : ""}>
                    <dt>Years survived</dt>
                    <dd>
                        {yearsSurvived}
                        <small>/{GAME_YEARS}</small>
                    </dd>
                </div>
                <div className={corals.total > 0 && corals.collected.length === corals.total ? "isGood" : ""}>
                    <dt>Corals collected</dt>
                    <dd>
                        {corals.collected.length}
                        <small>/{corals.total}</small>
                    </dd>
                </div>
                <div>
                    <dt>Highest stress</dt>
                    <dd>
                        {Math.round(history.peakStress)}
                        <small>%</small>
                    </dd>
                </div>
            </dl>
            <HistoryChart
                years={history.years}
                values={history[chart.series]}
                title={chart.title}
                yRange={chart.yRange}
                bleachingYears={BLEACHING_YEARS}
            />
            <p className="SimEndLegend">
                <span className="SimEndLegendSwatch" />
                Bleaching summers
            </p>
            <div className="SimEndPopupChartButtons">
                <p className="SimEndPopupText">View: </p>
                {CHARTS.map(({ button }, i) => (
                    <button
                        type="button"
                        key={button}
                        className={`SimEndPopupChartButton${i === currentChart ? " isSelected" : ""}`}
                        aria-pressed={i === currentChart}
                        onClick={() => setCurrentChart(i)}
                    >
                        {button}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default SimEndPopup;
