import "../styles/OptionsDialog.css";

/**
 * The Options menu, opened from the settings button or with Escape during a game. The game is paused while it's open.
 * @param {object} props
 * @param {() => void} props.onClose
 * @param {() => void} props.onGoToTutorial
 * @param {() => void} props.onReturnToTitle
 * @param {() => void} props.onGoToResources
 * @param {{ musicVolume: number, sfxVolume: number, musicMuted: boolean, sfxMuted: boolean }} props.audio
 * @param {(changes: object | ((audio: object) => object)) => void} props.onAudioChange called with just the values
 *   that change, or a function that works them out from the current settings
 * @param {boolean} props.oceanSounds Ocean Sounds plays in place of the music
 * @param {(enabled: boolean) => void} props.onOceanSoundsChange
 * @param {"wasd" | "arrows"} props.controlScheme the keys that swim
 * @param {(scheme: "wasd" | "arrows") => void} props.onControlSchemeChange
 */
function OptionsDialog({
    onClose,
    onGoToTutorial,
    onReturnToTitle,
    onGoToResources,
    audio,
    onAudioChange,
    oceanSounds,
    onOceanSoundsChange,
    controlScheme,
    onControlSchemeChange,
}) {
    const { musicVolume, sfxVolume, musicMuted, sfxMuted } = audio;
    const backgroundName = oceanSounds ? "ocean sounds" : "music";

    return (
        <div className="OptionsDialog" role="dialog" aria-modal="true" aria-labelledby="options-title">
            <button type="button" className="OptionsDialogClose" aria-label="Close options" onClick={onClose}>
                ×
            </button>
            <h1 className="OptionsDialogTitle" id="options-title">
                Options
            </h1>

            <div className="OptionsDialogGroup" role="group" aria-labelledby="options-background-sound">
                <span id="options-background-sound">Background Sound</span>
                <div className="OptionsDialogControls">
                    <button
                        type="button"
                        className="OptionsDialogToggle"
                        aria-pressed={!oceanSounds}
                        onClick={() => onOceanSoundsChange(false)}
                    >
                        Music
                    </button>
                    <button
                        type="button"
                        className="OptionsDialogToggle"
                        aria-pressed={oceanSounds}
                        onClick={() => onOceanSoundsChange(true)}
                    >
                        Ocean Sounds
                    </button>
                </div>
            </div>

            <div className="OptionsDialogGroup">
                <label htmlFor="options-music-volume">{oceanSounds ? "Ocean Volume" : "Music Volume"}</label>
                <div className="OptionsDialogControls">
                    <input
                        id="options-music-volume"
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={musicVolume}
                        onChange={(event) => onAudioChange({ musicVolume: Number(event.target.value) })}
                    />
                    <button
                        type="button"
                        className="OptionsDialogMute"
                        aria-label={`${musicMuted ? "Unmute" : "Mute"} ${backgroundName}`}
                        aria-pressed={musicMuted}
                        onClick={() => onAudioChange((current) => ({ musicMuted: !current.musicMuted }))}
                    >
                        {musicMuted ? "Unmute" : "Mute"}
                    </button>
                </div>
            </div>

            <div className="OptionsDialogGroup">
                <label htmlFor="options-sfx-volume">SFX Volume</label>
                <div className="OptionsDialogControls">
                    <input
                        id="options-sfx-volume"
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={sfxVolume}
                        onChange={(event) => onAudioChange({ sfxVolume: Number(event.target.value) })}
                    />
                    <button
                        type="button"
                        className="OptionsDialogMute"
                        aria-label={sfxMuted ? "Unmute sound effects" : "Mute sound effects"}
                        aria-pressed={sfxMuted}
                        onClick={() => onAudioChange((current) => ({ sfxMuted: !current.sfxMuted }))}
                    >
                        {sfxMuted ? "Unmute" : "Mute"}
                    </button>
                </div>
            </div>

            <div className="OptionsDialogGroup" role="group" aria-labelledby="options-movement-keys">
                <span id="options-movement-keys">Movement Keys</span>
                <div className="OptionsDialogControls">
                    <button
                        type="button"
                        className="OptionsDialogToggle"
                        aria-pressed={controlScheme === "wasd"}
                        onClick={() => onControlSchemeChange("wasd")}
                    >
                        WASD
                    </button>
                    <button
                        type="button"
                        className="OptionsDialogToggle"
                        aria-pressed={controlScheme === "arrows"}
                        onClick={() => onControlSchemeChange("arrows")}
                    >
                        Arrow Keys
                    </button>
                </div>
            </div>

            <button type="button" className="OptionsDialogResume" onClick={onClose}>
                Resume
            </button>
            <button type="button" className="OptionsDialogButton" onClick={onReturnToTitle}>
                Return to Title
            </button>
            <button type="button" className="OptionsDialogButton" onClick={onGoToTutorial}>
                Go to Tutorial
            </button>
            <button type="button" className="OptionsDialogButton" onClick={onGoToResources}>
                Resources
            </button>
        </div>
    );
}

export default OptionsDialog;
