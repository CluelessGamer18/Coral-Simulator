import { HEART_OFFSET_Y } from "./gameConfig.js";

// Sprinting (hold Space) runs on stamina, shown as a thin bar just under the hearts. A full bar lasts
// SPRINT_DURATION_MS of sprinting and refills from empty in RECHARGE_DURATION_MS. Running it dry tires the fish out:
// it can't sprint again until the bar is full, so sprint can't simply be held down to outrun every predator.

const SPRINT_DURATION_MS = 3000;
const RECHARGE_DURATION_MS = 2000;

const BAR_WIDTH = 90;
const BAR_HEIGHT = 7;
const BAR_GAP = 16; // from the middle of the hearts down to the bar
const BAR_COLOR = 0x4fc3f7;
const BAR_TIRED_COLOR = 0xff8a65; // while the fish is tired out and refilling
const BAR_BACK_COLOR = 0x0b1d2a;
const BAR_DEPTH = 9999.6; // just over the hearts

export function createStamina(scene) {
    scene.stamina = 1;          // 0 to 1
    scene.staminaTired = false; // ran out, and refilling before it can be used again
    scene.staminaBack = scene.add.rectangle(0, 0, BAR_WIDTH + 4, BAR_HEIGHT + 4, BAR_BACK_COLOR, 0.7)
        .setStrokeStyle(1, 0xffffff, 0.6)
        .setDepth(BAR_DEPTH)
        .setVisible(false);
    scene.staminaFill = scene.add.rectangle(0, 0, BAR_WIDTH, BAR_HEIGHT, BAR_COLOR)
        .setOrigin(0, 0.5)
        .setDepth(BAR_DEPTH + 0.01)
        .setVisible(false);
}

// Call once a frame. wantsSprint: Space is held while the fish is actually swimming. Returns whether it sprints.
export function updateStamina(scene, delta, wantsSprint) {
    const sprinting = wantsSprint && !scene.staminaTired && scene.stamina > 0;

    if (sprinting) {
        scene.stamina = Math.max(0, scene.stamina - delta / SPRINT_DURATION_MS);
        if (scene.stamina === 0) scene.staminaTired = true;
    } else {
        scene.stamina = Math.min(1, scene.stamina + delta / RECHARGE_DURATION_MS);
        if (scene.stamina === 1) scene.staminaTired = false;
    }

    // Only shown while in use, so a full bar doesn't sit over the fish all game
    const visible = scene.stamina < 1;
    const y = scene.guide.y - scene.guide.displayHeight / 2 - HEART_OFFSET_Y + BAR_GAP;
    const left = scene.guide.x - BAR_WIDTH / 2;
    scene.staminaBack.setVisible(visible).setPosition(scene.guide.x, y);
    scene.staminaFill
        .setVisible(visible && scene.stamina > 0)
        .setPosition(left, y)
        .setScale(scene.stamina, 1)
        .setFillStyle(scene.staminaTired ? BAR_TIRED_COLOR : BAR_COLOR);

    return sprinting;
}
