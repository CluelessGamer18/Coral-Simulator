import Phaser from "phaser";
import { addGlow, removeGlow } from "./glow.js";
import { SOUNDS, TEXTURES } from "./assetKeys.js";
import { GAME_EVENTS } from "./gameEvents.js";
import { DEPTH, FONT_FAMILY, PLAY_AREA, WORLD_WIDTH } from "./gameConfig.js";

/*
Nest building: the triggerfish collects glowing pieces of rubble from around the sea floor and carries them to its
nest, a crater dug into the sandbar between the reefs. Press Q near a piece to pick it up, then Q again near the nest
to drop it in. Dropping it anywhere else lets it sink back to the floor.

New pieces keep turning up through the whole game, but how many, and which kind, depends on the reef:
  - calm (the first year): the full supply.
  - summer: less, and less again the hotter the water. Shellfish suffer in the heat, so there are fewer shells, and
    dying coral starts to break apart, so there's more coral rubble.
  - winter: the water cools and the reef recovers, but triggerfish nest in warm water, so the supply stays low until
    summer.
High reef stress also means fewer shells at any time of year, because fewer shellfish survive on a stressed reef.
*/

const PIECE_TEXTURES = {
    pebble: TEXTURES.nestPebble,
    shell: TEXTURES.nestShell,
    coral: TEXTURES.nestCoralRubble,
};

// How often a new piece turns up, before the conditions below slow it down. Over a full 10-year game this works out to
// roughly 40 pieces, so a player who keeps collecting finishes the nest in the later years, but not without effort.
const PIECE_SPAWN_INTERVAL = 9000;
const STARTING_PIECES = 4;
const MAX_FLOOR_PIECES = 6; // stop spawning while this many are already lying around
const CONDITIONS = {
    calm: { supply: 1, weights: { pebble: 1, shell: 1, coral: 1 } },
    summer: { supply: 0.7, weights: { pebble: 1, shell: 0.4, coral: 2 } },
    winter: { supply: 0.6, weights: { pebble: 1, shell: 1, coral: 0.6 } },
};
const HEAT_SUPPLY_LOSS = 0.35; // in the worst heat, a summer's supply drops by this much more

// The same nest art grows with each stage. Rim values describe the oval the collected pieces sit on, measured from
// the bottom center of the image.
const NEST_STAGES = [
    { scale: 0.3, piecesNeeded: 0, rimRx: 73, rimRy: 23, rimAboveBottom: 60 },
    { scale: 0.4, piecesNeeded: 8, rimRx: 97, rimRy: 31, rimAboveBottom: 80 },
    { scale: 0.5, piecesNeeded: 20, rimRx: 122, rimRy: 38, rimAboveBottom: 100 },
];
const STAGE_NOTICES = [
    null,
    {
        title: "Nest Growing",
        message:
            "Your triggerfish has dug its nest wider and deeper. Triggerfish blow jets of water at the sand and carry rubble away in their mouths to make room.",
    },
    {
        title: "Nest Complete",
        message:
            "The nest is finished and eggs have been laid in the bottom. Triggerfish guard their nests fiercely and will chase away much bigger fish.",
    },
];

const PIECE_GLOW_COLOR = 0xc04dff; // vivid purple: no other pickup or bubble uses it, so it reads as "nest piece"
const PIECE_GLOW_STYLE = { padding: 22, blur: 10, layers: 12 };
const PICKUP_DISTANCE = 90; // how close the fish must be to grab a piece
const DROP_DISTANCE = 220; // how close the fish must be to the nest to drop a piece in
const NEST_CLEARANCE = 450; // pieces never spawn this close to the nest
const PIECE_MIN_Y = 790; // on or near the floor, but still inside PLAY_AREA so the fish can reach them
const PIECE_MAX_Y = 845;
const PIECE_SCALE = 0.3;
const PIECE_NEST_SCALE = PIECE_SCALE * 0.6; // pieces shrink a little once they're part of the nest

const NEST_BOTTOM = 860; // the nest sits on the sand band the fish swims over (lower down is hidden by the HUD)
const HIDE_ZOOM = 1.35; // how far the camera zooms in on the nest while the fish hides in it
const HIDE_CAMERA_SMOOTHING = 0.08;
const PROMPT_ABOVE_FISH = 70;

