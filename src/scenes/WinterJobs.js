import Phaser from "phaser";
import { addGlow, removeGlow } from "./Glow.js";
import { changeStressNear, replantCoral } from "./CoralManager.js";
import { plugPipe, getCalendarYear } from "./reefModel.js";

/*
Things the fish can do for the reef outside the heatwaves, so winters and calm years have a job, and what the
player does in one season changes the next.

  Algae     After bleaching, seaweed grows over weakened coral and smothers it. Reef fish that graze it off give
            the coral room to recover. Triggerfish eat algae along with everything else, so the fish grazes
            tufts off the most stressed corals. Each tuft cleared helps that patch recover; each one left harms it.
  Snails    Coral-eating snails (Drupella, the "drupes") gather on stressed coral. Triggerfish crack open snails,
            so eating them feeds the fish as well as sparing the coral.
  Replant   Branching corals spread naturally when broken pieces settle and regrow. The fish carries a living
            fragment to a dead colony's spot, where it grows into a new colony.
  The pipe  Nutrient pollution makes heatwaves harder on coral. From year 6 the fish can wedge three nest pieces
            into the leaking pipe. (On real reefs this job belongs to people: treating sewage on land.)
*/

const PEST_COUNT = 4;
const PEST_RANGE = 1500;          // px either side of the fish where a job's pests may appear
const PEST_SPACING = 260;
const PEST_REACH = 64;            // how close the fish has to get to clear one
const PEST_RADIUS = 170;          // the patch of coral around a pest that it helps or harms
const PEST_CLEARED_RECOVERY = 22; // stress points taken off that patch when the pest is cleared
const PEST_LEFT_HARM = 22;        // and added if it is still there when summer comes
const PEST_GLOW = 0xffc857;

const FRAGMENT_COUNT = 3;
const FRAGMENT_RANGE = 1300;
const FRAGMENT_HEIGHT = 50;       // px on screen
const FRAGMENT_GLOW = 0x7fe3c4;
const REPLANT_REACH = 120;        // how close (sideways) the fish must be to a dead coral to plant on it
const REPLANT_FROM_YEAR = 4;

export const PIPE_FROM_YEAR = 6;
export const PIPE_ROCKS_NEEDED = 3;
export const PIPE_MOUTH = { x: 300, y: 700 }; // the open end of the pipe at the left of the reef
const PIPE_REACH = 230;

const JOBS = {
    algae: { texture: "algaeTuft", size: 64, word: "Algae", done: "Algae grazed", left: "smothered by algae" },
    snails: { texture: "mulberryDrupe", size: 46, word: "Snail", done: "Snail eaten", left: "eaten by snails" },
};

export function createWinterJobs(scene) {
    scene.pests = [];
    scene.pestJob = null;
    scene.pipeRocks = 0;
    if (!scene.textures.exists("algaeTuft")) drawAlgaeTuft(scene);

    // Shows which dead coral a carried fragment would be planted on
    scene.replantMarker = scene.add.ellipse(0, 0, 150, 34)
        .setStrokeStyle(4, FRAGMENT_GLOW).setDepth(7.4).setVisible(false);
    scene.tweens.add({ targets: scene.replantMarker, scale: 1.2, alpha: 0.55, duration: 700, yoyo: true, repeat: -1 });
}

// A tuft of seaweed, drawn once: a dozen blades fanning out from the bottom
function drawAlgaeTuft(scene) {
    const graphics = scene.make.graphics({ add: false });
    for (let i = 0; i < 13; i++) {
        const lean = (i - 6) / 6;
        graphics.fillStyle(i % 2 ? 0x4f8f3a : 0x76b041, 1);
        graphics.fillTriangle(32 + lean * 8 - 4, 62, 32 + lean * 8 + 4, 62, 32 + lean * 28, 8 + Math.abs(lean) * 22);
    }
    graphics.generateTexture("algaeTuft", 64, 64);
    graphics.destroy();
}

