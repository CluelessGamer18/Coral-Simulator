// Choices from the Options menu's Accessibility and Game sections. Saved in the browser, and read by both React
// (App.jsx turns them into classes on the page) and the game's scenes, which ask getSettings() when they need one.
const STORAGE_KEY = "coralSimulator.settings";

const systemPrefersReducedMotion = () =>
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

export const TEXT_SIZES = { normal: 1, large: 1.15, larger: 1.3 };

function defaults() {
    return {
        reducedMotion: systemPrefersReducedMotion(), // no camera zoom, swaying coral or pulsing
        textSize: "normal",                          // a key of TEXT_SIZES
        colourBlind: false,                          // blue and orange in place of green and red, and striped danger zones
        relaxedPace: false,                          // the years pass more slowly, so there is more time to act
        touchButtons: false,                         // always show the on-screen buttons (they appear by themselves on touch screens)
        tutorialDone: false,                         // Start goes straight into the game once the tutorial has been finished
    };
}

let current = null;

// localStorage throws when the browser blocks it, in which case the choices just last until the page closes
export function getSettings() {
    if (current) return current;
    current = defaults();
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
        for (const key of Object.keys(current)) {
            if (typeof saved[key] === typeof current[key]) current[key] = saved[key];
        }
        if (!(current.textSize in TEXT_SIZES)) current.textSize = "normal";
    } catch {
        // keep the defaults
    }
    return current;
}

export function saveSettings(changes) {
    current = { ...getSettings(), ...changes };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch {
        // nothing to do: see above
    }
    return current;
}

export const RELAXED_PACE = 0.75; // how fast the years pass with relaxedPace on

// The best result so far, shown on the title screen
const BEST_KEY = "coralSimulator.best";

export function loadBest() {
    try {
        const best = JSON.parse(localStorage.getItem(BEST_KEY));
        return best && typeof best.alive === "number" ? best : null;
    } catch {
        return null;
    }
}

export function saveBest(result) {
    const best = loadBest();
    if (best && (best.stars > result.stars || (best.stars === result.stars && best.alive >= result.alive))) return;
    try {
        localStorage.setItem(BEST_KEY, JSON.stringify(result));
    } catch {
        // nothing to do
    }
}
