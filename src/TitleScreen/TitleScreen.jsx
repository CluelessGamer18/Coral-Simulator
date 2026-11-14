import "./TitleScreen.css";
import { useNavigate } from 'react-router';
import { asset } from "../assetUrl";

// The reef's own background art sits behind the title. These are the files the game loads anyway.
const LAYERS = ["surface_1440x155", "farground_1440x804", "middleground_2072x691", "foreground_2860x467", "foreforeground_2860x161"];

function TitleScreen({ hasExistingGame, tutorialDone, best, onStart, onResume, onOptions }) {
    const navigate = useNavigate();

    return (
        <div className="TitleScreen">
            <div className="TitleArt" aria-hidden="true">
                {LAYERS.map((name, i) => (
                    <img key={name} className={`TitleLayer TitleLayer${i}`} src={asset(`assets/background/${name}.png`)} alt="" />
                ))}
                <img className="TitleFish" src={asset("assets/fish/fish.png")} alt="" />
            </div>

            <div className="TitlePlate">
                <h1 className="TitleName">Coral Life Watch</h1>
                <p className="TitleTagline">Guide a triggerfish and keep a reef alive through ten summers.</p>

                <div className="TitleButtons">
                    {hasExistingGame ? (
                        <>
                            <button className="Button ButtonPrimary" onClick={onResume}>Continue</button>
                            <button className="Button ButtonSecondary" onClick={() => onStart(false)}>New game</button>
                        </>
                    ) : (
                        <button className="Button ButtonPrimary" onClick={() => onStart(false)}>Start</button>
                    )}
                    {tutorialDone ? <button className="Button ButtonSecondary" onClick={() => onStart(true)}>Play tutorial</button> : null}
                    <button className="Button ButtonSecondary" onClick={onOptions}>Settings</button>
                    <button className="Button ButtonSecondary" onClick={() => navigate("/about")}>About</button>
                </div>

                {best ? (
                    <p className="TitleBest">
                        Best reef so far: <span aria-hidden="true">{"★".repeat(best.stars)}{"☆".repeat(3 - best.stars)}</span>
                        <span className="visually-hidden">{best.stars} of 3 stars,</span> {best.alive}% of corals alive
                    </p>
                ) : null}
            </div>
        </div>
    );
}

export default TitleScreen;
