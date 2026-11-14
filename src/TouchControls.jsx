import { useEffect, useState } from "react";
import "./styles/TouchControls.css";
import { pressVirtualKey } from "./scenes/PointerControls.js";

/*
On-screen buttons for the two keys the game needs besides swimming, for tablets and touch-screen exhibits
(swimming itself is press-and-hold on the water: PointerControls.js). They sit at the side of the play area, clear
of the sea floor. Shown once the player touches the screen, or always if that is turned on in Options.
*/
function TouchControls({ scene, always }) {
    const [touched, setTouched] = useState(() => window.matchMedia?.("(pointer: coarse)").matches === true);
    const [state, setState] = useState({ hiding: false, actionAvailable: false });

    useEffect(() => {
        if (touched) return;
        const onTouch = () => setTouched(true);
        window.addEventListener("touchstart", onTouch, { once: true, passive: true });
        return () => window.removeEventListener("touchstart", onTouch);
    }, [touched]);

    const visible = always || touched;
    useEffect(() => {
        if (!visible) return;
        const events = scene.game.events;
        const onStats = (stats) => setState(old =>
            old.hiding === Boolean(stats.hiding) && old.actionAvailable === Boolean(stats.actionAvailable)
                ? old : { hiding: Boolean(stats.hiding), actionAvailable: Boolean(stats.actionAvailable) });
        events.on("stats-changed", onStats);
        return () => events.off("stats-changed", onStats);
    }, [scene, visible]);

    if (!visible) return null;

    // pointerdown, not click, so a second finger can press a button while the first one steers
    const press = (name) => (event) => {
        event.preventDefault();
        pressVirtualKey(scene, name);
    };

    return (
        <div className="TouchControls">
            <button type="button" className={state.actionAvailable ? "ready" : ""} onPointerDown={press("action")} aria-label="Pick up or place (Q)">
                <b>Q</b><span>carry</span>
            </button>
            <button type="button" className={state.hiding ? "ready" : ""} onPointerDown={press("hide")} aria-label={state.hiding ? "Come out of hiding (E)" : "Hide (E)"}>
                <b>E</b><span>{state.hiding ? "come out" : "hide"}</span>
            </button>
        </div>
    );
}

export default TouchControls;
