import { useEffect, useState } from "react";
import { asset } from "../assetUrl.js";
import { isBleachingYear } from "../game/bleachingSchedule.js";
import { CORAL_KIND_IDS, CORAL_KINDS, coralFileName } from "../game/coralKinds.js";
import { GAME_EVENTS } from "../game/gameEvents.js";
import {
    CRITICAL_STRESS,
    END_YEAR,
    GAME_YEARS,
    NORMAL_LIGHT,
    START_YEAR,
    SUMMER_PEAK_LIGHT,
    THRESHOLDS,
} from "../game/gameConfig.js";
import "../styles/SimInfoDisplay.css";

// The coral collection: one silhouette per kind, in the order of CORAL_KINDS
const COLLECTION_ICONS = CORAL_KIND_IDS.map((id) => ({
    id,
    name: `${CORAL_KINDS[id].name} coral`,
    image: `assets/corals/${coralFileName(CORAL_KINDS[id].variants[0])}`,
}));

// The timeline: a large dot at the start of every year and a small one halfway through, from START_YEAR to END_YEAR
const TIMELINE_DOTS = Array.from({ length: GAME_YEARS * 2 + 1 }, (_, i) => (i % 2 === 0 ? "Large" : "Small"));
const TIMELINE_MARKER_WIDTH = 5; // px, so the marker runs from the first dot to the last whatever the track's width

const WHITE = [255, 255, 255];
const TEMPERATURE_COLORS = { middle: 28, cold: 24, hot: 32, coldColor: [77, 166, 255], hotColor: [255, 83, 77] };
const LIGHT_COLORS = { dim: [55, 62, 67], bright: [255, 213, 74] };
const STRESS_COLORS = { from: 60, calm: [2, 146, 165], critical: [229, 57, 53] }; // the dial reddens from 60 to critical

// A color part way from one RGB color to another, as a hex string
function mixColor(from, to, amount) {
    const channel = (index) =>
        Math.round(from[index] + (to[index] - from[index]) * amount)
            .toString(16)
            .padStart(2, "0");
    return `#${channel(0)}${channel(1)}${channel(2)}`;
}

const clamp01 = (value) => Math.min(Math.max(value, 0), 1);

// White at a comfortable temperature, turning blue as the water cools and red as it warms
function getTemperatureColor(temperature) {
    const { middle, cold, hot, coldColor, hotColor } = TEMPERATURE_COLORS;
    const value = Number(temperature);
    const isCold = value < middle;
    const amount = Math.min(Math.abs(value - middle) / Math.abs((isCold ? cold : hot) - middle), 1);
    return mixColor(WHITE, isCold ? coldColor : hotColor, amount);
}

// Gray in the dark, white at normal light, and yellow at the peak of summer
function getLightColor(light) {
    const value = Number(light);
    if (value > NORMAL_LIGHT) {
        return mixColor(
            WHITE,
            LIGHT_COLORS.bright,
            clamp01((value - NORMAL_LIGHT) / (SUMMER_PEAK_LIGHT - NORMAL_LIGHT)),
        );
    }
    const darkest = THRESHOLDS.light.a;
    return mixColor(LIGHT_COLORS.dim, WHITE, clamp01((value - darkest) / (NORMAL_LIGHT - darkest)));
}

function getStressColor(stress) {
    const amount = clamp01((stress - STRESS_COLORS.from) / (CRITICAL_STRESS - STRESS_COLORS.from));
    return mixColor(STRESS_COLORS.calm, STRESS_COLORS.critical, amount);
}

// The tag above the timeline, and what a screen reader says for it
function describeSeason(season, bleaching) {
    if (season !== "summer") return { text: "Winter: reef recovery", label: "Winter recovery season" };
    if (bleaching) return { text: "Summer: bleaching season", label: "Summer bleaching season" };
    return { text: "Summer: mild season", label: "Summer mild season" };
}

/**
 * The HUD along the bottom of the game: the stress dial, the timeline, the water and the coral collection.
 * @param {object} props the scene's stats (ReefScene.getStats)
 */