// Puts this winter's pests on the most stressed living corals near the fish. Returns how many there are.
export function startWinterJob(scene, kind) {
    const job = JOBS[kind];
    const candidates = scene.corals
        .filter(coral => !coral.dead && Math.abs(coral.x - scene.guide.x) <= PEST_RANGE)
        .sort((a, b) => b.stress - a.stress);

    const chosen = [];
    for (const coral of candidates) {
        if (chosen.length >= PEST_COUNT) break;
        if (chosen.every(other => Math.abs(other.x - coral.x) >= PEST_SPACING)) chosen.push(coral);
    }

    scene.pestJob = kind;
    for (const coral of chosen) {
        const y = Math.min(coral.y - coral.displayHeight * 0.8, 820); // the fish can't swim lower than 850
        const sprite = scene.add.image(coral.x, y, job.texture).setDepth(7.55).setAlpha(0);
        sprite.setScale(job.size / Math.max(sprite.width, sprite.height));
        scene.tweens.add({ targets: sprite, alpha: 1, duration: 600 });
        addGlow(scene, sprite, PEST_GLOW);
        scene.pests.push({ sprite, coral });
    }
    return chosen.length;
}

// Summer has come: any pest still on the reef harms its patch. Returns how many were left.
export function endWinterJob(scene) {
    const left = scene.pests.length;
    for (const pest of scene.pests) {
        changeStressNear(scene, pest.coral.x, PEST_RADIUS, PEST_LEFT_HARM);
        removePest(scene, pest);
    }
    if (left > 0 && scene.pestJob) {
        scene.game.events.emit("random-event", {
            title: "Winter job unfinished",
            message: `${left} coral ${left === 1 ? "patch was" : "patches were"} ${JOBS[scene.pestJob].left} and ${left === 1 ? "starts" : "start"} the summer weaker.`,
            warning: true,
        });
    }
    scene.pests = [];
    scene.pestJob = null;

    // Fragments nobody picked up wash away
    for (const piece of scene.homePieces.filter(piece => piece.isFragment && piece !== scene.carriedPiece)) {
        removeGlow(piece);
        scene.tweens.add({ targets: piece, alpha: 0, duration: 500, onComplete: () => piece.destroy() });
    }
    scene.homePieces = scene.homePieces.filter(piece => !piece.isFragment || piece === scene.carriedPiece);
    return left;
}

function removePest(scene, pest) {
    removeGlow(pest.sprite);
    scene.tweens.killTweensOf(pest.sprite);
    pest.sprite.destroy();
}

// Called every frame: the fish clears any pest it reaches, and the replant marker follows the fish
export function updateWinterJobs(scene) {
    if (scene.pests.length > 0 && !scene.isHiding) {
        const pest = scene.pests.find(({ sprite }) =>
            Phaser.Math.Distance.Between(scene.guide.x, scene.guide.y, sprite.x, sprite.y) <= PEST_REACH + scene.guide.displayHeight / 4);
        if (pest) clearPest(scene, pest);
    }

    const target = scene.carriedPiece?.isFragment ? findReplantSpot(scene) : null;
    scene.replantMarker.setVisible(Boolean(target));
    if (target) scene.replantMarker.setPosition(target.x, target.y - 12);
}

function clearPest(scene, pest) {
    const job = JOBS[scene.pestJob];
    scene.pests = scene.pests.filter(other => other !== pest);
    changeStressNear(scene, pest.coral.x, PEST_RADIUS, -PEST_CLEARED_RECOVERY);
    scene.yearStats.pestsCleared++;
    scene.sound.play("foodCrunch", { volume: scene.sfxVolume * (scene.pestJob === "snails" ? 1 : 0.5) });
    if (scene.pestJob === "snails") scene.feedFish();
    scene.floatText(pest.sprite.x, pest.sprite.y - 30, `${job.done}: this patch recovers faster`, "#7fe3c4");
    removePest(scene, pest);
}

