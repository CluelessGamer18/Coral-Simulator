import { useRef, useState } from "react";
import "./TitleScreen.css";
import { useFocusTrap } from "../useFocusTrap.js";
import { SpeakerIcon } from "../Hud.jsx";

// A pair (or three) of buttons where one is chosen
function Choice({ label, value, options, onChange }) {
    return (
        <div className="OptionsRow" role="group" aria-label={label}>
            <span className="OptionsLabel">{label}</span>
            <div className="OptionsChoice">
                {options.map(([key, text]) => (
                    <button key={String(key)} type="button" aria-pressed={value === key} onClick={() => onChange(key)}>{text}</button>
                ))}
            </div>
        </div>
    );
}

function Volume({ label, value, onChange, muted, onToggleMute }) {
    return (
        <div className="OptionsRow">
            <label className="OptionsLabel" htmlFor={`volume-${label}`}>{label}</label>
            <div className="OptionsVolume">
                <input id={`volume-${label}`} type="range" min="0" max="1" step="0.01" value={value} onChange={(event) => onChange(Number(event.target.value))} />
                <button type="button" className="OptionsMute" aria-pressed={muted} aria-label={`${muted ? "Unmute" : "Mute"} ${label.toLowerCase()}`} onClick={onToggleMute}>
                    <SpeakerIcon muted={muted} />
                </button>
            </div>
        </div>
    );
}

const GLOSSARY = [
    ["Reef stress", "Heat stress across the whole reef. It builds while the water is hot and falls in winter. Coral bleaches as it rises, and fully bleached coral starves if the heat lasts."],
    ["Temperature", "Coral is comfortable up to about 28 °C. Heatwaves add 3 to 7 °C. Cool Current bubbles take 2.4 °C off for a few seconds."],
    ["Light", "Bright summer light makes hot water bleach coral faster. Cloudy bubbles shade the reef for a few seconds."],
    ["Pollution", "Nutrients from the leaking pipe. Dirty water makes heat stress build up to 1.75 times faster and slows recovery. Plug the pipe from year 6."],
    ["Corals alive", "Each coral bleaches at its own pace: table corals first, pillar corals last. If fewer than one in five are alive, the reef collapses."],
];

