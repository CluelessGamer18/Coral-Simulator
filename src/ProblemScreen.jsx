import './styles/ProblemScreen.css'

// A full-screen message for when the game can't carry on: a file that won't download, the graphics being
// lost, or an error in the page itself. Reloading is the fix for all three.
function ProblemScreen({ title, message }) {
  return (
    <div className="ProblemScreen" role="alert">
      <div className="ProblemScreenCard">
        <h2>{title}</h2>
        <p>{message}</p>
        <button type="button" onClick={() => window.location.reload()}>Reload the game</button>
      </div>
    </div>
  );
}

export default ProblemScreen