/** A piece of rubble that can be carried to the nest. */
class NestPiece extends Phaser.GameObjects.Image {
    constructor(scene, x, y, type) {
        super(scene, x, y, PIECE_TEXTURES[type]);
        scene.add.existing(this);
        this.inNest = false;
        this.rimAngle = 0; // where on the nest's rim it sits, once it's in
    }
}

export class NestBuilding {
    /**
     * The nest, the Q key and the prompt above the fish.
     * @param {Phaser.Scene} scene needs `player` (a PlayerFish) once the game is running
     * @param {number} x where the nest goes
     * @param {{ supply?: boolean }} [options] supply: new pieces keep turning up around the reef as the game goes on
     *   (the main game). Without it there are no pieces but those added with addPiece() (the tutorial).
     */
    constructor(scene, x, { supply = true } = {}) {
        this.scene = scene;
        this.piecesPlaced = 0;
        this.stage = 0;
        /** @type {NestPiece[]} */
        this.pieces = [];
        this.carriedPiece = null;

        this.nest = scene.add
            .image(x, NEST_BOTTOM, TEXTURES.nest)
            .setOrigin(0.5, 1)
            .setScale(NEST_STAGES[0].scale)
            .setDepth(DEPTH.nest);
        this.key = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);

        // A small hint above the fish whenever there's something to pick up or drop, which can share the label with
        // the scene's own hint (hiding)
        this.prompt = scene.add
            .text(0, 0, "", {
                fontFamily: FONT_FAMILY,
                fontSize: "18px",
                color: "#ffffff",
                backgroundColor: "#1f3b4dcc",
                padding: { x: 6, y: 3 },
                align: "center",
            })
            .setOrigin(0.5, 1)
            .setDepth(DEPTH.prompt)
            .setVisible(false);

