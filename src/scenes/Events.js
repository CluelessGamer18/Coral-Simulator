import Phaser from "phaser";

// Tweak these values to change how the event bubbles behave
const CONFIG = {
    spawnMinTime: 1000, // minimum time between event spawns
    spawnMaxTime: 7000, // maximum time between event spawns
    maxNegativeBubbles: 6, // maximum number of negative bubbles on screen at once
    maxTotalBubbles: 10, // maximum number of total bubbles on screen at once
    negativeBubbleLifetime: 30000, // evade negative bubbles for this long and they disappear
    positiveBubbleLifetime: 45000, 
    aggroRadius: 700, // if the player is within this distance the bubbles will chase the player
    minSpawnDistance: 700, // the negative bubbles must spawn at least this far away from the player
    baseChaseSpeed: 1.2,
    chasePerIntensity: 0.2, // this is the base value for each point of intensity as each event can have varying values
    eventsCanKill: true, // when false, negative events cannot push conditions into fatal ranges
    negativeHitDamage: 0, // half a heart lost by interacting with event bubble
};

// Environmental variable map
const VARIABLES = {
    temperature: {prop: "temperature", setter: "updateTemperature", texture: "TempBubble", label: "The temperature", unit: "°C", max: 35},
    light: {prop: "lightLevel", setter: "updateLight", texture: "LightBubble", label: "The light level", unit: "", max: 1839},
};

const EVENT_CHANGE_RANGES = {
    temperature: {min: 1, max: 5, step: 1},
    light: {min: 100, max: 500, step: 10},
};

function randomEventChange(variable) {
    const { min, max, step } = EVENT_CHANGE_RANGES[variable];
    return Phaser.Math.Between(min / step, max / step) * step;
}

// Calculate risk with something defined as the profile of a trapezoid-shaped distribution
// This calculates the normalized probability (0 to 1) or risk occuring up to value
function risk(value, {a, b, c, d}){
    if (value < b) return Phaser.Math.Clamp((b - value) / (b - a), 0, 1);
    if (value > c) return Phaser.Math.Clamp((value - c) / (d - c), 0, 1);
    return 0;
}

// Event definitions
// weight (r) gets the current risk of each variable and returns how likely it is to be relevant to the other ones
export const EVENTS = [
    // Negative events (chase fish), darker = more intense
    {
        id: "temp_up", type: "negative", intensity: 2, variable: "temperature",
        title: "Ocean Temperatures Rising", learning: "multiple_stressors",
        teach: "High heat builds stress over time, and bright light can make that stress build faster.",
        weight: (r) => 1 + r.light * 1.5,
    },
    {
        id: "light_up", type: "negative", intensity: 2, variable: "light",
        title: "Light Levels Increasing", learning: "multiple_stressors",
        teach: "Bright light can accelerate bleaching when water is too warm.",
        weight: (r) => 1 + r.temperature * 1.5,
    },

    // Positive events (swim into them to help the reef)
    {
        id: "cool_current", type: "positive", intensity: 1, variable: "temperature",
        title: "Cool Current", learning: "reversible",
        teach: "Coral bleaching can be reversed when the stress is removed.",
        weight: (r) => 0.4 + r.temperature * 3,
    },
    {
        id: "shade", type: "positive", intensity: 1, variable: "light",
        title: "Cloudy", learning: "reversible",
        teach: "Shade from clouds takes pressure off of stressed corals.",
        weight: (r) => 0.4 + r.light * 3,
    },
];

// Event Manager
export class EventManager {
    constructor(scene, thresholds) {
        this.scene = scene;
        this.th = thresholds;
        this.active = [];
        this.season = scene.season;
        this.nextSpawnIn = Phaser.Math.Between(CONFIG.spawnMinTime, CONFIG.spawnMaxTime);
    }

    // Call every frame from the scene's update()
    update(delta, frameScale) {
        const s = this.scene;

        // Nothing happens during the tutorial, popups, the end screen, or the first year.
        // This gives players time to learn the reef before event bubbles begin appearing.
        if (s.simEnd || !s.tutorialComplete || s.bubbleCollision || s.coralInfoOpen || s.yearsElapsed < 1) return;

        if (this.season !== s.season) {
            this.clear();
            this.season = s.season;
            this.nextSpawnIn = Phaser.Math.Between(CONFIG.spawnMinTime, CONFIG.spawnMaxTime);
        }

        this.nextSpawnIn -= delta;
        if (this.nextSpawnIn <= 0) {
            this.spawn();
            this.nextSpawnIn = Phaser.Math.Between(CONFIG.spawnMinTime, CONFIG.spawnMaxTime);
        }

        // Copy the array because resolving an event is able to modify it.
        for (const b of [...this.active]) this.updateBubble(b, delta, frameScale);
    }

