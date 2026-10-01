

import "./styles/CoralPopup.css";
import { asset } from "./assetUrl";

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
        <p className="CoralInfo">{coral.info}</p>
        <img className="microCoralView" src={coral.img} alt={`Microscope view of ${coral.name}`} />
        {/* <button onClick={onClose}>Close</button> */}
      </div>
    </div>
  );
}
