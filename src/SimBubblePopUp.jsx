import './styles/SimBubblePopUp.css'
import { useState } from 'react';
function SimBubblePopUp({type,onChange, setCollision}){
    let min, max, initialValue,label;

    //Change Initial value to current value w/some sort of logic
    if(type == "temp"){
        min = 15;
        max = 35;
        initialValue = 22;
        label = "Change Temperature";
    }
    const [value, setValue] = useState(initialValue);
    
    const handleChange = (e) => {
        const newValue = Number(e.target.value);
        setValue(newValue);
    };

    const handleSubmitClick = () => {
        onChange(value);
        setCollision(false);
    }
    return(
        <div className="SimBubblePopUp">
            <div className="SimBubblePopUpSliderContainer">
                <div className="SimBubblePopUpSlider">
                    <input
                        type="range"
                        min={min}
                        max={max}
                        value={value}
                        onChange={handleChange}
                        className="slider"
                    />
                </div>
                <p className="SimBubblePopUpSliderLabel">{value}°C</p>
            </div>
            <div className="SimBubblePopUpIconContainer">
                <img className="SimBubblePopUpIcon" src="/temperature.png"></img>
                <p className="SimBubblePopUpIconLabel">{label}</p>
            </div>
            <button className="SimBubblePopUpSubmit" onClick={handleSubmitClick}>Save & Jump Forward 1 Year</button>
            <button className="SimBubblePopUpGoBack">Go Back</button>
        </div>
    )
}

export default SimBubblePopUp;