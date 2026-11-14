import Phaser from "phaser";
import { addGlow, removeGlow } from "./Glow.js";
import { takeVirtualKey, listenForPress } from "./PointerControls.js";
import { getCarryAction } from "./WinterJobs.js";
import { getSettings } from "../settings.js";

/*
Home building: the triggerfish collects glowing pieces of rubble from around the
sea floor and carries them to its nest, a crater dug into the sandbar between the reefs.
Press Q near a piece to pick it up, then Q again near the nest to drop it in.
Dropping it anywhere else lets it sink back to the floor.

New pieces keep turning up over the whole game, but how many (and which kind)
depends on what the reef is going through:
- calm water (the first year): full supply
- summer: the reef is in its warmer season, so supply varies with heat stress
  the hotter it gets. Shellfish suffer in the heat, so fewer shells; dying coral starts to
  break apart, so more coral rubble
- cooling (winter): the water settles and the reef recovers, but triggerfish nest in warm
  water, so the supply stays low until summer
High reef stress also means fewer shells, because fewer shellfish survive on a stressed reef.
*/

const PIECE_TYPES = {
    pebble: "homePebble",
    shell: "homeShell",
    coral: "homeCoralRubble",
};

// How often a new piece turns up, before the conditions below slow it down.
// Over a full 10-year game this works out to roughly 40 pieces, so a player who
// keeps collecting reaches stage 3 in the later years, but not without effort.
const PIECE_SPAWN_INTERVAL = 9000;
const STARTING_PIECES = 4;
const MAX_FLOOR_PIECES = 6; // stop spawning while this many are already lying around

const CONDITIONS = {
    calm: { supply: 1, weights: { pebble: 1, shell: 1, coral: 1 } },
    bleaching: { supply: 0.7, weights: { pebble: 1, shell: 0.4, coral: 2 } },
    cooling: { supply: 0.6, weights: { pebble: 1, shell: 1, coral: 0.6 } },
};
const BLEACHING_HEAT_SUPPLY_LOSS = 0.35; // at the worst heat, a bleaching event's supply drops by this much more

// Each stage is the crater from home_stageN.svg, drawn at 6x. The rim values describe the oval the
// collected pieces sit on, measured from the bottom-centre of the image.
export const HOME_STAGES = [
    { texture: "homeStage1", piecesNeeded: 0, rimRx: 90, rimRy: 30, rimAboveBottom: 48 },
    { texture: "homeStage2", piecesNeeded: 8, rimRx: 120, rimRy: 41, rimAboveBottom: 60 },
    { texture: "homeStage3", piecesNeeded: 20, rimRx: 150, rimRy: 51, rimAboveBottom: 72 },
];
const STAGE_NOTICES = [
    null,
    {
        title: "Nest Growing",
        message: "Your triggerfish has dug its nest wider and deeper. Triggerfish blow jets of water at the sand and carry rubble away in their mouths to make room.",
    },
    {
        title: "Nest Complete",
        message: "The nest is finished and eggs have been laid in the bottom. Triggerfish guard their nests fiercely and will chase away much bigger fish.",
    },
];

const PIECE_GLOW_COLOR = 0xffe07a; // sand yellow: green and red are kept for the state of the reef
const PICKUP_DISTANCE = 90;     // how close the fish must be to grab a piece
const HOME_DROP_DISTANCE = 220; // how close the fish must be to the nest to drop a piece in
const HOME_CLEARANCE = 450;     // pieces never spawn this close to the nest
const PIECE_MIN_Y = 790;        // on/near the floor, but still inside the fish's reachable area (y <= 850)
const PIECE_MAX_Y = 845;

const HOME_BOTTOM = 860;        // the nest sits on the sand band the fish swims over
const HOME_DEPTH = 6.5;         // above the sand layers (depth 5 and 6), below the corals in front
const PIECE_DEPTH = 7.5;
const PIECE_HOME_SCALE = 0.6;   // pieces shrink a little once they're part of the nest
const HIDE_ZOOM = 1.35;         // how far the camera zooms in on the nest while the fish hides in it
const HIDE_CAMERA_SMOOTHING = 0.08;

