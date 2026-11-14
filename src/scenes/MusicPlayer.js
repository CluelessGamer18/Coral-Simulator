import Phaser from "phaser";

/*
The background music, played through an <audio> element instead of Phaser's sound manager.

Phaser decodes every sound it loads into raw samples and keeps them in memory, which for a two and a half minute
music track is about 50 MB, and the whole file has to arrive before the game can start. An <audio> element streams:
it starts playing once the first few seconds are in, and only ever holds a little of the track at a time. The short
sound effects still go through Phaser, where being decoded ahead of time is what lets them play without a delay.

Like Phaser's own sounds, the music stops while the browser tab or window is in the background.
*/
export class MusicPlayer {
    constructor(scene, url, volume) {
        this.scene = scene;
        this.wanted = false; // whether the music should be playing right now, if the browser allows it

        this.audio = new Audio();
        this.audio.loop = true;
        this.audio.preload = "none"; // nothing is downloaded until the music is first played
        this.audio.src = url;
        this.setVolume(volume);

        this.onBlur = () => this.audio.pause();
        this.onFocus = () => { if (this.wanted) this.start(); };
        this.onInput = () => { if (this.wanted && this.audio.paused) this.start(); };
        this.destroy = this.destroy.bind(this);

        scene.game.events.on(Phaser.Core.Events.BLUR, this.onBlur);
        scene.game.events.on(Phaser.Core.Events.FOCUS, this.onFocus);
        // The sound doesn't belong to the scene, so it would carry on after a restart or after the game is closed
        scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy);
        scene.events.once(Phaser.Scenes.Events.DESTROY, this.destroy);
    }

    get isPlaying() {
        return this.wanted;
    }

    play() {
        this.wanted = true;
        this.start();
    }

    // Keeps its place in the track, so play() carries on from here
    pause() {
        this.wanted = false;
        this.audio?.pause();
    }

    setVolume(volume) {
        if (this.audio) this.audio.volume = Phaser.Math.Clamp(volume, 0, 1);
    }

    // Browsers refuse to play sound until the player has clicked or pressed a key on the page. If that happens,
    // try again on their next click or key press.
    start() {
        if (!this.audio) return;
        this.audio.play()?.catch(() => {
            window.addEventListener("pointerdown", this.onInput, { once: true });
            window.addEventListener("keydown", this.onInput, { once: true });
        });
    }

    destroy() {
        if (!this.audio) return;
        this.wanted = false;
        this.audio.pause();
        this.audio.removeAttribute("src"); // lets the browser drop what it has downloaded and buffered
        this.audio.load();
        this.audio = null;

        this.scene.game.events.off(Phaser.Core.Events.BLUR, this.onBlur);
        this.scene.game.events.off(Phaser.Core.Events.FOCUS, this.onFocus);
        this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.destroy);
        this.scene.events.off(Phaser.Scenes.Events.DESTROY, this.destroy);
        window.removeEventListener("pointerdown", this.onInput);
        window.removeEventListener("keydown", this.onInput);
    }
}
