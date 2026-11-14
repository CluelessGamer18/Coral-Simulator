import { useEffect, useState } from "react";
import "./styles/Hud.css";
import { asset } from "./assetUrl";
import { SUMMER_TEMPERATURE_RISE } from "./scenes/BleachingSchedule.js";
import { GAME_YEARS } from "./scenes/gameConfig.js";

/*
The HUD. On a wide window it is two rails in the empty margins either side of the game: the reef on the left,
the fish and this year's goals on the right. On a window too narrow for rails (a 4:3 projector, a tablet held
upright) it is one bar above the game. Either way nothing covers the sea floor, where the pickups and the nest are.

Every reading has a word and an icon as well as a colour, and explains itself on hover, keyboard focus or tap
(the data-tip attributes; see Hud.css).
*/

const TEMPERATURE_BAR = [26, 35]; // °C from one end of the bar to the other
const SAFE_TEMPERATURE = 28;
const LIGHT_BAR = [0, 1840];
const SAFE_LIGHT = 600;

const share = (value, [min, max]) => `${Math.min(Math.max((value - min) / (max - min), 0), 1) * 100}%`;

function describeStress(stress) {
    if (stress >= 85) return { word: "Critical", tone: "bad" };
    if (stress >= 60) return { word: "Bleaching", tone: "heat" };
    if (stress >= 25) return { word: "Stressed", tone: "warn" };
    return { word: "Healthy", tone: "good" };
}

function describeTemperature(temperature) {
    if (temperature >= 32) return { word: "very hot", tone: "bad" };
    if (temperature >= 30) return { word: "hot", tone: "heat" };
    if (temperature > SAFE_TEMPERATURE) return { word: "warm", tone: "warn" };
    return { word: "normal", tone: "good" };
}

function describeLight(light, shaded) {
    if (light >= 1100) return { word: "very bright", tone: "heat" };
    if (light > SAFE_LIGHT) return { word: "bright", tone: "warn" };
    return { word: shaded ? "shaded" : "gentle", tone: "good" };
}

function describePollution(multiplier) {
    if (multiplier >= 1.4) return { word: "dirty", tone: "heat" };
    if (multiplier >= 1.15) return { word: "murky", tone: "warn" };
    return { word: "clean", tone: "good" };
}

const TREND = { up: { arrow: "▲", word: "rising" }, down: { arrow: "▼", word: "recovering" }, flat: { arrow: "■", word: "steady" } };

// A bar with a marker for the value, and the safe part of the range drawn on it
function Gauge({ value, range, safeTo, tone }) {
    return (
        <span className="HudGauge" aria-hidden="true">
            <span className="HudGaugeSafe" style={{ width: share(safeTo, range) }} />
            <span className={`HudGaugeFill tone-${tone}`} style={{ width: share(value, range) }} />
        </span>
    );
}

function Hearts({ health, maxHealth }) {
    return (
        <span className="HudHearts" role="img" aria-label={`Health: ${health / 2} of ${maxHealth / 2} hearts`}>
            {Array.from({ length: maxHealth / 2 }, (_, i) => {
                const halves = Math.min(Math.max(health - i * 2, 0), 2);
                return <img key={i} src={asset(`assets/health/heart_${["dead", "half", "full"][halves]}.svg`)} alt="" />;
            })}
        </span>
    );
}

function Pips({ filled, total }) {
    return (
        <span className="HudPips" aria-hidden="true">
            {Array.from({ length: total }, (_, i) => <span key={i} className={i < filled ? "on" : ""} />)}
        </span>
    );
}

const GOAL_MARK = { todo: "", done: "✓", failed: "✕" };
const GOAL_WORD = { todo: "to do", done: "done", failed: "missed" };

function Goals({ goals }) {
    return (
        <ul className="HudGoals">
            {goals.map(goal => (
                <li key={goal.id} className={`goal-${goal.state}`}>
                    <span className="HudGoalBox" aria-hidden="true">{GOAL_MARK[goal.state]}</span>
                    <span>
                        {goal.text}{goal.progress && goal.state === "todo" ? <b> {goal.progress}</b> : null}
                        <span className="visually-hidden"> ({GOAL_WORD[goal.state]})</span>
                    </span>
                </li>
            ))}
        </ul>
    );
}

function seasonLine(stats) {
    if (stats.season === "winter") return "Winter: the reef recovers";
    return stats.heatwave > 0 ? `Summer heatwave +${stats.heatwave} °C` : "Summer: no heatwave";
}

