# Chrome Web Store — copy-paste snippets

Use these in the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) when submitting **Softr Studio App Organizer**.

## Short description (≤132 characters)

Matches `manifest.json` `description`. If you edit here, update the manifest to match.

```
Sort, filter, and pin apps on Softr Studio (studio.softr.io). Pinned order syncs per workspace; keyboard shortcut for search.
```

## Detailed description (listing “Description” field)

You can paste the **Features** and **Permissions** sections from [README.md](README.md), or this shorter version:

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

## Justification: `storage` permission

```
Stores sort order, publish-status filter, filter text, and pinned application IDs in chrome.storage.sync so the UI state persists and syncs with the user’s Chrome profile when sync is enabled. No data is sent to the extension developer’s servers.
```

## Justification: host permission `https://studio-api.softr.io/*`

```
When the user clicks Open on a pinned app, the extension requests GET https://studio-api.softr.io/v1/applications/{id} using the user’s existing Softr Studio session cookies (the same pattern the Studio web app uses) to read home_page_id and navigate to the editor. Requests go only to Softr’s API, not to the extension developer.
```

## Justification: `https://studio.softr.io/*` (content scripts)

```
Injects the organizer UI (toolbar, pinned strip, styles) only on Softr Studio. Does not run on other sites.
```

## Privacy policy

Host [PRIVACY.md](PRIVACY.md) at a **public HTTPS URL** (for example: GitHub → your repo → `PRIVACY.md` → Raw, or GitHub Pages). Paste that URL into the Privacy practices / Privacy policy field in the dashboard.

## Category

Suggested: **Productivity** or **Developer Tools**.

## Single purpose

```
Helps users sort, filter, pin, and quickly open Softr Studio applications from the studio.softr.io app list.
```
