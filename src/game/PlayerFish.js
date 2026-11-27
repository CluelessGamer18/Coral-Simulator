import Phaser from "phaser";
import { addShadow } from "./glow.js";
import { TEXTURES } from "./assetKeys.js";
import { COLORS, DEPTH, FISH_SCALE, FLOOR_SHADOW_Y, PLAY_AREA } from "./gameConfig.js";

const TURN_SPEED = 0.5; // radians per frame at 60fps
const WIGGLE_SPEED = 0.01; // how fast the body sways from side to side as it swims, in radians per ms
const WIGGLE_AMOUNT = 1; // px per frame at 60fps
const HURT_FLASH_MS = 150;

/** The player's triggerfish: how it swims, grows, hides and gets hurt. Used by the tutorial and the main game. */
export class PlayerFish extends Phaser.GameObjects.Image {
    /**
     * @param {Phaser.Scene} scene
     * @param {number} x
     * @param {number} y
     */
    constructor(scene, x, y) {
        super(scene, x, y, TEXTURES.playerFish);
        scene.add.existing(this);
        this.growthFactor = 1;
        this.setDepth(DEPTH.player).setScale(FISH_SCALE);
        addShadow(scene, this);
        this.floorShadow = scene.add.ellipse(x, FLOOR_SHADOW_Y, 100, 10, 0x000000, 0.5).setDepth(DEPTH.fishShadow);
    }

    /** How much bigger than its starting size the fish has grown from eating. Tweening it grows the fish smoothly. */
    get growth() {
        return this.growthFactor;
    }

    set growth(value) {
        this.growthFactor = value;
        this.setScale(FISH_SCALE * value);
    }

    /**
     * Grows the fish smoothly to a new size, rather than popping.
     * @param {number} growth times its starting size
     */
    growTo(growth) {
        this.scene.tweens.killTweensOf(this);
        this.scene.tweens.add({ targets: this, growth, duration: 300, ease: "Back.out" });
    }

    /**
     * Swims one frame's worth in the direction of the keys held, turning to face it, and stays inside the play area.
     * @param {number} horizontal -1 (left), 0 or 1 (right)
     * @param {number} vertical -1 (up), 0 or 1 (down)
     * @param {number} speed px per frame at 60fps
     * @param {number} frameScale how many 60fps frames this frame lasted
     * @param {number} worldWidth the width of the world the fish swims in
     */
    swim(horizontal, vertical, speed, frameScale, worldWidth) {
        const length = Math.hypot(horizontal, vertical);
        if (length === 0) return;

        this.x += (horizontal / length) * speed * frameScale;
        this.y += (vertical / length) * speed * frameScale;

        // Swimming straight up or down keeps the way the fish was facing, so it doesn't snap upside down
        this.setFlipY(horizontal === 0 ? this.flipY : horizontal < 0);
        this.rotation = Phaser.Math.Angle.RotateTo(
            this.rotation,
            Math.atan2(vertical, horizontal),
            TURN_SPEED * frameScale,
        );

        const wiggle = Math.sin(this.scene.time.now * WIGGLE_SPEED) * WIGGLE_AMOUNT * frameScale;
        this.x += Math.cos(this.rotation + Math.PI / 2) * wiggle;
        this.y += Math.sin(this.rotation + Math.PI / 2) * wiggle;

        // Clamped after the wiggle, so the wiggle can't push the fish out either
        this.x = Phaser.Math.Clamp(this.x, PLAY_AREA.sideMargin, worldWidth - PLAY_AREA.sideMargin);
        this.y = Phaser.Math.Clamp(this.y, PLAY_AREA.top, PLAY_AREA.bottom);
    }

    /**
     * Tucks the fish into a coral or the nest, just behind it.
     * @param {{ x: number, y: number, depth: number }} spot
     */
    hideAt(spot) {
        this.clearTint();
        this.setPosition(spot.x, spot.y).setDepth(spot.depth - 0.1);
    }

    comeOut() {
        this.setDepth(DEPTH.player);
    }

    // A quick red flash, so it's clear the fish got hurt
    flashHurt() {
        this.setTint(COLORS.hurt);
        this.scene.time.delayedCall(HURT_FLASH_MS, () => this.clearTint());
    }

    /**
     * Keeps the fish's shadow on the sand under it. Call once a frame.
     * @param {boolean} [visible]
     */
    updateFloorShadow(visible = true) {
        this.floorShadow.setVisible(visible).setPosition(this.x, FLOOR_SHADOW_Y).setScale(this.scale, 1);
    }
}