function SimInfoDisplay({
    yearsElapsed,
    season = "summer",
    light,
    temperature,
    stress = 0,
    pollution,
    corals,
    simEnd = false,
}) {
    const collected = corals?.collected.length ?? 0;
    const totalCorals = corals?.total ?? 0;
    const showSeason = yearsElapsed >= 1 && yearsElapsed < GAME_YEARS && !simEnd; // not behind the end screen
    const seasonTag = describeSeason(season, isBleachingYear(yearsElapsed));
    const timelineProgress = clamp01(yearsElapsed / GAME_YEARS);
    const displayedPollution = Math.round(pollution * 2) / 2;
    const temperatureColor = getTemperatureColor(temperature);
    const lightColor = getLightColor(light);

    return (
        <div className="SimInfoDisplay">
            <div className="SimInfoDial">
                <div className="SimInfoDialIcon">
                    <svg
                        className={stress >= CRITICAL_STRESS ? "SimInfoDialIconWarning" : ""}
                        viewBox="0 0 45 43"
                        role="img"
                        aria-label="Coral stress level"
                    >
                        <rect
                            x="1"
                            y="1"
                            width="43"
                            height="41"
                            rx="20.5"
                            fill={getStressColor(stress)}
                            stroke="white"
                            strokeWidth="2"
                        />
                        <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M24.3604 12.1099C26.4109 10.3276 29.8524 8.45812 32.9991 12.0337C37.743 17.4251 33.8455 29.7183 23.4532 35.5044L26.0215 25.2124L22.0782 21.8931L24.3604 12.1099ZM12 12.0337C15.7698 7.74966 19.9617 11.2837 21.6787 13.1177L18.627 21.8931L23.3106 27.4253L21.2608 35.2798C11.0827 29.4338 7.29979 17.3749 12 12.0337Z"
                            fill="white"
                        />
                    </svg>
                </div>
                <img
                    className="SimInfoDialPin"
                    src={asset("stress_dial_pin.svg")}
                    alt={`${Math.round(stress)} out of 100`}
                    style={{ transform: `rotate(${stress * 1.8 - 90}deg)` }}
                />
                <img
                    className="SimInfoTooltip"
                    src={asset("tooltips/tooltip_stress.png")}
                    alt="The dial begins on the left and slowly moves right. If it reaches the right, the corals die and the simulation ends."
                />
            </div>
            <div className="SimInfoTimeline">
                {showSeason ? (
                    <span
                        className={`SimInfoSeason ${season === "summer" ? "isSummer" : "isWinter"}`}
                        aria-label={seasonTag.label}
                    >
                        {seasonTag.text}
                    </span>
                ) : null}
                <span className="SimInfoText">{START_YEAR}</span>
                <div className="SimInfoTimelineTrack">
                    {TIMELINE_DOTS.map((size, index) => (
                        <span key={index} className={`SimInfoTimelineDot${size}`} />
                    ))}
                    <span
                        className="SimInfoTimelineMarker"
                        style={{ left: `calc(${timelineProgress} * (100% - ${TIMELINE_MARKER_WIDTH}px))` }}
                    />
                </div>
                <span className="SimInfoText">{END_YEAR}</span>
            </div>
            <div className="SimInfoBottom">
                <div className="SimInfoReading">
                    <span
                        className="SimInfoTemperatureIcon"
                        aria-hidden="true"
                        style={{
                            backgroundColor: temperatureColor,
                            maskImage: `url(${asset("temperature.svg")})`,
                            WebkitMaskImage: `url(${asset("temperature.svg")})`,
                        }}
                    />
                    <span className="SimInfoText SimInfoTemperatureValue" style={{ color: temperatureColor }}>
                        {temperature}°C
                    </span>
                    <img
                        className="SimInfoTooltip"
                        src={asset("tooltips/tooltip_temperature.png")}
                        alt="Temperature, in degrees Celsius."
                    />
                </div>
                <div className="SimInfoReading">
                    <span
                        className="SimInfoLightIcon"
                        aria-hidden="true"
                        style={{
                            backgroundColor: lightColor,
                            maskImage: `url(${asset("light_level.svg")})`,
                            WebkitMaskImage: `url(${asset("light_level.svg")})`,
                        }}
                    />
                    <span className="SimInfoText SimInfoLightValue" style={{ color: lightColor }}>
                        {light}
                    </span>
                    <img
                        className="SimInfoTooltip"
                        src={asset("tooltips/tooltip_light_level.png")}
                        alt="Light level, in µMol/m² per second: a measure of light intensity for growth and photosynthesis."
                    />
                </div>
                <div className="SimInfoReading">
                    <img src={asset("pollution.svg")} alt="Pollution" />
                    <span className="SimInfoText">{displayedPollution}</span>
                    <img
                        className="SimInfoTooltip"
                        src={asset("tooltips/tooltip_pollution.png")}
                        alt="Pollution, in µMol: the amount of nutrients expelled from sewage waste."
                    />
                </div>
                {/* The coral collection: silhouettes reveal their color as the player finds each kind */}
                <div
                    className={`SimInfoReading SimInfoCollection${totalCorals > 0 && collected === totalCorals ? " isComplete" : ""}`}
                    role="group"
                    aria-label={`Coral collection: ${collected} of ${totalCorals} kinds found`}
                >
                    <span className="SimInfoText SimInfoCollectionLabel">Corals</span>
                    <span className="SimInfoCollectionIcons">
                        {COLLECTION_ICONS.slice(0, totalCorals).map((coral) => {
                            const found = corals?.collected.includes(coral.id) ?? false;
                            return (
                                <img
                                    key={coral.id}
                                    className={`SimInfoCollectionIcon${found ? " isFound" : ""}`}
                                    src={asset(coral.image)}
                                    alt={`${coral.name}, ${found ? "found" : "not yet found"}`}
                                />
                            );
                        })}
                    </span>
                    {/* keyed by the count, so the number pops each time it goes up */}
                    <span key={collected} className="SimInfoText SimInfoCollectionValue">
                        {collected}/{totalCorals}
                    </span>
                </div>
            </div>
        </div>
    );
}

/**
 * The HUD wired straight to the scene. It listens for "stats-changed" itself (four times a second while the clock
 * runs), so only the HUD is drawn again each time, not the whole app.
 * @param {{ scene: Phaser.Scene }} props the main game
 */
export function LiveSimInfoDisplay({ scene }) {
    const [stats, setStats] = useState(() => scene.getStats());

    useEffect(() => {
        const events = scene.game.events; // kept so cleanup still works after the game is destroyed
        events.on(GAME_EVENTS.statsChanged, setStats);
        return () => events.off(GAME_EVENTS.statsChanged, setStats);
    }, [scene]);

    return (
        <SimInfoDisplay
            yearsElapsed={stats.yearsElapsed}
            season={stats.season}
            light={stats.light}
            temperature={stats.temperature}
            stress={stats.stress}
            pollution={stats.pollution}
            corals={stats.corals}
            simEnd={stats.simEnd}
        />
    );
}

export default SimInfoDisplay;
