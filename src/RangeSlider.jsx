import {useState} from 'react';
import './styles/SliderStyle.css'

function RangeSlider({ min = 0, max = 100, middle = false, onChange }) {
    const initialValue = 0 //middle ? Math.floor((min + max) / 2) : min;

    const [value, setValue] = useState(initialValue);

    const handleChange = (e) => {
        const newValue = Number(e.target.value);
        setValue(newValue);
        onChange(newValue);
    };

    return (
        <div className="slideContainer">
            <input
                type="range"
                min={min}
                max={max}
                value={value}
                onChange={handleChange}
                className="slider"
            />
        </div>
    );
}


export default RangeSlider