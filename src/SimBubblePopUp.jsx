import './styles/SimBubblePopUp.css'
import { useState, useEffect, useRef } from 'react';
import { asset } from './assetUrl';

//Change Initial value to current value w/some sort of logic

const CONFIG = {
        temp: {
        min: 18,
        max: 35,
        title: "Set Bubble Value",
        subtitle: "Temperature (°C)",
        icon: asset("temp_bubble.svg"),
        graph: asset("graphs/temperatureGraph.svg"),
        graphAlt: "Graph of coral health against temperature: corals are only safe between 24 and 32 °C.",
        dangerA: 24,
        dangerB: 32,
        },
        light: {
        min: 0,
        max: 2000,
        title: "Set Bubble Value",
        subtitle: "Light Level (µMol/m\u00B2/s)",
        icon: asset("light_level_bubble.svg"),
        graph: asset("graphs/light_levelGraph.svg"),
        graphAlt: "Graph of coral health against light level: corals are only safe between 140 and 1840 µMol/m²/s.",
        dangerA: 140,
        dangerB: 1840,
        },
        poll: {
        min: 0,
        max: 13,
        title: "Set Bubble Value",
        subtitle: "Nutrient Level (µMolar)",
        icon: asset("pollution_bubble.svg"),
        graph: asset("graphs/pollutionGraph.svg"),
        graphAlt: "Graph of coral health against nutrient level: corals are only safe between 0 and 6 µMolar.",
        dangerA: 0,
        dangerB: 6,
        }

}
function SimBubblePopUp({type, initialValue, onApply, onCancel}){
    const { min, max, title, subtitle, icon, graph, graphAlt, dangerA, dangerB } = CONFIG[type]
    const [ready, setReady] = useState(false);

    const [danger, setDanger] = useState(() => initialValue >= dangerB || initialValue <= dangerA);
    const [value, setValue] = useState(initialValue);
    const [displayLeft, setdisplayLeft] = useState(0);
    const sliderRef = useRef(null);
    
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
        onApply(value);
    }

    const handleCancelClick = () => {
        onCancel();
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
                <img className="SimBubblePopUpHeaderIcon" src={icon} alt="" />
                <div className="SimBubblePopUpHeaderText">
                    <div className="SimBubblePopUpHeaderTitle">{title}</div>
                    <div className="SimBubblePopUpHeaderSubtitle">{subtitle}</div>
                </div>
            </div>
            <img className="SimBubblePopUpGraph" src={graph} alt={graphAlt} />
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
                <img className="warningIcon" src={asset("warning.svg")} alt="Warning" />
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