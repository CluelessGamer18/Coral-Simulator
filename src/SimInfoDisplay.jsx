import "./styles/SimInfoDisplay.css";
import { asset } from "./assetUrl";

function SimInfoDisplay({timejump,light,temp,stress=0,poll,score=0}){
    timejump = 2*timejump
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
                <img className="SimInfoDialIcon" src={asset("stress_level.svg")}></img>
                <img className="SimInfoDialPin" src={asset("SimInfoDialPin.svg")} style={{ transform: `rotate(${stress * 1.8 - 90}deg)` }} ></img>
                <img className="hoverPreview" src={asset("tooltips/tooltip_stress.png")} />
            </div>
            <div className="SimInfoTimeline">
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
                        transform: `translateX(${timejump * 8.59}px)`
                    }}
                />
                {/*<img className="hoverPreview" src={asset("tooltip_timeline.png")} />*/}
            </div>

            <span className="SimInfoText">2036</span>
            </div>
            <div className="SimInfoBottom">
                <div className="statusGroup">
                    <img className="SimInfoIcon" src={asset("temperature.svg")}></img>
                    <span className="SimInfoText">{temp}°C</span>
                    <img className="hoverPreview" src={asset("tooltips/tooltip_temperature.png")} />
                </div>
                <div className="statusGroup">
                    <img className="SimInfoIcon" src={asset("light_level.svg")}></img>
                    <span className="SimInfoText">{light}</span>
                    <img className="hoverPreview" src={asset("tooltips/tooltip_light_level.png")} />
                </div>
                <div className="statusGroup">
                    <img className="SimInfoIcon" src={asset("poop.svg")}></img>
                    <span className="SimInfoText">{poll}</span>
                    <img className="hoverPreview" src={asset("tooltips/tooltip_pollution.png")} />
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