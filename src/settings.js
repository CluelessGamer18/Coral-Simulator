// The player's settings, saved in the browser so they survive a reload and only have to be chosen once. Read by both
// the Options menu (App.jsx) and the game's scenes, so the two always start in agreement.
//
// The keys keep the project's old name (coralSimulator): renaming them would reset every player's saved settings.
const KEYS = {
    audio: "coralSimulator.audio",
    controlScheme: "coralSimulator.controlScheme",
    oceanSounds: "coralSimulator.oceanSounds",
};

export const DEFAULT_AUDIO = { musicVolume: 0.25, sfxVolume: 0.5, musicMuted: false, sfxMuted: false };

// localStorage throws when the browser blocks it, in which case settings just last until the page closes
function loadSetting(key, parse, fallback) {
    try {
        return parse(localStorage.getItem(key));
    } catch {
        return fallback;
    }
}

function saveSetting(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch {
        // nothing to do: see loadSetting
    }
}

const isVolume = (value) => typeof value === "number" && value >= 0 && value <= 1;

/** @returns {{ musicVolume: number, sfxVolume: number, musicMuted: boolean, sfxMuted: boolean }} */
export function loadAudioSettings() {
    return loadSetting(
        KEYS.audio,
        (stored) => {
            const saved = JSON.parse(stored) ?? {};
            return {
                musicVolume: isVolume(saved.musicVolume) ? saved.musicVolume : DEFAULT_AUDIO.musicVolume,
                sfxVolume: isVolume(saved.sfxVolume) ? saved.sfxVolume : DEFAULT_AUDIO.sfxVolume,
                musicMuted: saved.musicMuted === true,
                sfxMuted: saved.sfxMuted === true,
            };
        },
        { ...DEFAULT_AUDIO },
    );
}

/** @param {ReturnType<typeof loadAudioSettings>} audio */
export function saveAudioSettings(audio) {
    saveSetting(KEYS.audio, JSON.stringify(audio));
}

/**
 * What the game should actually play at: zero while muted.
 * @param {ReturnType<typeof loadAudioSettings>} [audio] the saved settings if not given
 */
export function getEffectiveVolumes({ musicVolume, sfxVolume, musicMuted, sfxMuted } = loadAudioSettings()) {
    return { music: musicMuted ? 0 : musicVolume, sfx: sfxMuted ? 0 : sfxVolume };
}

/**
 * Which keys swim: "wasd" (the arrow keys move the camera) or "arrows" (the WASD keys move the camera).
 * @returns {"wasd" | "arrows"}
 */
export function loadControlScheme() {
    return loadSetting(KEYS.controlScheme, (stored) => (stored === "arrows" ? "arrows" : "wasd"), "wasd");
}

/** @param {"wasd" | "arrows"} scheme */
export function saveControlScheme(scheme) {
    saveSetting(KEYS.controlScheme, scheme);
}

/** Whether Ocean Sounds mode replaces the music */
export function loadOceanSounds() {
    return loadSetting(KEYS.oceanSounds, (stored) => stored === "on", false);
}

/** @param {boolean} enabled */
export function saveOceanSounds(enabled) {
    saveSetting(KEYS.oceanSounds, enabled ? "on" : "off");
}