    // Check if bubbles can spawn
    canSpawn(def) {
        const isSummer = this.scene.season === "summer";
        if ((def.type === "negative") !== isSummer) return false;

        const variable = VARIABLES[def.variable];
        const threshold = this.th[def.variable];
        const value = this.scene[variable.prop];

        if (def.type === "negative") {
            if (value < threshold.b) return false; // Already below the healthy value
            const maxChange = EVENT_CHANGE_RANGES[def.variable].max;
            const after = value + maxChange;
            if (!CONFIG.eventsCanKill && after > variable.max) return false;
            if (!CONFIG.eventsCanKill && after > threshold.d) return false; // Prevent events from instantly killing the reef
            if (!CONFIG.eventsCanKill) {
                const nextTemperature = def.variable === "temperature" ? after : this.scene.temperature;
                const nextLight = def.variable === "light" ? after : this.scene.lightLevel;
                const temperatureThreshold = this.th.temperature;
                const lightThreshold = this.th.light;
                const wouldCauseFatalPair =
                    (nextTemperature >= temperatureThreshold.d && nextLight >= lightThreshold.d)
                    || (nextTemperature <= temperatureThreshold.a && nextLight <= lightThreshold.a);
                if (wouldCauseFatalPair) return false;
            }
            return true;
        }

        return value > threshold.b;
    }

    // Choose what event is picked
    pickEvent() {
        const s = this.scene;
        // Winter recovery is automatic; keep positive event definitions available for future use.
        if (s.season !== "summer") return null;

        const r = {
            temperature: risk(s.temperature, this.th.temperature),
            light: risk(s.lightLevel, this.th.light),
        };
        const negativeCount = this.active.filter(b => b.def.type === "negative").length;

        const pool = EVENTS
            .filter(e => !(e.type === "negative" && negativeCount >= CONFIG.maxNegativeBubbles))
            .filter(e => this.canSpawn(e))
            .map(e => ({e, w: Math.max(0, e.weight(r))}))
            .filter(p => p.w > 0);

        const total = pool.reduce((sum, p) => sum + p.w, 0);
        if (total <= 0) return null;

        let roll = Math.random() * total;
        return (pool.find(p => (roll -= p.w) <= 0) ?? pool[0]).e;
    }

    // Spawning
    spawn() {
        if (this.active.length >= CONFIG.maxTotalBubbles) return;
        const def = this.pickEvent();
        if (!def) return;

        const s = this.scene;
        const change = randomEventChange(def.variable);
        const minDist = def.type === "negative" ? CONFIG.minSpawnDistance: 300;
        let x, y, tries = 0;

        do {
            // Only spawn in the same areas that the fish can reach
            x = Phaser.Math.Between(100, s.WORLD_WIDTH - 100);
            y = Phaser.Math.Between(120, 850);
        } while (Phaser.Math.Distance.Between(x, y, s.guide.x, s.guide.y) < minDist && ++tries < 20);

        const sprite = s.add.image(x, y, VARIABLES[def.variable].texture).setDepth(7);
        const changeSign = def.type === "negative" ? "+" : "−";
        const changeUnit = def.variable === "temperature" ? "°C" : "";
        const label = s.add.text(x, y, `${changeSign}${change}${changeUnit}`, {
            fontSize: "18px",
            fontFamily: "Arial, sans-serif",
            fontStyle: "bold",
            color: def.type === "negative" ? "#ffffff" : "#123d24",
            stroke: def.type === "negative" ? "#7d1717" : "#ffffff",
            strokeThickness: 3,
        })
            .setOrigin(0.5, 1)
            .setDepth(8);

        if (def.type === "negative") {
            // Red, getting darker with intensity: 1 = bright red, 3 = dark red
            const red = Math.round(255 - (def.intensity - 1) * 55);
            sprite.setTint(Phaser.Display.Color.GetColor(red, 40, 40));

            const base = 0.9 + 0.15 * def.intensity;
            sprite.setScale(base);
            s.tweens.add({targets: sprite, scale: base * 1.08, duration: 600, yoyo: true, repeat: -1, ease: "Sine.inOut"});
        } else {
            sprite.setTint(0x44dd66); // Green
            s.bubbleIdle(sprite);
        }

        this.active.push({
            sprite, label, def, change, age: 0, phase: Math.random() * 1000,
            life: def.type === "negative" ? CONFIG.negativeBubbleLifetime : CONFIG.positiveBubbleLifetime, 
            direction: Phaser.Math.FloatBetween(0, Math.PI * 2), 
            targetDirection: Phaser.Math.FloatBetween(0, Math.PI * 2),
            directionTimer: Phaser.Math.Between(500, 1500),

        });
    }

