import "./styles/SimInfoDisplay.css";

function SimInfoDisplay({timejump,light,temp,stress=0,poll}){
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
                <img className="SimInfoDialIcon" src="/stress_level.svg"></img>
                <img className="SimInfoDialPin" src="/SimInfoDialPin.svg" style={{ transform: `rotate(${stress * 1.8 - 90}deg)` }} ></img>
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
            </div>

            <span className="SimInfoText">2036</span>
            </div>
            <div className="SimInfoBottom">
                <div className="statusGroup">
                    <img className="SimInfoIcon" src="/temperature.svg"></img>
                    <span className="SimInfoText">{temp}°C</span>
                </div>
                <div className="statusGroup">
                    <img className="SimInfoIcon" src="/light_level.svg"></img>
                    <span className="SimInfoText">{light}</span>
                </div>
                <div className="statusGroup">
                    <img className="SimInfoIcon" src="/poop.svg"></img>
                    <span className="SimInfoText">{poll}</span>
                </div>
            </div>
        </div>
    )
}


export default SimInfoDisplay;