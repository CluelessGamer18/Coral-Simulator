// import titleCard from "/TitleCard.jpg";
// import {useState} from 'react';
import "./TitleScreen.css";
import { useNavigate } from 'react-router-dom';
// import OptionsDialog from "./OptionsDialog.jsx";

function TitleScreen({setShowTitleScreen}){
    const navigate = useNavigate();
    // const [showOptions, setShowOptions] = useState(false);

 return(
    <>
        <div className="TitleScreenContainer">

            <div className="waveWrapper"><div className="backgroundWave"></div></div>
            <h1 className="CoralSimTitle">CORAL LIFE WATCH</h1>
            <button className="StartButton" onClick={() => setShowTitleScreen(false)}>Start</button>
            <button className="OptionsButton" onClick={() => navigate("/about")}>About</button>
        </div>
        
    </>

 )
}


export default TitleScreen;