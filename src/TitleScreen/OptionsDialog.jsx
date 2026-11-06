import "./TitleScreen.css";

function OptionsDialog({
    setShowOptions,
    goToTutorial,
    returnToTitle,
    goToResources,
    musicVolume,
    setMusicVolume,
    musicMuted,
    setMusicMuted,
    sfxVolume,
    setSfxVolume,
    sfxMuted,
    setSfxMuted,
    oceanSounds,
    setOceanSounds,
    controlScheme,
    setControlScheme
    }) {

    const handleMusicChange = (e) => {
        setMusicVolume(Number(e.target.value));
    };

    const handleSfxChange = (e) => {
        setSfxVolume(Number(e.target.value));
    };

    const openResources = () => {
        goToResources();
    };

    return(
        <>
        <div className="OptionsBoxContainer">
            <button className="OptionsXButton" aria-label="Close options" onClick={()=>setShowOptions(false)}>X</button>
            <h1 className="OptionsTitle">Options</h1>
            <div className="OptionsSliderGroup" role="group" aria-labelledby="options-background-sound">
                <span id="options-background-sound">Background Sound</span>
                <div className="OptionsSliderControls">
                    <button
                        type="button"
                        className="OptionsKeysButton"
                        aria-pressed={!oceanSounds}
                        onClick={() => setOceanSounds(false)}
                    >
                        Music
                    </button>
                    <button
                        type="button"
                        className="OptionsKeysButton"
                        aria-pressed={oceanSounds}
                        onClick={() => setOceanSounds(true)}
                    >
                        Ocean Sounds
                    </button>
                </div>
            </div>

            <div className="OptionsSliderGroup">
                <label>{oceanSounds ? "Ocean Volume" : "Music Volume"}</label>
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
                        aria-label={`${musicMuted ? "Unmute" : "Mute"} ${oceanSounds ? "ocean sounds" : "music"}`}
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

            <div className="OptionsSliderGroup" role="group" aria-labelledby="options-movement-keys">
                <span id="options-movement-keys">Movement Keys</span>
                <div className="OptionsSliderControls">
                    <button
                        type="button"
                        className="OptionsKeysButton"
                        aria-pressed={controlScheme === "wasd"}
                        onClick={() => setControlScheme("wasd")}
                    >
                        WASD
                    </button>
                    <button
                        type="button"
                        className="OptionsKeysButton"
                        aria-pressed={controlScheme === "arrows"}
                        onClick={() => setControlScheme("arrows")}
                    >
                        Arrow Keys
                    </button>
                </div>
            </div>
            <button className="OptionHighlightedButton" onClick={()=>setShowOptions(false)}>Resume</button>
            
        
            {/* <button className="OptionsDialogButton">Settings</button> */}
            <button className="OptionsDialogButton" onClick={returnToTitle}>Return to Title</button>
            <button className="OptionsDialogButton" onClick={goToTutorial}>Go to Tutorial</button>
            <button className="OptionsDialogButton" onClick={openResources}>Resources</button>
        </div>

        </>
    )
}

export default OptionsDialog;
