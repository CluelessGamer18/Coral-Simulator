import { useNavigate } from "react-router";
import "../styles/TitleScreen.css";

/**
 * The first screen, shown while the game loads behind it, and again by Return to Title.
 * @param {object} props
 * @param {boolean} props.hasExistingGame there's a game to go back to, so offer Resume as well as a new game
 * @param {() => void} props.onStartNewGame
 * @param {() => void} props.onResume
 */
function TitleScreen({ hasExistingGame, onStartNewGame, onResume }) {
    const navigate = useNavigate();

    return (
        <div className="TitleScreen">
            <div className="TitleScreenWaves">
                <div className="TitleScreenWave" />
            </div>
            <h1 className="TitleScreenTitle">CORAL LIFE WATCH</h1>
            {hasExistingGame ? (
                <>
                    <button type="button" className="TitleScreenPrimaryButton" onClick={onResume}>
                        Resume Game
                    </button>
                    <button type="button" className="TitleScreenSecondaryButton" onClick={onStartNewGame}>
                        Start New Game
                    </button>
                </>
            ) : (
                <button type="button" className="TitleScreenPrimaryButton" onClick={onStartNewGame}>
                    Start
                </button>
            )}
            <button type="button" className="TitleScreenSecondaryButton" onClick={() => navigate("/about")}>
                About
            </button>
        </div>
    );
}

export default TitleScreen;
