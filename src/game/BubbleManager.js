import Phaser from "phaser";
import { isBleachingYear } from "./bleachingSchedule.js";
import { SOUNDS, TEXTURES } from "./assetKeys.js";
import { GAME_EVENTS } from "./gameEvents.js";
import { COLORS, DEPTH, FONT_FAMILY, PLAY_AREA, THRESHOLDS, WORLD_WIDTH } from "./gameConfig.js";

/*
The green Cloudy bubbles that turn up across the reef during bleaching summers. Swimming into one shades the reef: the
light drops, and with it how fast the heat bleaches the coral.
*/

const SPAWN_MIN_MS = 1000; // time between one bubble and the next
const SPAWN_MAX_MS = 7000;
const MAX_BUBBLES = 3; // on the reef at once
const BUBBLE_LIFETIME_MS = 45000; // a bubble nobody swims into fades away after this long
const MIN_DISTANCE_FROM_FISH = 350; // new bubbles turn up at least this far from the fish
const MIN_DISTANCE_APART = 1000; // and this far from each other, so they're spread out across the reef
const PLACEMENT_TRIES = 50; // places tried before giving up on a bubble until the next one is due
const LIGHT_DROP = { min: 300, max: 700, step: 10 }; // how much one bubble lowers the light
const TOUCH_MARGIN = 30; // how far outside the bubble the fish can still pop it
const BOB_HEIGHT = 20;

export const CLOUDY_BUBBLE = {
    title: "Cloudy",
    teach: "Shade from clouds takes pressure off of stressed corals.",
};

/**
 * A Cloudy bubble and the label that says how much it lowers the light. Also used by the tutorial's lesson.
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {number} lightDrop
 * @returns {{ sprite: Phaser.GameObjects.Image, label: Phaser.GameObjects.Text }}
 */
export function createCloudyBubble(scene, x, y, lightDrop) {
    const sprite = scene.add.image(x, y, TEXTURES.lightBubble).setDepth(DEPTH.bubble).setTint(COLORS.cloudyBubble);
    const label = scene.add
        .text(x, y, `−${lightDrop}`, {
            fontSize: "18px",
            fontFamily: FONT_FAMILY,
            fontStyle: "bold",
            color: COLORS.cloudyLabel,
            stroke: "#ffffff",
            strokeThickness: 3,
        })
        .setOrigin(0.5, 1)
        .setDepth(DEPTH.bubbleLabel);

    scene.tweens.add({
        targets: sprite,
        y: sprite.y - BOB_HEIGHT,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
    });
    const bubble = { sprite, label };
    placeBubbleLabel(bubble);
    return bubble;
}

/** Keeps a bubble's label just above it as it bobs. Call once a frame. */
export function placeBubbleLabel({ sprite, label }) {
    label.setPosition(sprite.x, sprite.y - sprite.displayHeight * 0.55);
}

export class BubbleManager {
    /** @param {Phaser.Scene} scene the main game */
    constructor(scene) {
        this.scene = scene;
        this.active = [];
        this.season = scene.season;
        this.nextSpawnIn = Phaser.Math.Between(SPAWN_MIN_MS, SPAWN_MAX_MS);
    }

    /**
     * Call every frame from the scene's update().
     * @param {number} delta the frame's length in ms
     */
    update(delta) {
        const { scene } = this;

        // The bubbles only last the summer they came in
        if (this.season !== scene.season) {
            this.clear();
            this.season = scene.season;
            this.nextSpawnIn = Phaser.Math.Between(SPAWN_MIN_MS, SPAWN_MAX_MS);
        }

        if (scene.simEnd || !scene.tutorialComplete || scene.coralInfoOpen || scene.yearsElapsed < 1) return;
        if (scene.season !== "summer" || !isBleachingYear(scene.yearsElapsed)) return;

        this.nextSpawnIn -= delta;
        if (this.nextSpawnIn <= 0) {
            this.spawn();
            this.nextSpawnIn = Phaser.Math.Between(SPAWN_MIN_MS, SPAWN_MAX_MS);
        }

        // Removing a bubble replaces this.active with a new array, so the one being looped over is never changed
        for (const bubble of this.active) this.updateBubble(bubble, delta);
    }

