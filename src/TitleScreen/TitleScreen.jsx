// import titleCard from "/TitleCard.jpg";
// import {useState} from 'react';
import "./TitleScreen.css";
import { useNavigate } from 'react-router';
// import OptionsDialog from "./OptionsDialog.jsx";

function TitleScreen({hasExistingGame, onStartNewGame, onResume}){
    const navigate = useNavigate();
    // const [showOptions, setShowOptions] = useState(false);

 return(
    <>
        <div className="TitleScreenContainer">

            <div className="waveWrapper"><div className="backgroundWave"></div></div>
            <h1 className="CoralSimTitle">CORAL LIFE WATCH</h1>
            {hasExistingGame ? (
                <>
                    <button className="StartButton" onClick={onResume}>Resume Game</button>
                    <button className="OptionsButton" onClick={onStartNewGame}>Start New Game</button>
                </>
            ) : (
                <button className="StartButton" onClick={onStartNewGame}>Start</button>
            )}
            <button className="OptionsButton" onClick={() => navigate("/about")}>About</button>
        </div>
        
    </>

 )
}


export default TitleScreen;