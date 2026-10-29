import Phaser from "phaser";

/*
Home building: the triggerfish collects glowing pieces of rubble from around the
sea floor and carries them to its nest, a crater dug into the sandbar between the reefs.
Press Q near a piece to pick it up, then Q again near the nest to drop it in.
Dropping it anywhere else lets it sink back to the floor.
*/

// Material textures a piece can use (loaded in Preloader.js)
const PIECE_TEXTURES = ["homePebble", "homeShell", "homeCoralRubble"];
const PIECE_COUNT = 8;
const PIECE_GLOW_COLOR = 0x66ff66;

const PICKUP_DISTANCE = 90;     // how close the fish must be to grab a piece
const HOME_DROP_DISTANCE = 220; // how close the fish must be to the nest to drop a piece in
const HOME_CLEARANCE = 450;     // pieces never spawn this close to the nest
const PIECE_MIN_Y = 790;        // on/near the floor, but still inside the fish's reachable area (y <= 850)
const PIECE_MAX_Y = 845;

const HOME_Y = 815;             // centre of the nest, on the sand band the fish swims over (lower down is hidden by the HUD)
const HOME_DEPTH = 6.5;         // above the sand layers (depth 5 and 6), below the corals in front
const PIECE_DEPTH = 7.5;
const PIECE_HOME_SCALE = 0.6;   // pieces shrink a little once they're part of the nest

// Rim of the nest relative to its centre, matching the crater in home_stage1.svg
const HOME_RIM_RX = 90;
const HOME_RIM_RY = 30;

export function createHomeBuilding(scene) {
    scene.homePiecesPlaced = 0;
    scene.carriedPiece = null;

    scene.home = scene.add.image(scene.WORLD_WIDTH / 2, HOME_Y, "homeStage1").setDepth(HOME_DEPTH);

    scene.homeKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);

    scene.homePieces = [];
    for (let i = 0; i < PIECE_COUNT; i++) {
        const { x, y } = getPieceSpawnLocation(scene);
        const piece = scene.add.image(x, y, Phaser.Utils.Array.GetRandom(PIECE_TEXTURES))
            .setDepth(PIECE_DEPTH)
            .setAngle(Phaser.Math.Between(-20, 20));
        addGlow(scene, piece);
        scene.homePieces.push(piece);
    }

    // Small "Q" hint above the fish whenever there's something to pick up or drop
    scene.homePrompt = scene.add.text(0, 0, "", {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#ffffff",
        backgroundColor: "#1f3b4dcc",
        padding: { x: 6, y: 3 },
    }).setOrigin(0.5, 1).setDepth(10002).setVisible(false);
}

// Called every frame from TestScene.update()
export function updateHomeBuilding(scene) {
    const canAct = scene.tutorialComplete && !scene.bubbleCollision && !scene.coralInfoOpen && !scene.simEnd;
    const nearbyPiece = scene.carriedPiece ? null : findNearbyPiece(scene);
    const nearHome = Phaser.Math.Distance.Between(scene.guide.x, scene.guide.y, scene.home.x, scene.home.y)
        <= HOME_DROP_DISTANCE;

    if (canAct && Phaser.Input.Keyboard.JustDown(scene.homeKey)) {
        if (scene.carriedPiece) {
            if (nearHome) placePieceInHome(scene);
            else dropPiece(scene);
        } else if (nearbyPiece) {
            pickUpPiece(scene, nearbyPiece);
        }
    }

    if (scene.carriedPiece) holdPiece(scene);

    let prompt = "";
    if (canAct && scene.carriedPiece) prompt = nearHome ? "Q: place in nest" : "Q: drop";
    else if (canAct && nearbyPiece) prompt = "Q: pick up";
    scene.homePrompt
        .setText(prompt)
        .setVisible(prompt !== "")
        .setPosition(scene.guide.x, scene.guide.y - scene.guide.displayHeight / 2 - 70);
}

function getPieceSpawnLocation(scene) {
    let x;
    do {
        x = Phaser.Math.Between(100, scene.WORLD_WIDTH - 100);
    } while (Math.abs(x - scene.WORLD_WIDTH / 2) < HOME_CLEARANCE);
    return { x, y: Phaser.Math.Between(PIECE_MIN_Y, PIECE_MAX_Y) };
}

function findNearbyPiece(scene) {
    return scene.homePieces
        .filter(piece => !piece.inHome)
        .map(piece => ({
            piece,
            distance: Phaser.Math.Distance.Between(scene.guide.x, scene.guide.y, piece.x, piece.y),
        }))
        .filter(({ distance }) => distance <= PICKUP_DISTANCE)
        .sort((a, b) => a.distance - b.distance)[0]?.piece;
}

// Pulsing green glow. preFX only exists under WebGL, so the Canvas renderer gets a pulsing green tint instead.
function addGlow(scene, piece) {
    if (piece.preFX) {
        piece.glow = piece.preFX.addGlow(PIECE_GLOW_COLOR, 4, 0, false, 0.1, 12);
        piece.glowTween = scene.tweens.add({
            targets: piece.glow,
            outerStrength: { from: 2, to: 6 },
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: "Sine.inOut",
        });
    } else {
        piece.setTint(PIECE_GLOW_COLOR);
        piece.glowTween = scene.tweens.add({
            targets: piece,
            alpha: { from: 1, to: 0.6 },
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: "Sine.inOut",
        });
    }
}

function removeGlow(piece) {
    piece.glowTween?.stop();
    piece.glowTween = null;
    if (piece.glow) {
        piece.preFX.remove(piece.glow);
        piece.glow = null;
    }
    piece.clearTint().setAlpha(1);
}

function pickUpPiece(scene, piece) {
    scene.tweens.killTweensOf(piece);
    removeGlow(piece);
    scene.carriedPiece = piece;
    scene.sound.play("bubblePop", { volume: scene.sfxVolume });
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
        .setRotation(fish.rotation)
        .setDepth(fish.depth + 0.1);
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
        onComplete: () => addGlow(scene, piece),
    });
}

// The piece settles onto a random spot on the nest's rim and becomes part of it
function placePieceInHome(scene) {
    const piece = scene.carriedPiece;
    scene.carriedPiece = null;
    piece.inHome = true;
    scene.homePiecesPlaced++;

    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    scene.tweens.add({
        targets: piece,
        x: scene.home.x + Math.cos(angle) * HOME_RIM_RX,
        y: scene.home.y + Math.sin(angle) * HOME_RIM_RY,
        scale: PIECE_HOME_SCALE,
        angle: Phaser.Math.Between(-30, 30),
        duration: 600,
        ease: "Back.out",
        onStart: () => piece.setDepth(HOME_DEPTH + 0.1),
    });
    scene.sound.play("bubblePop", { volume: scene.sfxVolume });
}
