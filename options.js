const {
  DEFAULTS,
  normalizeDomain,
  normalizeDomainList
} = window.KaizenCommon;

const state = {
  blockedSites: [],
  limitedSites: []
};


const blockedInputEl = document.getElementById("blockedInput");
const limitedInputEl = document.getElementById("limitedInput");
const blockedListEl = document.getElementById("blockedList");
const limitedListEl = document.getElementById("limitedList");
const limitSecondsEl = document.getElementById("limitSeconds");
const addBlockedBtn = document.getElementById("addBlockedBtn");
const addLimitedBtn = document.getElementById("addLimitedBtn");
const saveBtn = document.getElementById("saveBtn");
const statusEl = document.getElementById("status");

void restore();

addBlockedBtn.addEventListener("click", () => addSite("blocked"));
addLimitedBtn.addEventListener("click", () => addSite("limited"));
saveBtn.addEventListener("click", () => void save());

blockedInputEl.addEventListener("keydown", (event) => onEnter(event, () => addSite("blocked")));
limitedInputEl.addEventListener("keydown", (event) => onEnter(event, () => addSite("limited")));

async function restore() {
  const data = await chrome.storage.sync.get(Object.keys(DEFAULTS));
  const settings = { ...DEFAULTS, ...data };

  state.blockedSites = normalizeDomainList(settings.blockedSites);
  state.limitedSites = normalizeDomainList(settings.limitedSites);
  limitSecondsEl.value = String(Math.max(1, Number(settings.limitSeconds) || DEFAULTS.limitSeconds));

  renderLists();
}

function onEnter(event, fn) {
  if (event.key !== "Enter") {
    return;
  }

  event.preventDefault();
  fn();
}

function addSite(mode) {
  const input = mode === "blocked" ? blockedInputEl : limitedInputEl;
  const normalized = normalizeDomain(input.value);
  if (!normalized) {
    return;
  }

  const target = getTargetList(mode);
  if (!target.includes(normalized)) {
    target.push(normalized);
    target.sort();
  }

  input.value = "";
  renderLists();
}

function removeSite(mode, site) {
  const target = getTargetList(mode);
  const index = target.indexOf(site);
  if (index >= 0) {
    target.splice(index, 1);
  }

  renderLists();
}

function getTargetList(mode) {
  return mode === "blocked" ? state.blockedSites : state.limitedSites;
}

function renderLists() {
  renderSiteList(blockedListEl, state.blockedSites, "blocked");
  renderSiteList(limitedListEl, state.limitedSites, "limited");
}

function renderSiteList(root, sites, mode) {
  root.innerHTML = "";

  if (!sites.length) {
    const empty = document.createElement("li");
    empty.className = "site-item";
    empty.textContent = "No sites added.";
    root.appendChild(empty);
    return;
  }

  for (const site of sites) {
    const item = document.createElement("li");
    item.className = "site-item";

    const domain = document.createElement("span");
    domain.className = "domain";
    domain.textContent = site;

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.type = "button";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => removeSite(mode, site));

    item.append(domain, removeBtn);
    root.appendChild(item);
  }
}

async function save() {
  const limitSeconds = Math.max(1, Number(limitSecondsEl.value) || DEFAULTS.limitSeconds);

  await chrome.storage.sync.set({
    blockedSites: state.blockedSites,
    limitedSites: state.limitedSites,
    limitSeconds
  });

  statusEl.textContent = `Saved at ${new Date().toLocaleTimeString()}`;
  window.setTimeout(() => {
    statusEl.textContent = "";
  }, 1600);
}
