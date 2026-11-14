import Phaser from "phaser";

// Glows and shadows that are drawn once into a texture, then shown as an ordinary image behind their target.
// Phaser's preFX glow and shadow redraw the target through an off-screen buffer and a blur shader every frame, which
// is what slows the game down most on computers without a fast graphics card. These look the same and cost one
// extra image each, and they work on the Canvas renderer too.

const GLOW_PADDING = 14; // room around the art for the blur, in the texture's own pixels
const GLOW_BLUR = 6;
const GLOW_LAYERS = 10;  // the blur is drawn this many times over itself, so it's a strong outline rather than a faint haze
const GLOW_DIM = 0.5;   // the glow pulses between this and fully lit

const SHADOW_BLUR = 4;
const SHADOW_COLOR = 0x333333;
const SHADOW_ALPHA = 0.55;
const SHADOW_DROP = 5;   // how far below the target its shadow falls, at scale 1

// Pulsing glow that marks something on the sea floor the fish can interact with (green for nest pieces, red for
// food). The target has to stay put while it glows; call removeGlow() before moving or destroying it.
export function addGlow(scene, target, color) {
    removeGlow(target);

    const glow = scene.add.image(target.x, target.y, getSilhouette(scene, target, color, GLOW_BLUR, GLOW_LAYERS))
        .setDisplayOrigin(target.displayOriginX + GLOW_PADDING, target.displayOriginY + GLOW_PADDING)
        .setScale(target.scaleX, target.scaleY)
        .setRotation(target.rotation)
        .setFlip(target.flipX, target.flipY)
        .setScrollFactor(target.scrollFactorX, target.scrollFactorY)
        .setDepth(target.depth - 0.01)
        .setAlpha(0);
    target.glow = glow;

    const pulse = () => {
        target.glowTween = scene.tweens.add({
            targets: glow,
            alpha: { from: GLOW_DIM, to: 1 },
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: "Sine.inOut",
        });
    };

    // A target that's still fading in (a new nest piece) brings its glow in with it
    if (target.alpha < 1) {
        target.glowTween = scene.tweens.add({ targets: glow, alpha: GLOW_DIM, duration: 800, onComplete: pulse });
    } else {
        pulse();
    }

    target.once(Phaser.GameObjects.Events.DESTROY, removeGlow);
}

export function removeGlow(target) {
    target.glowTween?.stop();
    target.glowTween = null;
    target.glow?.destroy();
    target.glow = null;
    target.off(Phaser.GameObjects.Events.DESTROY, removeGlow);
}

// Soft shadow under something that moves, like the player's fish. It follows the target's position, size, turn and
// depth after every update, until the scene shuts down.
export function addShadow(scene, target) {
    const shadow = scene.add.image(target.x, target.y, getSilhouette(scene, target, SHADOW_COLOR, SHADOW_BLUR, 1))
        .setDisplayOrigin(target.displayOriginX + GLOW_PADDING, target.displayOriginY + GLOW_PADDING)
        .setAlpha(SHADOW_ALPHA);

    const follow = () => {
        if (!target.active) return;
        shadow
            .setPosition(target.x, target.y + SHADOW_DROP * Math.abs(target.scaleY))
            .setScale(target.scaleX, target.scaleY)
            .setRotation(target.rotation)
            .setFlip(target.flipX, target.flipY)
            .setVisible(target.visible)
            .setAlpha(SHADOW_ALPHA * target.alpha);
        // setDepth makes Phaser sort every object in the scene again, so only call it when the depth really changes
        if (shadow.depth !== target.depth - 0.01) shadow.setDepth(target.depth - 0.01);
    };
    follow();

    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, follow);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.POST_UPDATE, follow));
    return shadow;
}

// A blurred copy of the target's shape in one colour, GLOW_PADDING bigger than the art on every side. Made once
// for each image and colour, and kept for the whole game (textures are shared by every scene).
function getSilhouette(scene, target, color, blur, layers) {
    const { frame } = target;
    const key = `silhouette-${target.texture.key}-${frame.name}-${color}-${blur}-${layers}`;
    if (scene.textures.exists(key)) return key;

    const canvas = document.createElement("canvas");
    canvas.width = frame.cutWidth + GLOW_PADDING * 2;
    canvas.height = frame.cutHeight + GLOW_PADDING * 2;
    const context = canvas.getContext("2d");

    // The art is drawn off the side of the canvas, and only its shadow lands on it
    const offCanvas = canvas.width + 100;
    context.shadowColor = `#${color.toString(16).padStart(6, "0")}`;
    context.shadowBlur = blur;
    context.shadowOffsetX = offCanvas;
    for (let i = 0; i < layers; i++) {
        context.drawImage(
            frame.source.image,
            frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight,
            GLOW_PADDING - offCanvas, GLOW_PADDING, frame.cutWidth, frame.cutHeight
        );
    }

    scene.textures.addCanvas(key, canvas);
    return key;
}
