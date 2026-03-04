import "./styles/SimInfoDisplay.css";

function SimInfoDisplay({timejump=0,light=50,temp=20,stress=0,pollution=0}){
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
                <span className="SimInfoDialIcon">🌞</span>
                <span className="SimInfoDialPin">🔻</span>
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
                <span className="SimInfoIcon">🌡️</span>
                <span className="SimInfoText">{temp}°C</span>
                <span className="SimInfoIcon">❤️‍🩹</span>
                <span className="SimInfoText">{stress}%</span>
                <span className="SimInfoIcon">🗑️</span>
                <span className="SimInfoText">{pollution}</span>
            </div>
        </div>
    )
}


export default SimInfoDisplay;