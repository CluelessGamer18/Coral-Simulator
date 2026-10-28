import "./styles/SimInfoDisplay.css";
import { asset } from "./assetUrl";

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

function SimInfoDisplay({yearsElapsed,season="summer",light,temp,stress=0,poll,score=0}){
    const showSeasonIndicator = yearsElapsed >= 1;
    yearsElapsed = 2*yearsElapsed
    const displayedPollution = Math.round(poll * 2) / 2
    const temperatureColor = getTemperatureColor(temp);
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
                <img className="SimInfoDialIcon" src={asset("stress_level.svg")} alt="Coral stress level" />
                <img className="SimInfoDialPin" src={asset("SimInfoDialPin.svg")} alt={`${Math.round(stress)} out of 100`} style={{ transform: `rotate(${stress * 1.8 - 90}deg)` }} />
                <img className="hoverPreview" src={asset("tooltips/tooltip_stress.png")} alt="The dial begins on the left and slowly moves right. If it reaches the right, the corals die and the simulation ends." />
            </div>
            <div className="SimInfoTimeline">
            {showSeasonIndicator ? (
            <span className={`SeasonIndicator ${season}`} aria-label={season === "summer" ? "Summer bleaching season" : "Winter recovery season"}>
                {season === "summer" ? "Summer: bleaching season" : "Winter: reef recovery"}
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
                        transform: `translateX(${yearsElapsed * 8.59}px)`
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
                    <img className="SimInfoIcon" src={asset("light_level.svg")} alt="Light level" />
                    <span className="SimInfoText">{light}</span>
                    <img className="hoverPreview" src={asset("tooltips/tooltip_light_level.png")} alt="Light level, in µMol/m² per second: a measure of light intensity for growth and photosynthesis." />
                </div>
                <div className="statusGroup">
                    <img className="SimInfoIcon" src={asset("poop.svg")} alt="Pollution" />
                    <span className="SimInfoText">{displayedPollution}</span>
                    <img className="hoverPreview" src={asset("tooltips/tooltip_pollution.png")} alt="Pollution, in µMol: the amount of nutrients expelled from sewage waste." />
                </div>
                <div className="statusGroup scoreGroup">
                    <span className="SimInfoText scoreLabel">Score</span>
                    <span className="SimInfoText scoreValue">{score}</span>
                </div>
            </div>
        </div>
    )
}


export default SimInfoDisplay;