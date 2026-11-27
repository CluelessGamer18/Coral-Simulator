import { useEffect, useRef } from "react";
import { asset } from "../assetUrl.js";
import "../styles/CoralPopup.css";

// The description with the species name in italics, wherever it comes up
function withItalicName(info, scientificName) {
    return info
        .split(scientificName)
        .flatMap((text, i) => (i === 0 ? [text] : [<em key={i}>{scientificName}</em>, text]));
}

/**
 * What a coral is and how it's doing, opened by clicking one. Closes on the Close button, a click outside the box,
 * or Escape.
 * @param {object} props
 * @param {object | null} props.coral from the "coral-selected" event (getCoralInfo in coralKinds.js). Its collection
 *   (main game only) says whether this click added a new kind to the player's collection, and how many they have now.
 * @param {() => void} props.onClose
 */
function CoralPopup({ coral, onClose }) {
    const closeButton = useRef(null);

    useEffect(() => {
        if (!coral) return;
        closeButton.current?.focus();

        // In the capture phase, so Escape closes this popup rather than opening the Options menu behind it
        const onKeyDown = (event) => {
            if (event.key !== "Escape") return;
            event.stopPropagation();
            onClose();
        };
        window.addEventListener("keydown", onKeyDown, true);
        return () => window.removeEventListener("keydown", onKeyDown, true);
    }, [coral, onClose]);

    if (!coral) return null;
    const { collection } = coral;

    return (
        <div className="CoralPopupOverlay" onClick={onClose}>
            <div
                className="CoralPopup"
                role="dialog"
                aria-modal="true"
                aria-labelledby="coral-popup-title"
                onClick={(event) => event.stopPropagation()}
            >
                {collection ? (
                    <div className={`CoralPopupCollection${collection.isNew ? " isNew" : ""}`}>
                        <span className="CoralPopupCollectionBadge">
                            {collection.isNew ? "New coral collected!" : "In your collection"}
                        </span>
                        <span
                            className="CoralPopupCollectionCount"
                            aria-label={`${collection.collected} of ${collection.total} kinds collected`}
                        >
                            {collection.collected}/{collection.total}
                        </span>
                    </div>
                ) : null}
                <div className="CoralPopupTitle" id="coral-popup-title">
                    {coral.name}
                </div>
                <div className="CoralPopupScientificName">{coral.scientificName}</div>
                <div className="CoralPopupStatus">
                    <img src={asset("coral_status.svg")} alt="" />
                    <p className="CoralPopupStatusText">{coral.status}</p>
                </div>
                <p className="CoralPopupInfo">{withItalicName(coral.info, coral.scientificName)}</p>
                <img className="CoralPopupMicroscope" src={coral.img} alt={`Microscope view of ${coral.name}`} />
                <button ref={closeButton} className="CoralPopupClose" type="button" onClick={onClose}>
                    {collection && collection.collected < collection.total ? "Keep exploring" : "Close"}
                </button>
            </div>
        </div>
    );
}

export default CoralPopup;
