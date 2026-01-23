import {useState} from 'react';
import './SliderStyle.css'

function RangeSlider({onChange}){
    const [value, setValue] = useState(1);

    const handleChange = (e) => { 
        const newValue = e.target.value; 
        setValue(newValue); 
        onChange(newValue);
    };

    return(
        <>
            <div className="slideContainer">
                <input 
                type="range" 
                min="50" 
                max="150" 
                value={value} 
                onChange={handleChange}
                id="myRange" 
                className="slider"></input>
            </div>
        </>
    )
}

export default RangeSlider