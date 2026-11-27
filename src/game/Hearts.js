import Phaser from "phaser";
import { TEXTURES } from "./assetKeys.js";
import { DEPTH, HEART_OFFSET_Y, HEART_SPACING, MAX_HEALTH, MAX_HEARTS } from "./gameConfig.js";

const LOW_HEALTH = 2; // half hearts left when the hearts start to pulse, if they do
const OUTLINE_COLOR = 0xff3333;
const HEART_TEXTURES = [TEXTURES.heartEmpty, TEXTURES.heartHalf, TEXTURES.heartFull]; // by half hearts left in it

/** The fish's health, counted in half hearts, and the hearts that float above it. */
export class Hearts {
    /**
     * @param {Phaser.Scene} scene
     * @param {{ health?: number, pulseWhenLow?: boolean }} [options] pulseWhenLow: the hearts throb with a red
     *   outline when only LOW_HEALTH half hearts are left (the main game; the tutorial's fish can't die)
     */
    constructor(scene, { health = MAX_HEALTH, pulseWhenLow = false } = {}) {
        this.scene = scene;
        this.health = health;
        this.pulseWhenLow = pulseWhenLow;
        this.pulsing = false;
        this.icons = [];
        this.outlines = [];

        for (let i = 0; i < MAX_HEARTS; i++) {
            if (pulseWhenLow) {
                this.outlines.push(
                    scene.add
                        .image(0, 0, TEXTURES.heartFull)
                        .setTintFill(OUTLINE_COLOR)
                        .setDepth(DEPTH.heartOutline)
                        .setVisible(false),
                );
            }
            this.icons.push(scene.add.image(0, 0, TEXTURES.heartFull).setDepth(DEPTH.heart));
        }
        this.refresh();
    }

    get isFull() {
        return this.health >= MAX_HEALTH;
    }

    /** @param {number} health in half hearts; kept between 0 and MAX_HEALTH */
    setHealth(health) {
        this.health = Phaser.Math.Clamp(health, 0, MAX_HEALTH);
        this.refresh();
    }

    /**
     * Keeps the hearts centered above the fish. Call once a frame.
     * @param {Phaser.GameObjects.Image} fish
     */
    follow(fish) {
        const y = fish.y - fish.displayHeight / 2 - HEART_OFFSET_Y;
        const startX = fish.x - ((this.icons.length - 1) * HEART_SPACING) / 2;
        this.icons.forEach((heart, i) => {
            const x = startX + i * HEART_SPACING;
            heart.setPosition(x, y);
            this.outlines[i]?.setPosition(x, y);
        });
    }

    // Shows full, half or empty hearts to match the health
    refresh() {
        this.icons.forEach((heart, i) => {
            heart.setTexture(HEART_TEXTURES[Phaser.Math.Clamp(this.health - i * 2, 0, 2)]);
        });
        if (this.pulseWhenLow) this.updatePulse();
    }

    updatePulse() {
        const shouldPulse = this.health > 0 && this.health <= LOW_HEALTH;
        if (shouldPulse === this.pulsing) return;

        const { tweens } = this.scene;
        this.pulsing = shouldPulse;
        tweens.killTweensOf([...this.icons, ...this.outlines]);

        if (shouldPulse) {
            this.outlines.forEach((outline) => outline.setVisible(true));
            const pulse = { duration: 450, yoyo: true, repeat: -1, ease: "Sine.inOut" };
            tweens.add({ targets: this.icons, scale: 1.2, ...pulse });
            tweens.add({ targets: this.outlines, scale: 1.38, ...pulse });
        } else {
            this.icons.forEach((heart) => heart.setScale(1));
            this.outlines.forEach((outline) => outline.setScale(1.15).setVisible(false));
        }
    }
}
