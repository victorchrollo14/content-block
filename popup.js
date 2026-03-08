const {
  DEFAULTS,
  normalizeDomain,
  normalizeDomainList,
  normalizeImageList,
  normalizeImageUrl
} = window.KaizenCommon;

const state = {
  blockedSites: [],
  limitedSites: [],
  imageUrls: [],
  uploadedImages: []
};

const blockedInputEl = document.getElementById("blockedInput");
const limitedInputEl = document.getElementById("limitedInput");
const imageUrlInputEl = document.getElementById("imageUrlInput");
const blockedListEl = document.getElementById("blockedList");
const limitedListEl = document.getElementById("limitedList");
const imageUrlListEl = document.getElementById("imageUrlList");
const uploadedGridEl = document.getElementById("uploadedGrid");
const limitSecondsEl = document.getElementById("limitSeconds");
const imageUploadEl = document.getElementById("imageUpload");
const addBlockedBtn = document.getElementById("addBlockedBtn");
const addLimitedBtn = document.getElementById("addLimitedBtn");
const addImageUrlBtn = document.getElementById("addImageUrlBtn");
const saveBtn = document.getElementById("saveBtn");
const statusEl = document.getElementById("status");

void restore();

addBlockedBtn.addEventListener("click", () => addDomain("blocked"));
addLimitedBtn.addEventListener("click", () => addDomain("limited"));
addImageUrlBtn.addEventListener("click", () => addImageUrl());
saveBtn.addEventListener("click", () => void save());
imageUploadEl.addEventListener("change", () => void addUploadedImages());

blockedInputEl.addEventListener("keydown", (event) => onEnter(event, () => addDomain("blocked")));
limitedInputEl.addEventListener("keydown", (event) => onEnter(event, () => addDomain("limited")));
imageUrlInputEl.addEventListener("keydown", (event) => onEnter(event, () => addImageUrl()));

async function restore() {
  const [syncData, localData] = await Promise.all([
    chrome.storage.sync.get(Object.keys(DEFAULTS)),
    chrome.storage.local.get(["imageUrls", "uploadedImages"])
  ]);
  const settings = { ...DEFAULTS, ...syncData };

  state.blockedSites = normalizeDomainList(settings.blockedSites);
  state.limitedSites = normalizeDomainList(settings.limitedSites);
  state.imageUrls = normalizeImageList(localData.imageUrls || []);
  state.uploadedImages = normalizeImageList(localData.uploadedImages || []);

  limitSecondsEl.value = String(Math.max(1, Number(settings.limitSeconds) || DEFAULTS.limitSeconds));

  render();
}

function onEnter(event, fn) {
  if (event.key !== "Enter") {
    return;
  }

  event.preventDefault();
  fn();
}

function addDomain(mode) {
  const input = mode === "blocked" ? blockedInputEl : limitedInputEl;
  const value = normalizeDomain(input.value);
  if (!value) {
    return;
  }

  const target = getDomainList(mode);
  if (!target.includes(value)) {
    target.push(value);
    target.sort();
  }

  input.value = "";
  render();
}

function removeDomain(mode, domain) {
  const target = getDomainList(mode);
  const index = target.indexOf(domain);
  if (index >= 0) {
    target.splice(index, 1);
  }

  render();
}

function getDomainList(mode) {
  return mode === "blocked" ? state.blockedSites : state.limitedSites;
}

function addImageUrl() {
  const value = normalizeImageUrl(imageUrlInputEl.value);
  if (!value) {
    return;
  }

  if (!state.imageUrls.includes(value)) {
    state.imageUrls.push(value);
  }

  imageUrlInputEl.value = "";
  render();
}

function removeImageUrl(url) {
  const index = state.imageUrls.indexOf(url);
  if (index >= 0) {
    state.imageUrls.splice(index, 1);
  }

  render();
}

async function addUploadedImages() {
  const files = Array.from(imageUploadEl.files || []);
  if (!files.length) {
    return;
  }

  const dataUrls = await Promise.all(files.map(readFileAsDataUrl));
  for (const dataUrl of dataUrls) {
    if (dataUrl && !state.uploadedImages.includes(dataUrl)) {
      state.uploadedImages.push(dataUrl);
    }
  }

  imageUploadEl.value = "";
  render();
}

function removeUploadedImage(index) {
  state.uploadedImages.splice(index, 1);
  render();
}

function render() {
  renderDomainList(blockedListEl, state.blockedSites, "blocked");
  renderDomainList(limitedListEl, state.limitedSites, "limited");
  renderImageUrlList();
  renderUploadedGrid();
}

function renderDomainList(root, items, mode) {
  root.innerHTML = "";

  if (!items.length) {
    appendEmptyItem(root, "No sites added.");
    return;
  }

  for (const itemValue of items) {
    const item = document.createElement("li");
    item.className = "item";

    const text = document.createElement("span");
    text.textContent = itemValue;

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove";
    removeBtn.type = "button";
    removeBtn.textContent = "x";
    removeBtn.addEventListener("click", () => removeDomain(mode, itemValue));

    item.append(text, removeBtn);
    root.appendChild(item);
  }
}

function renderImageUrlList() {
  imageUrlListEl.innerHTML = "";

  if (!state.imageUrls.length) {
    appendEmptyItem(imageUrlListEl, "No image URLs added.");
    return;
  }

  for (const imageUrl of state.imageUrls) {
    const item = document.createElement("li");
    item.className = "item";

    const text = document.createElement("span");
    text.textContent = imageUrl;

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove";
    removeBtn.type = "button";
    removeBtn.textContent = "x";
    removeBtn.addEventListener("click", () => removeImageUrl(imageUrl));

    item.append(text, removeBtn);
    imageUrlListEl.appendChild(item);
  }
}

function renderUploadedGrid() {
  uploadedGridEl.innerHTML = "";

  for (let i = 0; i < state.uploadedImages.length; i += 1) {
    const wrapper = document.createElement("div");
    wrapper.className = "uploaded";

    const image = document.createElement("img");
    image.src = state.uploadedImages[i];
    image.alt = "Uploaded motivation";

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "x";
    removeBtn.addEventListener("click", () => removeUploadedImage(i));

    wrapper.append(image, removeBtn);
    uploadedGridEl.appendChild(wrapper);
  }
}

function appendEmptyItem(root, text) {
  const item = document.createElement("li");
  item.className = "item";
  item.textContent = text;
  root.appendChild(item);
}

async function save() {
  const limitSeconds = Math.max(1, Number(limitSecondsEl.value) || DEFAULTS.limitSeconds);

  await Promise.all([
    chrome.storage.sync.set({
      blockedSites: state.blockedSites,
      limitedSites: state.limitedSites,
      limitSeconds
    }),
    chrome.storage.local.set({
      imageUrls: state.imageUrls,
      uploadedImages: state.uploadedImages
    })
  ]);

  statusEl.textContent = `Saved ${new Date().toLocaleTimeString()}`;
  window.setTimeout(() => {
    statusEl.textContent = "";
  }, 1600);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}
