import Phaser from "phaser";
import { CORAL_KINDS, CORAL_KIND_IDS, CORAL_VARIANTS, getCoralInfo } from "./coralKinds.js";
import { getBleachStage, getBleachStageKeys } from "./bleachStages.js";
import { GAME_EVENTS } from "./gameEvents.js";
import {
    COLORS,
    DEPTH,
    FONT_FAMILY,
    SUMMER_DURATION_MS,
    WINTER_DURATION_MS,
    WORLD_HEIGHT,
    WORLD_WIDTH,
    YEAR_DURATION_MS,
} from "./gameConfig.js";

/*
The two reefs either side of the sandbar: planting them, swaying and bleaching every coral, and the player's collection
of the kinds they've clicked on. The kinds themselves are in coralKinds.js.
*/

const CORALS_PER_REEF = 100;
const SANDBAR_WIDTH = 800; // the bare sand between the two reefs, where the nest is
const CORAL_CLEARANCE = 100; // half the widest coral, so none grows onto the sandbar or off the end of the world
const MAX_CORAL_WIDTH = 200;
const MAX_CORAL_HEIGHT = 170;
const CORAL_ROWS = [-10, 120, 180]; // how far above the bottom of the world each row stands, front row first

// How the patches are laid out
const MIXED_PATCH_CHANCE = 0.05; // a rare patch has a second variant along its edge
const MIN_PATCH_SIZE = 3;
const MAX_PATCH_SIZE = 12;
const SETTLE_STEP_X = 35; // how far a new colony settles from the one it grew from
const SETTLE_STEP_Y = 8;
const ROW_DRIFT_CHANCE = 0.3; // chance a colony sits one row off the one it grew from

const HOVER_PULSE = 1.05; // how much a coral grows and shrinks under the pointer
const CULL_MARGIN = 150; // a coral is at most 200 px wide and sways a little, so this keeps it drawn until it's well out of view
const CULL_STEP = 64; // how far the camera has to move before the corals are checked again

/** One coral on the reef. Keeps its stress and bleach stage, and leans back and forth at its own pace. */
class Coral extends Phaser.GameObjects.Image {
    /**
     * @param {Phaser.Scene} scene
     * @param {number} x
     * @param {number} y the bottom of the coral
     * @param {string} variant
     * @param {number} row 0 for the front row
     */
    constructor(scene, x, y, variant, row) {
        super(scene, x, y, variant);
        scene.add.existing(this);

        const kind = CORAL_VARIANTS[variant];
        this.variant = variant;
        this.bleachStages = getBleachStageKeys(scene, variant);
        this.bleachRate = kind.bleachRate;
        this.stress = 0;
        this.bleachStage = 0;
        this.dead = false;
        this.hoverPulse = null;

        // The art in public/assets/corals is 1.5x this size (see scripts/build-art.py), so there's detail to spare
        // when a coral pulses or the camera zooms in on the nest
        this.baseScale = Math.min(MAX_CORAL_WIDTH / this.width, MAX_CORAL_HEIGHT / this.height, 1);
        this.setOrigin(0.5, 1)
            .setDepth(DEPTH.coralFrontRow - row)
            .setScale(this.baseScale);

        this.swayAngle = Phaser.Math.FloatBetween(kind.sway * 0.7, kind.sway * 1.3);
        this.swaySpeed = Math.PI / Phaser.Math.Between(4000, 6000); // radians per ms: one lean each way every 8 to 12 seconds
        this.swayPhase = Phaser.Math.FloatBetween(0, Math.PI * 2);
    }

    /** @param {number} stress 0 to 100 */
    setStress(stress) {
        this.stress = Phaser.Math.Clamp(stress, 0, 100);
        if (this.stress >= 100) this.dead = true;

        // Swaps the texture only when the stress crosses into another bleach stage
        const bleachStage = getBleachStage(this.stress);
        if (bleachStage === this.bleachStage) return;
        this.bleachStage = bleachStage;
        this.setTexture(this.bleachStages[bleachStage]);
    }

    startHoverPulse() {
        this.setTint(COLORS.coralHover);
        this.hoverPulse?.stop(); // never run two pulses on the same coral
        this.hoverPulse = this.scene.tweens.add({
            targets: this,
            scale: { from: this.baseScale, to: this.baseScale * HOVER_PULSE },
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: "Sine.inOut",
        });
    }

    stopHoverPulse() {
        this.clearTint();
        this.hoverPulse?.stop();
        this.hoverPulse = null;
        this.setScale(this.baseScale); // stopping the pulse mid-way leaves the coral at whatever size it had reached
    }
}

