import Phaser from "phaser";
import { addShade, addCooling, addPlumeHeat, isHeatwave, getCalendarYear } from "./reefModel.js";

/*
The bubbles that drift around the fish during a heatwave. Swimming into one pops it.

  Cloudy        shades the reef for a few seconds, which slows bleaching (from the first heatwave, year 2)
  Cool Current  takes the edge off the heat for a few seconds (from year 4)
  Hot Plume     a pocket of even hotter water that creeps towards the fish; touching one heats the reef for
                the rest of the summer (from year 7)

Both helpful kinds wear off, so a heatwave needs looking after all summer and not just once. Later years bring
fewer helpful bubbles, and they drift away from the fish, which is how the game gets harder.
*/

export const SHADE_AMOUNT = 480;   // light a Cloudy bubble holds off; it fades over 12 seconds (reefModel.js)
export const COOLING_AMOUNT = 2.4; // °C a Cool Current takes off; it fades over 12 seconds
const PLUME_HEAT = 1;              // °C a Hot Plume adds

export const BUBBLES = {
    cloudy: {
        texture: "LightBubble", tint: 0x7fe3c4, label: "Shade", labelColor: "#0b2e3a", helpful: true,
        title: "Cloudy", message: "Clouds are shading the reef for the next few seconds. Shade slows bleaching, but only cooler water stops it.",
    },
    cool: {
        texture: "TempBubble", tint: 0x8fd3ff, label: "Cool", labelColor: "#0b2e3a", helpful: true,
        title: "Cool Current", message: `A current of deeper water has cooled the reef by ${COOLING_AMOUNT} °C for a few seconds. Bleaching can be reversed when the heat is taken away.`,
    },
    plume: {
        texture: "TempBubble", tint: 0xff5d5d, label: "HOT", labelColor: "#ffffff", helpful: false,
        title: "Hot Plume", message: `You swam into a pocket of hot water. The reef is ${PLUME_HEAT} °C hotter until winter. Steer around the red ones!`,
    },
};

// What each heatwave year offers. Times are in ms; helpful bubbles spawn this far from the fish, in px.
function getPlan(year) {
    if (year >= 7) return { every: [3600, 6000], coolChance: 0.4, plumes: year - 5, drift: 1.1 };
    if (year >= 4) return { every: [3000, 5200], coolChance: 0.4, plumes: 0, drift: 0 };
    return { every: [2400, 4200], coolChance: 0, plumes: 0, drift: 0 };
}

const MAX_HELPFUL = 3;
const HELPFUL_LIFETIME = 14000;
const HELPFUL_DISTANCE = [380, 640];
const FIRST_BUBBLE_DELAY = 1800;       // the first bubble of a summer comes quickly, so there is something to do
const DRIFT_RANGE = 520;               // late-game helpful bubbles back away while the fish is this close
const PLUME_EVERY = [4500, 7500];
const PLUME_LIFETIME = 13000;
const PLUME_SPEED = 1.7;               // px per frame at 60fps; the fish swims at 6.75
const PLUME_MIN_SPAWN_DISTANCE = 650;
const BUBBLE_SPACING = 170;            // bubbles don't spawn on top of each other
const SWIM_AREA = { top: 150, bottom: 760 }; // bubbles keep off the sea floor, where the pickups are

export class EventManager {
    constructor(scene) {
        this.scene = scene;
        this.active = [];
        this.wasHeatwave = false;
        this.nextHelpfulIn = 0;
        this.nextPlumeIn = 0;
    }

    // Call every frame from the scene's update()
    update(delta, frameScale) {
        const s = this.scene;
        const heatwave = isHeatwave(s.reef) && !s.simEnd;

        if (heatwave !== this.wasHeatwave) {
            this.wasHeatwave = heatwave;
            if (heatwave) {
                this.nextHelpfulIn = FIRST_BUBBLE_DELAY;
                this.nextPlumeIn = Phaser.Math.Between(...PLUME_EVERY);
            } else {
                this.active.forEach(b => this.expire(b)); // winter: what's left fizzles out
            }
        }
        if (s.coralInfoOpen) return;

        if (heatwave) {
            const plan = getPlan(getCalendarYear(s.reef));
            const count = (helpful) => this.active.filter(b => b.def.helpful === helpful && !b.resolving).length;

            this.nextHelpfulIn -= delta;
            if (this.nextHelpfulIn <= 0) {
                this.nextHelpfulIn = Phaser.Math.Between(...plan.every);
                if (count(true) < MAX_HELPFUL) {
                    this.spawn(Math.random() < plan.coolChance ? "cool" : "cloudy", plan);
                }
            }

            this.nextPlumeIn -= delta;
            if (plan.plumes > 0 && this.nextPlumeIn <= 0) {
                this.nextPlumeIn = Phaser.Math.Between(...PLUME_EVERY);
                if (count(false) < plan.plumes) this.spawn("plume", plan);
            }
        }

        // Removing a bubble replaces this.active with a new array, so the one being looped over is never changed
        for (const b of this.active) this.updateBubble(b, delta, frameScale);
    }