    // Only while there's light to take away, and somewhere for the bubble to go
    spawn() {
        const { scene } = this;
        if (this.active.length >= MAX_BUBBLES || scene.climate.light <= THRESHOLDS.light.b) return;

        const position = this.findPlace();
        if (!position) return;

        const lightDrop =
            Phaser.Math.Between(LIGHT_DROP.min / LIGHT_DROP.step, LIGHT_DROP.max / LIGHT_DROP.step) * LIGHT_DROP.step;
        this.active.push({ ...createCloudyBubble(scene, position.x, position.y, lightDrop), lightDrop, age: 0 });
    }

    // Somewhere away from the fish and from the other bubbles, or null if no try found one
    findPlace() {
        const { player } = this.scene;
        for (let attempt = 0; attempt < PLACEMENT_TRIES; attempt++) {
            const x = Phaser.Math.Between(PLAY_AREA.sideMargin, WORLD_WIDTH - PLAY_AREA.sideMargin);
            const y = Phaser.Math.Between(PLAY_AREA.top, PLAY_AREA.bottom);
            const farFromFish = Phaser.Math.Distance.Between(x, y, player.x, player.y) >= MIN_DISTANCE_FROM_FISH;
            const farFromOthers = this.active.every(
                ({ sprite }) => Phaser.Math.Distance.Between(x, y, sprite.x, sprite.y) >= MIN_DISTANCE_APART,
            );
            if (farFromFish && farFromOthers) return { x, y };
        }
        return null;
    }

    updateBubble(bubble, delta) {
        const { player } = this.scene;
        if (bubble.popping) return;
        bubble.age += delta;
        placeBubbleLabel(bubble);

        const distance = Phaser.Math.Distance.Between(bubble.sprite.x, bubble.sprite.y, player.x, player.y);
        if (distance < bubble.sprite.displayWidth / 2 + TOUCH_MARGIN) this.pop(bubble);
        else if (bubble.age >= BUBBLE_LIFETIME_MS) this.expire(bubble);
    }

    // The fish swam into it: it pops, the light drops, and a notice says by how much
    pop(bubble) {
        const { scene } = this;
        bubble.popping = true;
        scene.tweens.killTweensOf(bubble.sprite);
        scene.sound.play(SOUNDS.bubblePop, { volume: scene.sfxVolume });
        scene.tweens.add({
            targets: bubble.sprite,
            scale: bubble.sprite.scaleX * 1.4,
            alpha: 0,
            angle: bubble.sprite.angle + 12,
            duration: 180,
            ease: "Back.in",
            onComplete: () => {
                this.remove(bubble);
                scene.game.events.emit(GAME_EVENTS.randomEvent, {
                    title: CLOUDY_BUBBLE.title,
                    message: this.shadeReef(bubble.lightDrop),
                });
                if (scene.simEnd) this.clear();
            },
        });
    }

    // Lowers the light, though never below the healthy range, and returns what happened for the notice
    shadeReef(lightDrop) {
        const { climate } = this.scene;
        const before = climate.light;
        const after = Math.min(
            Math.round(Math.max(before - lightDrop, THRESHOLDS.light.b) / LIGHT_DROP.step) * LIGHT_DROP.step,
            THRESHOLDS.light.d,
        );
        climate.setLight(after);
        return `The light level fell from ${before} to ${after}. ${CLOUDY_BUBBLE.teach}`;
    }

    // Nobody swam into it in time: it fizzles out harmlessly
    expire(bubble) {
        const { tweens } = this.scene;
        this.active = this.active.filter((other) => other !== bubble);
        tweens.killTweensOf(bubble.sprite);
        tweens.add({ targets: bubble.label, alpha: 0, duration: 400, onComplete: () => bubble.label.destroy() });
        tweens.add({ targets: bubble.sprite, alpha: 0, duration: 400, onComplete: () => bubble.sprite.destroy() });
    }

    remove(bubble) {
        this.active = this.active.filter((other) => other !== bubble);
        this.destroyBubble(bubble);
    }

    clear() {
        for (const bubble of this.active) this.destroyBubble(bubble);
        this.active = [];
    }

    destroyBubble({ sprite, label }) {
        this.scene.tweens.killTweensOf([sprite, label]);
        sprite.destroy();
        label.destroy();
    }
}
