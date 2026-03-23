# Softr Studio App Organizer

Chrome extension that improves the **Softr Studio** app dashboard ([studio.softr.io](https://studio.softr.io/)): sort, filter, pin-to-top (per workspace), and a quick keyboard shortcut to focus the name filter.

Built for teams who juggle many Softr apps and want a faster, more organized list without leaving Studio.

## Features

- **Sort** — Name (A–Z / Z–A), published vs draft first  
- **Status filter** — All, published only, or not published  
- **Live name filter** — Search box with optional **Ctrl+K** / **⌘K** (customizable under `chrome://extensions/shortcuts`)  
- **Pinned apps** — Pin from each card; pinned strip at the top with open + unpin; empty state when none pinned  
- **Per-workspace pins** — Pins are stored separately per Softr workspace (uses Studio’s Mixpanel cookie `workspace_id` when the URL does not include a workspace)  
- **Sync** — Toolbar choices and pins use `chrome.storage.sync` (Chrome profile sync where enabled)  
- **Open pinned app** — Uses the same Studio API pattern as the product (`GET /v1/applications/{id}` → `home_page_id` → open editor)

## For Softr developers (beta install)

No Git required. Chrome may show **Developer mode** — that’s normal for a beta loaded from a folder.

1. **Download** — On GitHub, green **Code** → **Download ZIP**.
2. **Unzip** the file. Open folders until you see **`extension`** (GitHub often wraps it in one extra folder, e.g. `…-main`).
3. In Chrome’s address bar, paste **`chrome://extensions`** and press Enter.  
   *(Microsoft Edge: **`edge://extensions`**)*
4. Turn **Developer mode** on (top right) → **Load unpacked** → choose the **`extension`** folder (the one that contains **`manifest.json`**).
5. **Reload** [studio.softr.io](https://studio.softr.io/) (refresh the tab). Your apps list should show the new toolbar.

**Updates:** `chrome://extensions` → **Reload** on this extension. If you downloaded a new ZIP, pick the new **`extension`** folder again with **Load unpacked** (or replace the old folder first).

**Tip:** **Ctrl+K** / **⌘K** focuses the search box (change under **Keyboard shortcuts** on the extensions page).

<details>
<summary>Install with Git (optional)</summary>

Clone the repo, then use step 4 on the **`extension`** folder inside the clone.

</details>

## Permissions

| Permission | Why |
|------------|-----|
| **storage** | Saves sort, status, filter text, and pinned app IDs in `chrome.storage.sync` (no extension backend). |
| **Host: `https://studio.softr.io/*`** | Injects the content script and styles only on Softr Studio. |
| **Host: `https://studio-api.softr.io/*`** | Opens pinned apps the same way Studio does: fetch application JSON (with your existing login cookies) to resolve the home page URL. |
| **Background service worker** | Handles the keyboard command and sends a message to the active Studio tab to focus the filter input. |

The extension does **not** send your app list or pins to the developer’s servers. A **“Powered by BRYSK”** link in the toolbar points to [brysk.so](https://www.brysk.so/) (opens in a new tab, `rel="noopener"`).

## Privacy

See **[PRIVACY.md](PRIVACY.md)** for what the extension reads and stores.

## Project layout

```
extension/
  manifest.json
  content.js      # UI + Softr DOM integration
  background.js   # Command → content script
  styles.css
  icons/          # Extension toolbar / listing icons (see scripts/generate_icons.py)
  brysk-icon.png  # Toolbar branding asset
scripts/
  generate_icons.py
PRIVACY.md
README.md
```

## License

Add a `LICENSE` file if you open-source the repo.

## Credits

Toolbar attribution: **BRYSK** — [brysk.so](https://www.brysk.so/)

Softr is a trademark of Softr; this project is not affiliated with or endorsed by Softr.
