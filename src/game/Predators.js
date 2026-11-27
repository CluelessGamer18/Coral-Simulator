import Phaser from "phaser";
import { TEXTURES } from "./assetKeys.js";
import { GAME_EVENTS } from "./gameEvents.js";
import {
    DEPTH,
    PREDATOR_ESCAPE_MARGIN,
    PREDATOR_SCALE,
    PREDATOR_SPEED,
    WORLD_HEIGHT,
    WORLD_WIDTH,
    YEAR_DURATION_MS,
} from "./gameConfig.js";

/*
The groupers that hunt the fish. Each one is in one state at a time:
  - chasing: swims after the fish, with a dash when it's close
  - nervous: the fish has eaten enough to be big, so the grouper keeps its distance
  - fleeing: swimming off the nearer end of the world, because the fish hid in its nest, or (scared) got too close
    once it was big. A scared grouper never comes back.
  - gone: it has left the world
While the fish hides in a coral, a chasing or nervous grouper can't find it and wanders on the spot instead.
*/

const SPAWN_YEARS = [2, 4.5, 7, 9.5]; // when each grouper turns up, in years since the game started
const DASH_SPEED = 10;
const DASH_DURATION = 450;
const DASH_COOLDOWN = 3000;
const DASH_RANGE = 400;
const WANDER_SPEED = PREDATOR_SPEED * 0.4;
const NERVOUS_DISTANCE = 500; // how close a big fish can come before the grouper backs off, divided by the fish's growth
const SCARE_DISTANCE = 250; // and before it flees for good
export const FOOD_TO_SCARE_PREDATOR = 5; // shellfish the fish must eat before it's big enough to scare a grouper
const TURN_SPEED = 0.5; // radians per frame at 60fps
const WIGGLE_SPEED = 0.01;

// A bite lands when the grouper's mouth reaches the fish's body. Both are circles, so the grouper doesn't get a bigger
// reach by turning, and the fish isn't easier to bite after it has grown.
const BITE_INTERVAL = 1000; // ms of touching the predator per half heart lost
const MOUTH_OFFSET = 85; // from the middle of the grouper to its mouth, in px on screen
const MOUTH_RADIUS = 42;
const FISH_BODY_RADIUS = 32;

/**
 * Turns a grouper toward the way it's swimming. The artwork faces left, so it's mirrored to face right.
 * @param {Phaser.GameObjects.Image} sprite
 * @param {number} directionX
 * @param {number} directionY
 * @param {number} frameScale
 */
export function facePredator(sprite, directionX, directionY, frameScale) {
    const flip = directionX === 0 ? sprite.flipX : directionX > 0;
    sprite.setFlipX(flip);
    sprite.rotation = Phaser.Math.Angle.RotateTo(
        sprite.rotation,
        Math.atan2(directionY, directionX) - (flip ? 0 : Math.PI),
        TURN_SPEED * frameScale,
    );
}

export class Predators {
    /** @param {Phaser.Scene} scene the main game: its player, clock and hiding state */
    constructor(scene) {
        this.scene = scene;
        this.list = []; // every grouper this game, gone ones included
        this.touchingFish = false;
        this.contactTime = 0; // time since the last bite while touching the fish, in ms
    }

    /** Any grouper that hasn't left yet */
    get present() {
        return this.list.some(({ state }) => state !== "gone");
    }

    /** Any grouper that's after the fish, rather than leaving */
    get hunting() {
        return this.list.some(({ state }) => state === "chasing" || state === "nervous");
    }

    /**
     * Brings in each grouper when its time comes. Call every frame the clock runs.
     * @param {number} elapsedSimMs
     */
    updateSpawns(elapsedSimMs) {
        while (
            this.list.length < SPAWN_YEARS.length &&
            elapsedSimMs >= SPAWN_YEARS[this.list.length] * YEAR_DURATION_MS
        ) {
            this.spawn();
        }
    }

