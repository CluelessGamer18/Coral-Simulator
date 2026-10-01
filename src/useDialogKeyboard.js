import { useEffect, useRef } from "react";

// Makes a popup usable from the keyboard: while `isOpen` is true it moves focus into the popup,
// closes it when Escape is pressed, and puts focus back where it was once the popup closes.
// Attach the returned ref to the popup element and give that element tabIndex={-1} so it can take focus.
export function useDialogKeyboard(onClose, isOpen = true) {
    const dialogRef = useRef(null);

    // keep the latest onClose without re-running the effect below (parents pass a new arrow function every render)
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    });

    useEffect(() => {
        if (!isOpen) return;

        const previouslyFocused = document.activeElement;
        dialogRef.current?.focus();

        const handleKeyDown = (e) => {
            if (e.key === "Escape") onCloseRef.current();
        };
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            previouslyFocused?.focus?.();
        };
    }, [isOpen]);

    return dialogRef;
}
