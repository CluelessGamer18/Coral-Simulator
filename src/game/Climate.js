import Phaser from "phaser";
import { getSummerTemperatureRise, isBleachingYear } from "./bleachingSchedule.js";
import { SOUNDS } from "./assetKeys.js";
import { GAME_EVENTS } from "./gameEvents.js";
import {
    CRITICAL_STRESS,
    GAME_DURATION_MS,
    MAX_POLLUTION,
    MAX_TEMPERATURE,
    NORMAL_LIGHT,
    NORMAL_TEMPERATURE,
    STARTING_POLLUTION,
    SUMMER_DURATION_MS,
    SUMMER_PEAK_LIGHT,
    THRESHOLDS,
    WINTER_DURATION_MS,
    YEAR_DURATION_MS,
} from "./gameConfig.js";

/*
The water the reef lives in, and how stressed that makes it: temperature, light and pollution through each summer and
winter, the reef's stress, and the warnings and alarm that go with it. Owned by the main game, which runs the clock.
*/

const SUMMER_FRACTION_OF_YEAR = SUMMER_DURATION_MS / YEAR_DURATION_MS;

// Heat alone should raise stress gradually; light above BLEACHING_LIGHT_START amplifies the rate. Temperature alone
// can't bleach coral: with the light back in the healthy range, summer stress stays flat until winter.
const HEAT_STRESS_POINTS_PER_YEAR = 120;
const BLEACHING_LIGHT_START = 600;
const BLEACHING_RATE_SCALE = 1.6; // so summer bleaching can still kill the reef under sustained heat and light
const MAX_POLLUTION_STRESS_MULTIPLIER = 1.75; // at full pollution, stress builds this many times faster

const STRESS_WARNING_THRESHOLDS = [40, 60, CRITICAL_STRESS];
const STRESS_WARNING_REARM = 5; // stress has to fall this far below a warning's threshold before it can show again
const STRESS_WARNINGS = [
    {
        warning: true,
        title: "Coral Stress Building",
        message:
            "Hot water and bright light together are stressing your coral. Swim into a green Cloudy bubble to shade the reef.",
    },
    {
        warning: true,
        title: "Serious Bleaching Risk",
        message: `Coral stress is high and still rising. Pop more green Cloudy bubbles before summer ends. Stress stops rising once the light is under ${BLEACHING_LIGHT_START}.`,
    },
    {
        warning: true,
        title: "Critical Reef Stress",
        message:
            "The reef is close to collapse. Pop every green Cloudy bubble you can reach. The coral recovers when winter comes.",
    },
];

const CRITICAL_ALARM_BEEP_INTERVAL = 1000;
const CRITICAL_ALARM_BEEPS = 3; // the alarm sounds this many times, then leaves its banner to do the nagging

// The ids React uses to replace or clear these banners
export const BLEACHING_NOTICE_ID = "bleaching";
const CRITICAL_NOTICE_ID = "critical-stress";

/**
 * The banner that opens a bleaching summer. The tutorial shows the same one.
 * @param {number} temperatureRise °C
 */
export function bleachingNotice(temperatureRise) {
    return {
        title: "Temperature Bleaching Event",
        message: `The water temperature has risen by ${temperatureRise}°C. Pop green Cloudy bubbles to keep the light low and stop your reef bleaching.`,
    };
}

// How far value is into the upper stressed range: 0 at the healthy limit b, 1 at the deadly limit d
function highRangeSeverity(value, { b, d }) {
    return value > b ? Phaser.Math.Clamp((value - b) / (d - b), 0, 1) : 0;
}

export class Climate {
    /** @param {Phaser.Scene} scene the main game: its clock (elapsedSimMs, yearsElapsed, season), reef and simEnd */
    constructor(scene) {
        this.scene = scene;
        this.temperature = NORMAL_TEMPERATURE;
        this.light = NORMAL_LIGHT;
        this.pollution = STARTING_POLLUTION;
        this.stress = 0; // 0 to 100, where the reef dies
        this.stressDelta = 0; // the last frame's change in stress
        this.peakStress = 0;
        this.reefDead = false;

        this.temperatureSeverity = 0; // how far into the dangerous heat the water is, 0 to 1
        this.lightSeverity = 0;
        this.summerTemperatureRise = 0;
        this.summerLightOffset = 0; // how far the bubbles have pushed the light below the summer's natural level
        this.winterStart = null; // the temperature and light winter is easing back from to normal
        this.winterYear = null;

        this.stressWarningLevel = 0;
        this.criticalAlarmOn = false;
        this.criticalAlarm = null;
    }