    spawn(kind, plan) {
        const s = this.scene;
        const def = BUBBLES[kind];
        const [near, far] = def.helpful ? HELPFUL_DISTANCE : [PLUME_MIN_SPAWN_DISTANCE, PLUME_MIN_SPAWN_DISTANCE + 500];

        // A ring around the fish, kept inside the water it can reach. A few tries find a spot that the edges of
        // the world haven't pushed too close.
        let x, y;
        for (let tries = 0; tries < 12; tries++) {
            const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
            const distance = Phaser.Math.Between(near, far);
            x = Phaser.Math.Clamp(s.guide.x + Math.cos(angle) * distance, 120, s.WORLD_WIDTH - 120);
            y = Phaser.Math.Clamp(s.guide.y + Math.sin(angle) * distance * 0.6, SWIM_AREA.top, SWIM_AREA.bottom);
            const clearOfFish = Phaser.Math.Distance.Between(x, y, s.guide.x, s.guide.y) >= near * 0.8;
            const clearOfOthers = this.active.every(b => Phaser.Math.Distance.Between(x, y, b.sprite.x, b.sprite.y) >= BUBBLE_SPACING);
            if (clearOfFish && clearOfOthers) break;
        }

        const sprite = s.add.image(x, y, def.texture).setDepth(7.6).setTint(def.tint).setAlpha(0);
        const label = s.add.text(x, y, def.label, {
            fontSize: "17px",
            fontFamily: "Poppins, sans-serif",
            fontStyle: "bold",
            color: def.labelColor,
            stroke: def.helpful ? "#ffffff" : "#7d1717",
            strokeThickness: 4,
        }).setOrigin(0.5, 1).setDepth(7.7).setAlpha(0);
        s.tweens.add({ targets: [sprite, label], alpha: 1, duration: 350 });
        if (!def.helpful) {
            sprite.setScale(1.15);
            s.tweens.add({ targets: sprite, scale: 1.28, duration: 520, yoyo: true, repeat: -1, ease: "Sine.inOut" });
        }

        this.active.push({
            sprite, label, def, kind, age: 0,
            life: def.helpful ? HELPFUL_LIFETIME : PLUME_LIFETIME,
            drift: def.helpful ? plan.drift : 0,
            bob: Math.random() * Math.PI * 2,
        });
    }

    updateBubble(b, delta, frameScale) {
        const s = this.scene;
        if (b.resolving) return;
        b.age += delta;

        const dx = s.guide.x - b.sprite.x;
        const dy = s.guide.y - b.sprite.y;
        const distance = Math.hypot(dx, dy) || 1;

        if (!b.def.helpful && !s.isHiding) {
            // Hot plumes creep towards the fish, slowly enough to swim around
            b.sprite.x += dx / distance * PLUME_SPEED * frameScale;
            b.sprite.y += dy / distance * PLUME_SPEED * frameScale;
        } else if (b.drift > 0 && distance < DRIFT_RANGE) {
            b.sprite.x -= dx / distance * b.drift * frameScale;
            b.sprite.y -= dy / distance * b.drift * 0.5 * frameScale;
        }
        // a gentle bob, in place of a tween per bubble
        b.bob += delta * 0.003;
        b.sprite.y += Math.sin(b.bob) * 0.35 * frameScale;
        b.sprite.x = Phaser.Math.Clamp(b.sprite.x, 100, s.WORLD_WIDTH - 100);
        b.sprite.y = Phaser.Math.Clamp(b.sprite.y, 120, 850);
        b.label.setPosition(b.sprite.x, b.sprite.y - b.sprite.displayHeight * 0.52);

        const touchRadius = b.sprite.displayWidth / 2 + 30;
        if (distance < touchRadius && !s.isHiding) return this.resolve(b);
        if (b.age >= b.life) return this.expire(b);
    }

    // The fish touched the bubble
    resolve(b) {
        const s = this.scene;
        if (b.resolving) return;
        b.resolving = true;
        s.tweens.killTweensOf(b.sprite);
        s.sound.play("bubblePop", { volume: s.sfxVolume });
        this.apply(b.kind);
        s.tweens.add({
            targets: b.sprite,
            scale: b.sprite.scaleX * 1.4,
            alpha: 0,
            angle: b.sprite.angle + 12,
            duration: 180,
            ease: "Back.in",
            onComplete: () => this.remove(b),
        });
        b.label.setVisible(false);
    }

    // What popping a bubble of this kind does to the reef. Also used by the automated balance checks.
    apply(kind) {
        const s = this.scene;
        const def = BUBBLES[kind];
        if (kind === "cloudy") addShade(s.reef, SHADE_AMOUNT);
        else if (kind === "cool") addCooling(s.reef, COOLING_AMOUNT);
        else addPlumeHeat(s.reef, PLUME_HEAT);

        s.onBubblePopped(kind);
        // The lesson is only spelled out the first couple of times; after that the HUD shows the effect
        const seen = (s.bubbleNoticesShown[kind] = (s.bubbleNoticesShown[kind] ?? 0) + 1);
        if (seen <= 2 || !def.helpful) {
            s.game.events.emit("random-event", { title: def.title, message: def.message, warning: !def.helpful, good: def.helpful });
        }
    }

    // Bubbles fizzle out harmlessly
    expire(b) {
        const s = this.scene;
        this.active = this.active.filter(x => x !== b);
        s.tweens.killTweensOf(b.sprite);
        s.tweens.add({ targets: [b.sprite, b.label], alpha: 0, duration: 400, onComplete: () => { b.sprite.destroy(); b.label.destroy(); } });
    }

    remove(b) {
        this.active = this.active.filter(x => x !== b);
        this.scene.tweens.killTweensOf([b.sprite, b.label]);
        b.sprite.destroy();
        b.label.destroy();
    }

    clear() {
        for (const b of this.active) {
            this.scene.tweens.killTweensOf([b.sprite, b.label]);
            b.sprite.destroy();
            b.label.destroy();
        }
        this.active = [];
    }
}
