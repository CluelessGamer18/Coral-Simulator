import Phaser from "phaser";

// Tweak these values to change how the event bubbles behave
const CONFIG = {
    spawnMinTime: 8000, // minimum time between event spawns
    spawnMaxTime: 15000, // maximum time between event spawns
    maxNegativeBubbles: 2, // maximum number of negative bubbles on screen at once
    maxTotalBubbles: 4, // maximum number of total bubbles on screen at once
    negativeBubbleLifetime: 15000, // evade negative bubbles for this long and they disappear
    positiveBubbleLifetime: 20000, 
    aggroRadius: 700, // if the player is within this distance the bubbles will chase the player
    minSpawnDistance: 700, // the negative bubbles must spawn at least this far away from the player
    baseChaseSpeed: 0.9, // chase speed will be updated on a few things, base value + (per intensity value * intensity number)
    chasePerIntensity: 0.5, // this is the base value for each point of intensity as each event can have varying values
    eventsCanKill: false, // this is a flag that stops events from killing the reef, obviously if we change how time works this can be modified / gotten rid of
    eventsAdvanceYear: false, // if set to false events dont take up a year when interacted with, true allows them to advance the year
    negativeHitDamage: 1, // half a heart lost by interacting with event bubble
};

// Environmental variable map
const VARIABLES = {
    temperature: {prop: "temperature", setter: "updateTemperature", texture: "TempBubble", label: "The temperature", unit: "°C", max: 35},
    pollution: {prop: "pollutionValue", setter: "updatePollution", texture: "PollutionBubble", label: "The nutrient level", unit: "", max: 5},
    light: {prop: "lightLevel", setter: "updateLight", texture: "LightBubble", label: "The light level", unit: "", max: 1839},
};

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
        id: "temp_up", type: "negative", intensity: 2, variable: "temperature", delta: +2,
        title: "Ocean Temperatures Rising", learning: "multiple_stressors",
        teach: "Heat and bright light together stress coral far more than either one by themselves",
        weight: (r) => 1 + r.light * 1.5,
    },
    {
        id: "nutrients_up", type: "negative", intensity: 1, variable: "pollution", delta: +1,
        title: "Nutrient Levels Rising", learning: "multiple_stressors",
        teach: "Extra nutrients make corals more sensetive to heat and light.",
        weight: (r) => 1 + r.temperature,
    },
    {
        id: "light_up", type: "negative", intensity: 2, variable: "light", delta: +200,
        title: "Light Levels Increasing", learning: "multiple_stressors",
        teach: "Bright light on warm water is a recipe for coral bleaching",
        weight: (r) => 1 + r.temperature * 1.5,
    },

    // Positive events (swim into them to help the reef)
    {
        id: "cool_current", type: "positive", intensity: 1, variable: "temperature", delta: -2,
        title: "Cool Current", learning: "reversible",
        teach: "Coral bleaching can be reversed when the stress is removed.",
        weight: (r) => 0.4 + r.temperature * 3,
    },
    {
        id: "nutrient_flush", type: "positive", intensity: 1, variable: "pollution", delta: -1,
        title: "Clean Water", learning: "reversible",
        teach: "Cleaner water affords coral room to recover.",
        weight: (r) => 0.4 + r.pollution * 3,
    },
    {
        id: "shade", type: "positive", intensity: 1, variable: "light", delta: -200,
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
        this.nextSpawnIn = Phaser.Math.Between(CONFIG.spawnMinTime, CONFIG.spawnMaxTime);
    }

    // Call every frame from the scene's update()
    update(delta, frameScale) {
        const s = this.scene;

        // Nothing happens during the tutorial, popups or the end screen
        if (s.simEnd || !s.tutorialComplete || s.bubbleCollision || s.coralInfoOpen) return;

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
        const variable = VARIABLES[def.variable];
        const threshold = this.th[def.variable];
        const value = this.scene[variable.prop];

        if (def.type === "negative") {
            if (value < threshold.b) return false; // Already below the healthy value
            const after = value + def.delta;
            if (after > variable.max) return false;
            if (!CONFIG.eventsCanKill && after > threshold.d) return false; // Prevent events from instantly killing the reef
            return true;
        }

        return value > threshold.b;
    }

    // Choose what event is picked
    pickEvent() {
        const s = this.scene;
        const r = {
            temperature: risk(s.temperature, this.th.temperature),
            pollution: risk(s.pollutionValue, this.th.pollution),
            light: risk(s.lightLevel, this.th.light),
        };
        const negativeCount = this.active.filter(b => b.def.type === "negative").length;

        const pool = EVENTS
            .filter(e => !(e.type === "negative" && negativeCount >= CONFIG.maxNegativeBubbles))
            .filter(e => !this.active.some(b => b.def.id === e.id)) // No duplicate negative bubbles
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
        const minDist = def.type === "negative" ? CONFIG.minSpawnDistance: 300;
        let x, y, tries = 0;

        do {
            // Only spawn in the same areas that the fish can reach
            x = Phaser.Math.Between(100, s.WORLD_WIDTH - 100);
            y = Phaser.Math.Between(120, 850);
        } while (Phaser.Math.Distance.Between(x, y, s.guide.x, s.guide.y) < minDist && ++tries < 20);

        const sprite = s.add.image(x, y, VARIABLES[def.variable].texture).setDepth(7);

        if (def.type === "negative") {
            // Darker = more intense, and larger
            const shade = Math.round(200 - def.intensity * 50);
            sprite.setTint(Phaser.Display.Color.GetColor(shade, shade, shade));
            const base = 0.9 + 0.15 * def.intensity;
            sprite.setScale(base);

            // Idle pulse via scale only
            s.tweens.add({targets: sprite, scale: base * 1.08, duration: 600, yoyo: true, repeat: -1, ease: "Sine.inOut"});
        } else {
            s.bubbleIdle(sprite); // Reuse existing bubble idle animation
        }

        this.active.push({
            sprite, def, age: 0, phase: Math.random() * 1000,
            life: def.type === "negative" ? CONFIG.negativeBubbleLifetime : CONFIG.positiveBubbleLifetime,
        });
    }

    // Per Bubble Behaviour
    updateBubble(b, delta, frameScale) {
        const s = this.scene;
        b.age += delta;

        const dist = Phaser.Math.Distance.Between(b.sprite.x, b.sprite.y, s.guide.x, s.guide.y);
        const touchRadius = b.sprite.displayWidth / 2 + 30;

        if (b.def.type === "negative") {
            if (dist < CONFIG.aggroRadius && dist > 0){
                const speed = (CONFIG.baseChaseSpeed + CONFIG.chasePerIntensity * b.def.intensity) * frameScale;
                const step = Math.min(speed, dist);
                b.sprite.x += ((s.guide.x - b.sprite.x) / dist) * step;
                b.sprite.y += ((s.guide.y - b.sprite.y) / dist) * step;
            } else {
                // Lazy drift while the fish is far away
                b.sprite.y += Math.sin((s.time.now + b.phase) / 400) * 0.3 * frameScale;
            }
        }

        if (dist < touchRadius) return this.resolve(b); // negative: you got hit, positive: you collected it
        if (b.age >= b.life) return this.expire(b); // Bubble disapears <-(how do you spell this)
    }

    // Fish touched the bubble
    resolve(b) {
        const s = this.scene;
        this.remove(b);
        // Here is where we add bubble popping noises if we have them

        // Negative hits hurt the fish directly
        if (b.def.type === "negative") {
            for (let i = 0; i < CONFIG.negativeHitDamage && !s.simEnd; i++) s.loseHalfHeart();
            if (s.simEnd) { // The bubble hit has killed the fish: skip the event trigger
                s.emitStats();
                this.clear();
                return;
            }
        }

        const message = this.apply(b.def);
        s.game.events.emit("random-event", {
            title: b.def.title,
            message,
            type: b.def.type,
            id: b.def.id,
            learning: b.def.learning
        });

        // apply() can end the simulaiton so clear the bubbles if that happened
        if (s.simEnd) this.clear();
    }

    // Bubbles fizzle out harmlessly
    expire(b) {
        const s = this.scene;
        this.active = this.active.filter(x => x !== b);
        s.tweens.killTweensOf(b.sprite);
        s.tweens.add({targets: b.sprite, alpha: 0, duration: 400, onComplete: () => b.sprite.destroy() });
        if (b.def.type === "negative") {
            s.game.events.emit("event-averted", {id: b.def.id, title: b.def.title});
        }
    }

    // Changes the value through update()
    apply(def) {
        const s = this.scene;
        const variable = VARIABLES[def.variable];
        const threshold = this.th[def.variable];
        const before = s[variable.prop];
        const after  = def.type === "negative" ? Math.min(before + def.delta, variable.max) : Math.max(before + def.delta, threshold.b); // Positives stop at healthy flow

        // Checks the flag to see if the event advances the year 
        s[variable.setter](after, CONFIG.eventsAdvanceYear);

        const verb = after > before ? "rose" : "fell";
        return `${variable.label} ${verb} from ${before}${variable.unit} to ${after}${variable.unit}. ${def.teach}`
    }

    // Cleanup files
    remove(b) {
        this.active = this.active.filter(x => x !== b);
        this.scene.tweens.killTweensOf(b.sprite);
        b.sprite.destroy();
    }

    clear() {
        for (const b of this.active) {
            this.scene.tweens.killTweensOf(b.sprite);
            b.sprite.destroy();
        }
        this.active = [];
    }
}