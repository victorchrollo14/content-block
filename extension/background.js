const BASE_URL = 'https://vz83d6k8.us-east.insforge.app';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNTAyODl9.XsmS2-vr0aYcqndMPlQWqe1pXO4QFw9IZnjoXoSq99Y';

const AUTH_KEY = 'kaizen_auth_token';

const DEFAULT_QUOTES = [
  "Anything that distracts is evil. Now get back to work.",
  "The only one you need to beat is yourself.",
  "Mediocrity is premature death.",
  "What are you scrolling for? What do you wish to find?",
  "Kaizen: continuous improvement starts with focus."
];

const SESSION_KEYS = {
  siteSessions: "siteSessions",
  tabHosts: "tabHosts"
};

let cachedSettings = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30000;

chrome.runtime.onInstalled.addListener(async () => {
  console.log('Kaizen extension installed');
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
  
  const fullBlockSites = settings.blockedSites.map(s => s.domain);
  const limitedSites = settings.limitedSites.filter(s => s.block_type === 'limited').map(s => ({ domain: s.domain, limit: s.limit_seconds * 1000 }));

  const blocked = matchesHost(fullBlockSites, host);
  if (blocked) {
    return {
      mode: "blocked",
      quote: getRandomQuote(settings.quotes),
      image: getRandomImage(settings.images)
    };
  }

  const limited = matchesHost(limitedSites.map(s => s.domain), host);
  if (!limited) {
    await resetTabTimerIfHostChanged(tabId, host);
    return { mode: "none" };
  }

  const limitedSite = limitedSites.find(s => matchesHost([s.domain], host));
  const limitMs = limitedSite ? limitedSite.limit : 30000;
  
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
  const now = Date.now();
  
  if (cachedSettings && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedSettings;
  }

  try {
    const authResult = await chrome.storage.local.get(AUTH_KEY);
    const token = authResult[AUTH_KEY];
    
    const headers = {
      'apikey': ANON_KEY,
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const [sitesRes, quotesRes, imagesRes] = await Promise.all([
      fetch(`${BASE_URL}/rest/v1/blocked_sites?is_active=eq.true`, { headers }),
      fetch(`${BASE_URL}/rest/v1/quotes?is_active=eq.true`, { headers }),
      fetch(`${BASE_URL}/rest/v1/images?is_active=eq.true`, { headers })
    ]);

    const sites = sitesRes.ok ? await sitesRes.json() : [];
    const quotes = quotesRes.ok ? await quotesRes.json() : [];
    const images = imagesRes.ok ? await imagesRes.json() : [];

    cachedSettings = {
      blockedSites: sites,
      limitedSites: sites.filter(s => s.block_type === 'limited'),
      quotes: quotes.length > 0 ? quotes.map(q => q.text) : DEFAULT_QUOTES,
      images: images.map(i => i.url)
    };
    
    cacheTimestamp = now;
    
    return cachedSettings;
  } catch (err) {
    console.error('Failed to fetch settings:', err);
    return {
      blockedSites: [],
      limitedSites: [],
      quotes: DEFAULT_QUOTES,
      images: []
    };
  }
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

function matchesHost(sites, host) {
  return sites.some((site) => {
    const normalized = site.toLowerCase().replace(/^\.+/, '').replace(/\/+$/, '');
    return host === normalized || host.endsWith(`.${normalized}`);
  });
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