export class CoralReef {
    /**
     * Plants both reefs in the scene.
     * @param {Phaser.Scene} scene the main game, which owns tutorialComplete, simEnd, coralInfoOpen, season and
     *   elapsedSimMs
     */
    constructor(scene) {
        this.scene = scene;
        /** @type {Coral[]} */
        this.corals = [];
        this.collected = new Set(); // ids of the kinds of coral the player has opened
        this.cullX = undefined; // the camera's scrollX when the corals were last culled

        const sandbarStart = (WORLD_WIDTH - SANDBAR_WIDTH) / 2;
        const sandbarEnd = sandbarStart + SANDBAR_WIDTH;

        // One drawing of every kind is handed out between the two reefs, so the whole collection can always be found
        const oneOfEachKind = Phaser.Utils.Array.Shuffle(
            Object.values(CORAL_KINDS).map((kind) => Phaser.Utils.Array.GetRandom(kind.variants)),
        );
        const half = Math.ceil(oneOfEachKind.length / 2);

        this.plantReef(CORAL_CLEARANCE, sandbarStart - CORAL_CLEARANCE, oneOfEachKind.slice(0, half));
        this.plantReef(sandbarEnd + CORAL_CLEARANCE, WORLD_WIDTH - CORAL_CLEARANCE, oneOfEachKind.slice(half));
    }

    plantReef(minX, maxX, requiredVariants) {
        for (const { x, yOffset, variant, row } of planReef(CORALS_PER_REEF, minX, maxX, requiredVariants)) {
            const coral = new Coral(this.scene, x, WORLD_HEIGHT - CORAL_ROWS[row] + yOffset, variant, row);
            coral.setInteractive();
            coral.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => coral.startHoverPulse());
            coral.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => coral.stopHoverPulse());
            coral.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.openCoralInfo(coral));
            this.corals.push(coral);
        }
    }

    // Opens the coral's info popup, and adds its kind to the collection
    openCoralInfo(coral) {
        const { scene } = this;
        if (!scene.tutorialComplete || scene.simEnd || scene.coralInfoOpen) return;

        scene.coralInfoOpen = true;
        const collection = this.collect(coral);
        scene.game.events.emit(GAME_EVENTS.coralSelected, {
            ...getCoralInfo(coral.variant, coral.stress, coral.dead),
            collection,
        });
    }

    // Adds the coral's kind to the collection the first time one of that kind is opened, with a little "New coral!"
    // over the coral. Returns what the popup needs to show: { kind, isNew, collected, total }.
    collect(coral) {
        const { scene } = this;
        const kind = CORAL_VARIANTS[coral.variant].kindId;
        const isNew = !this.collected.has(kind);
        const total = CORAL_KIND_IDS.length;

        if (isNew) {
            this.collected.add(kind);
            scene.emitStats();

            const text = scene.add
                .text(coral.x, coral.y - coral.displayHeight, `New coral! ${this.collected.size}/${total}`, {
                    fontSize: "26px",
                    fontFamily: FONT_FAMILY,
                    fontStyle: "bold",
                    color: "#ffe3a3",
                    stroke: "#0b2e3a",
                    strokeThickness: 5,
                })
                .setOrigin(0.5, 1)
                .setDepth(DEPTH.newCoralText);

            scene.tweens.add({
                targets: text,
                y: text.y - 60,
                alpha: 0,
                duration: 1400,
                ease: "Cubic.out",
                onComplete: () => text.destroy(),
            });
        }

        if (isNew && this.collected.size === total) {
            scene.game.events.emit(GAME_EVENTS.randomEvent, {
                title: "Collection Complete",
                message: `You've found all ${total} kinds of coral on your reef. Now keep them alive!`,
                good: true,
            });
        }

        return { kind, isNew, collected: this.collected.size, total };
    }

    // Leans every coral on screen back and forth. One sine each per frame, in place of 200 tweens that ran whether
    // or not their coral could be seen. Uses the scene's clock, so the reef holds still while the game is paused.
    sway() {
        const now = this.scene.time.now;
        for (const coral of this.corals) {
            if (coral.visible) coral.angle = Math.sin(now * coral.swaySpeed + coral.swayPhase) * coral.swayAngle;
        }
    }

    // Phaser draws every image whether or not the camera can see it. Only about a quarter of the reef is on screen at
    // once, so corals out of view are hidden, which also skips their sway. Called every frame, but only does anything
    // once the view has moved by CULL_STEP.
    cull() {
        // The camera only ever zooms in, which narrows the view, so its unzoomed width covers every case
        const { scrollX, width } = this.scene.cameras.main;
        if (this.cullX !== undefined && Math.abs(scrollX - this.cullX) < CULL_STEP) return;
        this.cullX = scrollX;

        const left = scrollX - CULL_MARGIN - CULL_STEP;
        const right = scrollX + width + CULL_MARGIN + CULL_STEP;
        for (const coral of this.corals) {
            const inView = coral.x > left && coral.x < right;
            if (inView !== coral.visible) coral.setVisible(inView);
        }
    }

    /**
     * Applies the reef's stress change to each coral using its own bleach rate. Called every frame the clock runs.
     * @param {number} stressDelta the reef's change in stress this frame
     * @param {number} deltaMs the frame's length
     */
    updateStress(stressDelta, deltaMs) {
        const { season, elapsedSimMs } = this.scene;

        // Winter brings every living coral back to zero stress by the end of the season, however stressed it was
        let winterRecovery = 0;
        if (stressDelta <= 0 && season === "winter") {
            const winterProgress = Phaser.Math.Clamp(
                ((elapsedSimMs % YEAR_DURATION_MS) - SUMMER_DURATION_MS) / WINTER_DURATION_MS,
                0,
                1,
            );
            winterRecovery = deltaMs / WINTER_DURATION_MS / Math.max(1 - winterProgress, 0.001);
        }

        for (const coral of this.corals) {
            if (coral.dead) continue;

            let change;
            if (stressDelta > 0) change = (stressDelta * coral.bleachRate) / 100;
            else if (season === "winter") change = -coral.stress * winterRecovery;
            else change = stressDelta;

            coral.setStress(coral.stress + change);
        }
    }

    // The reef has died: every coral shows its last bleach stage
    killAll() {
        for (const coral of this.corals) {
            coral.setStress(100);
            coral.dead = true;
        }
    }
}

