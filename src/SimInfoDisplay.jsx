import "./styles/SimInfoDisplay.css";

function SimInfoDisplay({light=50,temp=20,stress=0,pollution=0}){
    return(
        <div className="SimInfoDisplayContainer">
            <div className="SimInfoDial">
                <span className="SimInfoDialIcon">🌞</span>
                <span className="SimInfoDialPin">🔻</span>
            </div>
            <div className="SimInfoTimeline">
                    <span className="SimInfoText">2026</span> 
                    <span className="TimelineDotLarge active"></span>
                    <span className="TimelineDotSmall"></span>
                    <span className="TimelineDotLarge"></span>
                    <span className="TimelineDotSmall"></span>
                    <span className="TimelineDotLarge"></span>
                    <span className="TimelineDotSmall"></span>
                    <span className="TimelineDotLarge"></span>
                    <span className="TimelineDotSmall"></span>
                    <span className="TimelineDotLarge"></span>
                    <span className="TimelineDotSmall"></span>
                    <span className="TimelineDotLarge"></span>
                    <span className="TimelineDotSmall"></span>
                    <span className="TimelineDotLarge"></span>
                    <span className="TimelineDotSmall"></span>
                    <span className="TimelineDotLarge"></span>
                    <span className="TimelineDotSmall"></span>
                    <span className="TimelineDotLarge"></span>
                    <span className="TimelineDotSmall"></span>
                    <span className="TimelineDotLarge"></span>
                    <span className="TimelineDotSmall"></span>
                    <span className="TimelineDotLarge"></span>
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