import Phaser from "phaser";

/*
Swimming without a keyboard, for mice, tablets and touch-screen exhibits.

Press and hold anywhere on the water and the fish swims to the pointer; tap, and it swims to that spot and stops.
A quick tap on a coral opens its popup instead (CoralManager.js). The Q and E keys and their on-screen buttons
(TouchControls.jsx) both end up in pressVirtualKey(), which the scenes read with takeVirtualKey().
*/

const ARRIVE_DISTANCE = 18; // px: close enough to the spot to stop
const SLOW_DISTANCE = 60;   // the fish eases off inside this, so it doesn't jitter around the pointer

export function createPointerControls(scene) {
    scene.pointerGoal = null;  // where the fish is heading, in world coordinates
    scene.virtualKeys = {};

    const setGoal = (pointer) => {
        const point = scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
        scene.pointerGoal = { x: point.x, y: point.y };
    };
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, setGoal);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer) => { if (pointer.isDown) setGoal(pointer); });
}

// Which way the fish should swim this frame: { x, y } no longer than 1, from the keys if any are held, and
// otherwise towards the pointer's spot.
export function readMovement(scene) {
    const { moveKeys, guide } = scene;
    const x = (moveKeys.right.isDown ? 1 : 0) - (moveKeys.left.isDown ? 1 : 0);
    const y = (moveKeys.down.isDown ? 1 : 0) - (moveKeys.up.isDown ? 1 : 0);
    if (x !== 0 || y !== 0) {
        scene.pointerGoal = null; // the keyboard takes over
        const length = Math.hypot(x, y);
        return { x: x / length, y: y / length };
    }

    // While the pointer is held the fish keeps following it, even as the camera scrolls underneath
    const pointer = scene.input.activePointer;
    if (pointer.isDown && scene.pointerGoal) {
        const point = scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
        scene.pointerGoal = { x: point.x, y: point.y };
    }

    const goal = scene.pointerGoal;
    if (!goal) return { x: 0, y: 0 };

    const distance = Phaser.Math.Distance.Between(guide.x, guide.y, goal.x, goal.y);
    if (distance <= ARRIVE_DISTANCE) {
        scene.pointerGoal = null;
        return { x: 0, y: 0 };
    }
    const speed = Math.min(distance / SLOW_DISTANCE, 1);
    return { x: (goal.x - guide.x) / distance * speed, y: (goal.y - guide.y) / distance * speed };
}

export function pressVirtualKey(scene, name) {
    (scene.virtualKeys ??= {})[name] = true;
}

// Q and E are read as presses rather than by asking each frame whether the key has just gone down: on a slow
// computer a quick tap can go down and up again between two frames, and would be missed.
export function listenForPress(scene, key, name) {
    key.on("down", () => pressVirtualKey(scene, name));
}

// True once for each press of an on-screen button
export function takeVirtualKey(scene, name) {
    const pressed = scene.virtualKeys?.[name] === true;
    if (pressed) scene.virtualKeys[name] = false;
    return pressed;
}
