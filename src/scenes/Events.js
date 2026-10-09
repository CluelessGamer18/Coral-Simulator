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
        weight: (r) => 1 + r.temperature * 1.5,
    },
    {
        id: "nutrients_up", type: "negative", intensity: 1, variable: "pollution", delta: +1,
        title: "Nutrient Levels Rising", learning: "multiple_stressors",
        teach: "Extra nutrients make corals more sensative to heat and light.",
        weight: (r) => 1 + r.pollution,
    },
    {
        id: "light_up", type: "negative", intensity: 2, variable: "light", delta: +200,
        title: "Light Levels Increasing", learning: "multiple_stressors",
        teach: "Bright light on warm water is a recipe for coral bleaching",
        weight: (r) => 1 + r.light * 1.5,
    },

    // Positive events (swim into them to help the reef)
    {
        id: "cool_current", type: "positive", intensity: 1, variable: "temperature", delta: -2,
        title: "Cool Current", learning: "reversible",
        teach: "Coral bleaching can be reversed when the stress is removed.",
        weight: (r) => 0.4 * r.temperature * 3,
    },
    {
        id: "nutrient_flush", type: "positive", intensity: 1, variable: "pollution", delta: -1,
        title: "Clean Water", learning: "reversible",
        teach: "Cleaner water affords coral room to recover.",
        weight: (r) => 0.4 * r.pollution * 3,
    },
    {
        id: "shade", type: "positive", intensity: 1, variable: "light", delta: -2,
        title: "Cloudy", learning: "reversible",
        teach: "Shade from clouds takes pressure off of stressed corals.",
        weight: (r) => 0.4 * r.light * 3,
    },
];

