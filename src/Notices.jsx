import { useEffect } from 'react'
import './styles/Notices.css'
import { asset } from './assetUrl'

/*
The messages the game shows over the play area, in two lanes so one kind never hides the other:

  - the banner, top centre, for the state of the reef: the bleaching alert and the stress warnings. One at a
    time; the rest wait their turn (App.jsx keeps the queue and decides the order).
  - toasts, top right, for things that happen to the fish: predators, the nest, bubbles and the coral
    collection. Up to three are stacked, each with its own timer.

In the tutorial both lanes sit in the slot under the lesson banner instead (inSlot), so they follow it.
*/

// How long each kind stays up, in ms. Persistent notices stay until closed or cleared by the game.
function getDuration(notice, slow) {
  if (notice.persistent) return null;
  if (notice.bleaching) return 7000;
  if (slow) return 10000; // the tutorial's notices are being read for the first time
  return notice.warning ? 6500 : 5000;
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
  return (
    <aside
      className={`EventNotice${notice.warning ? " EventNoticeWarning" : ""}${notice.bleaching ? " EventNoticeBleaching" : ""}${notice.good ? " EventNoticeGood" : ""}`}
      role={urgent ? "alert" : "status"}
      aria-live={urgent ? "assertive" : "polite"}
      aria-labelledby={titleId}
    >
      <button className="EventNoticeDismiss" type="button" onClick={() => onClose(key, true)} aria-label="Dismiss notification">Close</button>
      {notice.bleaching ? <img className="EventNoticeBleachingIcon" src={asset("warning.svg")} alt="" /> : null}
      <div className="EventNoticeHeading">
        <h2 id={titleId}>{notice.title}</h2>
      </div>
      <p>{notice.message}</p>
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