// Leaves up to three living fragments on the sea floor near the fish, if there are dead corals to replace.
// Returns how many were left.
export function spawnFragments(scene) {
    if (getCalendarYear(scene.reef) < REPLANT_FROM_YEAR) return 0;
    const dead = scene.corals.filter(coral => coral.dead).length;
    const donors = scene.corals.filter(coral => !coral.dead && Math.abs(coral.x - scene.guide.x) <= FRAGMENT_RANGE);
    const count = Math.min(dead, FRAGMENT_COUNT, donors.length);

    for (let i = 0; i < count; i++) {
        const donor = Phaser.Utils.Array.GetRandom(donors);
        const piece = scene.add.image(donor.x + Phaser.Math.Between(-60, 60), Phaser.Math.Between(795, 840), donor.texture.key)
            .setDepth(7.5).setAngle(Phaser.Math.Between(-25, 25));
        piece.setScale(FRAGMENT_HEIGHT / piece.height);
        piece.isFragment = true;
        piece.glowColor = FRAGMENT_GLOW;
        addGlow(scene, piece, FRAGMENT_GLOW);
        scene.homePieces.push(piece);
    }
    return count;
}

// The nearest dead coral the fish is close enough to plant a fragment on
function findReplantSpot(scene) {
    let nearest = null;
    let nearestDistance = REPLANT_REACH;
    for (const coral of scene.corals) {
        if (!coral.dead) continue;
        const distance = Math.abs(coral.x - scene.guide.x);
        if (distance <= nearestDistance && scene.guide.y > coral.y - coral.displayHeight - 260) {
            nearest = coral;
            nearestDistance = distance;
        }
    }
    return nearest;
}

export function findNearestDeadCoral(scene) {
    let nearest = null;
    for (const coral of scene.corals) {
        if (coral.dead && (!nearest || Math.abs(coral.x - scene.guide.x) < Math.abs(nearest.x - scene.guide.x))) nearest = coral;
    }
    return nearest;
}

export const isPipeOpen = (scene) => getCalendarYear(scene.reef) >= PIPE_FROM_YEAR && scene.pipeRocks < PIPE_ROCKS_NEEDED;

// What Q does with the piece the fish is carrying, when that is something other than adding it to the nest.
// Returns { prompt, run } or null. Called by HomeBuilding.js.
export function getCarryAction(scene, piece) {
    if (piece.isFragment) {
        const coral = findReplantSpot(scene);
        if (!coral) return { prompt: "Carry it to a dead coral", run: null };
        return {
            prompt: "replant",
            run: () => {
                scene.carriedPiece = null;
                scene.homePieces = scene.homePieces.filter(other => other !== piece);
                piece.destroy();
                replantCoral(scene, coral);
                scene.yearStats.replanted++;
                scene.totalReplanted++;
                scene.sound.play("nestPiece", { volume: scene.sfxVolume });
                scene.floatText(coral.x, coral.y - 120, "Replanted! It will grow into a new colony", "#7fe3c4");
            },
        };
    }

    const nearPipe = Phaser.Math.Distance.Between(scene.guide.x, scene.guide.y, PIPE_MOUTH.x, PIPE_MOUTH.y) <= PIPE_REACH;
    if (!isPipeOpen(scene) || !nearPipe) return null;
    return {
        prompt: "plug the pipe",
        run: () => {
            scene.carriedPiece = null;
            piece.plugged = true;
            scene.pipeRocks++;
            plugPipe(scene.reef, 1 / PIPE_ROCKS_NEEDED);
            scene.sound.play("nestPiece", { volume: scene.sfxVolume });
            scene.tweens.add({
                targets: piece,
                x: PIPE_MOUTH.x - 28 + scene.pipeRocks * 18,
                y: PIPE_MOUTH.y + 4 - (scene.pipeRocks % 2) * 26,
                scale: 1.5,
                duration: 500,
                ease: "Back.out",
                onStart: () => piece.setDepth(6.2),
            });
            if (scene.pipeRocks >= PIPE_ROCKS_NEEDED) {
                scene.game.events.emit("random-event", {
                    title: "Pipe plugged",
                    message: "The leak has stopped and the water will slowly clear, so later heatwaves will be easier on the coral. On real reefs this takes people treating sewage on land.",
                    good: true,
                });
            } else {
                scene.floatText(PIPE_MOUTH.x, PIPE_MOUTH.y - 90, `${scene.pipeRocks} of ${PIPE_ROCKS_NEEDED}: the leak is slowing`, "#7fe3c4");
            }
        },
    };
}
