

import "./styles/CoralPopup.css";
import { asset } from "./assetUrl";

// The description with the species name in italics, wherever it comes up
function withItalicName(info, scientificName) {
  return info.split(scientificName).flatMap((text, i) =>
    i === 0 ? [text] : [<em key={i}>{scientificName}</em>, text]
  );
}

export default function CoralPopup({ coral, onClose }) {
  if (!coral) return null;

  return (
    <div className="CoralOverlay" onClick={onClose}>
      <div className="CoralPopup">
        <div className="CoralTitle">{coral.name}</div>
        <div className="ScienceName">{coral.scientificName}</div>
        <div className="statusContainer">
          <img className="statusIcon" src={asset("coralStatus.svg")} alt="" />
          <p className="CoralStatus">{coral.status}</p>
        </div> 
        <p className="CoralInfo">{withItalicName(coral.info, coral.scientificName)}</p>
        <img className="microCoralView" src={coral.img} alt={`Microscope view of ${coral.name}`} />
        {/* <button onClick={onClose}>Close</button> */}
      </div>
    </div>
  );
}
