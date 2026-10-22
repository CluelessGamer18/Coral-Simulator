import "./TitleScreen.css";

import { useNavigate } from "react-router";

function OptionsDialog({
    setShowOptions,
    setShowTitleScreen = null,
    resetSimState = null,
    setScene = null,
    musicVolume,
    setMusicVolume,
    musicMuted,
    setMusicMuted,
    sfxVolume,
    setSfxVolume,
    sfxMuted,
    setSfxMuted
    }) {

    const navigate = useNavigate();


    const handleMusicChange = (e) => {
        setMusicVolume(Number(e.target.value));
    };

    const handleSfxChange = (e) => {
        setSfxVolume(Number(e.target.value));
    };

    const returnToTitle = () => {
        setShowOptions(false);
        if(setShowTitleScreen && setScene){
            setShowTitleScreen(true);
            setScene(null)
            resetSimState();
        }
    }
    const goToResources = () => {
        setShowOptions(false);
        navigate("/about");
        if(setShowTitleScreen && setScene){
            setShowTitleScreen(true);
            setScene(null)
            resetSimState();
        }
    };

    return(
        <>
        <div className="OptionsBoxContainer">
            <button className="OptionsXButton" aria-label="Close options" onClick={()=>setShowOptions(false)}>X</button>
            <h1 className="OptionsTitle">Options</h1>
            <div className="OptionsSliderGroup">
                <label>Music Volume</label>
                <div className="OptionsSliderControls">
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={musicVolume}
                        onChange={handleMusicChange}
                    />
                    <button
                        type="button"
                        className="OptionsMuteButton"
                        aria-label={musicMuted ? "Unmute music" : "Mute music"}
                        aria-pressed={musicMuted}
                        onClick={() => setMusicMuted(!musicMuted)}
                    >
                        {musicMuted ? "Unmute" : "Mute"}
                    </button>
                </div>
            </div>

            <div className="OptionsSliderGroup">
                <label>SFX Volume</label>
                <div className="OptionsSliderControls">
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={sfxVolume}
                        onChange={handleSfxChange}
                    />
                    <button
                        type="button"
                        className="OptionsMuteButton"
                        aria-label={sfxMuted ? "Unmute sound effects" : "Mute sound effects"}
                        aria-pressed={sfxMuted}
                        onClick={() => setSfxMuted(!sfxMuted)}
                    >
                        {sfxMuted ? "Unmute" : "Mute"}
                    </button>
                </div>
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
