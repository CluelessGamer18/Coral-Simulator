import "./styles/CoralPopup.css";

export default function CoralPopup({ coral, onClose }) {
  if (!coral) return null;

  return (
    <div className="CoralPopup">
      <h3>Coral Info (popup test)</h3>
      <p>Type: {coral.type}</p>
      {/* <p>Bleach Rate: {coral.bleachRate}</p>
      <p>Stress: {coral.stress}</p>
      <p>Stage: {coral.stage}</p> */}
      <p>Staghorn coral is a species of coral inhabiting the Caribbean Ocean, living to a depth of approximately 98 feet (30 meters). Their critically endangered status makes it one of the most important species in marine conservation.</p>
      <button onClick={onClose}>Close</button>
    </div>
  );
}