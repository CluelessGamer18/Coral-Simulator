import titleCard from "/TitleCard.jpg";
import {useState} from 'react';
import "./TitleScreen.css";
import OptionsDialog from "./OptionsDialog.jsx";

function TitleScreen({setShowTitleScreen}){
const [showOptions, setShowOptions] = useState(false);

 return(
    <>
        <div className="TitleScreenContainer">
            <img src={titleCard} className="TitleArt"></img>
            <button className="StartButton" onClick={() => setShowTitleScreen(false)}>Start</button>
            <button className="OptionsButton" onClick={() => setShowOptions(true)}>Options</button>
        </div>
        {showOptions ? <OptionsDialog setShowOptions={setShowOptions}/> : null}
        
    </>

 )
}


export default TitleScreen;