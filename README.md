# BLOCK_CONTENT

Repository for the **Kaizen** Chrome extension, located in `focus-guard-extension/`.

## Project Layout

- `focus-guard-extension/manifest.json` - Extension manifest (MV3), permissions, entry points.
- `focus-guard-extension/background.js` - Service worker; computes block policy and tracks per-tab timers.
- `focus-guard-extension/content.js` - Content script; requests policy and enforces fullscreen blocking overlay.
- `focus-guard-extension/popup.html|css|js` - Popup UI for fast configuration.
- `focus-guard-extension/options.html|css|js` - Options page for broader settings management.
- `focus-guard-extension/README.md` - Existing extension-specific readme.

## What Kaizen Does

- Fully blocks configured domains immediately.
- Allows configured domains for a limited time, then blocks them.
- Shows a motivational quote (and optional image) on block screen.
- Lets users configure blocked/limited domains, limit seconds, quotes, and images.

## Quick Usage

1. Click the Kaizen extension icon.
2. Add domains to:
   - **Fully Blocked**
   - **Time-Limited**
3. Set `Limit (seconds)`.
4. Add quotes and optional images.
5. Click **Save**.

## Storage Model (High Level)

- `chrome.storage.sync`:
  - `blockedSites`
  - `limitedSites`
  - `quotes`
  - `limitSeconds`
- `chrome.storage.local`:
  - `imageUrls`
  - `uploadedImages` (Data URLs)
- `chrome.storage.session`:
  - `siteSessions` (timer start per `tabId|host`)
  - `tabHosts` (last host per tab)

For deeper architecture details, see `CLAUDE.md`.
