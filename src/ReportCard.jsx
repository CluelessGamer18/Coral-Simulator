import './styles/ReportCard.css'
import ReportChart from './ReportCharts.jsx'
import { getStars, CHART_COLORS } from './reportGrade.js'
import { useMemo, useRef, useState } from 'react';
import { BLEACHING_YEARS } from './scenes/BleachingSchedule.js';
import { useFocusTrap } from './useFocusTrap.js';

const START_YEAR = 2026;

function getHeadline(summary, fishDead) {
    if (fishDead) return "A grouper caught your fish";
    if (!summary.survived) return "Your reef collapsed";
    return ["Your reef survived, but only just", "Your reef survived 10 summers", "Your reef came through strong", "Your reef is thriving"][getStars(summary)];
}

// Two sentences on what happened and why, written from the numbers the game recorded
function getStory(summary, fishDead) {
    const heatYears = summary.years.filter(report => BLEACHING_YEARS.includes(report.year));
    const worst = heatYears.reduce((a, b) => (b.lost > a.lost || (b.lost === a.lost && b.peak > a.peak) ? b : a), heatYears[0] ?? null);

    let happened;
    if (fishDead) {
        happened = `Your triggerfish ran out of hearts in year ${summary.endYear}, with ${summary.coralsAlive} of ${summary.coralsTotal} corals still alive.`;
    } else if (!worst) {
        happened = "The game ended before the first heatwave.";
    } else if (!summary.survived) {
        happened = `By year ${summary.endYear} fewer than one coral in five was left, too few to rebuild the reef. The ${START_YEAR + worst.year - 1} heatwave did the most damage: stress reached ${worst.peak}% and ${worst.lost} corals starved.`;
    } else if (summary.lost === 0) {
        happened = `Not one coral was lost. The hardest summer was ${START_YEAR + worst.year - 1}, when stress reached ${worst.peak}%, and you kept the reef shaded and cool through it.`;
    } else {
        happened = `The ${START_YEAR + worst.year - 1} heatwave was the hardest: stress reached ${worst.peak}% and ${worst.lost} of the ${summary.lost} corals you lost died that year.`;
    }

    let advice;
    if (fishDead) {
        advice = "Swim to your nest and press E as soon as a grouper appears. Coral hides you, but only the nest makes it leave.";
    } else if (!summary.pipePlugged && summary.endYear >= 7) {
        advice = "The biggest single change: plug the leaking pipe in year 6. Dirty water made the last heatwaves build stress up to 1.75 times faster.";
    } else if (summary.plumesHit > 0 && summary.lost > 0) {
        advice = `You swam into ${summary.plumesHit} hot ${summary.plumesHit === 1 ? "plume" : "plumes"}, each heating the reef for the rest of its summer. Steering around them would have saved corals.`;
    } else if (summary.lost > 0) {
        advice = "Corals die when they stay fully bleached for too long. Popping bubbles from the first seconds of a heatwave, before stress passes 60%, keeps them out of danger.";
    } else {
        advice = "Shade and cool water only last a few seconds, and you kept them coming all summer. That is exactly what the reef needed.";
    }
    return [happened, advice];
}