/*
The pause menu, also opened from the title screen (where there is no game to go back to, so inGame is false).
Sound, Controls, Accessibility and Game, with the game dimmed behind it. Leaving for the tutorial throws the
current game away, so that asks first.
*/
function OptionsDialog({
    inGame, inTutorial, onClose, goToTutorial, returnToTitle, goToResources,
    musicVolume, setMusicVolume, musicMuted, setMusicMuted,
    sfxVolume, setSfxVolume, sfxMuted, setSfxMuted,
    oceanSounds, setOceanSounds, controlScheme, setControlScheme,
    settings, changeSettings,
}) {
    const box = useRef(null);
    const [confirmTutorial, setConfirmTutorial] = useState(false);
    const [showGlossary, setShowGlossary] = useState(false);
    useFocusTrap(box);

    const swim = controlScheme === "arrows" ? "Arrow keys" : "W A S D";
    const look = controlScheme === "arrows" ? "W A S D" : "Arrow keys";

    return (
        <div className="OptionsScrim" onClick={onClose}>
            <div className="OptionsBox" ref={box} role="dialog" aria-modal="true" aria-labelledby="options-title" tabIndex={-1} onClick={(event) => event.stopPropagation()}>
                <div className="OptionsHeader">
                    <h1 id="options-title">{inGame ? "Paused" : "Settings"}</h1>
                    <button type="button" className="Button ButtonPrimary" data-autofocus onClick={onClose}>{inGame ? "Resume" : "Done"}</button>
                </div>

                <div className="OptionsColumns">
                    <section aria-labelledby="options-sound">
                        <h2 id="options-sound">Sound</h2>
                        <Choice label="Background" value={oceanSounds} onChange={setOceanSounds} options={[[false, "Music"], [true, "Ocean sounds"]]} />
                        <Volume label={oceanSounds ? "Ocean volume" : "Music volume"} value={musicVolume} onChange={setMusicVolume} muted={musicMuted} onToggleMute={() => setMusicMuted(!musicMuted)} />
                        <Volume label="Effects volume" value={sfxVolume} onChange={setSfxVolume} muted={sfxMuted} onToggleMute={() => setSfxMuted(!sfxMuted)} />

                        <h2 id="options-controls">Controls</h2>
                        <Choice label="Swim with" value={controlScheme} onChange={setControlScheme} options={[["wasd", "W A S D"], ["arrows", "Arrow keys"]]} />
                        <dl className="OptionsKeys">
                            <div><dt>{swim}</dt><dd>Swim. Or press and hold on the water with a mouse or finger.</dd></div>
                            <div><dt>{look}</dt><dd>Look around the reef</dd></div>
                            <div><dt>Q</dt><dd>Pick up, place in the nest, replant, plug the pipe</dd></div>
                            <div><dt>E</dt><dd>Hide in the nest or a coral, and come back out</dd></div>
                            <div><dt>Click</dt><dd>A coral, to open its page</dd></div>
                            <div><dt>M · Esc</dt><dd>Mute · Pause</dd></div>
                        </dl>
                    </section>

                    <section aria-labelledby="options-access">
                        <h2 id="options-access">Accessibility</h2>
                        <Choice label="Text size" value={settings.textSize} onChange={(textSize) => changeSettings({ textSize })} options={[["normal", "Normal"], ["large", "Large"], ["larger", "Largest"]]} />
                        <Choice label="Motion" value={settings.reducedMotion} onChange={(reducedMotion) => changeSettings({ reducedMotion })} options={[[false, "Full"], [true, "Reduced"]]} />
                        <p className="OptionsHint">Reduced: no camera zoom, swaying coral or pulsing.</p>
                        <Choice label="Colours" value={settings.colourBlind} onChange={(colourBlind) => changeSettings({ colourBlind })} options={[[false, "Standard"], [true, "Colour-blind"]]} />
                        <p className="OptionsHint">Colour-blind: blue and orange in place of green and red, with striped danger bars.</p>
                        <Choice label="Pace" value={settings.relaxedPace} onChange={(relaxedPace) => changeSettings({ relaxedPace })} options={[[false, "Standard"], [true, "Relaxed"]]} />
                        <p className="OptionsHint">Relaxed: the years pass a quarter more slowly, so there is more time to act.</p>
                        <Choice label="On-screen buttons" value={settings.touchButtons} onChange={(touchButtons) => changeSettings({ touchButtons })} options={[[false, "On touch"], [true, "Always"]]} />

                        <h2 id="options-game">Game</h2>
                        <div className="OptionsActions">
                            <button type="button" className="Button ButtonSecondary" aria-expanded={showGlossary} onClick={() => setShowGlossary(!showGlossary)}>What do the readings mean?</button>
                            {inGame ? (
                                confirmTutorial ? (
                                    <div className="OptionsConfirm" role="alert">
                                        <span>{inTutorial ? "Start the tutorial again?" : "This ends your current game. Go to the tutorial?"}</span>
                                        <button type="button" className="Button ButtonPrimary" onClick={goToTutorial}>Yes</button>
                                        <button type="button" className="Button ButtonSecondary" onClick={() => setConfirmTutorial(false)}>No</button>
                                    </div>
                                ) : <button type="button" className="Button ButtonSecondary" onClick={() => setConfirmTutorial(true)}>Play the tutorial</button>
                            ) : null}
                            {inGame ? <button type="button" className="Button ButtonSecondary" onClick={returnToTitle}>Title screen (keeps your game)</button> : null}
                            {inGame ? <button type="button" className="Button ButtonSecondary" onClick={goToResources}>Resources</button> : null}
                        </div>
                    </section>
                </div>

                {showGlossary ? (
                    <dl className="OptionsGlossary">
                        {GLOSSARY.map(([term, meaning]) => <div key={term}><dt>{term}</dt><dd>{meaning}</dd></div>)}
                    </dl>
                ) : null}
            </div>
        </div>
    );
}

export default OptionsDialog;