        if (supply) {
            this.nextPieceIn = PIECE_SPAWN_INTERVAL;
            for (let i = 0; i < STARTING_PIECES; i++) this.spawnPiece("calm");
        }
    }

    /**
     * The main game's every-frame update: new pieces while the clock runs, and the Q controls.
     * @param {number} delta the frame's length in ms
     * @param {boolean} clockIsRunning false during popups and before the tutorial is done, so no pieces turn up
     * @param {string} hidePrompt the scene's own hint for the label above the fish, or ""
     */
    update(delta, clockIsRunning, hidePrompt) {
        const { scene } = this;
        if (clockIsRunning && !scene.simEnd) this.updateSupply(delta);
        this.updateControls(scene.tutorialComplete && !scene.coralInfoOpen && !scene.simEnd, hidePrompt);
    }

    /**
     * Q to pick up, drop and place pieces, and the hint above the fish. Call once a frame.
     * @param {boolean} canAct false while the fish can't use Q
     * @param {string} [hidePrompt] the scene's own hint, shown with this one
     */
    updateControls(canAct, hidePrompt = "") {
        const { player } = this.scene;
        const nearbyPiece = this.carriedPiece ? null : this.findNearbyPiece();
        const rim = this.getRimCenter();
        const nearNest = Phaser.Math.Distance.Between(player.x, player.y, rim.x, rim.y) <= DROP_DISTANCE;

        if (canAct && Phaser.Input.Keyboard.JustDown(this.key)) {
            if (this.carriedPiece) {
                if (nearNest) this.placePiece();
                else this.dropPiece();
            } else if (nearbyPiece) {
                this.pickUp(nearbyPiece);
            }
        }

        if (this.carriedPiece) this.holdPiece();

        let prompt = "";
        if (canAct && this.carriedPiece) prompt = nearNest ? "Q: place in nest" : "Q: drop";
        else if (canAct && nearbyPiece) prompt = "Q: pick up";
        const text = [prompt, hidePrompt].filter(Boolean).join("\n");
        this.prompt
            .setText(text)
            .setVisible(text !== "")
            .setPosition(player.x, player.y - player.displayHeight / 2 - PROMPT_ABOVE_FISH);
    }

    /**
     * Eases the camera in on the nest while the fish hides in it, and back out once it leaves. The scene's camera
     * bounds keep the view on the world, so it settles against the sea floor.
     * @param {boolean} hiding the fish is hiding in the nest
     * @param {number} frameScale
     */
    updateCamera(hiding, frameScale) {
        const camera = this.scene.cameras.main;
        if (!hiding && camera.zoom === 1) return;

        const ease = 1 - Math.pow(1 - HIDE_CAMERA_SMOOTHING, frameScale);
        const targetZoom = hiding ? HIDE_ZOOM : 1;
        const zoom = Phaser.Math.Linear(camera.zoom, targetZoom, ease);
        camera.setZoom(Math.abs(zoom - targetZoom) < 0.001 ? targetZoom : zoom); // Linear never quite arrives

        if (hiding) {
            camera.scrollX = Phaser.Math.Linear(camera.scrollX, this.nest.x - camera.width / 2, ease);
            camera.scrollY = Phaser.Math.Linear(camera.scrollY, this.nest.y - camera.height / 2, ease);
        } else {
            camera.scrollY = Phaser.Math.Linear(camera.scrollY, 0, ease);
        }
    }

    /** Where the fish goes to hide in the nest, and the depth it hides behind. */
    getHidePoint() {
        const { nest } = this;
        return {
            x: nest.x,
            y: Phaser.Math.Clamp(nest.y - nest.displayHeight * 0.45, PLAY_AREA.top, PLAY_AREA.bottom),
            depth: nest.depth,
        };
    }

    // What the reef is going through right now, which decides how many pieces turn up and of which kind
    getCondition() {
        const { season, yearsElapsed } = this.scene;
        if (season === "winter") return "winter";
        if (yearsElapsed >= 1) return "summer";
        return "calm";
    }

    updateSupply(delta) {
        const floorPieces = this.pieces.filter((piece) => !piece.inNest && piece !== this.carriedPiece).length;
        if (floorPieces >= MAX_FLOOR_PIECES) return;

        const condition = this.getCondition();
        let supply = CONDITIONS[condition].supply;
        if (condition === "summer") supply -= HEAT_SUPPLY_LOSS * this.scene.climate.temperatureSeverity;

        this.nextPieceIn -= delta * Math.max(supply, 0.1);
        if (this.nextPieceIn <= 0) {
            this.nextPieceIn += PIECE_SPAWN_INTERVAL;
            this.spawnPiece(condition);
        }
    }

    pickPieceType(condition) {
        const weights = { ...CONDITIONS[condition].weights };
        weights.shell *= 1 - Phaser.Math.Clamp(this.scene.climate.stress / 150, 0, 0.66);

        const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
        let roll = Math.random() * total;
        return Object.keys(weights).find((type) => (roll -= weights[type]) <= 0) ?? "pebble";
    }

    spawnPiece(condition) {
        let x;
        do {
            x = Phaser.Math.Between(PLAY_AREA.sideMargin, WORLD_WIDTH - PLAY_AREA.sideMargin);
        } while (Math.abs(x - this.nest.x) < NEST_CLEARANCE);

        this.addPiece(x, this.pickPieceType(condition));
    }

    /**
     * A glowing piece lying on the floor, ready to be picked up.
     * @param {number} x
     * @param {"pebble" | "shell" | "coral"} type
     * @param {number} [y]
     */
    addPiece(x, type, y = Phaser.Math.Between(PIECE_MIN_Y, PIECE_MAX_Y)) {
        const piece = new NestPiece(this.scene, x, y, type)
            .setScale(PIECE_SCALE)
            .setDepth(DEPTH.nestPiece)
            .setAngle(Phaser.Math.Between(-20, 20));
        addGlow(this.scene, piece, PIECE_GLOW_COLOR, PIECE_GLOW_STYLE);
        this.pieces.push(piece);

        // Fade in so pieces don't pop into existence in front of the player
        this.scene.tweens.add({ targets: piece, alpha: { from: 0, to: 1 }, duration: 800 });
    }

    // The closest piece on the floor within reach. Runs every frame, so it's a plain loop that makes no new arrays.
    findNearbyPiece() {
        const { player } = this.scene;
        let nearest = null;
        let nearestDistance = PICKUP_DISTANCE;
        for (const piece of this.pieces) {
            if (piece.inNest) continue;
            const distance = Phaser.Math.Distance.Between(player.x, player.y, piece.x, piece.y);
            if (distance <= nearestDistance) {
                nearest = piece;
                nearestDistance = distance;
            }
        }
        return nearest;
    }

    pickUp(piece) {
        this.scene.tweens.killTweensOf(piece);
        removeGlow(piece);
        this.carriedPiece = piece;
        this.playPieceSound();
    }

    // Keeps the carried piece in the fish's mouth, at the front of whichever way it's facing
    holdPiece() {
        const { player } = this.scene;
        const mouthDistance = player.displayWidth * 0.45;
        this.carriedPiece
            .setPosition(
                player.x + Math.cos(player.rotation) * mouthDistance,
                player.y + Math.sin(player.rotation) * mouthDistance + 8,
            )
            .setRotation(player.rotation);
        // setDepth makes Phaser sort every object in the scene again, so only call it when the depth really changes
        if (this.carriedPiece.depth !== player.depth + 0.1) this.carriedPiece.setDepth(player.depth + 0.1);
    }

    // Dropped away from the nest: the piece sinks back to the floor and glows again
    dropPiece() {
        const piece = this.carriedPiece;
        this.carriedPiece = null;
        piece.setDepth(DEPTH.nestPiece);
        this.scene.tweens.add({
            targets: piece,
            y: Phaser.Math.Between(PIECE_MIN_Y, PIECE_MAX_Y),
            angle: Phaser.Math.Between(-20, 20),
            duration: 700,
            ease: "Sine.out",
            onComplete: () => addGlow(this.scene, piece, PIECE_GLOW_COLOR, PIECE_GLOW_STYLE),
        });
    }

    getRimCenter() {
        return { x: this.nest.x, y: this.nest.y - NEST_STAGES[this.stage].rimAboveBottom };
    }

    // Where a piece sits on the rim of the current stage's crater
    getRimPosition(angle) {
        const stage = NEST_STAGES[this.stage];
        const center = this.getRimCenter();
        return {
            x: center.x + Math.cos(angle) * stage.rimRx,
            y: center.y + Math.sin(angle) * stage.rimRy,
        };
    }

    // The piece settles onto a random spot on the nest's rim and becomes part of it
    placePiece() {
        const piece = this.carriedPiece;
        this.carriedPiece = null;
        piece.inNest = true;
        piece.rimAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        this.piecesPlaced++;

        this.scene.tweens.add({
            targets: piece,
            ...this.getRimPosition(piece.rimAngle),
            scale: PIECE_NEST_SCALE,
            angle: Phaser.Math.Between(-30, 30),
            duration: 600,
            ease: "Back.out",
            onStart: () => piece.setDepth(DEPTH.nest + 0.1),
            onComplete: () => this.growIfReady(),
        });
        this.playPieceSound();
    }

    growIfReady() {
        const { scene } = this;
        const next = this.stage + 1;
        if (next >= NEST_STAGES.length || this.piecesPlaced < NEST_STAGES[next].piecesNeeded) return;

        this.stage = next;
        const { scale } = NEST_STAGES[next];
        this.nest.setScale(scale * 0.85);

        // A little bounce so the growth is noticeable
        scene.tweens.add({
            targets: this.nest,
            scaleX: { from: scale * 0.85, to: scale },
            scaleY: { from: scale * 0.85, to: scale },
            duration: 500,
            ease: "Back.out",
        });

        // The rim is wider now, so move every piece already in the nest out onto it
        for (const piece of this.pieces.filter((p) => p.inNest)) {
            scene.tweens.add({
                targets: piece,
                ...this.getRimPosition(piece.rimAngle),
                duration: 500,
                ease: "Sine.out",
            });
        }

        scene.game.events.emit(GAME_EVENTS.randomEvent, STAGE_NOTICES[next]);
    }

    playPieceSound() {
        this.scene.sound.play(SOUNDS.nestPiece, { volume: this.scene.sfxVolume });
    }
}
