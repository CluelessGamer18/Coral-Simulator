import Phaser from "phaser";

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

export class OceanSounds {
    constructor(scene, volume) {
        this.scene = scene;
        this.volume = volume;
        this.enabled = false;
        this.reefMix = 0; // 0 is the healthy reef, 1 the degraded one
        this.loops = {
            healthy: scene.sound.add("oceanReefHealthy", { loop: true, volume: 0 }),
            degraded: scene.sound.add("oceanReefDegraded", { loop: true, volume: 0 }),
            waves: scene.sound.add("oceanWaves", { loop: true, volume: 0 }),
        };
    }

    setEnabled(enabled) {
        if (enabled === this.enabled) return;
        this.enabled = enabled;

        if (enabled) {
            this.reefMix = this.targetMix(); // start on the reef as it is now, rather than fading to it
            this.applyLoopVolumes();
            Object.values(this.loops).forEach(loop => loop.play());
            this.scheduleCall();
        } else {
            Object.values(this.loops).forEach(loop => loop.stop());
            this.callTimer.remove();
            this.silenceCalls();
        }
    }

    setVolume(volume) {
        this.volume = volume;
        if (volume === 0) this.silenceCalls();
        if (this.enabled) this.applyLoopVolumes();
    }

    update(delta) {
        if (!this.enabled) return;

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
        this.callTimer?.remove();
        this.silenceCalls();
        Object.values(this.loops).forEach(loop => loop.destroy());
    }
}