export function createHomeBuilding(scene) {
    createHome(scene, scene.WORLD_WIDTH / 2);
    scene.nextHomePieceIn = PIECE_SPAWN_INTERVAL;
    for (let i = 0; i < STARTING_PIECES; i++) spawnPiece(scene, "calm");
}

// The nest, the Q key and the prompt, without any pieces. Also used by the tutorial, which places its own pieces.
export function createHome(scene, x) {
    scene.homePiecesPlaced = 0;
    scene.homeStage = 0;
    scene.carriedPiece = null;
    scene.homePieces = [];

    scene.home = scene.add.image(x, HOME_BOTTOM, HOME_STAGES[0].texture)
        .setOrigin(0.5, 1)
        .setDepth(HOME_DEPTH);

    scene.homeKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    listenForPress(scene, scene.homeKey, "action");

    // Small "Q" hint above the fish whenever there's something to pick up or drop
    scene.homePrompt = scene.add.text(0, 0, "", {
        fontFamily: "Poppins, sans-serif",
        fontSize: "18px",
        fontStyle: "bold",
        color: "#ffffff",
        backgroundColor: "#0b2e3ae6",
        padding: { x: 9, y: 4 },
    }).setOrigin(0.5, 1).setDepth(10002).setVisible(false);
}

// Eases the camera in on the nest while the fish hides in it, and back out once it leaves.
// The scene's camera bounds keep the view on the world, so it settles against the sea floor.
export function updateNestCamera(scene, hiding, frameScale) {
    const cam = scene.cameras.main;
    if (!hiding && cam.zoom === 1 && cam.scrollY === 0) return;

    const ease = 1 - Math.pow(1 - HIDE_CAMERA_SMOOTHING, frameScale);
    const targetZoom = hiding && !getSettings().reducedMotion ? HIDE_ZOOM : 1; // zooming is motion some players can't watch
    const zoom = Phaser.Math.Linear(cam.zoom, targetZoom, ease);
    cam.setZoom(Math.abs(zoom - targetZoom) < 0.001 ? targetZoom : zoom); // Linear never quite arrives

    if (hiding) {
        cam.scrollX = Phaser.Math.Linear(cam.scrollX, scene.home.x - cam.width / 2, ease);
        cam.scrollY = Phaser.Math.Linear(cam.scrollY, scene.home.y - cam.height / 2, ease);
    } else {
        cam.scrollY = Phaser.Math.Linear(cam.scrollY, 0, ease);
    }
}

// Called every frame from TestScene.update(). clockIsRunning is false during the tutorial and popups,
// so no pieces turn up while the game's clock is stopped.
export function updateHomeBuilding(scene, delta, clockIsRunning) {
    if (clockIsRunning && !scene.simEnd) updatePieceSupply(scene, delta);

    const canAct = scene.tutorialComplete && !scene.coralInfoOpen && !scene.simEnd;
    updateHomeControls(scene, canAct);
}

