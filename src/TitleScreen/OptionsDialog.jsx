import "./TitleScreen.css";

import { useNavigate } from "react-router";

function OptionsDialog({
    setShowOptions,
    setShowTitleScreen = null,
    endSim = null,
    setScene = null,
    scene,
    musicVolume,
    setMusicVolume,
    sfxVolume,
    setSfxVolume
    }) {

    const navigate = useNavigate();


    const handleMusicChange = (e) => {
        const value = Number(e.target.value);
        setMusicVolume(value);

        // send to phaser (if available)
        if (scene?.setMusicVolume) {
            scene.setMusicVolume(value);
        }
    };

    const handleSfxChange = (e) => {
        const value = Number(e.target.value);
        setSfxVolume(value);

        if (scene?.setSfxVolume) {
            scene.setSfxVolume(value);
        }
    };

    const returnToTitle = () => {
        setShowOptions(false);
        if(setShowTitleScreen && setScene){
            setShowTitleScreen(true);
            setScene(null)
            endSim();
        }
    }
    const goToResources = () => {
        setShowOptions(false);
        navigate("/about");
        if(setShowTitleScreen && setScene){
            setShowTitleScreen(true);
            setScene(null)
            endSim();
        }
    };

    return(
        <>
        <div className="OptionsBoxContainer">
            <button className="OptionsXButton" onClick={()=>setShowOptions(false)}>X</button>
            <h1 className="OptionsTitle">Options</h1>
            <div className="OptionsSliderGroup">
                <label>Music Volume</label>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={musicVolume}
                    onChange={handleMusicChange}
                />
            </div>

            <div className="OptionsSliderGroup">
                <label>SFX Volume</label>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={sfxVolume}
                    onChange={handleSfxChange}
                />
            </div>
            <button className="OptionHighlightedButton" onClick={()=>setShowOptions(false)}>Resume</button>
            
        
            {/* <button className="OptionsDialogButton">Settings</button> */}
            <button className="OptionsDialogButton" onClick={returnToTitle}>Return to Title</button>
            <button className="OptionsDialogButton" onClick={goToResources}>Resources</button>
        </div>

        </>
    )
}

export default OptionsDialog;
