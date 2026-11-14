import { useEffect } from "react";

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

// Keeps keyboard focus inside a dialog while it is open: focus moves in when it opens, Tab and Shift+Tab go
// round inside it, and focus goes back to where it was when the dialog closes.
export function useFocusTrap(ref, active = true) {
    useEffect(() => {
        const box = ref.current;
        if (!active || !box) return;

        const previous = document.activeElement;
        const items = () => [...box.querySelectorAll(FOCUSABLE)].filter(item => item.offsetParent !== null);
        // without scrolling: a tall dialog should open at its top, not at the button that takes focus
        (box.querySelector("[data-autofocus]") ?? items()[0] ?? box).focus({ preventScroll: true });

        const onKeyDown = (event) => {
            if (event.key !== "Tab") return;
            const list = items();
            if (list.length === 0) return;
            const first = list[0];
            const last = list.at(-1);
            if (event.shiftKey && (document.activeElement === first || !box.contains(document.activeElement))) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && (document.activeElement === last || !box.contains(document.activeElement))) {
                event.preventDefault();
                first.focus();
            }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
            if (previous instanceof HTMLElement && document.contains(previous)) previous.focus();
        };
    }, [ref, active]);
}