    /**
     * A summer or a winter has begun: a bleaching summer heats the water and raises the alarm, and winter starts
     * bringing it back to normal.
     * @param {"summer" | "winter"} season
     */
    startSeason(season) {
        const { scene } = this;
        if (season === "summer") {
            this.summerLightOffset = 0;
        } else {
            this.summerTemperatureRise = 0;
            // Living coral recovers gradually through the winter; the stress meter isn't reset all at once
            scene.game.events.emit(GAME_EVENTS.reefWarningCleared, BLEACHING_NOTICE_ID);
        }

        if (season === "summer" && isBleachingYear(scene.yearsElapsed) && scene.elapsedSimMs < GAME_DURATION_MS) {
            // Each bleaching summer is hotter than the last (see bleachingSchedule.js)
            this.summerTemperatureRise = getSummerTemperatureRise(scene.yearsElapsed);
            this.temperature = Math.min(MAX_TEMPERATURE, this.temperature + this.summerTemperatureRise);
            this.temperatureSeverity = highRangeSeverity(this.temperature, THRESHOLDS.temperature);
            scene.game.events.emit(GAME_EVENTS.reefWarning, {
                id: BLEACHING_NOTICE_ID,
                bleaching: true,
                ...bleachingNotice(this.summerTemperatureRise),
            });
        }
    }

    /**
     * Moves the water and the reef's stress on by one frame. Call every frame the clock runs. Sets reefDead once the
     * stress reaches 100.
     * @param {number} delta the frame's length in ms
     */
    update(delta) {
        const { elapsedSimMs } = this.scene;
        this.applySummerLightRamp();
        this.normalizeWinter(elapsedSimMs);
        this.pollution = STARTING_POLLUTION + (MAX_POLLUTION - STARTING_POLLUTION) * (elapsedSimMs / GAME_DURATION_MS);
        this.advanceStress(delta);
    }

    // Light rises gently through each summer from the second year, less however much the bubbles have taken off it
    applySummerLightRamp() {
        const { season, yearsElapsed } = this.scene;
        if (season !== "summer") return;

        if (yearsElapsed < 1) {
            this.light = NORMAL_LIGHT;
            this.lightSeverity = 0;
            return;
        }

        this.light = Phaser.Math.Clamp(
            Math.round(this.getNaturalSummerLight() + this.summerLightOffset),
            THRESHOLDS.light.a,
            THRESHOLDS.light.d,
        );
        this.lightSeverity = highRangeSeverity(this.light, THRESHOLDS.light);
    }

    getNaturalSummerLight() {
        const summerProgress = Phaser.Math.Clamp(
            (this.scene.elapsedSimMs % YEAR_DURATION_MS) / SUMMER_DURATION_MS,
            0,
            1,
        );
        // Eased, so the light rises gently at both ends of the summer
        const easedProgress = summerProgress * summerProgress * (3 - 2 * summerProgress);
        return NORMAL_LIGHT + (SUMMER_PEAK_LIGHT - NORMAL_LIGHT) * easedProgress;
    }

    // Through each winter the temperature and light ease back from wherever the summer left them to normal
    normalizeWinter(elapsedMs) {
        const currentYear = Math.floor(elapsedMs / YEAR_DURATION_MS);
        const isWinter = this.scene.season === "winter";
        if (!isWinter) {
            this.winterStart = null;
            this.winterYear = null;
        } else if (this.winterYear !== currentYear) {
            this.winterYear = currentYear;
            this.winterStart = { temperature: this.temperature, light: this.light };
        }

        if (isWinter) {
            const winterProgress = Phaser.Math.Clamp(
                ((elapsedMs % YEAR_DURATION_MS) - SUMMER_DURATION_MS) / WINTER_DURATION_MS,
                0,
                1,
            );
            const { temperature, light } = this.winterStart;
            this.temperature =
                Math.round((temperature + (NORMAL_TEMPERATURE - temperature) * winterProgress) * 10) / 10;
            this.light = Math.round((light + (NORMAL_LIGHT - light) * winterProgress) / 10) * 10;
        }

        this.temperatureSeverity = highRangeSeverity(this.temperature, THRESHOLDS.temperature);
        this.lightSeverity = highRangeSeverity(this.light, THRESHOLDS.light);
    }

    /**
     * Sets the light level, as a Cloudy bubble does.
     * @param {number} light
     */
    setLight(light) {
        const { scene } = this;

        // A change part way through winter moves where it's easing back from, so it still ends at normal
        if (scene.season === "winter" && this.winterYear === Math.floor(scene.elapsedSimMs / YEAR_DURATION_MS)) {
            this.winterStart.light += light - this.light;
        }

        if (scene.season === "summer") {
            this.summerLightOffset = light - this.getNaturalSummerLight();
            this.light = Phaser.Math.Clamp(Math.round(light), THRESHOLDS.light.a, THRESHOLDS.light.d);
        } else {
            this.light = light;
        }
        this.lightSeverity = highRangeSeverity(light, THRESHOLDS.light);
        this.syncCriticalAlarm();
        scene.emitStats();
    }