    spawn() {
        const { scene } = this;
        const sprite = scene.add.image(0, 0, TEXTURES.grouper).setScale(PREDATOR_SCALE).setDepth(DEPTH.predator);
        const halfWidth = sprite.displayWidth / 2;
        const halfHeight = sprite.displayHeight / 2;
        sprite.setPosition(
            Phaser.Math.Clamp(WORLD_WIDTH - halfWidth - PREDATOR_ESCAPE_MARGIN, halfWidth, WORLD_WIDTH - halfWidth),
            Phaser.Math.Clamp(300 + (this.list.length % 3) * 120, halfHeight, WORLD_HEIGHT - halfHeight),
        );

        const predator = {
            sprite,
            state: "chasing",
            stateBeforeFleeing: null, // where a grouper that turns back picks up again
            scared: false,
            retreatDirection: null,
            dashRemaining: 0,
            dashCooldown: 0,
            dashVelocityX: 0,
            dashVelocityY: 0,
            escapeDirection: 0,
            wanderAngle: null,
        };
        this.list.push(predator);

        if (scene.isHidingInNest) this.startFleeing(predator);
        scene.game.events.emit(GAME_EVENTS.predatorAppeared);
    }

    /**
     * Moves every grouper on by one frame.
     * @param {number} delta the frame's length in ms
     * @param {number} frameScale how many 60fps frames it lasted
     */
    update(delta, frameScale) {
        for (const predator of this.list) this.updateOne(predator, delta, frameScale);
    }

    updateOne(predator, delta, frameScale) {
        const { scene } = this;
        if (predator.state === "gone") return;
        if (scene.isHidingInNest && predator.state !== "fleeing") this.startFleeing(predator);

        if (predator.state === "fleeing") {
            this.flee(predator, delta, frameScale);
        } else if (scene.isHiding) {
            // Hidden in the coral: the grouper can't find the fish, so it prowls around until the fish comes out
            this.wander(predator, delta, frameScale);
        } else if (!scene.coralInfoOpen) {
            this.hunt(predator, delta, frameScale);
        }
    }

    // Off the nearer end of the world, with a dash first if the fish scared it
    flee(predator, delta, frameScale) {
        if (predator.scared && predator.dashRemaining > 0) {
            this.move(predator, predator.dashVelocityX, predator.dashVelocityY, DASH_SPEED, frameScale);
            predator.dashRemaining = Math.max(0, predator.dashRemaining - delta);
        } else {
            this.move(predator, predator.escapeDirection, 0, PREDATOR_SPEED, frameScale, false);
        }

        const { x, displayWidth } = predator.sprite;
        const escaped =
            predator.escapeDirection < 0
                ? x + displayWidth / 2 <= -PREDATOR_ESCAPE_MARGIN
                : x - displayWidth / 2 >= WORLD_WIDTH + PREDATOR_ESCAPE_MARGIN;
        if (!escaped) return;

        predator.sprite.destroy();
        predator.state = "gone";
        if (!this.present) this.scene.game.events.emit(GAME_EVENTS.predatorLeft);
    }

    // Slow, lazy loops on the spot, a little wider than they are tall
    wander(predator, delta, frameScale) {
        predator.dashRemaining = 0;
        predator.wanderAngle = (predator.wanderAngle ?? Phaser.Math.FloatBetween(0, Math.PI * 2)) + delta * 0.0007;
        this.move(
            predator,
            Math.cos(predator.wanderAngle),
            Math.sin(predator.wanderAngle) * 0.5,
            WANDER_SPEED,
            frameScale,
            false,
        );
        this.keepInWorld(predator, false);
    }

    // Chasing, or keeping its distance once the fish is big enough to scare it
    hunt(predator, delta, frameScale) {
        const { player, foodEaten } = this.scene;
        const { sprite } = predator;
        const distance = Phaser.Math.Distance.Between(sprite.x, sprite.y, player.x, player.y);
        const canScare = foodEaten >= FOOD_TO_SCARE_PREDATOR;

        if (canScare && predator.state !== "nervous" && distance <= NERVOUS_DISTANCE / player.growth) {
            predator.state = "nervous";
            predator.retreatDirection = null;
            predator.dashRemaining = 0;
        }

        if (canScare && distance <= SCARE_DISTANCE / player.growth) {
            this.startFleeing(predator, true);
        } else if (distance > 0 && predator.state === "nervous") {
            this.backAway(predator, distance, frameScale);
        } else if (distance > 0) {
            this.chase(predator, distance, delta, frameScale);
        }
    }

