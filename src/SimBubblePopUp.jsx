import './styles/SimBubblePopUp.css'
import { useState, useEffect, useRef } from 'react';
function SimBubblePopUp({type,initialValue, onChange, setCollision}){
    let min, max, label, graph, dangerA, dangerB;

    //Change Initial value to current value w/some sort of logic
    if(type == "temp"){
        min = 18;
        max = 35;
        label = "temperaturebubbletitle.png";
        graph = "temperaturegraph.png";
        dangerA = 24;
        dangerB = 31;
    } else if(type == "light"){
        min = 0;
        max = 2000;
        label = "/lightlevelbubbletitle.png"
        graph = "/lightlevelgraph.png";
        dangerA = 140;
        dangerB = 1840;
    } else if(type == "poll"){
        min = 0;
        max = 13;
        label = "/pollutionbubbletitle.png";
        graph = "pollutiongraph.png";
        dangerA = 0;
        dangerB = 6;
    }
    const [danger, setDanger] = useState(false);
    const [value, setValue] = useState(initialValue);
    const [displayLeft, setdisplayLeft] = useState(0);
    const sliderRef = useRef(null);
    
    useEffect(() => {
        if (initialValue >= dangerB || initialValue <= dangerA){
            setDanger(true);
        } 
    },[])

    useEffect(() => {
        const slider = sliderRef.current;
        if (!slider) return;

        const percent = (value - min) / (max - min);

        const thumbWidth = 20;    
        const thumbRadius = thumbWidth / 2;
        const offset = 2;

        const sliderWidth = slider.offsetWidth;
        const usableWidth = sliderWidth - thumbWidth;

        setdisplayLeft(percent * usableWidth + thumbRadius + offset);
    }, [value, min, max]);

    const handleChange = (e) => {
        const newValue = Number(e.target.value);
        setValue(newValue);
        if (newValue >= dangerB || newValue <= dangerA){
            setDanger(true);
        } else {
            setDanger(false);
        }
    };

    const handleSubmitClick = () => {
        onChange(value);
        setCollision(false);
    }

    const handleCancelClick = () => {
        setCollision(false);
    }
    return(
        <div className="SimBubblePopUp">
            <img className="SimBubblePopUpGraph" src={graph}></img>
            <div className="SimBubblePopUpSlider">
                <input
                    ref={sliderRef}
                    type="range"
                    min={min}
                    max={max}
                    value={value}
                    onChange={handleChange}
                    className="slider"
                />
                {/*<div className="SimBubblePopUpSliderOutputLine" style={{ left: displayLeft }}></div>*/}
                <div className="SimBubblePopUpSliderOutput" style={{ left: displayLeft }}>
                {value}
                </div>
            </div>
            <img className="SimBubblePopUpTitle"src={label}></img>
            <p className="SimBubblePopUpTutorial">Move the slider to the desired value under a custom duration over time.</p>
            {danger ? <img className="SimBubblePopUpWarning"src="/warning.png"></img> : null}
            <button className="SimBubblePopUpSubmit" onClick={handleSubmitClick}>Apply</button>
            <button className="SimBubblePopUpGoBack" onClick={handleCancelClick}>Cancel</button>
        </div>
    )
}

export default SimBubblePopUp;