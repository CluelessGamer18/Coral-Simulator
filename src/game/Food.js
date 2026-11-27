import Phaser from "phaser";
import { addGlow, removeGlow } from "./glow.js";
import { SOUNDS, TEXTURES } from "./assetKeys.js";
import {
    COLORS,
    DEPTH,
    FOOD_MAX_Y,
    FOOD_MIN_Y,
    FOOD_SIZE,
    PLAY_AREA,
    WORLD_WIDTH,
    YEAR_DURATION_MS,
} from "./gameConfig.js";

/*
Food is shellfish (snails and clams), which triggerfish crack open with their strong jaws. They live on the sea floor,
along the band of sand the fish can still reach. The fish gets hungry: every FOOD_INTERVAL_MS (one dot on the timeline,
half a year) it loses half a heart, and one shellfish turns up at the far end of the reef from it, so it has to go
looking.
*/

export const FOOD_INTERVAL_MS = YEAR_DURATION_MS / 2; // the gap between two dots on the timeline
const END_ZONE = 0.2; // food turns up in this outer fraction of the world at either end
const MIDDLE_ZONE = 0.1; // a fish within this fraction of the world's width of the middle gets food at a random end
const SHELLS = [TEXTURES.isabellaCowrie, TEXTURES.honeyCowrie, TEXTURES.fleaCone, TEXTURES.mulberryDrupe];
const SIZE_VARIATION = 0.2; // each shellfish is up to 20% smaller or bigger than FOOD_SIZE
const ICON_SIZE = 20; // the red plus over each shellfish that says "eat me for health", in pixels
const ICON_ALPHA = 0.7;

/**
 * A glowing shellfish on the sea floor with a health icon over it. Also used by the tutorial's lesson.
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {string} texture
 * @param {{ size?: number, depth?: number, angle?: number, flipX?: boolean }} [options] size: on-screen size, as the
 *   square root of its area, since the shell images are all different sizes
 */
export function addShellfish(
    scene,
    x,
    y,
    texture,
    { size = FOOD_SIZE, depth = DEPTH.food, angle = 0, flipX = false } = {},
) {
    const shellfish = scene.add.image(x, y, texture);
    shellfish
        .setDepth(depth)
        .setScale(size / Math.sqrt(shellfish.width * shellfish.height))
        .setAngle(angle)
        .setFlipX(flipX);
    addGlow(scene, shellfish, COLORS.foodGlow); // after the angle and flip, which the glow copies
    addFoodHealthIcon(scene, shellfish);
    return shellfish;
}

// A small semi-transparent red plus floating just above a shellfish, so players can tell it heals. The texture is
// drawn once and shared; the icon stays upright whatever the shell's angle, and goes when the shellfish does.
function addFoodHealthIcon(scene, shellfish) {
    const key = TEXTURES.foodHealthIcon;
    if (!scene.textures.exists(key)) {
        const bar = ICON_SIZE / 3;
        const edge = 2; // the white outline's width
        const full = ICON_SIZE + edge * 2;
        const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
        // white outline first, so the red reads against both sand and dark water
        graphics.fillStyle(0xffffff, 1);
        graphics.fillRoundedRect(bar, 0, bar + edge * 2, full, 3);
        graphics.fillRoundedRect(0, bar, full, bar + edge * 2, 3);
        graphics.fillStyle(0xe53935, 1);
        graphics.fillRect(edge + bar, edge, bar, ICON_SIZE);
        graphics.fillRect(edge, edge + bar, ICON_SIZE, bar);
        graphics.generateTexture(key, full, full);
        graphics.destroy();
    }

    const icon = scene.add
        .image(shellfish.x, shellfish.y - shellfish.displayHeight / 2 - ICON_SIZE / 2 - 4, key)
        .setDepth(shellfish.depth + 0.01)
        .setAlpha(ICON_ALPHA);
    // a gentle bob, so it reads as a pickup rather than part of the scenery
    scene.tweens.add({ targets: icon, y: icon.y - 5, duration: 900, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    shellfish.once(Phaser.GameObjects.Events.DESTROY, () => {
        scene.tweens.killTweensOf(icon);
        icon.destroy();
    });
}

/**
 * Eats a shellfish: it's gone, with a crunch.
 * @param {Phaser.Scene} scene
 * @param {Phaser.GameObjects.Image} shellfish
 */
export function eatShellfish(scene, shellfish) {
    removeGlow(shellfish); // stops the glow's tween, which would otherwise outlive the shellfish
    shellfish.destroy();
    scene.sound.play(SOUNDS.foodCrunch, { volume: scene.sfxVolume });
}

/** The main game's shellfish: where they turn up, and which one the fish is touching. */
export class Food {
    /** @param {Phaser.Scene} scene */
    constructor(scene) {
        this.scene = scene;
        this.items = []; // the shellfish on the sea floor
        this.deck = []; // kinds of shell still to deal out before any repeat
    }

    /**
     * One shellfish at the far end of the reef from the fish. Near the middle, either end is as far, so it's a coin toss.
     * @param {number} fishX
     */
    spawnFarFrom(fishX) {
        const middle = WORLD_WIDTH / 2;
        const nearMiddle = Math.abs(fishX - middle) <= WORLD_WIDTH * MIDDLE_ZONE;
        const atRightEnd = nearMiddle ? Math.random() < 0.5 : fishX < middle;
        const zoneWidth = WORLD_WIDTH * END_ZONE;
        const x = atRightEnd
            ? Phaser.Math.Between(WORLD_WIDTH - zoneWidth, WORLD_WIDTH - PLAY_AREA.sideMargin)
            : Phaser.Math.Between(PLAY_AREA.sideMargin, zoneWidth);

        // dealt in turn from a shuffled deck, so every kind appears before any repeats
        if (this.deck.length === 0) this.deck = Phaser.Utils.Array.Shuffle([...SHELLS]);
        const shellfish = addShellfish(this.scene, x, Phaser.Math.Between(FOOD_MIN_Y, FOOD_MAX_Y), this.deck.pop(), {
            size: FOOD_SIZE * Phaser.Math.FloatBetween(1 - SIZE_VARIATION, 1 + SIZE_VARIATION),
            angle: Phaser.Math.Between(-30, 30),
            flipX: Math.random() < 0.5,
        });
        this.items.push(shellfish);
    }

    /**
     * The shellfish the fish's body reaches, if any. One distance check per shellfish, in place of a physics engine.
     * @param {Phaser.GameObjects.Image} fish
     */
    findTouching(fish) {
        const reach = fish.displayHeight / 2;
        return this.items.find(
            (shellfish) =>
                Phaser.Math.Distance.Between(fish.x, fish.y, shellfish.x, shellfish.y) <=
                reach + shellfish.displayWidth / 2,
        );
    }

    /** @param {Phaser.GameObjects.Image} shellfish one of this.items */
    eat(shellfish) {
        this.items = this.items.filter((other) => other !== shellfish);
        eatShellfish(this.scene, shellfish);
    }
}
