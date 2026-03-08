const DEFAULT_SETTINGS = {
  blockedSites: [],
  limitedSites: [],
  limitSeconds: 30
};
const DEFAULT_LOCAL_SETTINGS = {
  imageUrls: [],
  uploadedImages: []
};
const HARD_CODED_QUOTES = [
  "What are you scrolling for? What do you wish to find?",
  "You need to beat yourself up, before you try to beat others.",
  "Anime and corn keeps you mediocre, if you don't defeat these you'll never amount to anything in life.",
  "kaam wa kami",
  "The only one you need to beat is yourself.",
  "Mediocrity is premature death."
];

const SESSION_KEYS = {
  siteSessions: "siteSessions",
  tabHosts: "tabHosts"
};

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.sync.get(Object.keys(DEFAULT_SETTINGS));
  const currentLocal = await chrome.storage.local.get(Object.keys(DEFAULT_LOCAL_SETTINGS));
  const next = {};
  const nextLocal = {};

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    if (current[key] === undefined) {
      next[key] = value;
    }
  }
  for (const [key, value] of Object.entries(DEFAULT_LOCAL_SETTINGS)) {
    if (currentLocal[key] === undefined) {
      nextLocal[key] = value;
    }
  }

  if (Object.keys(next).length > 0) {
    await chrome.storage.sync.set(next);
  }
  if (Object.keys(nextLocal).length > 0) {
    await chrome.storage.local.set(nextLocal);
  }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  await cleanupTabState(tabId);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "getPolicy") {
    return;
  }

  void handleGetPolicy(message, sender)
    .then((result) => sendResponse(result))
    .catch((err) => {
      console.error("getPolicy failed", err);
      sendResponse({ mode: "none" });
    });

  return true;
});

async function handleGetPolicy(message, sender) {
  const url = message?.url;
  const tabId = sender?.tab?.id;

  if (!url || tabId === undefined) {
    return { mode: "none" };
  }

  const host = getHost(url);
  if (!host) {
    return { mode: "none" };
  }

  const settings = await getSettings();
  const blocked = matchesHost(settings.blockedSites, host);
  if (blocked) {
    return {
      mode: "blocked",
      quote: getRandomQuote(settings.quotes),
      image: getRandomImage(settings.images)
    };
  }

  const limited = matchesHost(settings.limitedSites, host);
  if (!limited) {
    await resetTabTimerIfHostChanged(tabId, host);
    return { mode: "none" };
  }

  const limitMs = Math.max(1, Number(settings.limitSeconds) || 30) * 1000;
  const now = Date.now();
  const { siteSessions, tabHosts } = await getSessionState();

  const previousHost = tabHosts[tabId];
  if (previousHost && previousHost !== host) {
    delete siteSessions[sessionKey(tabId, previousHost)];
  }

  tabHosts[tabId] = host;

  const key = sessionKey(tabId, host);
  if (!siteSessions[key]) {
    siteSessions[key] = now;
  }

  const startedAt = siteSessions[key];
  const elapsedMs = now - startedAt;
  const overLimit = elapsedMs >= limitMs;
  const remainingMs = Math.max(0, limitMs - elapsedMs);

  await setSessionState({ siteSessions, tabHosts });

  return {
    mode: overLimit ? "limited-expired" : "limited-active",
    quote: getRandomQuote(settings.quotes),
    image: getRandomImage(settings.images),
    remainingMs
  };
}

async function resetTabTimerIfHostChanged(tabId, newHost) {
  const { siteSessions, tabHosts } = await getSessionState();
  const previousHost = tabHosts[tabId];

  if (previousHost && previousHost !== newHost) {
    delete siteSessions[sessionKey(tabId, previousHost)];
  }

  tabHosts[tabId] = newHost;
  await setSessionState({ siteSessions, tabHosts });
}

async function cleanupTabState(tabId) {
  const { siteSessions, tabHosts } = await getSessionState();
  const previousHost = tabHosts[tabId];

  if (previousHost) {
    delete siteSessions[sessionKey(tabId, previousHost)];
  }

  delete tabHosts[tabId];
  await setSessionState({ siteSessions, tabHosts });
}

async function getSettings() {
  const [data, localData] = await Promise.all([
    chrome.storage.sync.get(Object.keys(DEFAULT_SETTINGS)),
    chrome.storage.local.get(Object.keys(DEFAULT_LOCAL_SETTINGS))
  ]);

  const imageUrls = normalizeImageList(localData.imageUrls ?? DEFAULT_LOCAL_SETTINGS.imageUrls);
  const uploadedImages = normalizeImageList(localData.uploadedImages ?? DEFAULT_LOCAL_SETTINGS.uploadedImages);

  return {
    blockedSites: normalizeSiteList(data.blockedSites ?? DEFAULT_SETTINGS.blockedSites),
    limitedSites: normalizeSiteList(data.limitedSites ?? DEFAULT_SETTINGS.limitedSites),
    quotes: HARD_CODED_QUOTES,
    limitSeconds: data.limitSeconds ?? DEFAULT_SETTINGS.limitSeconds,
    images: [...imageUrls, ...uploadedImages]
  };
}

async function getSessionState() {
  const data = await chrome.storage.session.get([SESSION_KEYS.siteSessions, SESSION_KEYS.tabHosts]);

  return {
    siteSessions: data[SESSION_KEYS.siteSessions] ?? {},
    tabHosts: data[SESSION_KEYS.tabHosts] ?? {}
  };
}

async function setSessionState({ siteSessions, tabHosts }) {
  await chrome.storage.session.set({
    [SESSION_KEYS.siteSessions]: siteSessions,
    [SESSION_KEYS.tabHosts]: tabHosts
  });
}

function sessionKey(tabId, host) {
  return `${tabId}|${host}`;
}

function normalizeSiteList(list) {
  if (!Array.isArray(list)) {
    return [];
  }

  return list
    .map((site) => String(site).trim().toLowerCase())
    .filter(Boolean)
    .map((site) => {
      if (site.includes("://")) {
        try {
          return new URL(site).hostname.toLowerCase();
        } catch {
          return site;
        }
      }

      return site.replace(/^\.+/, "").replace(/\/+$/, "");
    })
    .filter(Boolean);
}

function matchesHost(sites, host) {
  return sites.some((site) => host === site || host.endsWith(`.${site}`));
}

function normalizeImageList(images) {
  if (!Array.isArray(images)) {
    return [];
  }

  return images.map((image) => String(image || "").trim()).filter(Boolean);
}

function getHost(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function getRandomQuote(quotes) {
  if (!quotes.length) {
    return "Back to work.";
  }

  const index = Math.floor(Math.random() * quotes.length);
  return quotes[index];
}

function getRandomImage(images) {
  if (!images.length) {
    return "";
  }

  const index = Math.floor(Math.random() * images.length);
  return images[index];
}