// Ten blocks, one a year, with the heatwaves marked ahead of time so the player can see what is coming
function Calendar({ stats }) {
    return (
        <ol className="HudCalendar" aria-label="The ten years, with heatwave summers marked">
            {Array.from({ length: GAME_YEARS }, (_, i) => {
                const year = i + 1;
                const rise = SUMMER_TEMPERATURE_RISE[year];
                const state = year < stats.year ? "past" : year === stats.year ? "now" : "ahead";
                return (
                    <li key={year} className={`${state}${rise ? " heat" : ""}`} aria-current={state === "now" ? "true" : undefined}>
                        <span className="HudCalendarYear">{year}</span>
                        <span className="HudCalendarHeat">{rise ? `+${rise}°` : "·"}</span>
                        <span className="visually-hidden">{rise ? `heatwave plus ${rise} degrees` : "no heatwave"}</span>
                    </li>
                );
            })}
        </ol>
    );
}

function HudButtons({ onOpenOptions, muted, onToggleMute }) {
    return (
        <div className="HudButtons">
            <button type="button" className="HudIconButton" aria-label="Pause and open settings" onClick={onOpenOptions}>
                <img src={asset("settings.svg")} alt="" />
            </button>
            <button type="button" className="HudIconButton" aria-label={muted ? "Turn sound on" : "Turn sound off"} aria-pressed={muted} onClick={onToggleMute}>
                <SpeakerIcon muted={muted} />
            </button>
        </div>
    );
}

