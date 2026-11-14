import { useEffect, useState } from "react";
import "./styles/SimInfoDisplay.css";
import { asset } from "./assetUrl";
import { isBleachingYear } from "./scenes/BleachingSchedule.js";
import { GAME_YEARS } from "./scenes/gameConfig.js";

function getTemperatureColor(temp) {
    const value = Number(temp);
    const average = 28;
    const endpoint = value < average ? 24 : 32;
    const startColor = value < average ? [77, 166, 255] : [255, 83, 77];
    const amount = Math.min(Math.abs(value - average) / Math.abs(endpoint - average), 1);
    const channel = (index) => Math.round(255 + (startColor[index] - 255) * amount)
        .toString(16)
        .padStart(2, "0");

    return `#${channel(0)}${channel(1)}${channel(2)}`;
}

function getLightColor(light) {
    const value = Number(light);
    const baseline = 500;
    const isAboveBaseline = value > baseline;
    const startColor = isAboveBaseline ? [255, 255, 255] : [55, 62, 67];
    const endColor = isAboveBaseline ? [255, 213, 74] : [255, 255, 255];
    const rangeStart = isAboveBaseline ? baseline : 141;
    const rangeEnd = isAboveBaseline ? 1500 : baseline;
    const amount = Math.min(Math.max((value - rangeStart) / (rangeEnd - rangeStart), 0), 1);
    const channel = (index) => Math.round(
        startColor[index] + (endColor[index] - startColor[index]) * amount
    ).toString(16).padStart(2, "0");

    return `#${channel(0)}${channel(1)}${channel(2)}`;
}

function getCoralStressColor(stress) {
    const progress = Math.min(Math.max((stress - 60) / 20, 0), 1);
    const start = [2, 146, 165];
    const end = [229, 57, 53];
    const channel = (index) => Math.round(start[index] + (end[index] - start[index]) * progress)
        .toString(16)
        .padStart(2, "0");

    return `#${channel(0)}${channel(1)}${channel(2)}`;
}

