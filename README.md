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

You do **not** need Git or coding tools. You are only downloading a zip file and telling Chrome where it lives.

Chrome may show words like **Developer mode** or **Load unpacked**. That only means “you are installing an extension from a folder instead of the Chrome Web Store.” That is expected for this beta.

### Step 1 — Download the zip from GitHub

1. Go to the **main page** of this project on GitHub (the page that shows the list of files and folders, and this README).
2. Look near the top right of the file list for a **green button** labeled **Code**.
3. Click **Code**. A small menu opens.
4. Click **Download ZIP**. Your browser saves a zip file (often in your **Downloads** folder).

### Step 2 — Unzip and find the `extension` folder

1. Open the zip file you downloaded. On **Mac**, double-click it. On **Windows**, right-click it and choose **Extract all…**, then confirm.
2. You should see folders and files. Look for one named **`extension`** (all lowercase).  
   - If you **don’t** see **`extension`** yet, open the **only** folder you see, then look again for **`extension`** inside it.
3. Open **`extension`** once and check: you should see files including **`manifest.json`**. If you see that file, you have the correct folder. **Leave this window open** or remember this path — you will pick this folder in Step 4.

### Step 3 — Open Chrome’s Extensions page

1. Click Chrome’s address bar at the top (where you type website addresses).
2. Type or paste exactly: **`chrome://extensions`**
3. Press **Enter**.  
   - **Microsoft Edge:** use **`edge://extensions`** the same way.

You should see a page titled **Extensions** and a list (maybe empty) of installed extensions.

### Step 4 — Turn on Developer mode and load the extension

1. On that Extensions page, find the switch **Developer mode** (Chrome: usually **top right**). Turn it **on**.
2. New buttons appear. Click **Load unpacked**.
3. A file chooser opens. Navigate to the **`extension`** folder from **Step 2** — the folder that **directly contains** `manifest.json`.
4. Click **Select** / **Open** (wording depends on your computer).

If Chrome shows an error, you probably selected the wrong folder. Go **up one level** or **into** the `extension` folder and try **Load unpacked** again.

### Step 5 — See it in Softr Studio

1. Open [studio.softr.io](https://studio.softr.io/) and go to your **apps** list (where all your Softr apps appear).
2. **Refresh the page** (reload the tab, or press **F5** / **Ctrl+R** / **⌘R**).  
3. You should see the new **toolbar** (sort, filter, pins) above your apps.

### When you get an updated zip later

1. Download and unzip the new zip the same way as Step 1–2.
2. Go back to **`chrome://extensions`** (Step 3).
3. Find **Softr Studio App Organizer** in the list and click **Reload** (circular arrow).  
   - If the update changed a lot, you may need **Remove** and then **Load unpacked** again on the **new** `extension` folder.

### Optional: keyboard shortcut for search

While you are on the Softr apps list, **Ctrl+K** (Windows) or **⌘K** (Mac) moves the cursor into the **Filter by name** box. To change that shortcut: Extensions page → **Keyboard shortcuts** (link at the bottom) → find this extension.

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
