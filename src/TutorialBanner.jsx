import "./styles/TutorialBanner.css";
import { asset } from "./assetUrl";

// The tutorial scene's current instruction, shown as a wide box along the top of the game,
// plus the short praise message that fades away when the player completes a step.
function TutorialBanner({ step, praise, onPraiseEnd, onButton }) {
  return (
    <>
      {step ? (
        <div className="TutorialBanner" role="status" aria-live="polite">
          {step.image ? <img className="TutorialBannerImage" src={asset(step.image)} alt={step.imageAlt ?? ""} /> : null}
          <div className="TutorialBannerContent">
            <h2 className="TutorialBannerTitle">{step.title}</h2>
            <p className="TutorialBannerText">{step.text}</p>
          </div>
          {step.buttonLabel ? (
            <button className="TutorialBannerButton" onClick={onButton}>{step.buttonLabel}</button>
          ) : null}
        </div>
      ) : null}
      {praise ? (
        // keyed by id, so a new message restarts the fade even if it has the same text
        <p key={praise.id} className="TutorialPraise" role="status" aria-live="polite" onAnimationEnd={onPraiseEnd}>
          {praise.text}
        </p>
      ) : null}
    </>
  );
}

export default TutorialBanner;
