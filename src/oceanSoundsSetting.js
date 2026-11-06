// Whether Ocean Sounds mode replaces the music. Saved in the browser so the player only has to choose once.
const STORAGE_KEY = "coralSimulator.oceanSounds";

// localStorage throws when the browser blocks it, in which case the choice just lasts until the page closes
export function loadOceanSounds() {
    try {
        return localStorage.getItem(STORAGE_KEY) === "on";
    } catch {
        return false;
    }
}

export function saveOceanSounds(enabled) {
    try {
        localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
    } catch {
        // nothing to do: see above
    }
}
