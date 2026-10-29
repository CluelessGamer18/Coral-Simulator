// Pulsing glow that marks something on the sea floor the fish can interact with
// (green for nest pieces, red for food). preFX only exists under WebGL, so the
// Canvas renderer gets a pulsing tint in the same colour instead.
export function addGlow(scene, target, color) {
    if (target.preFX) {
        target.glow = target.preFX.addGlow(color, 4, 0, false, 0.1, 12);
        target.glowTween = scene.tweens.add({
            targets: target.glow,
            outerStrength: { from: 2, to: 6 },
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: "Sine.inOut",
        });
    } else {
        target.setTint(color);
        target.glowTween = scene.tweens.add({
            targets: target,
            alpha: { from: 1, to: 0.6 },
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: "Sine.inOut",
        });
    }
}

export function removeGlow(target) {
    target.glowTween?.stop();
    target.glowTween = null;
    if (target.glow) {
        target.preFX.remove(target.glow);
        target.glow = null;
    }
    target.clearTint().setAlpha(1);
}
