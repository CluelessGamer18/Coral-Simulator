// Puts the running scene on window.gameScene, for poking at the game from the browser console and for automated
// checks. Only in development, or when the page's address ends in ?debug, so players don't get it by default.
const enabled = import.meta.env.DEV || new URLSearchParams(window.location.search).has("debug");

/** @param {Phaser.Scene} scene the scene that just started */
export function exposeForDebugging(scene) {
    if (enabled) window.gameScene = scene;
}