// Q to pick up, drop and place pieces, and the hint above the fish. canAct is false while the fish can't use Q.
export function updateHomeControls(scene, canAct) {
    const nearbyPiece = scene.carriedPiece ? null : findNearbyPiece(scene);
    const center = getRimCenter(scene);
    const nearHome = Phaser.Math.Distance.Between(scene.guide.x, scene.guide.y, center.x, center.y)
        <= HOME_DROP_DISTANCE;

    // Replanting a fragment or plugging the pipe (WinterJobs.js). The tutorial has neither.
    const special = scene.carriedPiece && scene.reef ? getCarryAction(scene, scene.carriedPiece) : null;
    const canPlace = nearHome && !scene.carriedPiece?.isFragment;

    // Q, or the on-screen button on a touch screen
    const pressed = takeVirtualKey(scene, "action");
    if (canAct && pressed) {
        if (special?.run) special.run();
        else if (scene.carriedPiece) {
            if (canPlace) placePieceInHome(scene);
            else dropPiece(scene);
        } else if (nearbyPiece) {
            pickUpPiece(scene, nearbyPiece);
        }
    }

    if (scene.carriedPiece) holdPiece(scene);

    let prompt = "";
    if (canAct && scene.carriedPiece) {
        if (special) prompt = special.run ? `Q: ${special.prompt}` : special.prompt;
        else prompt = canPlace ? "Q: place in nest" : "Q: drop";
    } else if (canAct && nearbyPiece) prompt = "Q: pick up";
    scene.actionAvailable = prompt.startsWith("Q"); // lights up the on-screen button
    scene.homePrompt
        .setText(prompt)
        .setVisible(prompt !== "")
        .setPosition(scene.guide.x, scene.guide.y - scene.guide.displayHeight / 2 - 70);
}

// What the reef is going through right now, which decides how many pieces turn up and of which kind
function getReefCondition(scene) {
    if (scene.season === "winter") return "cooling";
    if (scene.tempStressSeverity > 0) return "bleaching";
    return "calm";
}

function updatePieceSupply(scene, delta) {
    const floorPieces = scene.homePieces
        .filter(piece => !piece.inHome && !piece.plugged && !piece.isFragment && piece !== scene.carriedPiece).length;
    if (floorPieces >= MAX_FLOOR_PIECES) return;

    const condition = getReefCondition(scene);
    let supply = CONDITIONS[condition].supply;
    if (condition === "bleaching") supply -= BLEACHING_HEAT_SUPPLY_LOSS * scene.tempStressSeverity;

    scene.nextHomePieceIn -= delta * Math.max(supply, 0.1);
    if (scene.nextHomePieceIn <= 0) {
        scene.nextHomePieceIn += PIECE_SPAWN_INTERVAL;
        spawnPiece(scene, condition);
    }
}

function pickPieceType(scene, condition) {
    const weights = { ...CONDITIONS[condition].weights };
    weights.shell *= 1 - Phaser.Math.Clamp(scene.stressValue / 150, 0, 0.66);

    const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
    let roll = Math.random() * total;
    return Object.keys(weights).find(type => (roll -= weights[type]) <= 0) ?? "pebble";
}

function spawnPiece(scene, condition) {
    let x;
    do {
        x = Phaser.Math.Between(100, scene.WORLD_WIDTH - 100);
    } while (Math.abs(x - scene.WORLD_WIDTH / 2) < HOME_CLEARANCE);

    addPiece(scene, x, pickPieceType(scene, condition));
}

// A glowing piece lying on the floor, ready to be picked up. type is a key of PIECE_TYPES.
export function addPiece(scene, x, type, y = Phaser.Math.Between(PIECE_MIN_Y, PIECE_MAX_Y)) {
    const piece = scene.add.image(x, y, PIECE_TYPES[type])
        .setDepth(PIECE_DEPTH)
        .setAngle(Phaser.Math.Between(-20, 20));
    addGlow(scene, piece, PIECE_GLOW_COLOR);
    scene.homePieces.push(piece);

    // Fade in so pieces don't pop into existence in front of the player
    scene.tweens.add({ targets: piece, alpha: { from: 0, to: 1 }, duration: 800 });
}

// The closest piece on the floor within reach. Runs every frame, so it's a plain loop that makes no new arrays.
function findNearbyPiece(scene) {
    let nearest = null;
    let nearestDistance = PICKUP_DISTANCE;
    for (const piece of scene.homePieces) {
        if (piece.inHome || piece.plugged) continue;
        const distance = Phaser.Math.Distance.Between(scene.guide.x, scene.guide.y, piece.x, piece.y);
        if (distance <= nearestDistance) {
            nearest = piece;
            nearestDistance = distance;
        }
    }
    return nearest;
}

