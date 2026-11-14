import { GAME_YEARS, YEAR_DURATION_MS, SUMMER_DURATION_MS, WINTER_DURATION_MS } from "./gameConfig.js";
import { getSummerTemperatureRise } from "./BleachingSchedule.js";

/*
The reef's climate and heat stress, with no drawing in it, so the same code runs in the game (TestScene.js steps
it every frame) and in a plain Node script that plays thousands of games to check the balance.

What it models, and the reef science each rule comes from:

- Heat stress builds with how hot the water is AND how long it stays hot, like the "degree heating weeks" reef
  scientists use: a little bleaches coral, about twice as much starts killing it.
- Heat is the cause. Bright light makes it worse, so shade slows bleaching without stopping it.
- Nutrient pollution lowers the temperature coral can stand, and bleached coral in dirty water stays bleached
  for longer.
- Recovery is slow. A winter gives back a fixed amount, not everything, so a bad summer makes the next one harder.
*/

export const NORMAL_TEMPERATURE = 27;
export const STRESS_TEMPERATURE = 28;   // coral starts to suffer about a degree above its usual summer water
export const HOTTEST_TEMPERATURE = 36;  // heat stress is at its fullest here, though no heatwave in the game gets this hot
export const NORMAL_LIGHT = 500;
export const SAFE_LIGHT = 600;          // light above this adds to heat stress
export const SUMMER_PEAK_LIGHT = 1500;
export const MIN_LIGHT = 150;
export const MAX_LIGHT = 1840;
export const STARTING_POLLUTION = 1;
export const MAX_POLLUTION = 5;
export const MAX_POLLUTION_STRESS_MULTIPLIER = 1.75;

const STRESS_PER_SECOND = 9.6;         // at full heat severity, full light and clean water
const HEAT_ONLY_SHARE = 0.3;           // how much of that heat does by itself, in full shade
const WINTER_RECOVERY = 52;            // stress points a winter gives back in clean water
const MILD_SUMMER_RECOVERY = 30;       // and a summer with no heatwave
const DIRTY_WATER_RECOVERY_LOSS = 0.4; // at the worst pollution, recovery is this much slower
const HEAT_RAMP_MS = 2500;             // a heatwave arrives over this long, rather than in one frame
const WINTER_COOLING_MS = 9000;        // and the water is back to normal this far into winter

const SHADE_FADE_PER_SECOND = 40;      // light: a Cloudy bubble's 480 of shade lasts 12 seconds
const COOLING_FADE_PER_SECOND = 0.2;   // °C: a Cool Current's 2.4 °C lasts 12 seconds
export const MAX_SHADE = 1000;
export const MAX_COOLING = 4.8;
const POLLUTION_CLEAN_YEARS = 2;       // with the pipe plugged, pollution falls most of the way back in about this long

const GAME_DURATION_MS = GAME_YEARS * YEAR_DURATION_MS;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export function createReef() {
    return {
        elapsedMs: 0,
        season: "summer",
        temperature: NORMAL_TEMPERATURE,
        light: NORMAL_LIGHT,
        pollution: STARTING_POLLUTION,
        stress: 0,          // 0 to 100, what the HUD shows
        stressDelta: 0,     // last step's change before the 0-100 limit, which is what each coral takes on (CoralManager.js)
        shade: 0,           // light being held off by Cloudy bubbles
        cooling: 0,         // °C being taken off by Cool Currents
        plumeHeat: 0,       // °C added by hot plumes the fish swam into, until the summer ends
        pipePlugged: 0,     // 0 to 1: how much of the sewage pipe has been blocked
        winterStart: null,  // the temperature and light when this winter began
    };
}

export const getYearsElapsed = (reef) => reef.elapsedMs / YEAR_DURATION_MS;
export const getCalendarYear = (reef) => Math.min(Math.floor(getYearsElapsed(reef)) + 1, GAME_YEARS);
export const isOver = (reef) => reef.elapsedMs >= GAME_DURATION_MS;

// 0 to 1 through the current summer or winter
export function getSeasonProgress(reef) {
    const intoYear = reef.elapsedMs % YEAR_DURATION_MS;
    return intoYear < SUMMER_DURATION_MS
        ? intoYear / SUMMER_DURATION_MS
        : (intoYear - SUMMER_DURATION_MS) / WINTER_DURATION_MS;
}

export function getSecondsLeftInSeason(reef) {
    const length = reef.season === "summer" ? SUMMER_DURATION_MS : WINTER_DURATION_MS;
    return Math.ceil((1 - getSeasonProgress(reef)) * length / 1000);
}

export const getHeatwaveRise = (reef) => getSummerTemperatureRise(getYearsElapsed(reef));
export const isHeatwave = (reef) => reef.season === "summer" && getHeatwaveRise(reef) > 0 && !isOver(reef);

// How much harder dirty water makes a heatwave: x1 when clean, up to x1.75
export function getPollutionMultiplier(reef) {
    return 1 + (reef.pollution - STARTING_POLLUTION) / (MAX_POLLUTION - STARTING_POLLUTION)
        * (MAX_POLLUTION_STRESS_MULTIPLIER - 1);
}

