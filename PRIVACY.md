# Privacy Policy — Softr Studio App Organizer

**Last updated:** March 2026  

This policy describes the Chrome extension **Softr Studio App Organizer** (“Extension”).  

**Developer:** BRYSK (see the “Powered by BRYSK” link in the Extension toolbar on [studio.softr.io](https://studio.softr.io/) for the current website).  

**Contact:** Use the support channel you publish with your Chrome Web Store listing (email or website).

---

## What the Extension does

The Extension runs **only** on **https://studio.softr.io/**. It adds a toolbar (sort, filter, reset), a pinned-apps section, and pin controls on Softr’s app list. It may request your Softr Studio API (**https://studio-api.softr.io/**) **from your browser** using **your existing Softr login** (cookies), to open a pinned app in the editor the same way the Studio web app does.

---

## Data the Extension collects

The Extension **does not** operate its own backend and **does not** send your Softr data to BRYSK or third-party analytics chosen by this Extension.

### Stored on your device (Chrome)

- **chrome.storage.sync** (and locally where Chrome applies sync rules): sort preference, publish-status filter, filter text, and **lists of pinned application IDs**, scoped per Softr **workspace** where possible.  
- This data is managed by Google Chrome and may sync with your Google account if you have Chrome Sync enabled.

### Read in the page (not uploaded by the Extension)

- **Document content** on Softr Studio (DOM) to locate app cards and render the UI.  
- **Cookies / `document.cookie`** visible to **studio.softr.io** (for example, Mixpanel-related cookies that contain Softr’s current **workspace id**) so pins can be kept **per workspace**. The Extension does not transmit those cookie values to BRYSK.

### Network

- **HTTPS requests to https://studio-api.softr.io/** initiated **by your browser** while you are logged into Softr, to load application metadata when you use **Open** on a pinned app. Those requests go to **Softr**, not to BRYSK.

### External link

- The toolbar may show **“Powered by BRYSK”** linking to **https://www.brysk.so/**. Opening that link is voluntary. The link uses `rel="noopener"` so the new tab does not get script access to the Studio tab.

---

## Children’s privacy

The Extension is not directed at children under 13.

---

## Changes

We may update this policy when the Extension’s behavior changes. The **Last updated** date at the top will change accordingly.

---

## Your choices

- You can **remove** the Extension at any time in `chrome://extensions`.  
- You can **disable Chrome Sync** or manage extension data in Chrome settings if you do not want preferences synced.

---

## Softr

**Softr** is a product of Softr. This Extension is **independent** and not endorsed by Softr. Softr’s own privacy terms apply to your use of **studio.softr.io** and **studio-api.softr.io**.
