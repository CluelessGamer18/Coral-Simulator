import {useState} from "react";
import "./BoxStyle.css";

function ToggleBox({onChange}){
    const [on, SetOn] = useState(false);
    const handleClick = () => {
        const newValue = !on;
        SetOn(newValue);
        onChange(newValue);
    }
    return(
        <div className={`toggle ${on ? "on" : ""}`} onClick={handleClick}></div>
    )
}

export default ToggleBox;