// 0 when the water is fine, rising to 0.75 in the hottest heatwave (+7 °C)
export function getHeatSeverity(temperature) {
    return clamp((temperature - STRESS_TEMPERATURE) / (HOTTEST_TEMPERATURE - STRESS_TEMPERATURE), 0, 1.2);
}

export function getLightSeverity(light) {
    return clamp((light - SAFE_LIGHT) / (MAX_LIGHT - SAFE_LIGHT), 0, 1);
}

// The first year is calm; after that every summer's light climbs to a peak at the end of the season
function getNaturalSummerLight(reef) {
    if (getYearsElapsed(reef) < 1) return NORMAL_LIGHT;
    const progress = getSeasonProgress(reef);
    const eased = progress * progress * (3 - 2 * progress);
    return NORMAL_LIGHT + (SUMMER_PEAK_LIGHT - NORMAL_LIGHT) * eased;
}

// Moves the reef on by deltaMs. Returns the season if it has just changed, or null.
export function stepReef(reef, deltaMs) {
    const seconds = deltaMs / 1000;
    reef.elapsedMs = Math.min(reef.elapsedMs + deltaMs, GAME_DURATION_MS);

    const intoYear = reef.elapsedMs % YEAR_DURATION_MS;
    const season = intoYear < SUMMER_DURATION_MS || isOver(reef) && intoYear === 0 ? "summer" : "winter";
    const seasonChanged = season !== reef.season;
    if (seasonChanged) {
        reef.season = season;
        if (season === "winter") {
            reef.winterStart = { temperature: reef.temperature, light: reef.light };
        } else {
            reef.plumeHeat = 0;
        }
    }

    reef.shade = Math.max(reef.shade - SHADE_FADE_PER_SECOND * seconds, 0);
    reef.cooling = Math.max(reef.cooling - COOLING_FADE_PER_SECOND * seconds, 0);

    if (season === "summer") {
        const rise = getHeatwaveRise(reef) * clamp(intoYear / HEAT_RAMP_MS, 0, 1);
        // A Cool Current can only take the heatwave away, not make the water colder than usual
        reef.temperature = NORMAL_TEMPERATURE + Math.max(rise + reef.plumeHeat - reef.cooling, 0);
        reef.light = clamp(getNaturalSummerLight(reef) - reef.shade, MIN_LIGHT, MAX_LIGHT);
    } else {
        const intoWinter = intoYear - SUMMER_DURATION_MS;
        const cooled = clamp(intoWinter / WINTER_COOLING_MS, 0, 1);
        const start = reef.winterStart ?? { temperature: NORMAL_TEMPERATURE, light: NORMAL_LIGHT };
        reef.temperature = start.temperature + (NORMAL_TEMPERATURE - start.temperature) * cooled;
        reef.light = start.light + (NORMAL_LIGHT - start.light) * cooled;
    }

    // The pipe leaks a little more every year. Plugging it stops the leak and lets the water clear.
    const leak = (MAX_POLLUTION - STARTING_POLLUTION) / GAME_DURATION_MS * deltaMs * (1 - reef.pipePlugged);
    const cleared = (reef.pollution - STARTING_POLLUTION) * reef.pipePlugged
        * deltaMs / (POLLUTION_CLEAN_YEARS * YEAR_DURATION_MS);
    reef.pollution = clamp(reef.pollution + leak - cleared, STARTING_POLLUTION, MAX_POLLUTION);

    const heat = season === "summer" ? getHeatSeverity(reef.temperature) : 0;
    let delta;
    if (heat > 0) {
        delta = STRESS_PER_SECOND * heat
            * (HEAT_ONLY_SHARE + (1 - HEAT_ONLY_SHARE) * getLightSeverity(reef.light))
            * getPollutionMultiplier(reef) * seconds;
    } else {
        const dirtiness = (reef.pollution - STARTING_POLLUTION) / (MAX_POLLUTION - STARTING_POLLUTION);
        const perSeason = season === "winter" ? WINTER_RECOVERY : MILD_SUMMER_RECOVERY;
        const seasonSeconds = (season === "winter" ? WINTER_DURATION_MS : SUMMER_DURATION_MS) / 1000;
        delta = -perSeason / seasonSeconds * (1 - DIRTY_WATER_RECOVERY_LOSS * dirtiness) * seconds;
    }
    reef.stressDelta = delta;
    reef.stress = clamp(reef.stress + delta, 0, 100);

    return seasonChanged ? season : null;
}

// The bubbles and the pipe (Events.js, WinterJobs.js)
export function addShade(reef, amount) {
    reef.shade = Math.min(reef.shade + amount, MAX_SHADE);
}

export function addCooling(reef, degrees) {
    reef.cooling = Math.min(reef.cooling + degrees, MAX_COOLING);
}

export function addPlumeHeat(reef, degrees) {
    reef.plumeHeat += degrees;
}

export function plugPipe(reef, share) {
    reef.pipePlugged = clamp(reef.pipePlugged + share, 0, 1);
}
