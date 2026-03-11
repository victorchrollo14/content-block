const OVERLAY_ID = "focus-guard-overlay-root";

(async function init() {
  const url = window.location.href;
  const response = await chrome.runtime.sendMessage({ type: "getPolicy", url }).catch(() => null);

  if (!response || response.mode === "none") {
    return;
  }

  if (response.mode === "blocked") {
    enforceOverlay({
      title: "Site Blocked",
      quote: response.quote,
      subtitle: "This site is blocked by Kaizen.",
      image: response.image
    });
    return;
  }

  if (response.mode === "limited-expired") {
    enforceOverlay({
        title: "Time Limit Reached",
        quote: response.quote,
        subtitle: "Your time is up. Get back to work.",
        image: response.image
      });
      return;
  }

  if (response.mode === "limited-active") {
    window.setTimeout(() => {
      enforceOverlay({
        title: "Time Limit Reached",
        quote: response.quote,
        subtitle: "Your time is up. Get back to work.",
        image: response.image
      });
    }, Math.max(0, Number(response.remainingMs) || 0));
  }
})();

function enforceOverlay({ title, quote, subtitle, image }) {
  muteAllMedia();

  const create = () => {
    if (document.getElementById(OVERLAY_ID)) {
      return;
    }

    const root = document.createElement("div");
    root.id = OVERLAY_ID;

    const shadow = root.attachShadow({ mode: "open" });
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <style>
        :host { all: initial; }
        .fg-backdrop {
          position: fixed;
          inset: 0;
          z-index: 2147483647;
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            radial-gradient(1200px 680px at 6% 8%, #33463e 0%, transparent 55%),
            radial-gradient(1200px 680px at 95% 95%, #28353f 0%, transparent 52%),
            #0f171d;
          color: #f5f7fa;
          font-family: "Avenir Next", "Segoe UI", "Helvetica Neue", sans-serif;
          padding: 24px 20px;
          box-sizing: border-box;
          overflow: hidden;
        }
        .fg-backdrop::before {
          content: "";
          position: absolute;
          inset: 0;
          background: ${image ? `url("${escapeCssUrl(image)}") center / cover no-repeat` : "none"};
          filter: ${image ? "blur(6px) brightness(0.2)" : "none"};
          transform: ${image ? "scale(1.06)" : "none"};
        }
        .fg-shell {
          position: relative;
          max-width: 980px;
          width: 100%;
          min-height: min(620px, 88vh);
          display: grid;
          grid-template-columns: minmax(260px, 42%) 1fr;
          border: 1px solid rgba(245, 247, 250, 0.23);
          border-radius: 26px;
          overflow: hidden;
          backdrop-filter: blur(2px);
          background: rgba(14, 18, 23, 0.62);
          box-shadow: 0 32px 96px rgba(0, 0, 0, 0.45);
        }
        .fg-media {
          position: relative;
          background: linear-gradient(155deg, #111f27 0%, #192e36 52%, #1d2d33 100%);
          border-right: 1px solid rgba(244, 246, 250, 0.22);
        }
        .fg-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .fg-image-fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: flex-end;
          justify-content: flex-start;
          padding: 24px;
          box-sizing: border-box;
          color: rgba(255, 255, 255, 0.8);
          font-size: clamp(20px, 3vw, 30px);
          letter-spacing: 0.03em;
          font-weight: 500;
          background:
            radial-gradient(420px 240px at 20% 22%, rgba(178, 210, 194, 0.28) 0%, transparent 72%),
            radial-gradient(420px 220px at 80% 82%, rgba(139, 176, 190, 0.3) 0%, transparent 70%),
            linear-gradient(165deg, #0f2229 0%, #1d3b46 56%, #2d5767 100%);
        }
        .fg-panel {
          background: #f3f0e9;
          color: #16171a;
          padding: clamp(22px, 4vw, 46px);
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 18px;
          text-align: left;
        }
        .fg-badge {
          display: inline-flex;
          align-self: flex-start;
          border: 1px solid #b2afa8;
          border-radius: 999px;
          padding: 6px 11px;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #545861;
        }
        .fg-title {
          margin: 0;
          font-family: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, "Times New Roman", serif;
          font-size: clamp(34px, 7vw, 74px);
          line-height: 1.1;
          letter-spacing: 0.01em;
          font-weight: 500;
        }
        .fg-subtitle {
          margin: 0;
          color: #4d5260;
          font-size: clamp(13px, 2vw, 16px);
          line-height: 1.45;
        }
        .fg-quote {
          margin: 10px 0 0;
          font-family: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, "Times New Roman", serif;
          font-size: clamp(26px, 5vw, 46px);
          line-height: 1.15;
          color: #151820;
          max-width: 22ch;
        }
        .fg-note {
          margin: 2px 0 0;
          font-size: 12px;
          letter-spacing: 0.03em;
          color: #666b79;
          text-transform: uppercase;
          font-weight: 700;
        }
        @media (max-width: 820px) {
          .fg-shell {
            grid-template-columns: 1fr;
            min-height: unset;
            max-height: 92vh;
          }
          .fg-media {
            min-height: 210px;
            max-height: 36vh;
            border-right: 0;
            border-bottom: 1px solid rgba(244, 246, 250, 0.22);
          }
          .fg-panel {
            padding: 22px 18px 24px;
            gap: 14px;
          }
          .fg-title {
            font-size: clamp(30px, 8vw, 52px);
          }
          .fg-quote {
            font-size: clamp(23px, 6vw, 38px);
          }
        }
      </style>
      <div class="fg-backdrop" role="dialog" aria-modal="true" aria-label="Kaizen message">
        <div class="fg-shell">
          <aside class="fg-media" aria-hidden="true">
            ${
              image
                ? `<img class="fg-image" src="${escapeHtml(image)}" alt="Motivation" />`
                : '<div class="fg-image-fallback">Kaizen</div>'
            }
          </aside>
          <section class="fg-panel">
            <span class="fg-badge">Focus Mode</span>
            <p class="fg-quote">${escapeHtml(quote || "Back to work.")}</p>
            <p class="fg-note">Anything that distracts is evil. Now get back to work.</p>
          </section>
        </div>
      </div>
    `;

    shadow.appendChild(wrap);
    appendRoot(root);
    forceNoScroll();
  };

  create();

  const interval = window.setInterval(() => {
    create();
    forceNoScroll();
  }, 400);

  const observer = new MutationObserver(() => {
    create();
    forceNoScroll();
  });

  observer.observe(document.documentElement || document, {
    childList: true,
    subtree: true
  });

  window.addEventListener(
    "beforeunload",
    () => {
      window.clearInterval(interval);
      observer.disconnect();
    },
    { once: true }
  );
}

function appendRoot(root) {
  if (document.documentElement) {
    document.documentElement.appendChild(root);
    return;
  }

  document.addEventListener(
    "DOMContentLoaded",
    () => {
      if (!document.getElementById(OVERLAY_ID)) {
        document.documentElement.appendChild(root);
      }
    },
    { once: true }
  );
}

function forceNoScroll() {
  if (document.documentElement) {
    document.documentElement.style.setProperty("overflow", "hidden", "important");
    document.documentElement.style.setProperty("height", "100%", "important");
  }

  if (document.body) {
    document.body.style.setProperty("overflow", "hidden", "important");
    document.body.style.setProperty("height", "100%", "important");
  }
}

function escapeHtml(input) {
  return String(input)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeCssUrl(input) {
  return String(input).replaceAll('"', '\\"');
}

function muteAllMedia() {
  document.querySelectorAll("video, audio").forEach((el) => {
    el.pause();
    el.muted = true;
    el.volume = 0;
  });

  Object.defineProperty(document, "visibilityState", {
    get: () => "hidden",
    configurable: true
  });
  document.hidden = true;

  const style = document.createElement("style");
  style.textContent = `video, audio { display: none !important; visibility: hidden !important; }`;
  (document.head || document.documentElement).appendChild(style);
}