export function SpeakerIcon({ muted }) {
    return (
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
            {muted ? <path d="M17 9l5 6M22 9l-5 6" /> : <path d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12" />}
        </svg>
    );
}

function ControlsCard({ controlScheme }) {
    const swim = controlScheme === "arrows" ? "Arrows" : "WASD";
    return (
        <section className="HudCard HudControls" aria-label="Controls">
            <h2>Controls</h2>
            <dl>
                <div><dt>{swim}</dt><dd>swim (or hold the mouse)</dd></div>
                <div><dt>Q</dt><dd>pick up, place</dd></div>
                <div><dt>E</dt><dd>hide</dd></div>
                <div><dt>Click</dt><dd>a coral to check it</dd></div>
                <div><dt>Esc</dt><dd>pause</dd></div>
            </dl>
        </section>
    );
}

function Hud({ stats, inTutorial, log, controlScheme, onOpenOptions, muted, onToggleMute, onSkipTutorial }) {
    const [goalsOpen, setGoalsOpen] = useState(false);
    const buttons = <HudButtons onOpenOptions={onOpenOptions} muted={muted} onToggleMute={onToggleMute} />;

    // The tutorial has no reef to report on yet: the rails hold the controls and the way out
    if (inTutorial || !stats?.goals) {
        return (
            <>
                <aside className="Rail RailLeft" aria-label="Game menu">
                    {buttons}
                    <section className="HudCard">
                        <h2>Tutorial</h2>
                        <p className="HudNote">Four short lessons: swim, eat, build your nest and hide.</p>
                    </section>
                </aside>
                <aside className="Rail RailRight" aria-label="Controls">
                    <ControlsCard controlScheme={controlScheme} />
                    <button type="button" className="Button ButtonSecondary HudSkip" onClick={onSkipTutorial}>Skip tutorial</button>
                </aside>
                <header className="TopBar" aria-label="Game menu">
                    {buttons}
                    <span className="TopBarTitle">Tutorial</span>
                    <button type="button" className="Button ButtonSecondary HudSkip" onClick={onSkipTutorial}>Skip tutorial</button>
                </header>
            </>
        );
    }

    const stress = Math.round(stats.stress);
    const stressState = describeStress(stats.stress);
    const trend = TREND[stats.trend];
    const temperature = Math.round(stats.temperature * 10) / 10;
    const temperatureState = describeTemperature(stats.temperature);
    const lightState = describeLight(stats.light, stats.shadeSeconds > 0);
    const pollutionState = describePollution(stats.pollutionMultiplier);
    const collected = stats.corals.collected.length;
    const goalsDone = stats.goals.filter(goal => goal.state === "done").length;
    const { nest, fish } = stats;
    const nestLine = nest.needed === null ? "Complete" : `${nest.placed} / ${nest.needed} pieces`;

    return (
        <>
            <aside className="Rail RailLeft" aria-label="The reef">
                {buttons}

                <section className={`HudCard HudReef${stats.stress >= 80 ? " critical" : ""}`} aria-label="Reef health">
                    <h2>Reef stress</h2>
                    <div className="HudBig" tabIndex={0} data-tip="Heat stress builds while the water is hot, faster in bright light and dirty water. Coral bleaches as it rises, and fully bleached coral starves if the heat lasts. It falls again in winter.">
                        <span className="HudBigNumber">{stress}<small>%</small></span>
                        <span className={`HudState tone-${stressState.tone}`}>
                            <span><span aria-hidden="true">{trend.arrow}</span> {stressState.word}</span>
                            <span className="HudStateSub">{trend.word}</span>
                        </span>
                    </div>
                    <div className="HudStressBar" role="img" aria-label={`Reef stress ${stress} percent, ${stressState.word}, ${trend.word}`}>
                        <span className={`HudStressFill tone-${stressState.tone}`} style={{ width: `${stats.stress}%` }} />
                        <i style={{ left: "40%" }} /><i style={{ left: "60%" }} /><i style={{ left: "80%" }} />
                    </div>
                    <p className="HudLine" tabIndex={0} data-tip="Each coral bleaches at its own pace. If fewer than one in five are left alive, the reef collapses and the game is over.">
                        <b>{stats.coralsAlive}</b> of {stats.coralsTotal} corals alive
                    </p>
                </section>

                <section className="HudCard" aria-label="Water">
                    <h2>Water</h2>
                    <div className="HudRow" tabIndex={0} data-tip="Coral is comfortable up to about 28 °C (the pale part of the bar). Heatwaves push the water past that. Blue Cool Current bubbles bring it down for a few seconds.">
                        <span className="HudRowLabel"><ThermometerIcon />Temp</span>
                        <span className="HudRowValue">{temperature.toFixed(1)} °C</span>
                        <span className={`HudWord tone-${temperatureState.tone}`}>{temperatureState.word}{stats.coolingSeconds > 0 ? ` · cooled ${stats.coolingSeconds}s` : ""}</span>
                        <Gauge value={stats.temperature} range={TEMPERATURE_BAR} safeTo={SAFE_TEMPERATURE} tone={temperatureState.tone} />
                    </div>
                    <div className="HudRow" tabIndex={0} data-tip="Summer sunlight gets stronger as the season goes on. Bright light makes hot water bleach coral faster. Green Cloudy bubbles shade the reef for a few seconds.">
                        <span className="HudRowLabel"><SunIcon />Light</span>
                        <span className="HudRowValue">{lightState.word}</span>
                        <span className={`HudWord tone-${lightState.tone}`}>{stats.shadeSeconds > 0 ? `shade ${stats.shadeSeconds}s` : stats.light > SAFE_LIGHT ? "adds to stress" : "safe"}</span>
                        <Gauge value={stats.light} range={LIGHT_BAR} safeTo={SAFE_LIGHT} tone={lightState.tone} />
                    </div>
                    <div className="HudRow" tabIndex={0} data-tip={`Nutrients from the leaking pipe. Dirty water makes heat stress build faster (the number shows how much) and slows recovery. ${stats.pipe.rocks >= stats.pipe.needed ? "You plugged the pipe, so it is clearing." : `From year ${stats.pipe.from} you can plug the pipe with nest pieces.`}`}>
                        <span className="HudRowLabel"><DropIcon />Pollution</span>
                        <span className="HudRowValue">×{stats.pollutionMultiplier.toFixed(2)}</span>
                        <span className={`HudWord tone-${pollutionState.tone}`}>{pollutionState.word}{stats.pipe.rocks >= stats.pipe.needed ? " · plugged" : ""}</span>
                        <Gauge value={stats.pollutionMultiplier} range={[1, 1.75]} safeTo={1.15} tone={pollutionState.tone} />
                    </div>
                </section>

                <section className="HudCard" aria-label="Calendar">
                    <h2>Year {stats.year} of {GAME_YEARS}</h2>
                    <p className={`HudSeason ${stats.season}${stats.heatwave ? " heat" : ""}`}>
                        {seasonLine(stats)}
                        <span className="HudSeasonTime">{stats.secondsLeft}s left</span>
                    </p>
                    <Calendar stats={stats} />
                </section>
            </aside>

            <aside className="Rail RailRight" aria-label="Your fish and goals">
                <section className="HudCard" aria-label="Your triggerfish">
                    <h2>Your triggerfish</h2>
                    <div className="HudSplit">
                        <Hearts health={fish.health} maxHealth={fish.maxHealth} />
                        <span className="HudLine" tabIndex={0} data-tip="Each shellfish heals half a heart and makes your fish bigger. At full size it can scare groupers away.">
                            Growth <Pips filled={fish.meals} total={fish.mealsMax} /> <b>{fish.meals}/{fish.mealsMax}</b>
                        </span>
                    </div>
                    <p className="HudLine" tabIndex={0} data-tip="Carry glowing pieces to the nest with Q. Hiding in the nest (E) is the only thing that makes a grouper leave. A finished nest hatches young in the last year.">
                        Nest stage <b>{nest.stage}</b> of {nest.stages} · {nestLine}
                    </p>
                </section>

                <section className="HudCard HudGoalsCard" aria-label="This year's goals">
                    <h2>This year <span className="HudChapter">{stats.chapter.title}</span></h2>
                    <Goals goals={stats.goals} />
                    <p className="HudNote">All done by the year's end: +1 heart</p>
                </section>

                <section className="HudCard" aria-label="Coral collection">
                    <div className="HudLine" tabIndex={0} data-tip="Click a coral to open its page. Each new kind you open is added to your collection.">
                        Corals found <Pips filled={collected} total={stats.corals.total} /> <b key={collected} className="HudPop">{collected}/{stats.corals.total}</b>
                    </div>
                </section>

                <section className="HudCard HudLog" aria-label="Recent messages">
                    <h2>Log</h2>
                    {log.length === 0 ? <p className="HudNote">Messages you might have missed are kept here.</p> : (
                        <ul>
                            {log.map(entry => <li key={entry.key}><b>{entry.title}</b>{entry.message ? <span> {entry.message}</span> : null}</li>)}
                        </ul>
                    )}
                </section>

                <ControlsCard controlScheme={controlScheme} />
            </aside>

            <header className="TopBar" aria-label="Game status">
                {buttons}
                <span className={`TopBarItem tone-${stressState.tone}${stats.stress >= 80 ? " critical" : ""}`}>
                    <span className="TopBarLabel">Stress</span>
                    <b>{stress}% <span aria-hidden="true">{trend.arrow}</span></b>
                    <span className="TopBarWord">{stressState.word}</span>
                </span>
                <span className="TopBarItem">
                    <span className="TopBarLabel">Corals</span>
                    <b>{stats.coralsAlive}/{stats.coralsTotal}</b>
                </span>
                <span className={`TopBarItem tone-${temperatureState.tone}`}>
                    <span className="TopBarLabel">Temp</span>
                    <b>{temperature.toFixed(1)} °C</b>
                    <span className="TopBarWord">{temperatureState.word}</span>
                </span>
                <span className={`TopBarItem tone-${lightState.tone}`}>
                    <span className="TopBarLabel">Light</span>
                    <b>{lightState.word}</b>
                </span>
                <span className="TopBarItem">
                    <span className="TopBarLabel">Year {stats.year}/{GAME_YEARS}</span>
                    <b>{stats.season === "winter" ? "Winter" : stats.heatwave ? `Heat +${stats.heatwave}°` : "Summer"}</b>
                    <span className="TopBarWord">{stats.secondsLeft}s</span>
                </span>
                <span className="TopBarItem"><Hearts health={fish.health} maxHealth={fish.maxHealth} /></span>
                <span className="TopBarItem">
                    <span className="TopBarLabel">Nest</span>
                    <b>{nest.needed === null ? "done" : `${nest.placed}/${nest.needed}`}</b>
                </span>
                <button type="button" className="TopBarGoals" aria-expanded={goalsOpen} onClick={() => setGoalsOpen(open => !open)}>
                    Goals {goalsDone}/{stats.goals.length}
                </button>
                {goalsOpen ? (
                    <div className="TopBarGoalsPanel">
                        <h2>This year <span className="HudChapter">{stats.chapter.title}</span></h2>
                        <Goals goals={stats.goals} />
                    </div>
                ) : null}
            </header>
        </>
    );
}

const iconProps = { viewBox: "0 0 24 24", width: "1.1em", height: "1.1em", "aria-hidden": true, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
const ThermometerIcon = () => <svg {...iconProps}><path d="M10 14.5V5a2 2 0 014 0v9.5a4 4 0 11-4 0z" /><circle cx="12" cy="18" r="1.4" fill="currentColor" /></svg>;
const SunIcon = () => <svg {...iconProps}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M5 19l1.4-1.4M17.6 6.4L19 5" /></svg>;
const DropIcon = () => <svg {...iconProps}><path d="M12 3c3 4 6 7 6 11a6 6 0 01-12 0c0-4 3-7 6-11z" /></svg>;

// The HUD wired straight to the scene. It listens for "stats-changed" itself (four times a second while the
// clock runs), so only the HUD is drawn again each time, not the whole app. App gives it a key per scene, so it
// starts again from that scene's own values.
export function LiveHud({ scene, ...props }) {
    const [stats, setStats] = useState(() => scene.getStats?.() ?? null);

    useEffect(() => {
        const events = scene.game.events; // kept so cleanup still works after the game is destroyed
        events.on("stats-changed", setStats);
        return () => events.off("stats-changed", setStats);
    }, [scene]);

    return <Hud stats={stats} {...props} />;
}

export default Hud;
