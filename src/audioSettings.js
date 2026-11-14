// Music and sound effect volumes, and whether each is muted. Saved in the browser so they survive a reload,
// and read by both the Options menu (App.jsx) and the game (TestScene.js), so the two always start in agreement.
const STORAGE_KEY = "coralSimulator.audio";

export const DEFAULT_AUDIO = { musicVolume: 0.25, sfxVolume: 0.5, musicMuted: false, sfxMuted: false };

const isVolume = (value) => typeof value === "number" && value >= 0 && value <= 1;

// localStorage throws when the browser blocks it, in which case the settings just last until the page closes
export function loadAudioSettings() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
        return {
            musicVolume: isVolume(saved.musicVolume) ? saved.musicVolume : DEFAULT_AUDIO.musicVolume,
            sfxVolume: isVolume(saved.sfxVolume) ? saved.sfxVolume : DEFAULT_AUDIO.sfxVolume,
            musicMuted: saved.musicMuted === true,
            sfxMuted: saved.sfxMuted === true,
        };
    } catch {
        return { ...DEFAULT_AUDIO };
    }
}

export function saveAudioSettings(settings) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
        // nothing to do: see above
    }
}

// What the game should actually play at: zero while muted
export function getEffectiveVolumes({ musicVolume, sfxVolume, musicMuted, sfxMuted } = loadAudioSettings()) {
    return { music: musicMuted ? 0 : musicVolume, sfx: sfxMuted ? 0 : sfxVolume };
}