function pickUpPiece(scene, piece) {
    scene.tweens.killTweensOf(piece);
    removeGlow(piece);
    scene.carriedPiece = piece;
    scene.sound.play("nestPiece", { volume: scene.sfxVolume });
}

// Keeps the carried piece in the fish's mouth, at the front of whichever way it's facing
function holdPiece(scene) {
    const fish = scene.guide;
    const mouthDistance = fish.displayWidth * 0.45;
    scene.carriedPiece
        .setPosition(
            fish.x + Math.cos(fish.rotation) * mouthDistance,
            fish.y + Math.sin(fish.rotation) * mouthDistance + 8
        )
        .setRotation(fish.rotation);
    // setDepth makes Phaser sort every object in the scene again, so only call it when the depth really changes
    if (scene.carriedPiece.depth !== fish.depth + 0.1) scene.carriedPiece.setDepth(fish.depth + 0.1);
}

// Dropped away from the nest: the piece sinks back to the floor and glows again
function dropPiece(scene) {
    const piece = scene.carriedPiece;
    scene.carriedPiece = null;
    piece.setDepth(PIECE_DEPTH);
    scene.tweens.add({
        targets: piece,
        y: Phaser.Math.Between(PIECE_MIN_Y, PIECE_MAX_Y),
        angle: Phaser.Math.Between(-20, 20),
        duration: 700,
        ease: "Sine.out",
        onComplete: () => addGlow(scene, piece, piece.glowColor ?? PIECE_GLOW_COLOR),
    });
}

function getRimCenter(scene) {
    return { x: scene.home.x, y: scene.home.y - HOME_STAGES[scene.homeStage].rimAboveBottom };
}

// Where a piece sits on the rim of the current stage's crater
function getRimPosition(scene, angle) {
    const stage = HOME_STAGES[scene.homeStage];
    const center = getRimCenter(scene);
    return {
        x: center.x + Math.cos(angle) * stage.rimRx,
        y: center.y + Math.sin(angle) * stage.rimRy,
    };
}

// The piece settles onto a random spot on the nest's rim and becomes part of it
function placePieceInHome(scene) {
    const piece = scene.carriedPiece;
    scene.carriedPiece = null;
    piece.inHome = true;
    piece.rimAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    scene.homePiecesPlaced++;
    if (scene.yearStats) scene.yearStats.placed++;

    scene.tweens.add({
        targets: piece,
        ...getRimPosition(scene, piece.rimAngle),
        scale: PIECE_HOME_SCALE,
        angle: Phaser.Math.Between(-30, 30),
        duration: 600,
        ease: "Back.out",
        onStart: () => piece.setDepth(HOME_DEPTH + 0.1),
        onComplete: () => growHomeIfReady(scene),
    });
    scene.sound.play("nestPiece", { volume: scene.sfxVolume });
}

function growHomeIfReady(scene) {
    const next = scene.homeStage + 1;
    if (next >= HOME_STAGES.length || scene.homePiecesPlaced < HOME_STAGES[next].piecesNeeded) return;

    scene.homeStage = next;
    scene.home.setTexture(HOME_STAGES[next].texture);

    // A little bounce so the growth is noticeable
    scene.tweens.add({
        targets: scene.home,
        scaleX: { from: 0.85, to: 1 },
        scaleY: { from: 0.85, to: 1 },
        duration: 500,
        ease: "Back.out",
    });

    // The rim is wider now, so move every piece already in the nest out onto it
    for (const piece of scene.homePieces.filter(p => p.inHome)) {
        scene.tweens.add({
            targets: piece,
            ...getRimPosition(scene, piece.rimAngle),
            duration: 500,
            ease: "Sine.out",
        });
    }

    scene.game.events.emit("random-event", STAGE_NOTICES[next]);
}