    backAway(predator, distance, frameScale) {
        const { player } = this.scene;
        const awayX = (predator.sprite.x - player.x) / distance;
        const awayY = (predator.sprite.y - player.y) / distance;

        // Backed into the end of the world: it makes a run for it instead
        if (awayX !== 0 && !this.canMove(predator, Math.sign(awayX), 0, frameScale)) {
            this.startFleeing(predator, true);
            return;
        }

        const current = predator.retreatDirection;
        const alignment = current ? current.x * awayX + current.y * awayY : -1;
        if (!current || alignment < -0.35 || !this.canMove(predator, current.x, current.y, frameScale)) {
            predator.retreatDirection = this.chooseRetreatDirection(predator, awayX, awayY, frameScale);
        }

        const direction = predator.retreatDirection;
        if (direction) this.move(predator, direction.x, direction.y, PREDATOR_SPEED, frameScale);
        this.keepInWorld(predator, true);
    }

    chase(predator, distance, delta, frameScale) {
        const { player } = this.scene;
        const { sprite } = predator;

        if (predator.dashRemaining > 0) {
            this.move(predator, predator.dashVelocityX, predator.dashVelocityY, DASH_SPEED, frameScale);
            predator.dashRemaining = Math.max(0, predator.dashRemaining - delta);
            return;
        }

        predator.dashCooldown = Math.max(0, predator.dashCooldown - delta);
        const directionX = (player.x - sprite.x) / distance;
        const directionY = (player.y - sprite.y) / distance;
        if (predator.dashCooldown === 0 && distance <= DASH_RANGE) {
            predator.dashVelocityX = directionX * DASH_SPEED;
            predator.dashVelocityY = directionY * DASH_SPEED;
            facePredator(sprite, predator.dashVelocityX, predator.dashVelocityY, frameScale);
            predator.dashRemaining = DASH_DURATION;
            predator.dashCooldown = DASH_COOLDOWN;
        } else {
            this.move(predator, directionX, directionY, PREDATOR_SPEED, frameScale);
        }
    }

    /**
     * Sends a grouper off the nearer end of the world.
     * @param {object} predator
     * @param {boolean} [awayFromFish] the fish scared it: it dashes off and won't come back
     */
    startFleeing(predator, awayFromFish = false) {
        if (predator.state === "gone") return;
        if (predator.scared && !awayFromFish) return;

        predator.scared ||= awayFromFish;
        predator.retreatDirection = null;
        if (predator.state !== "fleeing") predator.stateBeforeFleeing = predator.state;
        predator.state = "fleeing";
        predator.escapeDirection = predator.sprite.x <= WORLD_WIDTH / 2 ? -1 : 1;
        if (awayFromFish) {
            predator.dashVelocityX = predator.escapeDirection * DASH_SPEED;
            predator.dashVelocityY = 0;
            predator.dashRemaining = DASH_DURATION;
        }
        predator.sprite.clearTint();
    }

    /** The fish came out of the nest too soon: every grouper that was only leaving because of it turns back. */
    turnBack() {
        for (const predator of this.list) {
            if (predator.state === "fleeing" && !predator.scared) {
                predator.state = predator.stateBeforeFleeing ?? "chasing";
            }
        }
    }

    /**
     * Half a heart the moment a grouper's mouth reaches the fish, then another for every second it stays there. Call
     * every frame; it calls the scene's loseHalfHeart().
     * @param {number} delta
     */
    updateBites(delta) {
        const { scene } = this;
        // No damage while a popup is open, since the fish can't move away, or while the fish is hidden: the nest
        // scares groupers off, and in the coral they can't find it
        const paused = scene.coralInfoOpen;
        const touching = !paused && !scene.isHiding && this.list.some((predator) => this.mouthReachesFish(predator));

        if (!touching) {
            if (!paused) this.touchingFish = false;
            return;
        }

        if (!this.touchingFish) {
            this.touchingFish = true;
            this.contactTime = 0;
            scene.loseHalfHeart();
        } else {
            this.contactTime += delta;
        }
        if (this.contactTime >= BITE_INTERVAL) {
            this.contactTime -= BITE_INTERVAL;
            scene.loseHalfHeart();
        }
    }

