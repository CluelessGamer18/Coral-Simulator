import { DEPTH, HEART_OFFSET_Y } from "./gameConfig.js";

/*
Sprinting (hold Space) runs on stamina, shown as a thin bar just under the hearts. A full bar lasts SPRINT_DURATION_MS
of sprinting and refills from empty in RECHARGE_DURATION_MS. Running it dry tires the fish out: it can't sprint again
until the bar is full, so sprint can't simply be held down to outrun every predator.
*/

const SPRINT_DURATION_MS = 3000;
const RECHARGE_DURATION_MS = 2000;

const BAR_WIDTH = 90;
const BAR_HEIGHT = 7;
const BAR_GAP = 16; // from the middle of the hearts down to the bar
const BAR_COLOR = 0x4fc3f7;
const BAR_TIRED_COLOR = 0xff8a65; // while the fish is tired out and refilling
const BAR_BACK_COLOR = 0x0b1d2a;

export class Stamina {
    /** @param {Phaser.Scene} scene */
    constructor(scene) {
        this.level = 1; // 0 to 1
        this.tired = false; // ran out, and refilling before it can be used again
        this.back = scene.add
            .rectangle(0, 0, BAR_WIDTH + 4, BAR_HEIGHT + 4, BAR_BACK_COLOR, 0.7)
            .setStrokeStyle(1, 0xffffff, 0.6)
            .setDepth(DEPTH.stamina)
            .setVisible(false);
        this.fill = scene.add
            .rectangle(0, 0, BAR_WIDTH, BAR_HEIGHT, BAR_COLOR)
            .setOrigin(0, 0.5)
            .setDepth(DEPTH.stamina + 0.01)
            .setVisible(false);
    }

    /**
     * Call once a frame.
     * @param {number} delta the frame's length in ms
     * @param {boolean} wantsSprint Space is held while the fish is actually swimming
     * @param {Phaser.GameObjects.Image} fish the bar sits under its hearts
     * @returns {boolean} whether the fish sprints this frame
     */
    update(delta, wantsSprint, fish) {
        const sprinting = wantsSprint && !this.tired && this.level > 0;

        if (sprinting) {
            this.level = Math.max(0, this.level - delta / SPRINT_DURATION_MS);
            if (this.level === 0) this.tired = true;
        } else {
            this.level = Math.min(1, this.level + delta / RECHARGE_DURATION_MS);
            if (this.level === 1) this.tired = false;
        }

        // Only shown while in use, so a full bar doesn't sit over the fish all game
        const visible = this.level < 1;
        const y = fish.y - fish.displayHeight / 2 - HEART_OFFSET_Y + BAR_GAP;
        this.back.setVisible(visible).setPosition(fish.x, y);
        this.fill
            .setVisible(visible && this.level > 0)
            .setPosition(fish.x - BAR_WIDTH / 2, y)
            .setScale(this.level, 1)
            .setFillStyle(this.tired ? BAR_TIRED_COLOR : BAR_COLOR);

        return sprinting;
    }
}
