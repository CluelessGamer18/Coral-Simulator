import { useEffect, useRef } from "react";
import "./styles/CoralPopup.css";
import { asset } from "./assetUrl";

// The description with the species name in italics, wherever it comes up
function withItalicName(info, scientificName) {
  return info.split(scientificName).flatMap((text, i) =>
    i === 0 ? [text] : [<em key={i}>{scientificName}</em>, text]
  );
}

// What a coral is and how it's doing, opened by clicking one. coral.collection (main game only) says whether
// this click added a new kind to the player's collection, and how many they have now.
// Closes on the Close button, a click outside the box, or Escape.
export default function CoralPopup({ coral, onClose }) {
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
    <div className="CoralOverlay" onClick={onClose}>
      <div className="CoralPopup" role="dialog" aria-modal="true" aria-labelledby="coral-popup-title" onClick={(event) => event.stopPropagation()}>
        {collection ? (
          <div className={`CoralCollection${collection.isNew ? " isNew" : ""}`}>
            <span className="CoralCollectionBadge">{collection.isNew ? "New coral collected!" : "In your collection"}</span>
            <span className="CoralCollectionCount" aria-label={`${collection.collected} of ${collection.total} kinds collected`}>
              {collection.collected}/{collection.total}
            </span>
          </div>
        ) : null}
        <div className="CoralTitle" id="coral-popup-title">{coral.name}</div>
        <div className="ScienceName">{coral.scientificName}</div>
        <div className="statusContainer">
          <img className="statusIcon" src={asset("coralStatus.svg")} alt="" />
          <p className="CoralStatus">{coral.status}</p>
        </div> 
        <p className="CoralInfo">{withItalicName(coral.info, coral.scientificName)}</p>
        <img className="microCoralView" src={coral.img} alt={`Microscope view of ${coral.name}`} />
        <button ref={closeButton} className="CoralPopupClose" type="button" onClick={onClose}>
          {collection && collection.collected < collection.total ? "Keep exploring" : "Close"}
        </button>
      </div>
    </div>
  );
}
