import { useEffect } from "react";
import { asset } from "../assetUrl.js";
import "../styles/Notices.css";

/*
The messages the game shows over the play area, in two lanes so one kind never hides the other:
  - the banner, top center, for the state of the reef: the bleaching alert and the stress warnings. One at a time;
    the rest wait their turn (App.jsx keeps the queue and decides the order).
  - toasts, top right, for things that happen to the fish: predators, the nest, bubbles and the coral collection.
    Up to three are stacked, each with its own timer.
In the tutorial both lanes sit in the slot under the lesson banner instead (inSlot), so they follow it.
*/

const TUTORIAL_MS = 3000; // every notice in the tutorial, even a persistent one, so the lessons keep moving
const BLEACHING_MS = 7000;
const WARNING_MS = 6500;
const NOTICE_MS = 5000;

// How long a notice stays up, in ms, or null for one that stays until it's closed
function getDuration(notice, inTutorial) {
    if (inTutorial) return TUTORIAL_MS;
    if (notice.persistent) return null;
    if (notice.bleaching) return BLEACHING_MS;
    return notice.warning ? WARNING_MS : NOTICE_MS;
}

function Notice({ notice, inTutorial, onClose }) {
    const duration = getDuration(notice, inTutorial);
    const { key, advanceTutorialOnClose } = notice;

    useEffect(() => {
        if (duration === null) return;
        const id = window.setTimeout(() => onClose(key, advanceTutorialOnClose), duration);
        return () => window.clearTimeout(id);
    }, [key, duration, onClose, advanceTutorialOnClose]);

    const urgent = notice.bleaching || notice.warning;
    const titleId = `notice-title-${key}`;
    const modifiers = [notice.warning && "isWarning", notice.bleaching && "isBleaching", notice.good && "isGood"];
    return (
        <aside
            className={["Notice", ...modifiers.filter(Boolean)].join(" ")}
            role={urgent ? "alert" : "status"}
            aria-live={urgent ? "assertive" : "polite"}
            aria-labelledby={titleId}
        >
            <button
                className="NoticeDismiss"
                type="button"
                onClick={() => onClose(key, advanceTutorialOnClose)}
                aria-label="Dismiss notification"
            >
                Close
            </button>
            {notice.bleaching ? <img className="NoticeBleachingIcon" src={asset("warning.svg")} alt="" /> : null}
            <div className="NoticeHeading">
                <h2 id={titleId}>{notice.title}</h2>
            </div>
            <p>{notice.message}</p>
        </aside>
    );
}

/**
 * @param {object} props
 * @param {object[]} props.banners the queue of banners; the first is shown
 * @param {object[]} props.toasts
 * @param {boolean} [props.inSlot] in the tutorial's slot under its lesson banner
 * @param {(key: number, advanceTutorial: boolean) => void} props.onClose called when a notice times out or its Close
 *   button is clicked. advanceTutorial is set for a tutorial lesson's notice, which moves the lesson on.
 */
function Notices({ banners, toasts, inSlot = false, onClose }) {
    const banner = banners[0];
    if (!banner && toasts.length === 0) return null;

    return (
        <div className={inSlot ? "NoticesInSlot" : "Notices"}>
            {banner ? (
                <div className="NoticeBannerLane">
                    <Notice key={banner.key} notice={banner} inTutorial={inSlot} onClose={onClose} />
                </div>
            ) : null}
            {toasts.length > 0 ? (
                <div className="NoticeToastLane">
                    {toasts.map((toast) => (
                        <Notice key={toast.key} notice={toast} inTutorial={inSlot} onClose={onClose} />
                    ))}
                </div>
            ) : null}
        </div>
    );
}

export default Notices;
