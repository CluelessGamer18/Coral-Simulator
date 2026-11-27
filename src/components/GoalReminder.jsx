import { useEffect } from "react";
import { END_YEAR, GAME_YEARS, START_YEAR } from "../game/gameConfig.js";
import "../styles/GoalReminder.css";

const YEARS = Array.from({ length: GAME_YEARS }, (_, i) => i + 1);
const SHOW_FOR_MS = 4500; // a little longer than the card's own animation (GoalReminder.css)

/**
 * The card that drops in at the start of every game to remind the player what they're playing for. It doesn't stop
 * the game, and goes away by itself or on a click.
 * @param {{ onDone: () => void }} props
 */
function GoalReminder({ onDone }) {
    useEffect(() => {
        const id = window.setTimeout(onDone, SHOW_FOR_MS);
        return () => window.clearTimeout(id);
    }, [onDone]);

    return (
        <div className="GoalReminder" role="status" aria-live="polite" onClick={onDone}>
            <div className="GoalReminderCard">
                <span className="GoalReminderLabel">Your goal</span>
                <h2 className="GoalReminderTitle">Survive all {GAME_YEARS} years!</h2>
                <div className="GoalReminderYears" aria-hidden="true">
                    {YEARS.map((year) => (
                        <span
                            key={year}
                            className="GoalReminderYear"
                            style={{ animationDelay: `${300 + year * 90}ms` }}
                        >
                            {year}
                        </span>
                    ))}
                </div>
                <p className="GoalReminderText">
                    Keep your reef and your fish alive from {START_YEAR} to {END_YEAR}.
                </p>
            </div>
        </div>
    );
}

export default GoalReminder;