// Where each coral of one reef goes: patches of one variant, grown outward from a founder colony, with gaps of bare
// sand between them. The first patches are made of requiredVariants, one patch each; the rest are random.
function planReef(count, minX, maxX, requiredVariants = []) {
    const variants = Object.keys(CORAL_VARIANTS);
    const lastRow = CORAL_ROWS.length - 1;

    // approximate normal distribution (Box-Muller)
    const gaussian = () => {
        const u = 1 - Math.random();
        const v = Math.random();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };

    // uneven patch sizes (big and small clumps)
    const patchSizes = [];
    let remaining = count;
    while (remaining > 0) {
        let size = Math.min(remaining, Phaser.Math.Between(MIN_PATCH_SIZE, MAX_PATCH_SIZE));
        if (remaining - size < MIN_PATCH_SIZE) size = remaining; // avoid tiny leftovers
        patchSizes.push(size);
        remaining -= size;
    }

    // irregular patch centers with gaps of bare sand between them: the best of three tries at being far from the rest
    const centers = [];
    for (let i = 0; i < patchSizes.length; i++) {
        let best = null;
        let bestDistance = -1;
        for (let attempt = 0; attempt < 3; attempt++) {
            const candidate = Phaser.Math.FloatBetween(minX, maxX);
            const distance = centers.length ? Math.min(...centers.map((c) => Math.abs(c - candidate))) : Infinity;
            if (distance > bestDistance) {
                best = candidate;
                bestDistance = distance;
            }
        }
        centers.push(best);
    }

    const spawns = [];
    patchSizes.forEach((patchSize, patchIndex) => {
        const center = centers[patchIndex];
        const baseY = Phaser.Math.Between(-35, 35);
        const baseRow = Phaser.Math.Between(0, lastRow);
        const maxRadius = 25 + patchSize * 7; // bigger patches may spread wider

        const variant = requiredVariants[patchIndex] ?? Phaser.Utils.Array.GetRandom(variants);
        const colonies = [{ x: center, y: baseY, row: baseRow }];

        for (let i = 1; i < patchSize; i++) {
            // New colonies settle near an existing one, so the clusters come out organic and blobby
            const parent = Phaser.Utils.Array.GetRandom(colonies);

            let row = parent.row;
            if (Math.random() < ROW_DRIFT_CHANCE) {
                row += Math.random() < 0.5 ? -1 : 1;
            }

            colonies.push({
                x: Phaser.Math.Clamp(
                    parent.x + gaussian() * SETTLE_STEP_X,
                    Math.max(minX, center - maxRadius),
                    Math.min(maxX, center + maxRadius),
                ),
                y: Phaser.Math.Clamp(parent.y + gaussian() * SETTLE_STEP_Y, baseY - 30, baseY + 30),
                row: Phaser.Math.Clamp(row, 0, lastRow),
            });
        }

        // rare mixed patch: a different variant along the outer edge only
        const isMixedPatch = variants.length > 1 && Math.random() < MIXED_PATCH_CHANCE;
        const edgeVariant = isMixedPatch ? Phaser.Utils.Array.GetRandom(variants.filter((v) => v !== variant)) : null;
        const edgeColonies = new Set();

        if (isMixedPatch) {
            [...colonies]
                .sort((a, b) => Math.abs(b.x - center) - Math.abs(a.x - center))
                .slice(0, Math.max(1, Math.ceil(patchSize * 0.25)))
                .forEach((colony) => edgeColonies.add(colony));
        }

        for (const colony of colonies) {
            spawns.push({
                x: colony.x,
                yOffset: colony.y,
                variant: edgeColonies.has(colony) ? edgeVariant : variant,
                row: colony.row,
            });
        }
    });

    return spawns;
}
