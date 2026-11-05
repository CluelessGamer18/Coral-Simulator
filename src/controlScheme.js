// Which keys swim: "wasd" (the arrow keys move the camera) or "arrows" (the WASD keys move the camera).
// Saved in the browser so the player only has to choose once.
const STORAGE_KEY = "coralSimulator.controlScheme";

// localStorage throws when the browser blocks it, in which case the choice just lasts until the page closes
export function loadControlScheme() {
    try {
        return localStorage.getItem(STORAGE_KEY) === "arrows" ? "arrows" : "wasd";
    } catch {
        return "wasd";
    }
}

export function saveControlScheme(scheme) {
    try {
        localStorage.setItem(STORAGE_KEY, scheme);
    } catch {
        // nothing to do: see above
    }
}
