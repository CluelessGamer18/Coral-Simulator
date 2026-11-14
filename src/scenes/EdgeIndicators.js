import Phaser from "phaser";

/*
Arrows on the edge of the view that point at things worth knowing about but out of sight: the grouper, the
nearest helpful bubble, the nest when the fish has something to bring to it, this winter's job. The reef is four
screens wide, so without these the player has to guess which way to swim.

The scene gives a list of targets every frame (getEdgeTargets in TestScene.js); each kind gets one arrow, drawn
once and moved around.
*/

const MARGIN = 54;       // how far in from the edge of the view an arrow sits
const TOP_MARGIN = 150;  // more at the top, clear of the banners
const DEPTH = 10003;

const STYLES = {
    danger: { fill: 0xff5d5d, text: "#ffffff" },
    good: { fill: 0x7fe3c4, text: "#0b2e3a" },
    info: { fill: 0x8fd3ff, text: "#0b2e3a" },
    job: { fill: 0xffc857, text: "#0b2e3a" },
    home: { fill: 0xffe3a3, text: "#0b2e3a" },
};

export class EdgeIndicators {
    constructor(scene) {
        this.scene = scene;
        this.arrows = new Map(); // target id -> { container, triangle, label }
    }

    getArrow(id, style) {
        let arrow = this.arrows.get(id);
        if (arrow) return arrow;

        const { fill, text } = STYLES[style] ?? STYLES.info;
        const triangle = this.scene.add.triangle(0, 0, -11, -13, -11, 13, 13, 0, fill).setStrokeStyle(3, 0x0b2e3a);
        const label = this.scene.add.text(0, 0, "", {
            fontFamily: "Poppins, sans-serif",
            fontSize: "17px",
            fontStyle: "bold",
            color: text,
            backgroundColor: `#${fill.toString(16).padStart(6, "0")}`,
            padding: { x: 8, y: 3 },
        }).setOrigin(0.5);
        const container = this.scene.add.container(0, 0, [label, triangle])
            .setDepth(DEPTH)
            .setScrollFactor(0)
            .setVisible(false);
        arrow = { container, triangle, label };
        this.arrows.set(id, arrow);
        return arrow;
    }

    // targets: [{ id, x, y, label, style }], in world coordinates
    update(targets) {
        const cam = this.scene.cameras.main;
        const { width, height, zoom } = cam;
        const view = cam.worldView;
        const shown = new Set();

        for (const target of targets) {
            const inView = target.x >= view.x && target.x <= view.right && target.y >= view.y && target.y <= view.bottom;
            if (inView) continue;
            shown.add(target.id);

            // Where the target would be on screen, pulled back onto the edge
            const screenX = (target.x - view.centerX) * zoom + width / 2;
            const screenY = (target.y - view.centerY) * zoom + height / 2;
            const arrow = this.getArrow(target.id, target.style);
            if (arrow.label.text !== target.label) arrow.label.setText(target.label);
            const reach = arrow.label.width / 2 + 16;

            // kept far enough in that the whole label and its arrowhead stay on screen
            const x = Phaser.Math.Clamp(screenX, reach + MARGIN / 2, width - reach - MARGIN / 2);
            const y = Phaser.Math.Clamp(screenY, TOP_MARGIN, height - MARGIN);
            const angle = Math.atan2(screenY - y, screenX - x);
            arrow.triangle.setPosition(Math.cos(angle) * reach, Math.sin(angle) * (arrow.label.height / 2 + 16)).setRotation(angle);
            // setScrollFactor(0) stops the camera moving the arrow, but not zooming it, so this undoes the zoom
            arrow.container
                .setPosition(width / 2 + (x - width / 2) / zoom, height / 2 + (y - height / 2) / zoom)
                .setScale(1 / zoom)
                .setVisible(true);
        }

        for (const [id, arrow] of this.arrows) {
            if (!shown.has(id)) arrow.container.setVisible(false);
        }
    }
}
