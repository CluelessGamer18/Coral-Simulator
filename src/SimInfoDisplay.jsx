import "./styles/SimInfoDisplay.css";

function SimInfoDisplay({timejump,light,temp,stress=0,poll}){
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
                <img className="SimInfoDialIcon" src="/stress_level.png"></img>
                <img className="SimInfoDialPin" src="/SimInfoDialPin.png" style={{ transform: `rotate(${stress * 1.8 - 90}deg)` }} ></img>
            </div>
            <div className="SimInfoTimeline">
            <span className="SimInfoText">2026</span>

            {dots.map((type, index) => (
                <span
                key={index}
                className={
                    type === "large"
                    ? `TimelineDotLarge ${index === timejump ? "active" : ""}`
                    : `TimelineDotSmall ${index === timejump ? "active" : ""}`
                }
                ></span>
            ))}

            <span className="SimInfoText">2036</span>
            </div>
            <div className="SimInfoBottom">
                <img className="SimInfoIcon" src="/temperature.png"></img>
                <span className="SimInfoText">{temp}°C</span>
                <img className="SimInfoIcon" src="/light_level.png"></img>
                <span className="SimInfoText">{light}</span>
                <img className="SimInfoIcon" src="/poop.png"></img>
                <span className="SimInfoText">{poll}</span>
            </div>
        </div>
    )
}


export default SimInfoDisplay;