    // Per Bubble Behaviour
    updateBubble(b, delta, frameScale) {
        const s = this.scene;
        if (b.resolving) return;
        b.age += delta;

        const dist = Phaser.Math.Distance.Between(b.sprite.x, b.sprite.y, s.guide.x, s.guide.y);
        const touchRadius = b.sprite.displayWidth / 2 + 30;

        if (b.def.type === "negative") {
            b.directionTimer -= delta;

            if (b.directionTimer <= 0) {
                b.direction = Phaser.Math.FloatBetween(0, Math.PI * 2);
                b.directionTimer = Phaser.Math.Between(500, 1500);
            }

            b.targetDirection = Phaser.Math.FloatBetween(0, Math.PI * 2);
            b.directionTimer = Phaser.Math.Between(1500, 3000);

            const speed =
                (CONFIG.baseChaseSpeed + CONFIG.chasePerIntensity * b.def.intensity) * frameScale;

            const angleDifference = Phaser.Math.Angle.Wrap(b.targetDirection - b.direction);
            const maxTurn = 0.8 * delta / 1000; // radians per second
            b.direction += Phaser.Math.Clamp(angleDifference, -maxTurn, maxTurn);
            b.sprite.x += Math.cos(b.direction) * speed;
            b.sprite.y += Math.sin(b.direction) * speed;
            b.sprite.x = Phaser.Math.Clamp(b.sprite.x, 100, s.WORLD_WIDTH - 100);
            b.sprite.y = Phaser.Math.Clamp(b.sprite.y, 120, 850);
        }

        b.label.setPosition(b.sprite.x, b.sprite.y - b.sprite.displayHeight * 0.55);

        if (dist < touchRadius) return this.resolve(b); // negative: you got hit, positive: you collected it
        if (b.age >= b.life) return this.expire(b); // Bubble disapears <-(how do you spell this)
    }

    // Fish touched the bubble
    resolve(b) {
        const s = this.scene;
        if (b.resolving) return;
        b.resolving = true;
        s.tweens.killTweensOf(b.sprite);
        s.sound.play("bubblePop", { volume: s.sfxVolume });
        s.tweens.add({
            targets: b.sprite,
            scale: b.sprite.scaleX * 1.4,
            alpha: 0,
            angle: b.sprite.angle + 12,
            duration: 180,
            ease: "Back.in",
            onComplete: () => {
                this.remove(b);

                if (b.def.type === "negative") {
                    for (let i = 0; i < CONFIG.negativeHitDamage && !s.simEnd; i++) s.loseHalfHeart();
                    if (s.simEnd) {
                        s.emitStats();
                        this.clear();
                        return;
                    }
                }

                const message = this.apply(b);
                s.game.events.emit("random-event", {
                    title: b.def.title,
                    message,
                    type: b.def.type,
                    id: b.def.id,
                    learning: b.def.learning
                });

                if (s.simEnd) this.clear();
            }
        });
    }

    // Bubbles fizzle out harmlessly
    expire(b) {
        const s = this.scene;
        this.active = this.active.filter(x => x !== b);
        s.tweens.killTweensOf(b.sprite);
        s.tweens.add({targets: b.label, alpha: 0, duration: 400, onComplete: () => b.label.destroy() });
        s.tweens.add({targets: b.sprite, alpha: 0, duration: 400, onComplete: () => b.sprite.destroy() });
        if (b.def.type === "negative") {
            s.game.events.emit("event-averted", {id: b.def.id, title: b.def.title});
        }
    }

    // Changes the value through update()
    apply(bubble) {
        const s = this.scene;
        const {def, change} = bubble;
        const variable = VARIABLES[def.variable];
        const threshold = this.th[def.variable];
        const before = s[variable.prop];
        const direction = def.type === "negative" ? 1 : -1;
        const rawAfter = before + direction * change;
        const boundedAfter = def.type === "negative"
            ? Math.min(rawAfter, variable.max)
            : Math.max(rawAfter, threshold.b); // Positives stop at healthy flow
        const after = def.variable === "light"
            ? Math.min(Math.round(boundedAfter / 10) * 10, variable.max)
            : boundedAfter;

        s[variable.setter](after, false);

        const verb = after > before ? "rose" : "fell";
        return `${variable.label} ${verb} from ${before}${variable.unit} to ${after}${variable.unit}. ${def.teach}`
    }

    // Cleanup files
    remove(b) {
        this.active = this.active.filter(x => x !== b);
        this.scene.tweens.killTweensOf(b.sprite);
        this.scene.tweens.killTweensOf(b.label);
        b.sprite.destroy();
        b.label.destroy();
    }

    clear() {
        for (const b of this.active) {
            this.scene.tweens.killTweensOf(b.sprite);
            this.scene.tweens.killTweensOf(b.label);
            b.sprite.destroy();
            b.label.destroy();
        }
        this.active = [];
    }
}