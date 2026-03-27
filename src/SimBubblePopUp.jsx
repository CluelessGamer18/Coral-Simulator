import './styles/SimBubblePopUp.css'
import { useState, useEffect, useRef } from 'react';

//Change Initial value to current value w/some sort of logic

const CONFIG = {
        temp: {
        min: 18,
        max: 35,
        title: "Set Bubble Value",
        subtitle: "Temperature (°C)",
        icon: "/temp_bubble.svg",
        graph: "temperatureGraph.svg",
        dangerA: 24,
        dangerB: 32,
        },
        light: {
        min: 0,
        max: 2000,
        title: "Set Bubble Value",
        subtitle: "Light Level (µMol/m\u00B2/s)",
        icon: "/light_level_bubble.svg",
        graph: "/light_levelGraph.svg",
        dangerA: 140,
        dangerB: 1840,
        },
        poll: {
        min: 0,
        max: 13,
        title: "Set Bubble Value",
        subtitle: "Nutrient Level (µMolar)",
        icon: "/pollution_bubble.svg",
        graph: "pollutionGraph.svg",
        dangerA: 0,
        dangerB: 6,
        }

}
function SimBubblePopUp({type,initialValue, onChange, setCollision}){
    const { min, max, title, subtitle, icon, graph, dangerA, dangerB } = CONFIG[type]
    const [ready, setReady] = useState(false);

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

useEffect(() => {
    const handleReady = () => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                setReady(true);
            });
        });
    };

    if (document.readyState === "complete") {
        handleReady();
    } else {
        window.addEventListener("load", handleReady);
        return () => window.removeEventListener("load", handleReady);
    }
}, []);

    return(
        <div className={`SimBubblePopUp ${ready ? "show" : ""}`}>
            <div className="SimBubblePopUpHeader">
                <img className="SimBubblePopUpHeaderIcon" src={icon} />
                <div className="SimBubblePopUpHeaderText">
                    <div className="SimBubblePopUpHeaderTitle">{title}</div>
                    <div className="SimBubblePopUpHeaderSubtitle">{subtitle}</div>
                </div>
            </div>
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
            <p className="SimBubblePopUpTutorial">Move the slider to the desired value under a custom duration over time.</p>
            {danger ? 
            <div className="bubbleAlert">
                <img className="warningIcon"src="/warning.svg"></img>
                <div className="alertText">Setting to this value will cause irreversible coral bleaching and death within a year.</div>
            </div> : null}
            <div className="submitButtonWrapper">
                <button className="SimBubblePopUpGoBack" onClick={handleCancelClick}>Cancel</button>
                <button className="SimBubblePopUpSubmit" onClick={handleSubmitClick}>Apply</button>
            </div>
        </div>
    )
}

export default SimBubblePopUp;