function SimInfoDisplay({yearsElapsed,season="summer",light,temp,stress=0,poll,corals,simEnd=false}){
    const collected = corals?.collected.length ?? 0;
    const totalCorals = corals?.total ?? 0;
    const showSeasonIndicator = yearsElapsed >= 1 && yearsElapsed < GAME_YEARS && !simEnd; // not behind the end screen
    const summerIsBleaching = isBleachingYear(yearsElapsed);
    const coralStressIsHigh = stress >= 80;
    const coralStressColor = getCoralStressColor(stress);
    const timelineProgress = Math.min(Math.max(yearsElapsed / GAME_YEARS, 0), 1);
    const displayedPollution = Math.round(poll * 2) / 2
    const temperatureColor = getTemperatureColor(temp);
    const lightColor = getLightColor(light);
    const dots = [ 
        "large", "small", 
        "large", "small", 
        "large", "small", 
        "large", "small", 
        "large", "small", 
        "large", "small", 
        "large", "small", 
        "large", "small", 
        "large", "small", 
        "large", "small", "large" ];
    
    return(
        <div className="SimInfoDisplayContainer">
            <div className="SimInfoDial">
                <div className="SimInfoDialIcon">
                    <svg
                        className={coralStressIsHigh ? "SimInfoDialIconWarning" : ""}
                        viewBox="0 0 45 43"
                        role="img"
                        aria-label="Coral stress level"
                    >
                        <rect x="1" y="1" width="43" height="41" rx="20.5" fill={coralStressColor} stroke="white" strokeWidth="2" />
                        <path fillRule="evenodd" clipRule="evenodd" d="M24.3604 12.1099C26.4109 10.3276 29.8524 8.45812 32.9991 12.0337C37.743 17.4251 33.8455 29.7183 23.4532 35.5044L26.0215 25.2124L22.0782 21.8931L24.3604 12.1099ZM12 12.0337C15.7698 7.74966 19.9617 11.2837 21.6787 13.1177L18.627 21.8931L23.3106 27.4253L21.2608 35.2798C11.0827 29.4338 7.29979 17.3749 12 12.0337Z" fill="white" />
                    </svg>
                </div>
                <img className="SimInfoDialPin" src={asset("SimInfoDialPin.svg")} alt={`${Math.round(stress)} out of 100`} style={{ transform: `rotate(${stress * 1.8 - 90}deg)` }} />
                <img className="hoverPreview" src={asset("tooltips/tooltip_stress.png")} alt="The dial begins on the left and slowly moves right. If it reaches the right, the corals die and the simulation ends." />
            </div>
            <div className="SimInfoTimeline">
            {showSeasonIndicator ? (
            <span className={`SeasonIndicator ${season}`} aria-label={season === "summer" ? (summerIsBleaching ? "Summer bleaching season" : "Summer mild season") : "Winter recovery season"}>
                {season === "summer" ? (summerIsBleaching ? "Summer: bleaching season" : "Summer: mild season") : "Winter: reef recovery"}
            </span>
            ) : null}
            <span className="SimInfoText">2026</span>

            <div className="TimelineTrack">
                {dots.map((type, index) => (
                    <span
                        key={index}
                        className={
                            type === "large"
                            ? "TimelineDotLarge"
                            : "TimelineDotSmall"
                        }
                    ></span>
                ))}

                {/* moving dot indicator */}
                <span
                    className="TimelineIndicator"
                    style={{
                        // from the first dot to the last, whatever the track's width (5px is the marker's own width)
                        left: `calc(${timelineProgress} * (100% - 5px))`
                    }}
                />
                {/*<img className="hoverPreview" src={asset("tooltip_timeline.png")} />*/}
            </div>

            <span className="SimInfoText">2036</span>
            </div>
            <div className="SimInfoBottom">
                <div className="statusGroup">
                    <span
                        className="TemperatureIcon"
                        aria-hidden="true"
                        style={{
                            backgroundColor: temperatureColor,
                            maskImage: `url(${asset("temperature.svg")})`,
                            WebkitMaskImage: `url(${asset("temperature.svg")})`
                        }}
                    />
                    <span className="SimInfoText TemperatureValue" style={{ color: temperatureColor }}>
                        {temp}°C
                    </span>
                    <img className="hoverPreview" src={asset("tooltips/tooltip_temperature.png")} alt="Temperature, in degrees Celsius." />
                </div>
                <div className="statusGroup">
                    <span
                        className="LightIcon"
                        aria-hidden="true"
                        style={{
                            backgroundColor: lightColor,
                            maskImage: `url(${asset("light_level.svg")})`,
                            WebkitMaskImage: `url(${asset("light_level.svg")})`
                        }}
                    />
                    <span className="SimInfoText LightValue" style={{ color: lightColor }}>{light}</span>
                    <img className="hoverPreview" src={asset("tooltips/tooltip_light_level.png")} alt="Light level, in µMol/m² per second: a measure of light intensity for growth and photosynthesis." />
                </div>
                <div className="statusGroup">
                    <img className="SimInfoIcon" src={asset("poop.svg")} alt="Pollution" />
                    <span className="SimInfoText">{displayedPollution}</span>
                    <img className="hoverPreview" src={asset("tooltips/tooltip_pollution.png")} alt="Pollution, in µMol: the amount of nutrients expelled from sewage waste." />
                </div>
                {/* The coral collection: one pip for each kind of coral, filled in as the player finds them */}
                <div
                    className={`statusGroup collectionGroup${totalCorals > 0 && collected === totalCorals ? " complete" : ""}`}
                    role="img"
                    aria-label={`Corals collected: ${collected} of ${totalCorals}`}
                >
                    <span className="SimInfoText collectionLabel">Corals</span>
                    <span className="collectionPips">
                        {Array.from({ length: totalCorals }, (_, i) => (
                            <span key={i} className={`collectionPip${i < collected ? " found" : ""}`} />
                        ))}
                    </span>
                    {/* keyed by the count, so the number pops each time it goes up */}
                    <span key={collected} className="SimInfoText collectionValue">{collected}/{totalCorals}</span>
                </div>
            </div>
        </div>
    )
}


// The HUD wired straight to the scene. It listens for "stats-changed" itself (four times a second while the
// clock runs), so only the HUD is drawn again each time, not the whole app.
export function LiveSimInfoDisplay({ scene }) {
    const [stats, setStats] = useState(() => scene.getStats());

    useEffect(() => {
        const events = scene.game.events; // kept so cleanup still works after the game is destroyed
        events.on("stats-changed", setStats);
        return () => events.off("stats-changed", setStats);
    }, [scene]);

    return (
        <SimInfoDisplay
            yearsElapsed={stats.yearsElapsed}
            season={stats.season}
            light={stats.light}
            temp={stats.temperature}
            stress={stats.stress}
            poll={stats.pollution}
            corals={stats.corals}
            simEnd={stats.simEnd}
        />
    );
}

export default SimInfoDisplay;