/*
The end of a game, as a report card: how it ended and a grade, three numbers, the whole ten years on one chart
with the temperature and light beneath it, what happened and why, and a link from the game to the real thing.
result is the scene's last stats (TestScene.js, getStats), with its history and summary.
*/
function ReportCard({ result, onPlayAgain, onResources }) {
    const [hidden, setHidden] = useState(false);
    const box = useRef(null);
    useFocusTrap(box, !hidden);

    const { history, summary, corals, fishDead } = result;
    const stars = getStars(summary);
    const [happened, advice] = getStory(summary, fishDead);

    const charts = useMemo(() => {
        const at = (values) => values.map((y, i) => ({ x: START_YEAR + history.years[i], y }));
        const helpful = history.pops.filter(pop => pop.kind !== "plume");
        return {
            stress: [
                { label: "Reef stress", color: CHART_COLORS.stress, points: at(history.stress), unit: "%" },
                {
                    label: "Bubble popped", color: CHART_COLORS.pops, kind: "marks", shape: "triangle",
                    points: helpful.map(pop => ({ x: START_YEAR + pop.year, y: pop.stress, kind: pop.kind })),
                    describe: (point) => `${point.kind === "cool" ? "Cool Current" : "Cloudy"} bubble popped at ${Math.round(point.y)}% stress`,
                },
                {
                    label: "Corals died", color: CHART_COLORS.deaths, kind: "marks", shape: "circle",
                    points: history.deaths.map(death => ({ x: START_YEAR + death.year, y: death.stress, count: death.count })),
                    sizes: history.deaths.map(death => Math.min(5 + Math.sqrt(death.count) * 2, 14)),
                    describe: (point) => `${point.count} ${point.count === 1 ? "coral" : "corals"} died`,
                },
            ],
            temp: [{ label: "Temperature", color: CHART_COLORS.temp, points: at(history.temp), unit: " °C" }],
            light: [{ label: "Light", color: CHART_COLORS.light, points: at(history.light) }],
        };
    }, [history]);

    if (hidden) {
        return <button className="Button ButtonPrimary ReportShow" onClick={() => setHidden(false)}>Show my report card</button>;
    }

    const alivePercent = Math.round(summary.coralsAlive / summary.coralsTotal * 100);
    return (
        <div className="ReportScrim">
            <div className="ReportCard" ref={box} role="dialog" aria-modal="true" aria-labelledby="report-title" tabIndex={-1}>
                <header className="ReportHeader">
                    <div>
                        <h1 id="report-title">{getHeadline(summary, fishDead)}</h1>
                        <p className="ReportSub">{summary.survived ? "2026 to 2036: all ten years" : `Year ${summary.endYear} of 10`}</p>
                    </div>
                    <div className="ReportStars" role="img" aria-label={`${stars} of 3 stars`}>
                        {[1, 2, 3].map(star => <span key={star} className={star <= stars ? "on" : ""}>★</span>)}
                        <small>50% · 75% · 90% alive</small>
                    </div>
                </header>

                <dl className="ReportNumbers">
                    <div className={alivePercent >= 75 ? "good" : ""}>
                        <dt>Corals alive</dt>
                        <dd>{summary.coralsAlive}<small>/{summary.coralsTotal}</small></dd>
                        <span>{alivePercent}%{summary.replanted > 0 ? ` · ${summary.replanted} replanted` : ""}</span>
                    </div>
                    <div>
                        <dt>Hottest summer survived</dt>
                        <dd>{summary.hottest > 0 ? `+${summary.hottest}` : "none"}<small>{summary.hottest > 0 ? " °C" : ""}</small></dd>
                        <span>{summary.bubblesPopped} {summary.bubblesPopped === 1 ? "bubble" : "bubbles"} popped</span>
                    </div>
                    <div className={summary.nestStage === summary.nestStages ? "good" : ""}>
                        <dt>Nest</dt>
                        <dd>Stage {summary.nestStage}<small>/{summary.nestStages}</small></dd>
                        <span>Goals {summary.goalsMet}/{summary.goalsTotal} · corals found {corals.collected.length}/{corals.total}</span>
                    </div>
                </dl>

                <section className="ReportCharts" aria-label="The ten years">
                    <h2>Reef stress over the ten years</h2>
                    <ul className="ReportLegend">
                        <li><i className="line" style={{ background: CHART_COLORS.stress }} />Reef stress (%)</li>
                        <li><i className="triangle" style={{ borderBottomColor: CHART_COLORS.pops }} />Bubble popped</li>
                        <li><i className="dot" style={{ background: CHART_COLORS.deaths }} />Corals died</li>
                        <li><i className="band" />Heatwave summer</li>
                    </ul>
                    <ReportChart series={charts.stress} yRange={[0, 100]} heatYears={BLEACHING_YEARS} height="210px" label="Reef stress over the ten years, with bubbles popped and corals lost" />
                    <h3>Temperature (°C)</h3>
                    <ReportChart series={charts.temp} yRange={[26, 35]} heatYears={BLEACHING_YEARS} height="70px" compact label="Water temperature over the ten years" />
                    <h3>Light</h3>
                    <ReportChart series={charts.light} yRange={[0, 2000]} heatYears={BLEACHING_YEARS} height="70px" compact label="Light level over the ten years" />
                </section>

                <section className="ReportStory">
                    <h2>What happened, and why</h2>
                    <p>{happened}</p>
                    <p>{advice}</p>
                    <p className="ReportFact">
                        <b>On real reefs:</b> scientists track heat the same way, by how hot the water is and for how long.
                        About four "degree heating weeks" bleaches coral, and about eight starts to kill it.
                    </p>
                </section>

                <div className="ReportActions">
                    <button className="Button ButtonPrimary" data-autofocus onClick={onPlayAgain}>Play again</button>
                    <button className="Button ButtonSecondary" onClick={() => setHidden(true)}>View my reef</button>
                    <button className="Button ButtonSecondary" onClick={onResources}>Learn about real reefs</button>
                </div>
            </div>
        </div>
    );
}

export default ReportCard;