    mouthReachesFish(predator) {
        if (predator.state === "gone" || predator.state === "fleeing") return false;
        const { sprite } = predator;
        const { player } = this.scene;
        // Where the grouper's mouth is. Its artwork faces left, and is mirrored to face right.
        const facing = sprite.flipX ? 1 : -1;
        const mouthX = sprite.x + Math.cos(sprite.rotation) * MOUTH_OFFSET * facing;
        const mouthY = sprite.y + Math.sin(sprite.rotation) * MOUTH_OFFSET * facing;
        return Phaser.Math.Distance.Between(mouthX, mouthY, player.x, player.y) <= MOUTH_RADIUS + FISH_BODY_RADIUS;
    }

    move(predator, directionX, directionY, speed, frameScale, addWiggle = true) {
        const length = Math.hypot(directionX, directionY);
        if (length === 0) return;

        const { sprite } = predator;
        const normalX = directionX / length;
        const normalY = directionY / length;
        const wiggle = addWiggle ? Math.sin(this.scene.time.now * WIGGLE_SPEED) * frameScale : 0;

        sprite.x += normalX * speed * frameScale - normalY * wiggle;
        sprite.y += normalY * speed * frameScale + normalX * wiggle;
        facePredator(sprite, normalX, normalY, frameScale);
        // Kept inside the top and bottom of the world, allowing for the tallest it can be when turned
        const reach = sprite.displayWidth / 2;
        sprite.y = Phaser.Math.Clamp(
            sprite.y,
            Math.min(reach, WORLD_HEIGHT / 2),
            Math.max(WORLD_HEIGHT - reach, WORLD_HEIGHT / 2),
        );
    }

    keepInWorld(predator, vertically) {
        const { sprite } = predator;
        sprite.x = Phaser.Math.Clamp(sprite.x, sprite.displayWidth / 2, WORLD_WIDTH - sprite.displayWidth / 2);
        if (vertically) {
            sprite.y = Phaser.Math.Clamp(sprite.y, sprite.displayHeight / 2, WORLD_HEIGHT - sprite.displayHeight / 2);
        }
    }

    // Whether a normal-speed step that way would keep the whole grouper inside the world
    canMove(predator, directionX, directionY, frameScale) {
        const length = Math.hypot(directionX, directionY);
        if (length === 0) return false;

        const { sprite } = predator;
        const normalX = directionX / length;
        const normalY = directionY / length;
        const wiggle = Math.sin(this.scene.time.now * WIGGLE_SPEED) * frameScale;
        const nextX = sprite.x + normalX * PREDATOR_SPEED * frameScale - normalY * wiggle;
        const nextY = sprite.y + normalY * PREDATOR_SPEED * frameScale + normalX * wiggle;
        const halfWidth = sprite.displayWidth / 2;
        const halfHeight = sprite.displayHeight / 2;

        return (
            nextX >= halfWidth &&
            nextX <= WORLD_WIDTH - halfWidth &&
            nextY >= halfHeight &&
            nextY <= WORLD_HEIGHT - halfHeight
        );
    }

    // The open direction closest to straight away from the fish
    chooseRetreatDirection(predator, awayX, awayY, frameScale) {
        const candidates = [
            { x: awayX, y: awayY },
            { x: awayX, y: 0 },
            { x: 0, y: awayY },
            { x: 1, y: 0 },
            { x: -1, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: -1 },
        ];

        return candidates
            .filter(({ x, y }) => x !== 0 || y !== 0)
            .map(({ x, y }) => {
                const length = Math.hypot(x, y);
                return { x: x / length, y: y / length };
            })
            .filter(({ x, y }) => this.canMove(predator, x, y, frameScale))
            .sort((a, b) => b.x * awayX + b.y * awayY - (a.x * awayX + a.y * awayY))[0];
    }
}
