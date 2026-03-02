# CLAUDE.md

Architecture and implementation notes for the **Focus Guard** Chrome extension.

## 1) Scope

This repo currently contains one runtime project:

- `focus-guard-extension/` (Manifest V3 Chrome extension)

## 2) Runtime Components

### Service Worker (`background.js`)

Primary responsibilities:

- Initializes default settings on install.
- Handles `getPolicy` messages from the content script.
- Determines whether current host is:
  - `blocked`
  - `limited-active`
  - `limited-expired`
  - `none`
- Tracks per-tab, per-host timer state in session storage.
- Cleans tab state when tabs close.

### Content Script (`content.js`)

Primary responsibilities:

- Runs at `document_start` on all URLs.
- Requests policy from service worker for current URL.
- Enforces a full-page overlay immediately (blocked / expired) or after remaining time (limited-active).
- Uses shadow DOM isolation and repeat re-attachment to resist manual removal.
- Locks page scroll while overlay is active.

### Popup UI (`popup.html`, `popup.js`, `popup.css`)

Primary responsibilities:

- Fast editing for blocked/limited domains.
- Edit quote list and time limit.
- Add image URLs and upload local images.
- Persists settings to sync/local storage.

### Options UI (`options.html`, `options.js`, `options.css`)

Primary responsibilities:

- Larger settings surface for blocked/limited domains, quotes, and timer.
- Persists to sync storage.
- Mirrors core popup behavior for domain/quote/timer management.

## 3) Data Flow

1. User navigates to a page.
2. `content.js` sends `{ type: "getPolicy", url }`.
3. `background.js` normalizes host and loads settings.
4. Policy decision is returned to content script.
5. `content.js` either does nothing, schedules overlay, or enforces overlay immediately.

## 4) Storage Contracts

### `chrome.storage.sync` (cross-device profile sync)

- `blockedSites: string[]`
- `limitedSites: string[]`
- `quotes: string[]`
- `limitSeconds: number`

### `chrome.storage.local` (device-local)

- `imageUrls: string[]`
- `uploadedImages: string[]` (data URLs)

### `chrome.storage.session` (ephemeral state)

- `siteSessions: Record<string, number>`
  - key format: `${tabId}|${host}`
  - value: first-visit timestamp for timer start
- `tabHosts: Record<string, string>`
  - last known host per tab ID

## 5) Domain Matching Rules

- User input is normalized to lowercase hostnames.
- Protocols are stripped when URL-like strings are entered.
- Matching is root + subdomain aware:
  - Exact match (`host === site`)
  - Subdomain match (`host.endsWith('.' + site)`)

## 6) Timer Semantics

- Timers are scoped to tab + host.
- On host change inside same tab, previous host timer entry is cleared.
- On tab close, tab/session mapping is cleaned.
- For limited sites:
  - Before expiry: return `limited-active` with `remainingMs`.
  - After expiry: return `limited-expired`.

## 7) Overlay Enforcement Design

The block overlay is intentionally hard to bypass in-page:

- Mounted at document root with max z-index.
- Rendered inside shadow DOM.
- Recreated periodically (`setInterval`) and on DOM mutation (`MutationObserver`).
- Page scroll disabled via forced `overflow: hidden`.

## 8) Manifest + Permissions

From `manifest.json`:

- MV3 extension with background service worker.
- Content script on `<all_urls>` at `document_start`.
- Permissions: `storage`, `tabs`.
- Host permissions: `<all_urls>`.
- Includes action popup and options page.

## 9) Defaults and Fallbacks

Defaults are defined in both background and UI layers for resilience.

- If quotes are empty, fallback quote is used (`"Back to work."` in policy helpers).
- If timer value is invalid, minimum safe value is applied.
- Image list combines URL images + uploaded image data URLs.

## 10) Known Constraints

- Uploaded images as data URLs can increase local storage usage quickly.
- Overlay resistance is in-page only; users with extension-level/devtools expertise may still bypass.
- Options and popup share similar logic but are implemented separately (not yet deduplicated).

## 11) Suggested Next Improvements

- Extract shared settings logic into a common module.
- Add automated tests for normalization, host matching, and timer transitions.
- Add import/export for settings.
- Add explicit allowlist/session pause behavior.
- Add optional analytics-free local usage metrics for self-tracking.
