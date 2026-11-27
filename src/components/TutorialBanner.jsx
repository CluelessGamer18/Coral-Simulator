import { asset } from "../assetUrl.js";
import "../styles/TutorialBanner.css";

/**
 * The tutorial scene's current lesson, shown as a wide box along the top of the game, plus the short praise message
 * that fades away when the player completes a step. Below the banner is an empty slot that App puts the notices in,
 * so they always sit just under it.
 * @param {object} props
 * @param {object | null} props.step the lesson (Tutorial.js STEPS), or null outside the tutorial
 * @param {{ id: number, text: string } | null} props.praise
 * @param {() => void} props.onPraiseEnd
 * @param {() => void} props.onButton the lesson's button, on the last lesson
 * @param {(slot: HTMLElement | null) => void} props.noticeSlotRef given the notice slot once it's on the page
 */
function TutorialBanner({ step, praise, onPraiseEnd, onButton, noticeSlotRef }) {
    return (
        <>
            <div className="TutorialOverlay">
                {step ? (
                    <div className="TutorialBanner" role="status" aria-live="polite">
                        {step.image ? (
                            <img className="TutorialBannerImage" src={asset(step.image)} alt={step.imageAlt ?? ""} />
                        ) : null}
                        <div className="TutorialBannerContent">
                            <h2 className="TutorialBannerTitle">{step.title}</h2>
                            <p className="TutorialBannerText">{step.text}</p>
                        </div>
                        {step.buttonLabel ? (
                            <button type="button" className="TutorialBannerButton" onClick={onButton}>
                                {step.buttonLabel}
                            </button>
                        ) : null}
                    </div>
                ) : null}
                <div ref={noticeSlotRef} className="TutorialNoticeSlot" />
            </div>
            {praise ? (
                // keyed by id, so a new message restarts the fade even if it has the same text
                <p
                    key={praise.id}
                    className="TutorialPraise"
                    role="status"
                    aria-live="polite"
                    onAnimationEnd={onPraiseEnd}
                >
                    {praise.text}
                </p>
            ) : null}
        </>
    );
}

export default TutorialBanner;
