# Chrome Web Store (internal)

Packaging, listing, and reviewer notes for **Softr Studio App Organizer**. Not needed for GitHub beta installs — see **README.md** for users.

---

## Package the extension

From the repository root:

```bash
(cd extension && zip -r ../softr-studio-organizer.zip . -x "*.DS_Store")
```

Upload **`softr-studio-organizer.zip`** in the [Developer Dashboard](https://chrome.google.com/webstore/devconsole). The zip must contain **`manifest.json` at the root** of the archive (not nested inside another folder).

### Icons

Default listing icons are solid-color PNGs:

```bash
python3 scripts/generate_icons.py
```

Output: `extension/icons/icon{16,48,128}.png`. Replace with branded artwork if you want (same filenames, or update `manifest.json`).

---

## Listing checklist

| Item | Notes |
|------|--------|
| **Privacy policy URL** | Host [`PRIVACY.md`](PRIVACY.md) (GitHub Pages, your site, etc.) and paste the public URL in the listing. |
| **Single purpose** | Organize and navigate Softr Studio app lists only. |
| **Permission justifications** | Use the **Justification** sections below in the dashboard. |
| **Screenshots** | At least **1** (1280×800 or 640×400). Show `studio.softr.io` with toolbar, pins, and filter. |
| **Promo images** | Optional: small tile (440×280), marquee (1400×560), etc. — [Listing requirements](https://developer.chrome.com/docs/webstore/program-policies/requirements/). |
| **Support email / site** | Contact field for users reporting issues. |

### Permissions reference (reviewers & listing)

| Permission | Why |
|------------|-----|
| **storage** | Saves sort, status, filter text, and pinned app IDs in `chrome.storage.sync` (no extension backend). |
| **Host: `https://studio.softr.io/*`** | Injects the content script and styles only on Softr Studio. |
| **Host: `https://studio-api.softr.io/*`** | Opens pinned apps the same way Studio does: fetch application JSON (with the user’s login cookies) to resolve the home page URL. |
| **Background service worker** | Keyboard command → message to the active Studio tab to focus the filter input. |

The extension does **not** send app lists or pins to the developer’s servers. The toolbar includes a **“Powered by BRYSK”** link to [brysk.so](https://www.brysk.so/) (`rel="noopener"`).

---

## Short description (≤132 characters)

Should match `manifest.json` `description`. If you edit one, update the other.

```
Sort, filter, and pin apps on Softr Studio (studio.softr.io). Pinned order syncs per workspace; keyboard shortcut for search.
```

---

## Detailed description (listing “Description” field)

```
Softr Studio App Organizer improves the app list on https://studio.softr.io/:

• Sort by name or publish status
• Filter by published / draft and by name
• Pin favorite apps to a strip at the top (per Softr workspace)
• Optional empty state when nothing is pinned
• Keyboard shortcut (default Ctrl+K / ⌘K) to focus the name filter — change it under chrome://extensions/shortcuts

Pins and toolbar settings are saved with Chrome sync (chrome.storage.sync) when you use Chrome profile sync. Opening a pinned app uses Softr’s own API with your existing login — the extension does not send your data to the developer’s servers.

Includes a “Powered by BRYSK” link to https://www.brysk.so/ in the toolbar.

Not affiliated with Softr.
```

---

## Justification: `storage` permission

```
Stores sort order, publish-status filter, filter text, and pinned application IDs in chrome.storage.sync so the UI state persists and syncs with the user’s Chrome profile when sync is enabled. No data is sent to the extension developer’s servers.
```

---

## Justification: host permission `https://studio-api.softr.io/*`

```
When the user clicks Open on a pinned app, the extension requests GET https://studio-api.softr.io/v1/applications/{id} using the user’s existing Softr Studio session cookies (the same pattern the Studio web app uses) to read home_page_id and navigate to the editor. Requests go only to Softr’s API, not to the extension developer.
```

---

## Justification: `https://studio.softr.io/*` (content scripts)

```
Injects the organizer UI (toolbar, pinned strip, styles) only on Softr Studio. Does not run on other sites.
```

---

## Privacy policy

Host [PRIVACY.md](PRIVACY.md) at a **public HTTPS URL** (e.g. GitHub raw, GitHub Pages). Paste that URL into the Privacy practices / Privacy policy field in the dashboard.

---

## Category

Suggested: **Productivity** or **Developer Tools**.

---

## Single purpose

```
Helps users sort, filter, pin, and quickly open Softr Studio applications from the studio.softr.io app list.
```
