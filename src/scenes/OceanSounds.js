import Phaser from "phaser";
import { asset } from "../assetUrl";

/*
Ocean Sounds mode: real reef recordings in place of the music, chosen in the Options menu.
The files in assets/audio/ocean are made from the raw recordings by scripts/build-ocean-sounds.sh.

Three loops play together:
  - a healthy reef (Myora Reef) and a degraded one (Goat Island), both in Moreton Bay, Australia. They crossfade as
    reef stress rises, so the player hears their own reef change.
  - waves overhead, muffled by the water, which get louder as the fish swims up towards the surface.
On top of those, fish call now and then from random directions and distances. A stressed reef has fewer fish, so the
calls get further apart as stress rises.

The Options menu pauses the scene, which stops tweens, timers and update(). So turning the mode on or off and changing
the volume take effect straight away instead of fading.

The recordings are only downloaded the first time the mode is turned on (or when a game starts with it already on).
Together they are over 2 MB to download and about 40 MB once decoded, which most players, who keep the music, never need.
*/

const LOOP_GAIN = 1.4; // the loops are quieter than the music, so they need a boost to sit at the same slider position
const CALL_GAIN = 1.8;
const MIX_SPEED = 1 / 8000; // how far the reefs crossfade per ms: about 8 seconds to catch up with a change in stress

const WAVES_MIN = 0.1; // how loud the waves are on the sea floor...
const WAVES_MAX = 0.7; // ...and right at the surface
const SURFACE_Y = 120; // the highest the fish can swim
const WAVES_REACH = 350; // how far below the surface the waves get louder

// Seconds between calls, on a healthy reef and on a fully stressed one
const HEALTHY_GAP = { min: 5, max: 14 };
const DEGRADED_GAP = { min: 20, max: 50 };
const TRIGGERFISH_CHANCE = 0.2;
const WHALE_CHANCE = 0.03; // a whale passing in the distance is a rare treat

const REEF_FISH = ["fishDuck", "fishFalling", "fishFlutey", "fishLow", "fishPurr", "fishPurrs", "fishPulses", "fishShrill", "fishWoop"];
const TRIGGERFISH = ["triggerfishPicasso", "triggerfishWedge", "triggerfishOrange"];
const WHALE = "whaleWhoop";
const ALL_CALLS = [...REEF_FISH, ...TRIGGERFISH, WHALE];

// Ogg first for the loops: it loops without a gap, and Safari falls back to the mp3
const LOOP_FILES = {
    oceanReefHealthy: ["reef_healthy.ogg", "reef_healthy.mp3"],
    oceanReefDegraded: ["reef_degraded.ogg", "reef_degraded.mp3"],
    oceanWaves: ["surface_waves.ogg", "surface_waves.mp3"],
};
const CALL_FILES = {
    fishDuck: "fish_duck.mp3",
    fishFalling: "fish_falling.mp3",
    fishFlutey: "fish_flutey.mp3",
    fishLow: "fish_low.mp3",
    fishPurr: "fish_purr.mp3",
    fishPurrs: "fish_purrs.mp3",
    fishPulses: "fish_pulses.mp3",
    fishShrill: "fish_shrill.mp3",
    fishWoop: "fish_woop.mp3",
    triggerfishPicasso: "triggerfish_picasso.mp3",
    triggerfishWedge: "triggerfish_wedge.mp3",
    triggerfishOrange: "triggerfish_orange.mp3",
    whaleWhoop: "whale_whoop.mp3",
};
const FILES = { ...LOOP_FILES, ...CALL_FILES };
const oceanUrl = (file) => asset(`assets/audio/ocean/${file}`);

export class OceanSounds {
    constructor(scene, volume) {
        this.scene = scene;
        this.volume = volume;
        this.enabled = false;
        this.reefMix = 0; // 0 is the healthy reef, 1 the degraded one
        this.loops = null; // only exists while the mode is on and its recordings have arrived
        this.callTimer = null;
    }

    setEnabled(enabled) {
        if (enabled === this.enabled) return;
        this.enabled = enabled;

        if (enabled) this.load();
        else this.stop();
    }

