import { useEffect, useRef } from "react";
import "./styles/CoralPopup.css";
import { useFocusTrap } from "./useFocusTrap.js";

// The description with the species name in italics, wherever it comes up
function withItalicName(info, scientificName) {
  return info.split(scientificName).flatMap((text, i) =>
    i === 0 ? [text] : [<em key={i}>{scientificName}</em>, text]
  );
}

// What a coral is and how it's doing, opened by clicking one: a page of the player's field guide.
// coral.collection (main game only) says whether this click added a new kind to the collection.
// Closes on the Close button, a click outside the box, or Escape.
export default function CoralPopup({ coral, onClose }) {
  const box = useRef(null);
  useFocusTrap(box, Boolean(coral));

  useEffect(() => {
    if (!coral) return;

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
  const { collection, statuses = [], statusStage } = coral;

  return (
    <div className="CoralOverlay" onClick={onClose}>
      <div className="CoralPopup" ref={box} role="dialog" aria-modal="true" aria-labelledby="coral-popup-title" tabIndex={-1} onClick={(event) => event.stopPropagation()}>
        <div className="CoralPopupText">
          {collection ? (
            <div className={`CoralCollection${collection.isNew ? " isNew" : ""}`}>
              <span className="CoralCollectionBadge">{collection.isNew ? "New coral found!" : "In your collection"}</span>
              <span className="CoralCollectionCount" aria-label={`${collection.collected} of ${collection.total} kinds found`}>
                {collection.collected}/{collection.total}
              </span>
            </div>
          ) : null}
          <h2 className="CoralTitle" id="coral-popup-title">{coral.name}</h2>
          <div className="ScienceName">{coral.scientificName}</div>

          {/* five steps from healthy to dead, with this coral's own step picked out */}
          <ol className="CoralHealth" aria-label={`Health: ${coral.status}, ${coral.stress}% stressed`}>
            {statuses.map((status, i) => (
              <li key={status} className={`step${i}${i === statusStage ? " now" : ""}`} aria-current={i === statusStage ? "true" : undefined}>{status}</li>
            ))}
          </ol>
          <p className="CoralReason"><b>{coral.stress}% stressed.</b> {coral.reason}</p>
          <p className="CoralHeat">{coral.heat}</p>
          <p className="CoralInfo">{withItalicName(coral.info, coral.scientificName)}</p>
          <button className="Button ButtonPrimary" data-autofocus type="button" onClick={onClose}>
            {collection && collection.collected < collection.total ? "Keep exploring" : "Close"}
          </button>
        </div>
        <figure className="CoralMicroscope">
          <img src={coral.img} alt={`Microscope view of ${coral.name}`} />
          <figcaption>Under the microscope: the algae living inside the coral. <b>{coral.algaeLeft} of {coral.algaeTotal} left.</b></figcaption>
        </figure>
      </div>
    </div>
  );
}
