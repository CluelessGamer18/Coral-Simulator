// Names the game and React both use, kept in one place so the two sides can't drift apart. Phaser-free, like
// gameConfig.js, so React can import it without downloading the game.

// Sent on game.events. The README lists what each one carries.
export const GAME_EVENTS = {
    sceneReady: "scene-ready",
    statsChanged: "stats-changed",
    reefWarning: "reef-warning",
    reefWarningCleared: "reef-warning-cleared",
    randomEvent: "random-event",
    predatorAppeared: "predator-appeared",
    predatorLeft: "predator-left",
    coralSelected: "coral-selected",
    goalReminder: "goal-reminder",
    tutorialStep: "tutorial-step",
    tutorialPraise: "tutorial-praise",
    gameProblem: "game-problem",
};

export const SCENE_KEYS = {
    preloader: "Preloader",
    tutorial: "Tutorial",
    reef: "Reef",
};

// Values React leaves in game.registry for the scenes to read
export const REGISTRY_KEYS = {
    started: "started", // the player has pressed Start (the game loads behind the title screen until then)
};