    // Fetches whichever recordings aren't in the game's cache yet, then starts playing. The cache belongs to the
    // whole game, so this only downloads once however many times the scene restarts.
    load() {
        const { load, cache } = this.scene;
        const missing = Object.keys(FILES).filter(key => !cache.audio.exists(key));
        if (missing.length === 0) {
            this.start();
            return;
        }

        missing.forEach(key => load.audio(key, [FILES[key]].flat().map(oceanUrl)));
        load.once(Phaser.Loader.Events.COMPLETE, () => {
            // The player may have switched back to the music, or the scene may have ended, while this was loading
            if (this.enabled && !this.loops) this.start();
        });
        load.start();
    }

    start() {
        const { sound, cache } = this.scene;
        if (!Object.keys(LOOP_FILES).every(key => cache.audio.exists(key))) return; // a download failed: stay silent

        this.loops = {
            healthy: sound.add("oceanReefHealthy", { loop: true, volume: 0 }),
            degraded: sound.add("oceanReefDegraded", { loop: true, volume: 0 }),
            waves: sound.add("oceanWaves", { loop: true, volume: 0 }),
        };
        this.reefMix = this.targetMix(); // start on the reef as it is now, rather than fading to it
        this.applyLoopVolumes();
        Object.values(this.loops).forEach(loop => loop.play());
        this.scheduleCall();
    }

    stop() {
        this.callTimer?.remove();
        this.callTimer = null;
        this.silenceCalls();
        if (this.loops) Object.values(this.loops).forEach(loop => loop.destroy());
        this.loops = null;
    }

    setVolume(volume) {
        this.volume = volume;
        if (volume === 0) this.silenceCalls();
        if (this.loops) this.applyLoopVolumes();
    }

    update(delta) {
        if (!this.loops) return;

        const target = this.targetMix();
        const step = Math.min(Math.abs(target - this.reefMix), delta * MIX_SPEED);
        this.reefMix += Math.sign(target - this.reefMix) * step;
        this.applyLoopVolumes();
    }

    targetMix() {
        return Phaser.Math.Clamp(this.scene.stressValue / 100, 0, 1);
    }

    applyLoopVolumes() {
        const { healthy, degraded, waves } = this.loops;
        const volume = this.volume * LOOP_GAIN;
        const angle = this.reefMix * Math.PI / 2; // an equal-power crossfade, so the sound doesn't dip halfway through
        const nearSurface = 1 - Phaser.Math.Clamp((this.scene.guide.y - SURFACE_Y) / WAVES_REACH, 0, 1);

        healthy.setVolume(volume * Math.cos(angle));
        degraded.setVolume(volume * Math.sin(angle));
        waves.setVolume(volume * Phaser.Math.Linear(WAVES_MIN, WAVES_MAX, nearSurface));
    }

    // Uses the scene's clock, so calls stop while the game is paused
    scheduleCall() {
        const min = Phaser.Math.Linear(HEALTHY_GAP.min, DEGRADED_GAP.min, this.reefMix);
        const max = Phaser.Math.Linear(HEALTHY_GAP.max, DEGRADED_GAP.max, this.reefMix);

        this.callTimer = this.scene.time.delayedCall(Phaser.Math.FloatBetween(min, max) * 1000, () => {
            this.playCall();
            this.scheduleCall();
        });
    }

    playCall() {
        if (this.volume === 0) return;

        const roll = Math.random();
        let key = Phaser.Utils.Array.GetRandom(REEF_FISH);
        if (roll < WHALE_CHANCE) key = WHALE;
        else if (roll < WHALE_CHANCE + TRIGGERFISH_CHANCE) key = Phaser.Utils.Array.GetRandom(TRIGGERFISH);
        if (!this.scene.cache.audio.exists(key)) return; // its download failed

        this.scene.sound.play(key, {
            volume: this.volume * CALL_GAIN * Phaser.Math.FloatBetween(0.35, 1), // near or far away
            pan: Phaser.Math.FloatBetween(-0.8, 0.8),
        });
    }

    silenceCalls() {
        ALL_CALLS.forEach(key => this.scene.sound.removeByKey(key));
    }

    // The sound manager belongs to the whole game, not the scene, so these would outlive a restart
    destroy() {
        this.enabled = false;
        this.stop();
    }
}
