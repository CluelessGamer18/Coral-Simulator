import Phaser from "phaser";
import { CORAL_VARIANTS } from "./coralKinds.js";

/*
The bleached copies of every coral drawing. Each stage is a copy of the variant's texture that is more washed out and
whiter than the last, so a coral can be shown at any stress without a shader running every frame. Textures belong to
the whole game, so stages made in one scene are reused by the next.
*/

const BLEACH_STAGE_COUNT = 10;
const BLEACH_ROWS_PER_STEP = 100; // rows of a stage to make between yields

// Every made variant's stage texture keys, the original first
const stagesByVariant = new Map();

/**
 * @param {number} stress 0 to 100
 * @returns {number} the bleach stage to show, 0 (the original drawing) to BLEACH_STAGE_COUNT
 */
export function getBleachStage(stress) {
    return Math.floor((Phaser.Math.Clamp(stress, 0, 100) / 100) * BLEACH_STAGE_COUNT);
}

/**
 * Every bleach stage's texture key for a variant, the original first. Any stage that doesn't exist yet is made
 * straight away, so call prepareBleachStages() ahead of time to avoid a pause.
 * @param {Phaser.Scene} scene
 * @param {string} variant
 * @returns {string[]}
 */
export function getBleachStageKeys(scene, variant) {
    const known = stagesByVariant.get(variant);
    if (known?.every((key) => scene.textures.exists(key))) return known;

    const steps = generateBleachStages(scene, variant);
    let step;
    do {
        step = steps.next();
    } while (!step.done);
    stagesByVariant.set(variant, step.value);
    return step.value;
}

/**
 * Makes the bleach stages for every variant ahead of time, a little per next() call, so a scene can spread the work
 * over many frames. A stage is only added once it's finished, so stopping part way leaves nothing half made. The
 * tutorial runs this in the background so the main game doesn't freeze while it plants its reef.
 * @param {Phaser.Scene} scene
 */
export function* prepareBleachStages(scene) {
    for (const variant of Object.keys(CORAL_VARIANTS)) {
        stagesByVariant.set(variant, yield* generateBleachStages(scene, variant));
    }
}

// Yields often (after reading the source, after every few rows, and after each stage is uploaded) so the work can be
// spread over frames, and returns every stage's texture key, the original first. Stages that already exist are skipped.
function* generateBleachStages(scene, variant) {
    const keys = [variant];
    const source = scene.textures.get(variant).getSourceImage();
    const { width, height } = source;
    let original, gray; // the source's pixels, only read if a stage still needs making

    for (let stage = 1; stage <= BLEACH_STAGE_COUNT; stage++) {
        const key = `${variant}-bleach-${stage}`;
        keys.push(key);
        if (scene.textures.exists(key)) continue;

        // Read once for all of this variant's stages, rather than drawing and reading it back for every stage
        if (!original) {
            ({ original, gray } = readPixels(source));
            yield;
        }

        const canvas = createPixelCanvas(width, height);
        const context = canvas.getContext("2d", { willReadFrequently: true });
        const image = context.createImageData(width, height);

        for (let row = 0; row < height; row += BLEACH_ROWS_PER_STEP) {
            const lastRow = Math.min(row + BLEACH_ROWS_PER_STEP, height);
            bleachPixels(original, gray, image.data, stage / BLEACH_STAGE_COUNT, row * width, lastRow * width);
            yield;
        }

        // Added once it's finished, so it's only uploaded to the GPU once
        context.putImageData(image, 0, 0);
        scene.textures.addCanvas(key, canvas);
        yield;
    }

    return keys;
}

// A canvas kept in ordinary memory rather than on the GPU, like Phaser's own canvas textures. Reading and writing
// pixels is quicker there, and faint edge pixels come out exactly as they did before.
function createPixelCanvas(width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
}

// The source image's pixels, and the brightness of each one
function readPixels(source) {
    const canvas = createPixelCanvas(source.width, source.height);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(source, 0, 0);
    const original = context.getImageData(0, 0, source.width, source.height).data;

    const gray = new Float64Array(source.width * source.height);
    for (let i = 0, p = 0; i < original.length; i += 4, p++) {
        gray[p] = 0.2126 * original[i] + 0.7152 * original[i + 1] + 0.0722 * original[i + 2];
    }
    return { original, gray };
}

// Writes a washed-out, whitened copy of pixels first to last - 1 of the original into pixels (which starts fully
// transparent). For each color channel that's
//   desaturated = gray + (channel - gray) * (1 - strength)
//   result = round(desaturated + (255 - desaturated) * strength * 0.45)
// rearranged so each channel is a single multiply-add, and each pixel is read and written as one 32-bit value
// (byte order RGBA in memory, so red is the lowest byte on the little-endian machines browsers run on).
// Kept out of the generator above, because V8 optimizes a hot loop in a plain function much better.
function bleachPixels(original, gray, pixels, strength, first, last) {
    const whitening = strength * 0.45;
    const grayWeight = strength * (1 - whitening);
    const colorWeight = (1 - strength) * (1 - whitening);
    const offset = 255 * whitening + 0.5; // + 0.5 so truncating with | 0 rounds like Math.round

    const source = new Uint32Array(original.buffer, original.byteOffset, original.length / 4);
    const result = new Uint32Array(pixels.buffer, pixels.byteOffset, pixels.length / 4);

    for (let p = first; p < last; p++) {
        const rgba = source[p];
        const alpha = rgba >>> 24;
        if (alpha === 0) continue; // invisible, so leave it transparent

        const base = gray[p] * grayWeight + offset;
        const red = (base + (rgba & 255) * colorWeight) | 0;
        const green = (base + ((rgba >>> 8) & 255) * colorWeight) | 0;
        const blue = (base + ((rgba >>> 16) & 255) * colorWeight) | 0;
        result[p] = ((alpha << 24) | (blue << 16) | (green << 8) | red) >>> 0;
    }
}
