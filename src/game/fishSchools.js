import Phaser from "phaser";
import { TEXTURES } from "./assetKeys.js";
import { DEPTH, GAME_WIDTH, WORLD_HEIGHT, WORLD_WIDTH } from "./gameConfig.js";

/*
The schools of reef fish that swim around in the background. To change the fish, edit the sprite sheet
(public/assets/fish/fish_schools.png) and FISH_TYPES below: frame is the fish's frame on the sheet.
*/

const FISH_TYPES = {
    yellowTang: { frame: 0, min: 3, max: 5 }, // min and max: how many fish a school of this kind has
    moorishIdol: { frame: 1, min: 2, max: 3 },
    clownfish: { frame: 2, min: 1, max: 3 },
    frenchAngelfish: { frame: 3, min: 2, max: 2 },
    yellowLongnoseButterflyfish: { frame: 4, min: 1, max: 3 },
    regalTang: { frame: 5, min: 8, max: 14 },
    lionfish: { frame: 6, min: 1, max: 2 },
    barracuda: { frame: 7, min: 1, max: 2 },
    schoolingFish: { frame: 8, min: 6, max: 10 },
    yellowBoxfish: { frame: 9, min: 1, max: 1 },
    seaTurtle: { frame: 10, min: 4, max: 6 },
    picassoTriggerfish: { frame: 11, min: 1, max: 2 },
};
const FISH_TYPE_NAMES = Object.keys(FISH_TYPES);

const SCHOOL_COUNT = 25;
const SCHOOL_CHANCE = 0.5; // the chance a group is a school of several fish, rather than one on its own
const MIN_FISH_SCALE = 0.3; // fish size variation
const MAX_FISH_SCALE = 0.5;
const LAYER_WEIGHTS = [0, 0, 0, 0, 1, 1, 2, 2, 2]; // more schools in the foreground and background than the midground
const MIN_MOVE_INTERVAL = 5000; // ms between one move and the next
const MAX_MOVE_INTERVAL = 20000;
const MAX_MOVE_DISTANCE = 2000; // at full layer distance

// The three layers the schools swim in, back to front: their size, how far they scroll with the camera (as the
// width of the background layer they swim in front of), how slowly and how far they move, and a tint that fades the
// back ones into the water.
const LAYERS = [
    { scale: 0.1, scrollWidth: 1440, slowness: 1.6, distance: 0.3, tint: 0x32afac },
    { scale: 0.3, scrollWidth: 2072, slowness: 1.3, distance: 0.6, tint: 0x143f45 },
    { scale: 0.85, scrollWidth: 2860, slowness: 1.0, distance: 1.0, tint: null },
];

/**
 * Fills the main game's background with schools of fish, each moving somewhere new every few seconds.
 * @param {Phaser.Scene} scene
 */
export function createFishSchools(scene) {
    for (let i = 0; i < SCHOOL_COUNT; i++) {
        const type = FISH_TYPES[Phaser.Utils.Array.GetRandom(FISH_TYPE_NAMES)];
        const layer = Phaser.Utils.Array.GetRandom(LAYER_WEIGHTS);
        const count = Math.random() < SCHOOL_CHANCE ? Phaser.Math.Between(type.min, type.max) : 1;

        keepMoving(scene, createSchool(scene, count, type, layer), layer);
    }
}

// A school is a container of fish images, so it moves as one while each fish drifts around within it
function createSchool(scene, count, type, layerIndex) {
    const layer = LAYERS[layerIndex];
    const container = scene.add.container(Phaser.Math.Between(0, WORLD_WIDTH), Phaser.Math.Between(0, WORLD_HEIGHT));
    // Parallax: a school in front of a wider background layer scrolls further as the camera moves
    container
        .setDepth(DEPTH.fishSchools + layerIndex)
        .setScrollFactor((layer.scrollWidth - GAME_WIDTH) / (WORLD_WIDTH - GAME_WIDTH), 1);

    for (let i = 0; i < count; i++) {
        const fish = scene.add
            .image(Phaser.Math.Between(-100, 100), Phaser.Math.Between(-100, 100), TEXTURES.fishSchools, type.frame)
            .setScale(Phaser.Math.FloatBetween(MIN_FISH_SCALE, MAX_FISH_SCALE) * layer.scale);
        if (layer.tint) fish.setTintFill(layer.tint);
        container.add(fish);
    }

    return container;
}

// Sends the school somewhere new, then does it again when that move's time is up
function keepMoving(scene, school, layerIndex) {
    const duration = Phaser.Math.Between(MIN_MOVE_INTERVAL, MAX_MOVE_INTERVAL);
    moveSchool(scene, school, layerIndex, duration);
    scene.time.delayedCall(duration, () => keepMoving(scene, school, layerIndex));
}

// Tweens the school to a random spot nearby, and shuffles each fish's place in it
function moveSchool(scene, school, layerIndex, duration) {
    const layer = LAYERS[layerIndex];
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const distance = Phaser.Math.Between(200, MAX_MOVE_DISTANCE * layer.distance);
    const x = Phaser.Math.Clamp(school.x + Math.cos(angle) * distance, 0, layer.scrollWidth);
    const y = Phaser.Math.Clamp(school.y + Math.sin(angle) * distance, 0, WORLD_HEIGHT - (2 - layerIndex) * 100 - 400);
    const facingRight = x > school.x;

    // The back layers swim slowly, so their last move can still be running when the next one starts.
    // Stop it first, or two tweens would be steering the same school (and each of its fish) at once.
    scene.tweens.killTweensOf(school);
    scene.tweens.killTweensOf(school.list);

    scene.tweens.add({ targets: school, x, y, duration: duration * layer.slowness, ease: "Sine.inOut" });

    school.iterate((fish) => {
        fish.setFlipX(facingRight);
        scene.tweens.add({
            targets: fish,
            x: Phaser.Math.Between(-100, 100),
            y: Phaser.Math.Between(-100, 100),
            duration: duration * layer.slowness,
        });
    });
}
