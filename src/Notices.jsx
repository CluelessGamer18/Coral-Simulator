import { useEffect } from 'react'
import './styles/Notices.css'
import { asset } from './assetUrl'

/*
The messages the game shows, all inside the play area and near the top of it, in two lanes so one kind never
hides the other:

  - the banner, top centre, for the state of the reef: the card that opens each year, the winter job and the
    stress warnings. One at a time; the rest wait their turn (App.jsx keeps the queue and decides the order).
  - toasts, top right, for things that happen to the fish: predators, the nest, bubbles and the coral
    collection. Up to three are stacked, each with its own timer.

App also keeps the last few in the HUD's Log card, so one that was missed can still be read.
In the tutorial both lanes sit in the slot under the lesson banner instead (inSlot), so they follow it.
*/

// How long each kind stays up, in ms. Persistent notices stay until closed or cleared by the game.
function getDuration(notice, slow) {
  if (notice.persistent) return null;
  if (notice.card) return 9000;
  if (slow) return 10000; // the tutorial's notices are being read for the first time
  return notice.warning ? 6500 : 5500;
}

// The card that opens each year: how last year went, what this one brings, and its goals
function YearCard({ notice, titleId }) {
  const { report } = notice;
  return (
    <>
      {notice.chapter ? <span className="YearCardChapter">Chapter {notice.chapter.number}: {notice.chapter.title}</span> : null}
      <h2 id={titleId} className="YearCardTitle">
        {notice.heat > 0 ? <img src={asset("warning.svg")} alt="" /> : null}
        Year {notice.year}: {notice.heat > 0 ? `heatwave +${notice.heat} °C` : "no heatwave"}
      </h2>
      <p className="YearCardBrief">{notice.brief}</p>
      <ul className="YearCardGoals" aria-label="This year's goals">
        {notice.goals.map(goal => <li key={goal}>{goal}</li>)}
      </ul>
      {report ? (
        <p className="YearCardReport">
          Last year: stress peaked at <b>{report.peak}%</b> · <b>{report.lost}</b> {report.lost === 1 ? "coral" : "corals"} lost
          · goals <b>{report.met}/{report.total}</b>{report.allMet ? " · +1 heart" : ""}
        </p>
      ) : null}
    </>
  );
}

function Notice({ notice, slow, onClose }) {
  const duration = getDuration(notice, slow);
  const { key } = notice;

  useEffect(() => {
    if (duration === null) return;
    const id = window.setTimeout(() => onClose(key, false), duration);
    return () => window.clearTimeout(id);
  }, [key, duration, onClose]);

  const urgent = notice.bleaching || notice.warning;
  const titleId = `notice-title-${key}`;
  const kind = notice.card ? (notice.heat > 0 ? " YearCard YearCardHeat" : " YearCard")
    : notice.warning ? " EventNoticeWarning" : notice.good ? " EventNoticeGood" : "";
  return (
    <aside
      className={`EventNotice${kind}`}
      role={urgent ? "alert" : "status"}
      aria-live={urgent ? "assertive" : "polite"}
      aria-labelledby={titleId}
    >
      <button className="EventNoticeDismiss" type="button" onClick={() => onClose(key, true)} aria-label="Close this message">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
      </button>
      {notice.card ? <YearCard notice={notice} titleId={titleId} /> : (
        <>
          <h2 id={titleId}>{notice.title}</h2>
          <p>{notice.message}</p>
        </>
      )}
    </aside>
  );
}

// onClose(key, byPlayer) is called when a notice times out or its Close button is clicked
function Notices({ banners, toasts, inSlot = false, onClose }) {
  const banner = banners[0];
  if (!banner && toasts.length === 0) return null;

  return (
    <div className={inSlot ? "NoticesInSlot" : "Notices"}>
      {banner ? (
        <div className="NoticeBannerLane">
          <Notice key={banner.key} notice={banner} slow={inSlot} onClose={onClose} />
        </div>
      ) : null}
      {toasts.length > 0 ? (
        <div className="NoticeToastLane">
          {toasts.map(toast => <Notice key={toast.key} notice={toast} slow={inSlot} onClose={onClose} />)}
        </div>
      ) : null}
    </div>
  );
}

export default Notices