    advanceStress(delta) {
        const { scene } = this;
        const pollutionMultiplier =
            1 +
            ((this.pollution - STARTING_POLLUTION) / (MAX_POLLUTION - STARTING_POLLUTION)) *
                (MAX_POLLUTION_STRESS_MULTIPLIER - 1);
        const lightBleachingSeverity =
            this.light > BLEACHING_LIGHT_START
                ? Phaser.Math.Clamp(
                      (this.light - BLEACHING_LIGHT_START) / (THRESHOLDS.light.d - BLEACHING_LIGHT_START),
                      0,
                      1,
                  )
                : 0;
        const combinedSeverity =
            this.temperatureSeverity > 0 && lightBleachingSeverity > 0
                ? Math.sqrt(this.temperatureSeverity * lightBleachingSeverity)
                : 0;

        let stressRate = 0; // points per year
        if (scene.season === "summer") {
            stressRate =
                (HEAT_STRESS_POINTS_PER_YEAR / SUMMER_FRACTION_OF_YEAR) *
                combinedSeverity *
                pollutionMultiplier *
                BLEACHING_RATE_SCALE;
        } else {
            // Falls in proportion to what's left, so it reaches zero right at the end of the winter
            const winterProgress = Phaser.Math.Clamp(
                ((scene.elapsedSimMs % YEAR_DURATION_MS) - SUMMER_DURATION_MS) / WINTER_DURATION_MS,
                0,
                1,
            );
            const remainingWinterFraction = Math.max(1 - winterProgress, 0.001);
            stressRate = ((-this.stress / remainingWinterFraction) * YEAR_DURATION_MS) / WINTER_DURATION_MS;
        }

        this.stressDelta = (stressRate * delta) / YEAR_DURATION_MS;
        this.stress = Phaser.Math.Clamp(this.stress + this.stressDelta, 0, 100);
        scene.reef.updateStress(this.stressDelta, delta);
        this.peakStress = Math.max(this.peakStress, this.stress);

        if (this.stress >= 100) {
            this.reefDead = true;
            return;
        }

        this.showStressWarnings();
        this.syncCriticalAlarm();
    }

    // One banner each time the stress climbs past 40, 60 and 80. Falling a little below a threshold lets its banner
    // show again next time it's crossed.
    showStressWarnings() {
        const levelAt = (offset) =>
            STRESS_WARNING_THRESHOLDS.reduce(
                (level, threshold, index) => (this.stress >= threshold - offset ? index + 1 : level),
                0,
            );
        this.stressWarningLevel = Math.min(this.stressWarningLevel, levelAt(STRESS_WARNING_REARM));

        const nextLevel = levelAt(0);
        if (nextLevel > this.stressWarningLevel) {
            this.playWarningSound();
            this.scene.game.events.emit(GAME_EVENTS.reefWarning, STRESS_WARNINGS[nextLevel - 1]);
        }
        this.stressWarningLevel = nextLevel;
    }

    playWarningSound() {
        this.scene.sound.play(SOUNDS.bleachingWarning, { volume: this.scene.sfxVolume });
    }

    // Sounds while stress is critical and still climbing, and stops as soon as it levels off
    isCriticalAlarmNeeded() {
        const { scene } = this;
        return this.stress >= CRITICAL_STRESS && this.stressDelta > 0 && scene.season === "summer" && !scene.simEnd;
    }

    /** Starts or stops the critical stress alarm and its banner to match the reef. */
    syncCriticalAlarm() {
        const { scene } = this;
        const needed = this.isCriticalAlarmNeeded();
        if (needed === this.criticalAlarmOn) return;

        this.criticalAlarmOn = needed;
        if (needed) {
            scene.game.events.emit(GAME_EVENTS.reefWarning, {
                id: CRITICAL_NOTICE_ID,
                persistent: true,
                warning: true,
                title: "Critical Reef Stress",
                message: "The reef is about to die. Pop green Cloudy bubbles until the stress dial stops climbing.",
            });
            let beeps = 0;
            const beep = () => {
                this.playWarningSound();
                if (++beeps >= CRITICAL_ALARM_BEEPS) this.criticalAlarm?.remove();
            };
            beep();
            this.criticalAlarm = scene.time.addEvent({
                delay: CRITICAL_ALARM_BEEP_INTERVAL,
                loop: true,
                callback: beep,
            });
        } else {
            this.criticalAlarm?.remove();
            this.criticalAlarm = null;
            scene.game.events.emit(GAME_EVENTS.reefWarningCleared, CRITICAL_NOTICE_ID);
        }
    }
}
