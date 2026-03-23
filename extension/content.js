(() => {
  const STORAGE_KEY = "softrStudioAppOrganizer";
  const DEBOUNCE_MS = 280;

  /** Set `false` to silence `[Softr ext]` logs after debugging. */
  const SOFTR_EXT_DEBUG = false;

  function dbg(...args) {
    if (SOFTR_EXT_DEBUG) console.log("[Softr ext]", ...args);
  }

  /** @type {{ sort: string, status: string, filterText: string, pinned: string[] }} */
  const defaults = {
    sort: "name-asc",
    status: "all",
    filterText: "",
    pinned: [],
  };

  const STUDIO_UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const UNKNOWN_WORKSPACE_KEY = "__unknown__";

  /** @type {Record<string, string[]>} */
  let pinnedByWorkspace = {};
  /** Last workspace key we hydrated `state.pinned` for (null = not yet bound). */
  let lastWorkspaceKey = null;

  let state = { ...defaults, pinned: [] };

  function normalizeWorkspaceId(raw) {
    if (!raw || typeof raw !== "string") return null;
    const t = raw.trim().toLowerCase();
    return STUDIO_UUID_RE.test(t) ? t : null;
  }

  /** Rare fallback: query string or SPA history state (Studio app URLs do not carry workspace id). */
  function parseWorkspaceIdFromQueryOrHistory() {
    try {
      const qs = new URLSearchParams(location.search);
      for (const q of ["workspaceId", "workspace_id", "workspace"]) {
        const n = normalizeWorkspaceId(qs.get(q) || "");
        if (n) return n;
      }
    } catch {
      /* ignore */
    }
    try {
      const st = history.state;
      if (st && typeof st === "object") {
        for (const k of ["workspaceId", "workspace_id", "workspaceUUID"]) {
          const n = normalizeWorkspaceId(st[k]);
          if (n) return n;
        }
      }
    } catch {
      /* ignore */
    }
    return null;
  }

  /**
   * Primary signal for *current* workspace: Mixpanel super-property cookie `mp_<hex>_mixpanel`
   * JSON includes `workspace_id` (Softr does not put workspace in normal Studio URLs; `/workspaces`
   * API lists workspaces but not which is active).
   */
  function parseWorkspaceIdFromMixpanelCookie() {
    try {
      const chunks = document.cookie.split(";").map((s) => s.trim());
      for (const chunk of chunks) {
        const eq = chunk.indexOf("=");
        if (eq === -1) continue;
        const name = chunk.slice(0, eq).trim();
        if (!/^mp_[0-9a-f]+_mixpanel$/i.test(name)) continue;
        let raw = chunk.slice(eq + 1);
        try {
          raw = decodeURIComponent(raw);
        } catch {
          /* use as-is */
        }
        const j = JSON.parse(raw);
        const id = j?.workspace_id ?? j?.workspaceId;
        const n = normalizeWorkspaceId(typeof id === "string" ? id : "");
        if (n) return n;
      }
    } catch {
      /* ignore */
    }
    return null;
  }

  function getWorkspaceKey() {
    return (
      parseWorkspaceIdFromMixpanelCookie() ||
      parseWorkspaceIdFromQueryOrHistory() ||
      UNKNOWN_WORKSPACE_KEY
    );
  }

  /** When the URL/workspace changes, persist previous pins and load the new workspace’s list. */
  function ensureWorkspaceContext() {
    const key = getWorkspaceKey();
    if (lastWorkspaceKey === key) return;
    if (lastWorkspaceKey != null) {
      pinnedByWorkspace[lastWorkspaceKey] = state.pinned.slice();
    }
    if (
      lastWorkspaceKey === UNKNOWN_WORKSPACE_KEY &&
      key !== UNKNOWN_WORKSPACE_KEY
    ) {
      const unk = pinnedByWorkspace[UNKNOWN_WORKSPACE_KEY];
      if (
        unk &&
        unk.length > 0 &&
        (!pinnedByWorkspace[key] || pinnedByWorkspace[key].length === 0)
      ) {
        pinnedByWorkspace[key] = unk.slice();
        delete pinnedByWorkspace[UNKNOWN_WORKSPACE_KEY];
      }
    }
    lastWorkspaceKey = key;
    state.pinned = Array.isArray(pinnedByWorkspace[key]) ? pinnedByWorkspace[key].slice() : [];
  }

  function hydratePinnedByWorkspaceFromStored(stored) {
    pinnedByWorkspace = {};
    if (!stored || typeof stored !== "object") return;

    if (stored.pinnedByWorkspace && typeof stored.pinnedByWorkspace === "object") {
      for (const [k, v] of Object.entries(stored.pinnedByWorkspace)) {
        if (Array.isArray(v)) pinnedByWorkspace[k] = v.map(String);
      }
    }

    const legacy = stored.pinned;
    if (Array.isArray(legacy) && legacy.length > 0) {
      const wk = getWorkspaceKey();
      const hasAny = Object.keys(pinnedByWorkspace).length > 0;
      if (!hasAny) {
        pinnedByWorkspace[wk] = legacy.map(String);
      } else if (!pinnedByWorkspace[wk] || pinnedByWorkspace[wk].length === 0) {
        pinnedByWorkspace[wk] = legacy.map(String);
      }
    }
  }
  let applyingDom = false;
  let debounceTimer = 0;
  /** @type {MutationObserver | null} */
  let listObserver = null;
  /** @type {MutationObserver | null} */
  let areaObserver = null;
  /** @type {Element | null} */
  let observedAppsBody = null;
  /** @type {Element | null} */
  let observedAreaEl = null;

  function loadState() {
    return new Promise((resolve) => {
      chrome.storage.sync.get([STORAGE_KEY], (raw) => {
        const stored = raw[STORAGE_KEY];
        lastWorkspaceKey = null;
        if (stored && typeof stored === "object") {
          const { pinned: _dropPinned, pinnedByWorkspace: _dropPb, ...meta } = stored;
          state = { ...defaults, ...meta, pinned: [] };
          hydratePinnedByWorkspaceFromStored(stored);
          ensureWorkspaceContext();
        } else {
          pinnedByWorkspace = {};
          state = { ...defaults, pinned: [] };
          ensureWorkspaceContext();
        }
        resolve();
      });
    });
  }

  function saveState() {
    const key = getWorkspaceKey();
    pinnedByWorkspace[key] = state.pinned.slice();
    chrome.storage.sync.set({
      [STORAGE_KEY]: {
        sort: state.sort,
        status: state.status,
        filterText: state.filterText,
        pinnedByWorkspace: { ...pinnedByWorkspace },
      },
    });
  }

  function getAppsBody() {
    return document.querySelector(".apps-area .apps-body");
  }

  function getAppItems(appsBody) {
    return Array.from(appsBody.querySelectorAll(":scope > sw-application-list-item"));
  }

  /** Native Softr app hosts (always under `.apps-body`; pinned ones are hidden, not moved). */
  function getAllAppCards() {
    const area = document.querySelector(".apps-area");
    if (!area) return [];
    return Array.from(area.querySelectorAll("sw-application-list-item"));
  }

  function findAppHost(appId) {
    if (!appId) return null;
    const safe = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(appId) : appId.replace(/["\\]/g, "");
    return document.querySelector(`sw-application-list-item[data-app-id="${safe}"]`);
  }

  function repatriateStrayHosts(appsBody, pinnedRow) {
    if (!appsBody || !pinnedRow) return;
    pinnedRow.querySelectorAll("sw-application-list-item").forEach((el) => appsBody.appendChild(el));
  }

  const SOFTR_API_BASE = "https://studio-api.softr.io/v1";

  /**
   * Same as Studio: GET /applications/{id} → `home_page_id` → open that page URL.
   * Runs fetch in the page JS realm so cookies/auth match the SPA if the content-script fetch fails.
   */
  function openPinnedAppViaPageFetch(appId) {
    const uid = `softrExt_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    let settled = false;

    const finish = (url) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("message", onMsg, false);
      if (typeof url === "string" && url.startsWith("https://studio.softr.io/applications/")) {
        window.location.assign(url);
        return;
      }
      openPinnedAppDomFallback(appId);
    };

    const onMsg = (ev) => {
      if (ev.source !== window || ev.data?.type !== "softrExtAppOpen" || ev.data.uid !== uid) return;
      finish(ev.data.url);
    };

    window.addEventListener("message", onMsg, false);
    window.setTimeout(() => finish(null), 12000);

    const s = document.createElement("script");
    s.textContent = `(function(a,u){
      fetch("https://studio-api.softr.io/v1/applications/"+encodeURIComponent(a),{
        credentials:"include",
        headers:{accept:"application/json"}
      }).then(function(r){return r.ok?r.json():Promise.reject();})
      .then(function(d){
        var p=d&&d.home_page_id;
        var url=p
          ?"https://studio.softr.io/applications/"+a+"/pages/"+p
          :"https://studio.softr.io/applications/"+a;
        window.postMessage({type:"softrExtAppOpen",uid:u,url:url},"*");
      }).catch(function(){
        window.postMessage({type:"softrExtAppOpen",uid:u},"*");
      });
    })(${JSON.stringify(appId)},${JSON.stringify(uid)});`;
    (document.documentElement || document.head).appendChild(s);
    s.remove();
  }

  async function openPinnedApp(appId) {
    if (!appId) return;

    try {
      const res = await fetch(`${SOFTR_API_BASE}/applications/${encodeURIComponent(appId)}`, {
        method: "GET",
        credentials: "include",
        headers: { accept: "application/json" },
      });

      if (res.ok) {
        const data = await res.json();
        const pageId = data?.home_page_id;
        if (pageId) {
          window.location.assign(
            `https://studio.softr.io/applications/${encodeURIComponent(appId)}/pages/${encodeURIComponent(pageId)}`
          );
          return;
        }
        window.location.assign(`https://studio.softr.io/applications/${encodeURIComponent(appId)}`);
        return;
      }
    } catch {
      /* try page realm */
    }

    openPinnedAppViaPageFetch(appId);
  }

  /** Last resort if API isn’t reachable from the extension context (auth/CORS). */
  function openPinnedAppDomFallback(appId) {
    const host = findAppHost(appId);
    if (!host) return;

    const target =
      host.querySelector('[data-testid="app-item"]') || host.querySelector(".app-item-bottom");
    if (!target) return;

    const base = { bubbles: true, cancelable: true, composed: true, view: window, clientX: 8, clientY: 8 };
    const fire = (Ctor, type, extra = {}) => {
      try {
        target.dispatchEvent(new Ctor(type, { ...base, ...extra }));
      } catch {
        /* ignore */
      }
    };

    try {
      fire(PointerEvent, "pointerdown", {
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
        buttons: 1,
        pressure: 0.5,
      });
      fire(PointerEvent, "pointerup", {
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
        buttons: 0,
        pressure: 0,
      });
    } catch {
      /* PointerEvent unsupported */
    }
    fire(MouseEvent, "mousedown", { buttons: 1, detail: 1 });
    fire(MouseEvent, "mouseup", { buttons: 0, detail: 1 });
    fire(MouseEvent, "click", { buttons: 0, detail: 1 });

    if (typeof target.click === "function") target.click();
  }

  function allCardsSignature() {
    return getAllAppCards()
      .map(getAppId)
      .filter(Boolean)
      .sort()
      .join(",");
  }

  function getAppId(item) {
    return item.getAttribute("data-app-id") || "";
  }

  function getTitle(item) {
    const el = item.querySelector(".app-name");
    if (!el) return "";
    const fromAria = el.getAttribute("aria-label");
    if (fromAria && fromAria.trim()) return fromAria.trim();
    return (el.textContent || "").trim();
  }

  function getPublishBucket(item) {
    const t = (item.querySelector(".app-state")?.textContent || "")
      .replace(/\s+/g, " ")
      .trim();
    if (/not\s*published/i.test(t)) return "draft";
    if (/published/i.test(t)) return "published";
    return "unknown";
  }

  function compareBySort(a, b) {
    const titleA = getTitle(a).toLowerCase();
    const titleB = getTitle(b).toLowerCase();
    switch (state.sort) {
      case "name-desc":
        return titleB.localeCompare(titleA);
      case "status-published-first": {
        const o = { published: 0, unknown: 1, draft: 2 };
        const d = o[getPublishBucket(a)] - o[getPublishBucket(b)];
        return d !== 0 ? d : titleA.localeCompare(titleB);
      }
      case "status-draft-first": {
        const o = { draft: 0, unknown: 1, published: 2 };
        const d = o[getPublishBucket(a)] - o[getPublishBucket(b)];
        return d !== 0 ? d : titleA.localeCompare(titleB);
      }
      case "name-asc":
      default:
        return titleA.localeCompare(titleB);
    }
  }

  function matchesStatus(item) {
    if (state.status === "all") return true;
    const b = getPublishBucket(item);
    if (state.status === "published") return b === "published";
    if (state.status === "draft") return b === "draft" || b === "unknown";
    return true;
  }

  function matchesFilterText(item) {
    const q = (state.filterText || "").trim().toLowerCase();
    if (!q) return true;
    return getTitle(item).toLowerCase().includes(q);
  }

  function ensureAllAppsHeading(appsBody) {
    let h = document.querySelector(".softr-ext-all-apps-heading");
    if (!h) {
      h = document.createElement("div");
      h.className = "softr-ext-all-apps-heading";
      h.textContent = "All Apps";
    }
    if (h.nextElementSibling !== appsBody) {
      appsBody.insertAdjacentElement("beforebegin", h);
    }
    return h;
  }

  /**
   * Lightweight pinned list (extension UI only). Native cards stay in `.apps-body` but hidden.
   */
  function ensurePinnedStrip() {
    const appsBody = getAppsBody();
    if (!appsBody) return null;

    const allHeading = ensureAllAppsHeading(appsBody);

    let section = document.querySelector(".softr-ext-pinned-section");
    if (!section) {
      section = document.createElement("div");
      section.className = "softr-ext-pinned-section";
      section.innerHTML =
        '<div class="softr-ext-pinned-heading">Pinned apps</div><div class="softr-ext-pinned-row"></div>';
      allHeading.insertAdjacentElement("beforebegin", section);
    }

    const bar = document.querySelector(".softr-ext-toolbar");
    if (bar && section.previousElementSibling !== bar) {
      bar.insertAdjacentElement("afterend", section);
    }
    if (section.nextElementSibling !== allHeading) {
      allHeading.insertAdjacentElement("beforebegin", section);
    }

    return section.querySelector(".softr-ext-pinned-row");
  }

  function clearCardLayoutStyles(el) {
    el.style.removeProperty("order");
    el.style.removeProperty("grid-row");
  }

  /** Toolbar must sit above pinned section (if any), “All apps” label, then `.apps-body`. */
  function toolbarPlacementOk(bar, appsBody) {
    if (!bar?.isConnected || !appsBody?.isConnected) return false;
    let n = bar.nextElementSibling;
    if (n === appsBody) return true;
    if (!n?.classList?.contains("softr-ext-pinned-section")) return false;
    n = n.nextElementSibling;
    if (n?.classList?.contains("softr-ext-all-apps-heading") && n.nextElementSibling === appsBody)
      return true;
    return n === appsBody;
  }

  function sameHostChildOrder(parent, desired) {
    const cur = Array.from(parent.querySelectorAll(":scope > sw-application-list-item"));
    if (cur.length !== desired.length) return false;
    return cur.every((el, i) => el === desired[i]);
  }

  function getStatusLine(item) {
    return (item.querySelector(".app-state")?.textContent || "").replace(/\s+/g, " ").trim();
  }

  function renderPinnedStrip(pinnedRow) {
    if (!pinnedRow) return;
    pinnedRow.replaceChildren();
    const section = pinnedRow.closest(".softr-ext-pinned-section");
    if (state.pinned.length === 0) {
      if (section) {
        section.classList.add("softr-ext-pinned-section--empty");
        section.hidden = false;
      }
      const empty = document.createElement("div");
      empty.className = "softr-ext-pinned-empty";
      empty.setAttribute("role", "status");
      empty.textContent = "No pinned apps";
      pinnedRow.appendChild(empty);
      return;
    }
    if (section) {
      section.classList.remove("softr-ext-pinned-section--empty");
      section.hidden = false;
    }

    for (const id of state.pinned) {
      const host = findAppHost(id);
      const title = host ? getTitle(host) : "App";
      const statusLine = host ? getStatusLine(host) : "";

      const card = document.createElement("div");
      card.className = "softr-ext-pinned-card";

      const openBtn = document.createElement("button");
      openBtn.type = "button";
      openBtn.className = "softr-ext-pinned-open";
      openBtn.dataset.softrAppId = id;
      openBtn.setAttribute("aria-label", `Open ${title}`);

      const titleEl = document.createElement("span");
      titleEl.className = "softr-ext-pinned-title";
      titleEl.textContent = title;

      const metaEl = document.createElement("span");
      metaEl.className = "softr-ext-pinned-meta";
      metaEl.textContent = statusLine;

      openBtn.appendChild(titleEl);
      openBtn.appendChild(metaEl);
      openBtn.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        ev.stopImmediatePropagation();
        openPinnedApp(id);
      }, true);
      openBtn.addEventListener("keydown", (ev) => {
        if (ev.key !== "Enter" && ev.key !== " ") return;
        ev.preventDefault();
        openPinnedApp(id);
      });

      const pinBtn = document.createElement("button");
      pinBtn.type = "button";
      pinBtn.className = "softr-ext-pin softr-ext-pinned-strip-pin";
      pinBtn.dataset.softrAppId = id;
      pinBtn.textContent = "✕";
      pinBtn.setAttribute("aria-pressed", "true");
      pinBtn.setAttribute("aria-label", "Unpin from top");
      pinBtn.title = "Unpin from top";
      pinBtn.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        ev.stopImmediatePropagation();
        togglePin(id);
      }, true);
      pinBtn.addEventListener("keydown", (ev) => {
        if (ev.key !== "Enter" && ev.key !== " ") return;
        ev.preventDefault();
        togglePin(id);
      });

      card.appendChild(openBtn);
      card.appendChild(pinBtn);
      pinnedRow.appendChild(card);
    }
  }

  /**
   * Hide pinned native hosts in `.apps-body`; sort/filter unpinned only; render clean pinned strip.
   */
  function layoutAppsArea(appsBody, pinnedRow) {
    if (!appsBody || !pinnedRow) return;

    const display = getComputedStyle(appsBody).display;
    const isGrid = display === "grid" || display === "inline-grid";

    const items = getAppItems(appsBody);
    const pinnedSet = new Set(state.pinned);

    for (const item of items) {
      const id = getAppId(item);
      if (pinnedSet.has(id)) {
        item.classList.add("softr-ext-pinned-source-hidden");
        item.removeAttribute("data-softr-filtered");
        clearCardLayoutStyles(item);
      } else {
        item.classList.remove("softr-ext-pinned-source-hidden");
      }
    }

    const unpinned = items.filter((i) => !pinnedSet.has(getAppId(i)));
    for (const item of unpinned) {
      const show = matchesStatus(item) && matchesFilterText(item);
      if (show) item.removeAttribute("data-softr-filtered");
      else item.setAttribute("data-softr-filtered", "1");
    }

    const unpinnedVisible = unpinned.filter((i) => !i.hasAttribute("data-softr-filtered"));
    unpinnedVisible.sort(compareBySort);
    const unpinnedHidden = unpinned.filter((i) => i.hasAttribute("data-softr-filtered"));

    const pinnedOrdered = state.pinned
      .map((pid) => items.find((it) => getAppId(it) === pid))
      .filter(Boolean);
    const desiredOrder = [...pinnedOrdered, ...unpinnedVisible, ...unpinnedHidden];

    if (!sameHostChildOrder(appsBody, desiredOrder)) {
      for (const el of desiredOrder) {
        appsBody.appendChild(el);
      }
    }

    let orderIdx = 0;
    for (const el of unpinnedVisible) {
      clearCardLayoutStyles(el);
      const o = isGrid ? String(orderIdx++) : "";
      if (isGrid && el.style.order !== o) el.style.order = o;
    }
    for (const el of unpinnedHidden) {
      clearCardLayoutStyles(el);
      if (isGrid && el.style.order !== "9999") el.style.order = "9999";
    }
    for (const el of pinnedOrdered) {
      clearCardLayoutStyles(el);
      if (el.style.order) el.style.removeProperty("order");
    }

    renderPinnedStrip(pinnedRow);
  }

  function ensurePoweredByBrand(bar) {
    const iconSrc = chrome.runtime.getURL("brysk-icon.png");
    const html = `<a href="https://www.brysk.so/" target="_blank" rel="noopener" class="softr-ext-powered-link" aria-label="Powered by BRYSK — visit brysk.so"><img class="softr-ext-powered-icon" src="${iconSrc}" alt="" width="22" height="22" decoding="async" /><span class="softr-ext-powered-text">Powered by BRYSK</span></a>`;
    let span = bar.querySelector(".softr-ext-powered");
    if (!span) {
      span = document.createElement("span");
      span.className = "softr-ext-powered";
      bar.appendChild(span);
    }
    span.innerHTML = html;
  }

  function ensureToolbar() {
    const appsBody = getAppsBody();
    if (!appsBody) return;

    let bar = document.querySelector(".softr-ext-toolbar");
    if (!bar) {
      bar = document.createElement("div");
      bar.className = "softr-ext-toolbar";
      bar.innerHTML = `
      <label>Sort
        <select class="softr-ext-sort" aria-label="Sort apps">
          <option value="name-asc">Name A–Z</option>
          <option value="name-desc">Name Z–A</option>
          <option value="status-published-first">Published first</option>
          <option value="status-draft-first">Not published first</option>
        </select>
      </label>
      <label>Status
        <select class="softr-ext-status" aria-label="Filter by publish status">
          <option value="all">All</option>
          <option value="published">Published only</option>
          <option value="draft">Not published</option>
        </select>
      </label>
      <label>Filter
        <input type="search" class="softr-ext-filter" placeholder="Filter by name…" aria-label="Filter apps by name" />
      </label>
      <button type="button" class="softr-ext-reset">Reset</button>
    `;
    }

    ensurePoweredByBrand(bar);

    if (!bar.dataset.softrBound) bindToolbar(bar);

    if (!toolbarPlacementOk(bar, appsBody)) {
      const section = document.querySelector(".softr-ext-pinned-section");
      const anchor =
        section?.isConnected && section.parentNode === appsBody.parentNode ? section : appsBody;
      anchor.parentNode?.insertBefore(bar, anchor);
    }

    syncToolbarInputs(bar);
  }

  function syncToolbarInputs(bar) {
    const sort = bar.querySelector(".softr-ext-sort");
    const status = bar.querySelector(".softr-ext-status");
    const filter = bar.querySelector(".softr-ext-filter");
    if (sort) sort.value = state.sort;
    if (status) status.value = state.status;
    if (filter) filter.value = state.filterText;
  }

  function bindToolbar(bar) {
    bar.dataset.softrBound = "1";

    bar.querySelector(".softr-ext-sort")?.addEventListener("change", (e) => {
      state.sort = e.target.value;
      saveState();
      applyOrganizer();
    });
    bar.querySelector(".softr-ext-status")?.addEventListener("change", (e) => {
      state.status = e.target.value;
      saveState();
      applyOrganizer();
    });
    bar.querySelector(".softr-ext-filter")?.addEventListener("input", (e) => {
      state.filterText = e.target.value;
      saveState();
      applyOrganizer();
    });
    bar.querySelector(".softr-ext-reset")?.addEventListener("click", () => {
      const key = getWorkspaceKey();
      state = { ...defaults, pinned: [] };
      pinnedByWorkspace[key] = [];
      saveState();
      syncToolbarInputs(bar);
      applyOrganizer();
    });
  }

  function togglePin(appId) {
    const before = state.pinned.slice();
    const idx = state.pinned.indexOf(appId);
    if (idx === -1) state.pinned.push(appId);
    else state.pinned.splice(idx, 1);
    dbg("togglePin", { appId, before, after: state.pinned.slice() });
    saveState();
    applyOrganizer();
  }

  function pathSummary(ev) {
    if (typeof ev.composedPath !== "function") return "(no composedPath)";
    return ev
      .composedPath()
      .filter((n) => n instanceof Element || n instanceof Document)
      .slice(0, 12)
      .map((n) => {
        if (n instanceof Document) return "#document";
        const el = /** @type {Element} */ (n);
        const id = el.id ? `#${el.id}` : "";
        const cls = el.className && typeof el.className === "string" ? `.${el.className.split(/\s+/).slice(0, 3).join(".")}` : "";
        return `${el.tagName.toLowerCase()}${id}${cls}`;
      });
  }

  function stackFromPoint(x, y) {
    try {
      return document.elementsFromPoint(x, y).slice(0, 10).map((el) => {
        const cls =
          el.className && typeof el.className === "string"
            ? el.className.split(/\s+/).slice(0, 4).join(".")
            : "";
        return `${el.tagName.toLowerCase()}${cls ? "." + cls : ""}`;
      });
    } catch (e) {
      return [`(elementsFromPoint error: ${e})`];
    }
  }

  function findPinFromClickEvent(ev) {
    if (typeof ev.composedPath === "function") {
      for (const n of ev.composedPath()) {
        if (n instanceof Element && n.classList.contains("softr-ext-pin")) {
          return n;
        }
      }
    }
    let t = ev.target;
    if (t && t.nodeType === Node.TEXT_NODE) t = t.parentElement;
    if (t instanceof Element) {
      const pin = t.closest(".softr-ext-pin");
      if (pin) return pin;
    }
    const x = ev.clientX;
    const y = ev.clientY;
    if (typeof x === "number" && typeof y === "number") {
      try {
        for (const el of document.elementsFromPoint(x, y)) {
          if (el.classList?.contains("softr-ext-pin")) return el;
        }
      } catch {
        /* ignore */
      }
    }
    return null;
  }

  let globalPinClickBound = false;

  /**
   * Capture on `window` + `document` so we run before Angular/CDK handlers on `sw-application-list-item` / `.app-item`.
   */
  function ensureGlobalPinClick() {
    if (globalPinClickBound) return;
    globalPinClickBound = true;

    dbg(
      "global pin click listener attached (capture on window). Logs only when SOFTR_EXT_DEBUG is true. In DevTools, pick the top-level page context; content-script logs appear there."
    );

    const onClickCapture = (ev) => {
      let inApps = false;
      try {
        let t = ev.target;
        if (t && t.nodeType === Node.TEXT_NODE) t = t.parentElement;
        inApps = t instanceof Element && Boolean(t.closest(".apps-area"));
      } catch {
        inApps = false;
      }

      if (SOFTR_EXT_DEBUG && inApps) {
        dbg("click (in .apps-area)", {
          button: ev.button,
          target: ev.target,
          defaultPrevented: ev.defaultPrevented,
          path: pathSummary(ev),
          stackAtPoint: stackFromPoint(ev.clientX, ev.clientY),
        });
      }

      if (typeof ev.button === "number" && ev.button !== 0) return;

      const pin = findPinFromClickEvent(ev);
      if (pin && pin.isConnected) {
        if (!pin.closest(".apps-area")) {
          if (SOFTR_EXT_DEBUG) dbg("pin found but outside .apps-area — ignored");
          return;
        }

        const appId =
          pin.getAttribute("data-softr-app-id") ||
          pin.closest("sw-application-list-item")?.getAttribute("data-app-id");
        if (!appId) {
          if (SOFTR_EXT_DEBUG) dbg("pin element has no app id", pin);
          return;
        }

        dbg("handling pin click", { appId, pinConnected: pin.isConnected });
        ev.stopPropagation();
        ev.stopImmediatePropagation();
        togglePin(appId);
        return;
      }

      if (SOFTR_EXT_DEBUG && inApps) {
        dbg("no .softr-ext-pin resolved for this click (see path / stackAtPoint above)");
      }
      /* Strip “open” uses direct listeners on `.softr-ext-pinned-open` (capture). */
    };

    /* Only `window` — registering `document` too would run this twice and toggle pin back (noop). */
    window.addEventListener("click", onClickCapture, true);
  }

  /**
   * Pin in `.app-item-actions-wrapper` (Angular keeps this subtree). Host-level siblings are removed by Angular.
   * Pointer handling: `ensureGlobalPinClick` (capture `click` on window/document).
   */
  let lastPinEnsureSig = "";

  function ensurePinButtons(items) {
    let ensured = 0;
    let skippedNoActions = 0;
    for (const item of items) {
      const appId = getAppId(item);
      if (!appId) continue;

      /* Pinned: unpin only from the clean strip (avoids duplicate pins on hidden grid cards). */
      if (state.pinned.includes(appId)) continue;

      const actions = item.querySelector(".app-item-actions-wrapper");
      if (!actions) {
        skippedNoActions += 1;
        continue;
      }

      const orphanHostPin = item.querySelector(":scope > .softr-ext-pin");
      if (orphanHostPin) orphanHostPin.remove();
      item.classList.remove("softr-ext-card-host");

      let btn = item.querySelector(":scope .softr-ext-pin");
      if (!btn) {
        btn = document.createElement("button");
        btn.type = "button";
        btn.className = "softr-ext-pin";
        btn.textContent = "📌";
        btn.tabIndex = 0;
        actions.insertBefore(btn, actions.firstChild);
      } else if (btn.parentElement !== actions) {
        actions.insertBefore(btn, actions.firstChild);
      }

      btn.dataset.softrAppId = appId;

      if (!btn.dataset.softrKeydownBound) {
        btn.dataset.softrKeydownBound = "1";
        btn.addEventListener("keydown", (ev) => {
          if (ev.key !== "Enter" && ev.key !== " ") return;
          const id = btn.dataset.softrAppId;
          if (!id) return;
          ev.preventDefault();
          ev.stopPropagation();
          togglePin(id);
        });
      }

      btn.setAttribute("aria-label", "Pin app to top");
      const pinned = state.pinned.includes(appId);
      btn.setAttribute("aria-pressed", pinned ? "true" : "false");
      btn.title = pinned ? "Unpin from top" : "Pin to top (saved in extension)";
      ensured += 1;
    }
    if (SOFTR_EXT_DEBUG && items.length > 0) {
      const sig = `${items.length}|${ensured}|${skippedNoActions}`;
      if (sig !== lastPinEnsureSig) {
        lastPinEnsureSig = sig;
        dbg("ensurePinButtons", {
          listItems: items.length,
          pinsEnsured: ensured,
          skippedNoActionsWrapper: skippedNoActions,
        });
      }
    }
  }

  function disconnectListObserver() {
    if (listObserver) {
      listObserver.disconnect();
      listObserver = null;
    }
    observedAppsBody = null;
  }

  function connectListObserver(appsBody) {
    if (observedAppsBody === appsBody && listObserver) return;

    disconnectListObserver();
    observedAppsBody = appsBody;
    listObserver = new MutationObserver(() => {
      if (applyingDom) return;
      scheduleApply();
    });
    listObserver.observe(appsBody, { childList: true, subtree: false });
  }

  function applyOrganizer() {
    ensureWorkspaceContext();

    const appsBody = getAppsBody();
    if (!appsBody) {
      disconnectListObserver();
      lastAppListSignature = "";
      return;
    }

    const allCards = getAllAppCards();
    if (allCards.length === 0) {
      ensureToolbar();
      const section = document.querySelector(".softr-ext-pinned-section");
      if (section) {
        section.classList.add("softr-ext-pinned-section--empty");
        section.hidden = true;
      }
      connectListObserver(appsBody);
      lastAppListSignature = "";
      return;
    }

    applyingDom = true;
    disconnectListObserver();

    try {
      ensureToolbar();
      const pinnedRow = ensurePinnedStrip();
      repatriateStrayHosts(appsBody, pinnedRow);
      layoutAppsArea(appsBody, pinnedRow);
      ensurePinButtons(getAllAppCards());
    } finally {
      applyingDom = false;
      connectListObserver(appsBody);
      lastAppListSignature = allCardsSignature();
    }
  }

  function scheduleApply() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      debounceTimer = 0;
      applyOrganizer();
    }, DEBOUNCE_MS);
  }

  /**
   * Re-attach when .apps-area is a new node (SPA workspace switch may replace the tree).
   * Subtree must stay false so pin/thumbnail DOM inside cards does not retrigger applies.
   */
  function ensureAreaObserver() {
    const area = document.querySelector(".apps-area");
    if (!area) return;
    if (areaObserver && observedAreaEl === area) return;

    if (areaObserver) areaObserver.disconnect();
    observedAreaEl = area;
    areaObserver = new MutationObserver(() => {
      if (applyingDom) return;
      scheduleApply();
    });
    areaObserver.observe(area, { childList: true, subtree: false });
  }

  function hookSpaNavigation() {
    const notify = () => {
      ensureAreaObserver();
      scheduleApply();
    };

    try {
      const origPush = history.pushState.bind(history);
      const origReplace = history.replaceState.bind(history);

      history.pushState = (...args) => {
        const r = origPush(...args);
        notify();
        return r;
      };
      history.replaceState = (...args) => {
        const r = origReplace(...args);
        notify();
        return r;
      };
    } catch {
      /* ignore */
    }

    window.addEventListener("popstate", notify);
  }

  let lastAppListSignature = "";

  /** Workspace SPA may not change URL or replace .apps-body; detect new app id sets + body swaps. */
  function startStaleContainerWatch() {
    window.setInterval(() => {
      if (applyingDom) return;
      ensureAreaObserver();
      const body = getAppsBody();
      const sig = body ? allCardsSignature() : "";
      const bodySwapped = Boolean(body && observedAppsBody && body !== observedAppsBody);
      const listSwapped = sig !== lastAppListSignature;
      if (bodySwapped || listSwapped) {
        lastAppListSignature = sig;
        scheduleApply();
      }
    }, 900);
  }

  function focusFilterInput(onDone) {
    const appsBody = getAppsBody();
    if (appsBody) ensureToolbar();
    queueMicrotask(() => {
      const el = document.querySelector(".softr-ext-filter");
      if (el instanceof HTMLInputElement) {
        el.focus();
        el.select();
      }
      onDone?.();
    });
  }

  async function init() {
    dbg("init start", { href: location.href, runAt: "document_start" });

    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg?.type !== "softr-ext-focus-filter") return;
      focusFilterInput(() => sendResponse({ ok: true }));
      return true;
    });

    ensureGlobalPinClick();

    await loadState();
    dbg("storage loaded", { pinnedCount: state.pinned.length });

    hookSpaNavigation();
    ensureAreaObserver();
    startStaleContainerWatch();
    applyOrganizer();

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "sync" || !changes[STORAGE_KEY]) return;
      const n = changes[STORAGE_KEY].newValue;
      if (n && typeof n === "object") {
        const { pinned: _dp, pinnedByWorkspace: _dpb, ...meta } = n;
        state = { ...defaults, ...meta, pinned: [] };
        lastWorkspaceKey = null;
        hydratePinnedByWorkspaceFromStored(n);
        ensureWorkspaceContext();
        applyOrganizer();
      }
    });

    const area = document.querySelector(".apps-area");
    if (!area) {
      const scoutRoot = document.body || document.documentElement;
      const scout = new MutationObserver(() => {
        if (document.querySelector(".apps-area")) {
          scout.disconnect();
          ensureAreaObserver();
          scheduleApply();
        }
      });
      scout.observe(scoutRoot, { childList: true, subtree: true });
    }
  }

  init();
})();
