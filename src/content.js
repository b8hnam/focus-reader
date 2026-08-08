/*
 * Focus Reader — Copyright (C) 2026 Behnam Azimi (b8hnam)
 *
 * This program is free software: you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the
 * Free Software Foundation, either version 3 of the License, or (at your
 * option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General
 * Public License for more details. You should have received a copy of the
 * GNU General Public License along with this program. If not, see
 * <https://www.gnu.org/licenses/>.
 *
 * The name "Focus Reader", the byB8 and b8hnam names, and the logo and icon
 * files are NOT covered by this licence — see TRADEMARK.md.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/* ============================================================
 *  Focus Reader
 *  Selected text, in windows that read well — RTL and LTR.
 *
 *  byB8 · https://by.b8hnam.com/focus-reader/
 *
 *  Performance contract: a handful of passive listeners and
 *  nothing else until the reader is opened. No DOM, no storage
 *  read, no font fetch, no timer, until the first selection.
 *  ============================================================ */

(() => {
  "use strict";
  if (window.__b8FocusReader) return;
  window.__b8FocusReader = true;

  const IS_TOP = window.top === window;
  if (!IS_TOP && (window.innerWidth < 260 || window.innerHeight < 200)) return;

  /* ---------- settings ---------- */

  const TRIGGERS = { trgButton: true, trgKey: true, trgMenu: true };
  const LOOK = {
    fontSize: 19, lineHeight: 2, fontFamily: "vazir", theme: "system",
    dimPage: false, trWeb: true, ttsWeb: false, accent: "brand", trTarget: "fa"
  };
  const S = { ...TRIGGERS, ...LOOK };

  let settingsState = 0;
  const settingsQueue = [];

  const store = {
    get(area, defs, cb) {
      try { chrome.storage[area].get(defs, (v) => cb(chrome.runtime.lastError ? defs : v)); } catch (e) { cb(defs); }
    },
    set(area, obj) {
      try { chrome.storage[area].set(obj, () => void chrome.runtime.lastError); } catch (e) { /* gone */ }
    }
  };

  function ensureSettings(done) {
    if (settingsState === 2) { done && done(); return; }
    if (done) settingsQueue.push(done);
    if (settingsState === 1) return;
    settingsState = 1;

    let pending = 2;
    const finish = () => {
      if (--pending) return;
      settingsState = 2;
      try {
        chrome.storage.onChanged.addListener((changes, area) => {
          for (const key in changes) if (key in S) S[key] = changes[key].newValue;
          if (area === "sync" && !S.trgButton) hideMini();
          if (area === "local") { repaint(); wins.forEach(applyLook); syncScrim(); }
        });
      } catch (e) { /* gone */ }
      while (settingsQueue.length) settingsQueue.shift()();
    };

    store.get("sync", TRIGGERS, (v) => { Object.assign(S, v); finish(); });
    store.get("local", LOOK, (v) => { Object.assign(S, v); repaint(); wins.forEach(applyLook); syncScrim(); finish(); });
  }

  const FONTS = {
    vazir: '"B8 Vazirmatn", Vazirmatn, Tahoma, sans-serif',
    sans: '"Segoe UI", Roboto, "Noto Sans", Tahoma, Arial, sans-serif',
    serif: '"Noto Naskh Arabic", "Times New Roman", Georgia, serif',
    mono: '"Cascadia Mono", Consolas, "Courier New", monospace'
  };

  /* When the extension is reloaded, updated or removed, Chrome tears its
     context away from pages that are already open while this script keeps
     living in them. From that moment every chrome.* call throws
     "Extension context invalidated" — including chrome.i18n, which is called
     from async paths, so the throw surfaced as an unhandled rejection. Each
     call now goes through a guard, and labels already fetched are kept so an
     open window carries on reading well after the context is gone. */
  const alive = () => { try { return !!(chrome.runtime && chrome.runtime.id); } catch (e) { return false; } };
  const message = (key) => { try { return chrome.i18n.getMessage(key) || ""; } catch (e) { return ""; } };

  const LABELS = Object.create(null);
  const t = (key) => {
    if (key in LABELS) return LABELS[key];
    const text = message(key);
    if (text) LABELS[key] = text;
    return text || key;
  };

  const UI_DIR = message("@@bidi_dir") || "ltr";
  const UI_LANG = (() => {
    try { return chrome.i18n.getUILanguage ? chrome.i18n.getUILanguage() : "en"; } catch (e) { return "en"; }
  })();
  const FA_DIGITS = UI_LANG.startsWith("fa");

  let darkQuery = null;
  const isDark = () => S.theme === "dark" || (S.theme === "system" && (darkQuery ? darkQuery.matches : false));

  /* The font is loaded from bytes, not from a stylesheet URL: a relative url()
     inside an injected stylesheet resolves against the *page*, not the
     extension, and strict site policies can block extension fonts outright. */
  let fontState = 0;
  function ensureFont() {
    if (fontState || !window.FontFace || !document.fonts || !alive()) return;
    fontState = 1;
    for (const [weight, file] of [["400", "Vazirmatn-Regular.woff2"], ["700", "Vazirmatn-Bold.woff2"]]) {
      let url = "";
      try { url = chrome.runtime.getURL("fonts/" + file); } catch (e) { return; }
      fetch(url)
        .then((r) => r.arrayBuffer())
        .then((buffer) => {
          const face = new FontFace("B8 Vazirmatn", buffer, { weight, style: "normal", display: "swap" });
          return face.load().then((loaded) => document.fonts.add(loaded));
        })
        .catch(() => { /* fall back to Tahoma */ });
    }
  }

  /* ---------- icons ---------- */

  const PATHS = {
    logo: '<rect x="3" y="4" width="18" height="16" rx="4"/><path d="M17 9.5H8M17 14h-5"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"/>',
    save: '<path d="M6 3.5h12a1 1 0 0 1 1 1v16l-7-4-7 4v-16a1 1 0 0 1 1-1z"/>',
    library: '<path d="M8.5 6H21M8.5 12H21M8.5 18H21M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
    back: '<path d="M4 12h16M9 7l-5 5 5 5"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
    speak: '<path d="M11 5 6.5 9H3v6h3.5L11 19z"/><path d="M15.5 9.5a4 4 0 0 1 0 5"/><path d="M18.5 6.5a8 8 0 0 1 0 11"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2.5"/>',
    clean: '<path d="m14.5 4.5 5 5-9 9H5.5l-1-1z"/><path d="M11 8 16 13"/><path d="M13 20.5h8"/>',
    translate: '<circle cx="12" cy="12" r="9"/><path d="M3.2 12h17.6"/><path d="M12 3c2.4 2.7 3.7 5.7 3.7 9s-1.3 6.3-3.7 9c-2.4-2.7-3.7-5.7-3.7-9S9.6 5.7 12 3z"/>',
    ai: '<path d="m13 3 1.6 4.4L19 9l-4.4 1.6L13 15l-1.6-4.4L7 9l4.4-1.6z"/><path d="m6 14.5.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z"/>',
    send: '<path d="M4 12h14M13 6l6 6-6 6"/>',
    gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.6v2.6M12 18.8v2.6M5 7.3l2.2 1.3M16.8 15.4l2.2 1.3M5 16.7l2.2-1.3M16.8 8.6 19 7.3"/>',
    pin: '<path d="M9 3h6l-1 6 3.5 3.5H6.5L10 9z"/><path d="M12 12.5V21"/>',
    side: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M15 4v16"/>',
    rtl: '<path d="M20 6H4M20 12H10M20 18H8"/>',
    ltr: '<path d="M4 6h16M4 12h10M4 18h12"/>',
    smaller: '<path d="M3.5 18 8 6l4.5 12M5.2 14.2h5.6"/><path d="M15.5 12H21"/>',
    bigger: '<path d="M3.5 18 8 6l4.5 12M5.2 14.2h5.6"/><path d="M15.5 12H21M18.25 9.25v5.5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.2 4.2l1.5 1.5M18.3 18.3l1.5 1.5M2 12h2M20 12h2M4.2 19.8l1.5-1.5M18.3 5.7l1.5-1.5"/>',
    moon: '<path d="M20.5 14.8A8.6 8.6 0 0 1 9.2 3.5a8.6 8.6 0 1 0 11.3 11.3z"/>',
    system: '<rect x="2.5" y="4" width="19" height="12.5" rx="3"/><path d="M9 20.5h6M12 16.5v4"/>',
    edit: '<path d="M4 20h4L18.5 9.5a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    done: '<path d="m5 12.5 4.5 4.5L19 7"/>',
    bold: '<path d="M7 5h5.5a3.5 3.5 0 0 1 0 7H7zM7 12h6.5a3.5 3.5 0 0 1 0 7H7z"/>',
    italic: '<path d="M15.5 5h-5M13.5 19h-5M14.5 5 9.5 19"/>',
    underline: '<path d="M7 4v6.5a5 5 0 0 0 10 0V4M5 20h14"/>',
    undo: '<path d="M4.5 8H14a5 5 0 0 1 0 10H8.5M8.5 4l-4 4 4 4"/>',
    reset: '<path d="M4 5v6h6"/><path d="M4.6 11a8 8 0 1 1 1.2 6.5"/>',
    minimize: '<path d="M6 18h12"/>',
    maximize: '<rect x="5" y="5" width="14" height="14" rx="2.5"/>',
    restore: '<rect x="3.5" y="8" width="12.5" height="12" rx="2.5"/><path d="M8 8V6a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    trash: '<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
    open: '<path d="M8 16 16 8M9 8h7v7"/>',
    expand: '<path d="M4 10V4h6M20 14v6h-6M4 4l6 6M20 20l-6-6"/>'
  };

  const icon = (name) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name]}</svg>`;

  /* ---------- shared state ---------- */

  const MAX_WINS = 8;
  const MIN_W = 288, MIN_H = 46, DOCK_GAP = 8;
  const RESIZE_MIN_W = 320, RESIZE_MIN_H = 220; // floor for dragging a normal window's edges

  let host, shadow, stage, scrimEl, miniBar, bubble;
  const wins = [];
  let zTop = 10, cascade = 0, scrollBound = false, dock = null;
  let audio = null;

  const LANGS = ["fa", "en", "ar", "ku", "tr", "de", "fr", "es", "ru", "zh", "hi", "ja"];
  let langNames = null;
  function langLabel(code) {
    if (code === "src") return t("trOriginal");
    if (!langNames) {
      try { langNames = new Intl.DisplayNames([UI_LANG], { type: "language" }); }
      catch (e) { langNames = { of: (c) => c }; }
    }
    try { return langNames.of(code) || code; } catch (e) { return code; }
  }

  /* ---------- styles (structure only — colours come from the palette) ---------- */

  const CSS = `
  :host { all: initial; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  svg { width: 100%; height: 100%; display: block; }

  .stage {
    position: fixed; inset: 0; z-index: 2147483647; pointer-events: none;
    font-family: "B8 Vazirmatn", "Segoe UI", Tahoma, sans-serif;
    font-size: 13px; line-height: 1.5; -webkit-font-smoothing: antialiased;
    --spring: cubic-bezier(.32,.72,0,1);
  }

  .minibar {
    position: absolute; pointer-events: auto; display: none; gap: 2px; padding: 3px;
    background: var(--solid); border: 1px solid var(--hair); border-radius: 20px;
    -webkit-backdrop-filter: blur(20px) saturate(180%); backdrop-filter: blur(20px) saturate(180%);
    box-shadow: 0 10px 26px rgba(10,14,18,.26), inset 0 1px 0 rgba(255,255,255,.5);
  }
  .minibar.on { display: flex; }
  .minibtn {
    width: 32px; height: 32px; padding: 7px; border-radius: 50%;
    background: none; border: 0; color: var(--accent-text); cursor: pointer;
    transition: transform .18s cubic-bezier(.2,.9,.28,1.3), background .15s, color .15s;
  }
  .minibtn:hover { background: var(--accent); color: var(--accent-ink); transform: scale(1.06); }
  .minibtn:active { transform: scale(.92); }

  .bubble {
    position: absolute; pointer-events: auto; display: none; max-width: 340px;
    padding: 12px 14px; border-radius: 18px; color: var(--ink);
    background: var(--solid); border: 1px solid var(--hair);
    -webkit-backdrop-filter: blur(26px) saturate(180%); backdrop-filter: blur(26px) saturate(180%);
    box-shadow: var(--lift); font-size: 14px; line-height: 1.8;
    animation: b8pop .22s var(--spring);
  }
  .bubble.on { display: block; }
  .bubble .brow { display: flex; align-items: center; gap: 6px; margin-top: 9px; font-size: 11px; color: var(--muted); }
  .bubble .btn {
    font: inherit; font-size: 11px; background: var(--chip); border: 1px solid var(--hair);
    color: var(--ink); border-radius: 11px; padding: 5px 10px; cursor: pointer;
  }
  .bubble .btn:hover { background: var(--accent); color: var(--accent-ink); border-color: transparent; }
  @keyframes b8pop { from { opacity: 0; transform: scale(.94) translateY(6px); } }

  .scrim {
    position: absolute; inset: 0; pointer-events: none; opacity: 0; background: var(--scrim);
    -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px);
    transition: opacity .26s var(--spring);
  }
  .scrim.on { opacity: 1; pointer-events: auto; }

  .win {
    position: absolute; display: flex; flex-direction: column; pointer-events: auto;
    color: var(--ink); overflow: hidden;
    background: var(--glass);
    -webkit-backdrop-filter: blur(34px) saturate(190%); backdrop-filter: blur(34px) saturate(190%);
    border: 1px solid var(--hair); border-radius: 26px;
    box-shadow: var(--lift), inset 0 1px 0 rgba(255,255,255,.4);
    opacity: 0; transform: scale(.94);
  }
  .win::before { content: ""; position: absolute; inset: 0; border-radius: inherit; background: var(--sheen); pointer-events: none; }
  .win.ready { opacity: 1; transform: none;
    transition: left .42s var(--spring), top .42s var(--spring),
                width .42s var(--spring), height .42s var(--spring),
                border-radius .34s var(--spring), opacity .22s ease, transform .28s var(--spring); }
  .win.dragging { transition: none; }
  .win.resizing { transition: none; }

  .rzone { position: absolute; pointer-events: auto; z-index: 2; }
  .rzone.e  { inset-inline-end: -4px; inset-block: 8px; width: 8px; cursor: ew-resize; }
  .rzone.w  { inset-inline-start: -4px; inset-block: 8px; width: 8px; cursor: ew-resize; }
  .rzone.n  { inset-block-start: -4px; inset-inline: 8px; height: 8px; cursor: ns-resize; }
  .rzone.s  { inset-block-end: -4px; inset-inline: 8px; height: 8px; cursor: ns-resize; }
  .rzone.ne { inset-block-start: -4px; inset-inline-end: -4px; width: 16px; height: 16px; cursor: nesw-resize; }
  .rzone.nw { inset-block-start: -4px; inset-inline-start: -4px; width: 16px; height: 16px; cursor: nwse-resize; }
  .rzone.se { inset-block-end: -4px; inset-inline-end: -4px; width: 16px; height: 16px; cursor: nwse-resize; }
  .rzone.sw { inset-block-end: -4px; inset-inline-start: -4px; width: 16px; height: 16px; cursor: nesw-resize; }
  .win.is-min .rzone, .win.is-max .rzone { display: none; }
  .win.closing { opacity: 0; transform: scale(.93); }
  .win.is-min { border-radius: 23px; }
  .win.is-min .bar, .win.is-min .sheetbar, .win.is-min .content, .win.is-min .foot { display: none; }
  .win.is-min .pinbtn, .win.is-min .sidebtn { display: none; }
  .win.is-max { border-radius: 22px; }
  @media (prefers-reduced-motion: reduce) { .win.ready { transition: opacity .01s; } }

  .titlebar {
    position: relative; display: flex; align-items: center; gap: 9px;
    padding-inline-start: 16px; box-shadow: inset 0 -1px 0 var(--edge);
    cursor: grab; user-select: none; flex: none; min-height: 46px;
  }
  .win.is-min .titlebar { box-shadow: none; }
  .titlebar:active { cursor: grabbing; }
  .brand { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 12.5px; white-space: nowrap; }
  .brand > span:first-child { width: 18px; height: 18px; color: var(--accent); }
  .src { color: var(--muted); font-size: 11.5px; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .grow { flex: 1; }

  .wctl { display: flex; gap: 2px; padding: 7px 7px 7px 0; }
  .wbtn { width: 32px; height: 32px; padding: 8px; border-radius: 11px; background: none; border: 0; color: var(--ink); cursor: pointer; transition: background .15s, color .15s, transform .12s; }
  .wbtn:hover { background: var(--chip); }
  .wbtn.active { background: var(--accent); color: var(--accent-ink); }
  .wbtn.danger:hover { background: var(--danger); color: #fff; }
  .wbtn:active { transform: scale(.9); }
  .wbtn:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }

  .bar { position: relative; display: flex; align-items: center; flex-wrap: wrap; gap: 2px; padding: 7px 10px; box-shadow: inset 0 -1px 0 var(--edge); flex: none; }
  .bar.editbar { background: var(--sheet); display: none; }
  .bar.editbar.on { display: flex; }
  .sep { width: 1px; align-self: stretch; margin: 5px 7px; background: var(--edge); }

  .tool { width: 32px; height: 32px; padding: 7px; border-radius: 11px; background: none; border: 0; color: var(--ink); cursor: pointer; transition: background .15s, color .15s, transform .12s; }
  .tool:hover { background: var(--chip); }
  .tool:active { transform: scale(.9); }
  .tool.active { background: var(--accent); color: var(--accent-ink); }
  .tool:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
  .tool[disabled] { opacity: .4; pointer-events: none; }

  .sheetbar { position: relative; display: none; flex-wrap: wrap; gap: 7px; padding: 12px; background: var(--sheet); box-shadow: inset 0 -1px 0 var(--edge); flex: none; }
  .sheetbar.on { display: flex; animation: b8slide .26s var(--spring); }
  @keyframes b8slide { from { opacity: 0; transform: translateY(-6px); } }
  .chip {
    font: inherit; font-size: 12px; padding: 8px 13px; border-radius: 14px;
    background: var(--chip); border: 1px solid var(--hair); color: var(--ink);
    cursor: pointer; transition: background .15s, transform .12s, color .15s;
  }
  .chip:hover { background: var(--accent); border-color: transparent; color: var(--accent-ink); }
  .chip.on { background: var(--accent); border-color: transparent; color: var(--accent-ink); }
  .chip:active { transform: scale(.95); }
  .chip:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
  .sheetnote { width: 100%; font-size: 11px; color: var(--muted); line-height: 1.7; }

  .askrow { display: flex; align-items: center; gap: 6px; width: 100%; margin-top: 2px; }
  .askrow input {
    flex: 1; min-width: 0; font: inherit; font-size: 12.5px; color: var(--ink);
    background: var(--chip); border: 1px solid var(--hair); border-radius: 14px; padding: 9px 14px; outline: none;
  }
  .askrow input::placeholder { color: var(--muted); }
  .askrow input:focus { border-color: var(--accent); }
  .ailink { font: inherit; font-size: 11.5px; color: var(--muted); background: none; border: 0; cursor: pointer; padding: 4px 2px; display: flex; align-items: center; gap: 5px; }
  .ailink > span { width: 13px; height: 13px; }
  .ailink:hover { color: var(--accent-text); }

  .content { position: relative; overflow: auto; flex: 1; min-height: 0; background: var(--solid); }
  .win.busy .content { opacity: .5; }
  .body { padding: 28px 32px; white-space: pre-wrap; word-break: break-word; outline: none; caret-color: var(--accent); user-select: text; }
  .body.rich { white-space: normal; }
  .body[contenteditable="true"] { background: var(--sheet); }
  .body::selection { background: var(--accent); color: var(--accent-ink); }
  .body.off { display: none; }

  .body h1, .body h2, .body h3, .body h4, .body h5, .body h6 { line-height: 1.45; margin: 1.15em 0 .5em; font-weight: 700; }
  .body h1 { font-size: 1.5em; } .body h2 { font-size: 1.32em; }
  .body h3 { font-size: 1.18em; } .body h4 { font-size: 1.06em; }
  .body p { margin: 0 0 .9em; }
  .body ul, .body ol { margin: 0 0 .9em; padding-inline-start: 1.7em; }
  .body li { margin-bottom: .4em; }
  .body blockquote { margin: 0 0 .9em; padding-inline-start: 14px; border-inline-start: 3px solid var(--accent); color: var(--muted); }
  .body a { color: var(--accent-text); text-decoration: underline; text-underline-offset: 3px; }
  .body code { font-family: "Cascadia Mono", Consolas, monospace; font-size: .88em; background: var(--chip); padding: 1px 6px; border-radius: 7px; }
  .body pre { background: var(--chip); padding: 12px 14px; border-radius: 14px; overflow: auto; margin: 0 0 .9em; }
  .body pre code { background: none; padding: 0; }
  .body table { border-collapse: collapse; width: 100%; margin: 0 0 .9em; font-size: .92em; }
  .body th, .body td { border: 1px solid var(--edge); padding: 7px 10px; text-align: start; }
  .body hr { border: 0; border-top: 1px solid var(--edge); margin: 1.3em 0; }
  .body mark { background: var(--accent-soft); color: inherit; }
  .body > *:first-child { margin-top: 0; }
  .body > *:last-child { margin-bottom: 0; }

  .library { padding: 14px; display: none; }
  .library.on { display: block; }
  .libhead { display: flex; align-items: center; gap: 6px; padding: 4px 6px 12px; }
  .libhead b { font-size: 12.5px; }
  .libbtn { font: inherit; font-size: 11.5px; background: var(--chip); border: 1px solid var(--hair); color: var(--muted); border-radius: 12px; padding: 6px 11px; cursor: pointer; }
  .libbtn:hover { color: var(--accent-text); border-color: var(--accent); }
  .libbtn.danger:hover { color: var(--danger); border-color: var(--danger); }

  .item { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border: 1px solid var(--hair); border-radius: 16px; margin-bottom: 8px; background: var(--chip); }
  .item .txt { flex: 1; min-width: 0; }
  .item .snip { font-size: 13px; line-height: 1.75; max-height: 3.5em; overflow: hidden; }
  .item .meta { font-size: 11px; color: var(--muted); margin-top: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .item .acts { display: flex; gap: 2px; flex: none; }
  .item .tool { width: 28px; height: 28px; padding: 6px; border-radius: 9px; }
  .empty { color: var(--muted); padding: 30px 14px; text-align: center; font-size: 12.5px; }

  .foot { position: relative; display: flex; align-items: center; gap: 10px; flex: none; padding: 8px 14px; box-shadow: inset 0 1px 0 var(--edge); font-size: 11px; color: var(--muted); }
  .toast { color: var(--accent-text); }
  .spin { display: none; width: 12px; height: 12px; border-radius: 50%; flex: none; border: 2px solid var(--accent-soft); border-top-color: var(--accent); }
  .win.busy .spin { display: block; animation: b8spin .7s linear infinite; }
  @keyframes b8spin { to { transform: rotate(360deg); } }
  .sig { color: var(--muted); text-decoration: none; opacity: .75; font-weight: 700; letter-spacing: .3px; }
  .sig:hover { color: var(--accent-text); opacity: 1; }

  @media (max-width: 620px) { .body { padding: 20px 22px; } }

  /* Scrollbar — themed to match the popup, side panel, and site */
  .content, .library, .body pre { scrollbar-width: thin; scrollbar-color: var(--accent-soft) transparent; }
  .content::-webkit-scrollbar, .library::-webkit-scrollbar, .body pre::-webkit-scrollbar { width: 9px; height: 9px; }
  .content::-webkit-scrollbar-track, .library::-webkit-scrollbar-track, .body pre::-webkit-scrollbar-track { background: transparent; }
  .content::-webkit-scrollbar-thumb, .library::-webkit-scrollbar-thumb, .body pre::-webkit-scrollbar-thumb {
    background: var(--accent-soft); border-radius: 20px; border: 2px solid transparent; background-clip: padding-box;
  }
  .content::-webkit-scrollbar-thumb:hover, .library::-webkit-scrollbar-thumb:hover, .body pre::-webkit-scrollbar-thumb:hover {
    background: var(--accent); background-clip: padding-box;
  }`;

  /* ---------- rich text capture ---------- */

  const KEEP = new Set(["H1","H2","H3","H4","H5","H6","P","BR","HR","B","STRONG","I","EM","U","S","DEL","INS","MARK","SUP","SUB",
    "UL","OL","LI","BLOCKQUOTE","PRE","CODE","KBD","A","TABLE","THEAD","TBODY","TFOOT","TR","TH","TD","CAPTION","FIGCAPTION","DL","DT","DD"]);
  const DROP = new Set(["SCRIPT","STYLE","NOSCRIPT","SVG","IMG","VIDEO","AUDIO","IFRAME","CANVAS","BUTTON","INPUT","SELECT","TEXTAREA","FORM","NAV","ASIDE","FOOTER","HEADER"]);
  const BLOCKISH = new Set(["DIV","SECTION","ARTICLE","MAIN","FIGURE"]);

  function sanitizeInto(source, target, doc) {
    for (const node of source.childNodes) {
      if (node.nodeType === 3) { if (node.nodeValue) target.appendChild(doc.createTextNode(node.nodeValue)); continue; }
      if (node.nodeType !== 1) continue;
      const tag = node.tagName;
      if (DROP.has(tag)) continue;

      if (KEEP.has(tag)) {
        const el = doc.createElement(tag);
        if (tag === "A") {
          const href = node.getAttribute("href") || "";
          if (/^https?:|^mailto:/i.test(href)) { el.setAttribute("href", href); el.setAttribute("target", "_blank"); el.setAttribute("rel", "noopener noreferrer"); }
        }
        sanitizeInto(node, el, doc);
        target.appendChild(el);
        continue;
      }

      const style = node.style || {};
      const weight = String(style.fontWeight || "");
      const bold = weight === "bold" || weight === "bolder" || parseInt(weight, 10) >= 600;
      const italic = String(style.fontStyle || "") === "italic";
      const underline = /underline/.test(String(style.textDecorationLine || style.textDecoration || ""));

      let holder = target;
      for (const wrap of [bold && "STRONG", italic && "EM", underline && "U"]) {
        if (!wrap) continue;
        const el = doc.createElement(wrap);
        holder.appendChild(el);
        holder = el;
      }
      if (holder === target && BLOCKISH.has(tag)) {
        const el = doc.createElement("P");
        sanitizeInto(node, el, doc);
        if (el.textContent.trim() || el.querySelector("*")) target.appendChild(el);
        continue;
      }
      sanitizeInto(node, holder, doc);
    }
  }

  function sanitizeFragment(fragment) {
    const doc = document.implementation.createHTMLDocument("");
    const box = doc.createElement("div");
    sanitizeInto(fragment, box, doc);
    return box.innerHTML;
  }

  function readSelection() {
    const el = document.activeElement;
    if (el && (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && typeof el.selectionStart === "number"))) {
      const part = String(el.value || "").slice(el.selectionStart, el.selectionEnd);
      if (part.trim()) return { text: part, html: "" };
    }
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !sel.toString().trim()) return { text: "", html: "" };
    let html = "";
    try { html = sanitizeFragment(sel.getRangeAt(0).cloneContents()); } catch (e) { html = ""; }
    return { text: sel.toString(), html };
  }

  /* ---------- stage ---------- */

  function repaint() {
    if (!stage || !self.B8Palette) return;
    self.B8Palette.paint(stage, S.accent, isDark());
  }

  function ensureStage() {
    if (host) return;
    ensureFont();

    darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
    darkQuery.addEventListener("change", () => { if (S.theme === "system") repaint(); });

    host = document.createElement("div");
    host.id = "b8-focus-reader";
    host.style.cssText = "all:initial;position:static;";
    shadow = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = CSS;

    stage = document.createElement("div");
    stage.className = "stage";
    stage.dir = UI_DIR;
    stage.innerHTML = `<div class="scrim"></div>
      <div class="minibar">
        <button class="minibtn" type="button" data-mini="open" title="${t("extName")}" aria-label="${t("extName")}">${icon("logo")}</button>
        <button class="minibtn" type="button" data-mini="translate" title="${t("tipTranslate")}" aria-label="${t("tipTranslate")}">${icon("translate")}</button>
      </div>
      <div class="bubble"></div>`;

    shadow.append(style, stage);
    (document.body || document.documentElement).appendChild(host);

    scrimEl = shadow.querySelector(".scrim");
    miniBar = shadow.querySelector(".minibar");
    bubble = shadow.querySelector(".bubble");

    miniBar.addEventListener("mousedown", (e) => e.preventDefault());
    miniBar.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-mini]");
      if (!btn) return;
      if (btn.dataset.mini === "open") { openContent(readSelection()); hideMini(); }
      else quickTranslate();
    });
    bubble.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-bubble]");
      if (!btn) return;
      if (btn.dataset.bubble === "expand") {
        const w = openContent({ text: bubble.dataset.text || "", html: "" });
        w.lang = S.trTarget;
      }
      hideBubble();
    });
    scrimEl.addEventListener("mousedown", () => { const top = frontWin(); if (top) closeWin(top); });

    window.addEventListener("resize", () => { wins.forEach(clampWin); layoutDock(); }, { passive: true });

    for (const type of ["keydown", "keypress", "keyup", "input", "beforeinput", "paste", "cut"]) {
      document.addEventListener(type, (e) => {
        if (!host || !e.composedPath) return;
        if (e.composedPath().some((n) => n === host)) e.stopPropagation();
      }, true);
    }

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (bubble.classList.contains("on")) { hideBubble(); return; }
      const top = frontWin();
      if (!top) return;
      e.preventDefault();
      closeWin(top);
    }, true);

    if (IS_TOP) {
      console.log("%c Focus Reader %c byB8 · by.b8hnam.com/focus-reader ",
        "background:#411530;color:#fff;border-radius:4px 0 0 4px;padding:2px 7px",
        "background:#ff3000;color:#fff;border-radius:0 4px 4px 0;padding:2px 7px");
    }
    repaint();
  }

  function syncScrim() {
    if (!scrimEl) return;
    scrimEl.classList.toggle("on", !!S.dimPage && wins.some((w) => w.state !== "min"));
  }

  const frontWin = () => wins.filter((w) => w.state !== "min").sort((a, b) => b.z - a.z)[0] || null;
  const editingWin = () => wins.find((w) => w.editing) || null;

  function raise(w) { w.z = ++zTop; w.el.style.zIndex = String(w.z); }

  /* ---------- window ---------- */

  const toolBtn = (act, iconName, tipKey) =>
    `<button class="tool" type="button" data-act="${act}" data-icon="${iconName}" title="${t(tipKey)}" aria-label="${t(tipKey)}">${icon(iconName)}</button>`;

  let flashLater = "";

  function createWin() {
    ensureStage();
    if (wins.length >= MAX_WINS) { closeWin(wins[0], true); flashLater = t("winLimit"); }

    const el = document.createElement("div");
    el.className = "win";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", t("extName"));
    el.innerHTML = `
      <div class="titlebar">
        <span class="brand"><span>${icon("logo")}</span>Focus Reader</span>
        <span class="src"></span>
        <div class="wctl">
          <button class="wbtn pinbtn" type="button" data-act="pin" title="${t("tipPin")}" aria-label="${t("tipPin")}">${icon("pin")}</button>
          <button class="wbtn sidebtn" type="button" data-act="side" title="${t("tipSide")}" aria-label="${t("tipSide")}">${icon("side")}</button>
          <button class="wbtn" type="button" data-act="minimize" data-icon="minimize" title="${t("tipMinimize")}" aria-label="${t("tipMinimize")}">${icon("minimize")}</button>
          <button class="wbtn" type="button" data-act="maximize" data-icon="maximize" title="${t("tipMaximize")}" aria-label="${t("tipMaximize")}">${icon("maximize")}</button>
          <button class="wbtn danger" type="button" data-act="close" data-icon="close" title="${t("tipClose")}" aria-label="${t("tipClose")}">${icon("close")}</button>
        </div>
      </div>

      <span class="rzone n"></span><span class="rzone s"></span>
      <span class="rzone e"></span><span class="rzone w"></span>
      <span class="rzone ne"></span><span class="rzone nw"></span>
      <span class="rzone se"></span><span class="rzone sw"></span>

      <div class="bar tools">
        ${toolBtn("translate", "translate", "tipTranslate")}
        ${toolBtn("ai", "ai", "tipAI")}
        <span class="sep"></span>
        ${toolBtn("copy", "copy", "tipCopy")}
        ${toolBtn("save", "save", "tipSave")}
        ${toolBtn("download", "download", "tipDownload")}
        ${toolBtn("speak", "speak", "tipSpeak")}
        <span class="sep"></span>
        ${toolBtn("clean", "clean", "tipClean")}
        ${toolBtn("direction", "rtl", "tipDirection")}
        <span class="sep"></span>
        ${toolBtn("smaller", "smaller", "tipSmaller")}
        ${toolBtn("bigger", "bigger", "tipBigger")}
        ${toolBtn("theme", "system", "tipTheme")}
        <span class="sep"></span>
        ${toolBtn("edit", "edit", "tipEdit")}
        <span class="grow"></span>
        ${toolBtn("library", "library", "tipLibrary")}
      </div>

      <div class="sheetbar trsheet">
        <button class="chip" type="button" data-act="trTo" data-lang="src">${t("trOriginal")}</button>
        ${LANGS.map((code) => `<button class="chip" type="button" data-act="trTo" data-lang="${code}">${langLabel(code)}</button>`).join("")}
        <p class="sheetnote">${t("trFree")} ${t("trReclick")}</p>
      </div>

      <div class="sheetbar aisheet">
        <button class="chip" type="button" data-act="aiTask" data-task="summarize">${t("aiSummarize")}</button>
        <button class="chip" type="button" data-act="aiTask" data-task="keyPoints">${t("aiKeyPoints")}</button>
        <button class="chip" type="button" data-act="aiTask" data-task="simplify">${t("aiSimplify")}</button>
        <button class="chip" type="button" data-act="aiTask" data-task="proofread">${t("aiProofread")}</button>
        <div class="askrow">
          <input type="text" class="askinput" placeholder="${t("aiAsk")}" aria-label="${t("aiAsk")}">
          <button class="tool" type="button" data-act="aiAsk" title="${t("aiRun")}" aria-label="${t("aiRun")}">${icon("send")}</button>
        </div>
        <button class="ailink" type="button" data-act="aiOptions"><span>${icon("gear")}</span>${t("aiSettingsLink")}</button>
      </div>

      <div class="bar editbar">
        ${toolBtn("bold", "bold", "tipBold")}
        ${toolBtn("italic", "italic", "tipItalic")}
        ${toolBtn("underline", "underline", "tipUnderline")}
        <span class="sep"></span>
        ${toolBtn("undo", "undo", "tipUndo")}
        ${toolBtn("reset", "reset", "tipReset")}
      </div>

      <div class="content">
        <div class="body" tabindex="0"></div>
        <div class="library"></div>
      </div>

      <div class="foot">
        <span class="spin"></span>
        <span class="count"></span>
        <span class="toast"></span>
        <span class="grow"></span>
        <a class="sig" href="https://by.b8hnam.com/focus-reader/" target="_blank" rel="noopener noreferrer">byB8</a>
      </div>`;

    const w = {
      el,
      title: el.querySelector(".titlebar"),
      src: el.querySelector(".src"),
      trSheet: el.querySelector(".trsheet"),
      aiSheet: el.querySelector(".aisheet"),
      aiInput: el.querySelector(".askinput"),
      editbar: el.querySelector(".editbar"),
      body: el.querySelector(".body"),
      library: el.querySelector(".library"),
      count: el.querySelector(".count"),
      toast: el.querySelector(".toast"),
      state: "normal",
      geom: { x: 0, y: 0, w: 0, h: 0 },
      saved: null,
      dir: UI_DIR,
      lang: "",             // language currently on screen
      baseLang: "",         // language the text arrived in
      versions: {},         // language -> html, so switching back is instant
      originalHtml: "",
      pinned: false,
      editing: false, speaking: false, inLibrary: false,
      aiOpen: false, trOpen: false, busy: false,
      z: 0
    };

    el.addEventListener("mousedown", () => { if (w.state !== "min") raise(w); }, true);
    el.addEventListener("click", (e) => {
      const btn = e.target.closest && e.target.closest("[data-act]");
      if (btn) act(w, btn.dataset.act, btn);
    });
    w.body.addEventListener("input", () => { updateCount(w); schedulePinSave(); });
    w.aiInput.addEventListener("keydown", (e) => { if (e.key === "Enter") act(w, "aiAsk"); });
    w.title.addEventListener("mousedown", (e) => startDrag(w, e));
    w.title.addEventListener("dblclick", (e) => {
      if (e.target.closest("[data-act]")) return;
      act(w, w.state === "min" ? "minimize" : "maximize");
    });
    el.querySelectorAll(".rzone").forEach((zone) => {
      const edge = zone.className.split(" ")[1]; // n, s, e, w, ne, nw, se, sw
      zone.addEventListener("mousedown", (e) => startResize(w, e, edge));
    });

    stage.appendChild(el);
    wins.push(w);
    raise(w);
    return w;
  }

  function openContent(payload, source, quiet) {
    ensureStage();
    ensureSettings();
    const w = createWin();

    w.src.textContent = source || document.title || location.hostname;
    const hasText = payload && String(payload.text || "").trim();
    if (hasText) {
      setContent(w, payload);
      w.originalHtml = w.body.innerHTML;
      w.versions = { src: w.originalHtml };
      w.lang = "src";
    } else {
      w.body.textContent = "";
      w.body.classList.remove("rich");
    }

    applyLook(w);
    updateCount(w);

    const width = Math.min(760, Math.round(window.innerWidth * 0.92));
    w.el.style.width = width + "px";
    w.el.style.height = "auto";
    const natural = Math.min(w.el.offsetHeight || 420, Math.round(window.innerHeight * 0.86));
    const step = (cascade++ % 5) * 26;
    w.geom = {
      w: width, h: natural,
      x: Math.max(12, Math.round((window.innerWidth - width) / 2) + step),
      y: Math.max(12, Math.round((window.innerHeight - natural) / 2) + step)
    };
    clampWin(w);
    requestAnimationFrame(() => { w.el.classList.add("ready"); syncScrim(); });

    if (!hasText && !quiet) flash(w, t("msgNoSelection"));
    else if (flashLater) { flash(w, flashLater); flashLater = ""; }
    else if (!alive()) flash(w, t("msgStale"));

    setTimeout(() => w.el.querySelector('[data-act="close"]').focus(), 30);
    return w;
  }

  function applyGeom(w) {
    w.el.style.left = w.geom.x + "px";
    w.el.style.top = w.geom.y + "px";
    w.el.style.width = w.geom.w + "px";
    w.el.style.height = w.geom.h + "px";
  }

  function clampWin(w) {
    if (w.state === "min") return;
    if (w.state === "max") { setMax(w); return; }
    w.geom.x = Math.min(Math.max(8, w.geom.x), Math.max(8, window.innerWidth - w.geom.w - 8));
    w.geom.y = Math.min(Math.max(8, w.geom.y), Math.max(8, window.innerHeight - 60));
    applyGeom(w);
  }

  function setMax(w) {
    w.geom = { x: 16, y: 16, w: window.innerWidth - 32, h: window.innerHeight - 32 };
    applyGeom(w);
  }

  function defaultDock() {
    return UI_DIR === "rtl"
      ? { x: 16, y: window.innerHeight - MIN_H - 16 }
      : { x: window.innerWidth - MIN_W - 16, y: window.innerHeight - MIN_H - 16 };
  }

  function layoutDock() {
    if (!dock) dock = defaultDock();
    dock.x = Math.min(Math.max(8, dock.x), Math.max(8, window.innerWidth - MIN_W - 8));
    dock.y = Math.min(Math.max(8, dock.y), Math.max(8, window.innerHeight - MIN_H - 8));
    const stack = wins.filter((x) => x.state === "min");
    stack.forEach((x, index) => {
      const fromBottom = stack.length - 1 - index;
      x.geom = { x: dock.x, y: dock.y - fromBottom * (MIN_H + DOCK_GAP), w: MIN_W, h: MIN_H };
      x.el.style.zIndex = String(1 + index);
      applyGeom(x);
    });
  }

  function minimize(w) {
    if (w.state === "min") { restore(w); return; }
    if (w.state === "normal") w.saved = { ...w.geom };
    w.state = "min";
    w.el.classList.add("is-min");
    w.el.classList.remove("is-max");
    setEditing(w, false); showAI(w, false); showTranslate(w, false);
    if (!dock) dock = defaultDock();
    layoutDock();
    swapIcon(w, "maximize", "restore", "tipRestore");
    syncScrim();
  }

  function restore(w) {
    w.state = "normal";
    w.el.classList.remove("is-min", "is-max");
    w.geom = w.saved ? { ...w.saved } : { x: 40, y: 40, w: 700, h: 460 };
    clampWin(w); raise(w); layoutDock();
    swapIcon(w, "maximize", "maximize", "tipMaximize");
    syncScrim();
  }

  function toggleMax(w) {
    if (w.state === "max") { restore(w); return; }
    if (w.state === "normal") w.saved = { ...w.geom };
    w.state = "max";
    w.el.classList.add("is-max");
    w.el.classList.remove("is-min");
    setMax(w); raise(w); layoutDock();
    swapIcon(w, "maximize", "restore", "tipRestore");
    syncScrim();
  }

  function closeWin(w, silent) {
    stopSpeech(w);
    w.el.classList.add("closing");
    const index = wins.indexOf(w);
    if (index >= 0) wins.splice(index, 1);
    setTimeout(() => { w.el.remove(); layoutDock(); syncScrim(); }, silent ? 0 : 240);
    layoutDock(); syncScrim(); schedulePinSave();
  }

  function startResize(w, e, edge) {
    if (e.button !== 0 || w.state !== "normal") return;
    const startX = e.clientX, startY = e.clientY;
    const origin = { ...w.geom };
    raise(w);
    w.el.classList.add("resizing");
    e.preventDefault();
    e.stopPropagation(); // don't also trigger startDrag via the titlebar

    const move = (ev) => {
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      let { x, y, w: width, h: height } = origin;

      if (edge.includes("e")) width = origin.w + dx;
      if (edge.includes("w")) { width = origin.w - dx; x = origin.x + dx; }
      if (edge.includes("s")) height = origin.h + dy;
      if (edge.includes("n")) { height = origin.h - dy; y = origin.y + dy; }

      if (width < RESIZE_MIN_W) { if (edge.includes("w")) x -= RESIZE_MIN_W - width; width = RESIZE_MIN_W; }
      if (height < RESIZE_MIN_H) { if (edge.includes("n")) y -= RESIZE_MIN_H - height; height = RESIZE_MIN_H; }

      // keep at least a sliver of the window reachable on screen, same spirit as clampWin()
      x = Math.min(Math.max(-width + 80, x), window.innerWidth - 80);
      y = Math.min(Math.max(0, y), window.innerHeight - 40);

      w.geom = { x, y, w: width, h: height };
      applyGeom(w);
    };
    const up = () => {
      w.el.classList.remove("resizing");
      window.removeEventListener("mousemove", move, true);
      window.removeEventListener("mouseup", up, true);
      w.saved = { ...w.geom };
      schedulePinSave();
    };
    window.addEventListener("mousemove", move, true);
    window.addEventListener("mouseup", up, true);
  }

  function startDrag(w, e) {
    if (e.button !== 0 || e.target.closest("[data-act]") || w.state === "max") return;
    const minimized = w.state === "min";
    const startX = e.clientX, startY = e.clientY;
    const origin = minimized ? { ...dock } : { ...w.geom };
    if (!minimized) raise(w);
    w.el.classList.add("dragging");

    const move = (ev) => {
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      if (minimized) { dock.x = origin.x + dx; dock.y = origin.y + dy; layoutDock(); }
      else { w.geom.x = origin.x + dx; w.geom.y = origin.y + dy; clampWin(w); }
    };
    const up = () => {
      w.el.classList.remove("dragging");
      window.removeEventListener("mousemove", move, true);
      window.removeEventListener("mouseup", up, true);
      schedulePinSave();
    };
    window.addEventListener("mousemove", move, true);
    window.addEventListener("mouseup", up, true);
    e.preventDefault();
  }

  /* ---------- actions ---------- */

  function act(w, name, btn) {
    switch (name) {
      case "close": closeWin(w); break;
      case "minimize": minimize(w); break;
      case "maximize": w.state === "min" ? restore(w) : toggleMax(w); break;
      case "pin": togglePin(w); break;
      case "side": toSidePanel(w); break;

      case "translate": showTranslate(w, !w.trOpen); break;
      case "trTo": translateTo(w, btn.dataset.lang); break;

      case "ai": showAI(w, !w.aiOpen); break;
      case "aiTask": askAI(w, btn.dataset.task); break;
      case "aiAsk": { const q = w.aiInput.value.trim(); if (q) askAI(w, "ask", q); break; }
      case "aiOptions":
        try { chrome.runtime.sendMessage({ type: "B8_OPTIONS" }, () => void chrome.runtime.lastError); } catch (e) { /* gone */ }
        break;

      case "copy": copyText(w); break;
      case "save": saveCurrent(w); break;
      case "download": downloadText(w); break;
      case "speak": toggleSpeech(w); break;
      case "clean": cleanCurrent(w); break;
      case "direction": w.dir = w.dir === "rtl" ? "ltr" : "rtl"; applyLook(w); break;
      case "smaller": setLook({ fontSize: Math.max(14, S.fontSize - 1) }); break;
      case "bigger": setLook({ fontSize: Math.min(36, S.fontSize + 1) }); break;
      case "theme": setLook({ theme: S.theme === "light" ? "dark" : S.theme === "dark" ? "system" : "light" }); break;
      case "edit": setEditing(w, !w.editing); break;
      case "library": showLibrary(w, !w.inLibrary); break;

      case "bold": case "italic": case "underline": case "undo":
        if (w.editing) { w.body.focus(); document.execCommand(name, false, null); updateCount(w); }
        break;
      case "reset":
        w.body.innerHTML = w.originalHtml;
        w.body.classList.toggle("rich", /<[a-z]/i.test(w.originalHtml));
        w.lang = "src";
        w.dir = detectDir(w.body.innerText);
        applyLook(w); updateCount(w); markLangs(w);
        break;

      case "libClear": clearLibrary(w); break;
      case "libExport": exportLibrary(w); break;
      case "libOpen": openSaved(w, btn.dataset.id); break;
      case "libDelete": deleteSaved(w, btn.dataset.id); break;
    }
  }

  function swapIcon(w, name, iconName, tipKey) {
    const btn = w.el.querySelector(`[data-act="${name}"]`);
    if (!btn) return;
    if (btn.dataset.icon !== iconName) { btn.innerHTML = icon(iconName); btn.dataset.icon = iconName; }
    if (tipKey) { btn.title = t(tipKey); btn.setAttribute("aria-label", t(tipKey)); }
  }

  /* ---------- pin & side panel ---------- */

  function togglePin(w) {
    w.pinned = !w.pinned;
    const btn = w.el.querySelector('[data-act="pin"]');
    btn.classList.toggle("active", w.pinned);
    btn.title = t(w.pinned ? "tipUnpin" : "tipPin");
    flash(w, t(w.pinned ? "pinOn" : "pinOff"));
    schedulePinSave();
  }

  let pinTimer;
  function schedulePinSave() {
    clearTimeout(pinTimer);
    pinTimer = setTimeout(savePins, 400);
  }

  function savePins() {
    if (!IS_TOP) return;
    const payload = wins.filter((w) => w.pinned).map((w) => ({
      html: w.body.classList.contains("rich") ? w.body.innerHTML.slice(0, 80000) : "",
      text: w.body.innerText.slice(0, 40000),
      title: w.src.textContent,
      dir: w.dir,
      state: w.state === "max" ? "normal" : w.state,
      geom: w.saved || w.geom
    }));
    try { chrome.runtime.sendMessage({ type: "B8_PIN_SAVE", wins: payload }, () => void chrome.runtime.lastError); } catch (e) { /* gone */ }
  }

  function toSidePanel(w) {
    const payload = {
      html: w.body.classList.contains("rich") ? w.body.innerHTML.slice(0, 80000) : "",
      text: w.body.innerText.slice(0, 40000),
      title: w.src.textContent,
      dir: w.dir
    };
    try {
      chrome.runtime.sendMessage({ type: "B8_SIDE", payload }, (res) => {
        if (chrome.runtime.lastError || !res || !res.ok) flash(w, t("sideFailed"));
      });
    } catch (e) { flash(w, t("sideFailed")); }
  }

  /* ---------- content ---------- */

  function setContent(w, payload) {
    const html = payload && payload.html ? payload.html : "";
    const text = payload && payload.text ? String(payload.text).replace(/\u00a0/g, " ") : "";
    if (html) { w.body.innerHTML = html; w.body.classList.add("rich"); }
    else { w.body.textContent = text; w.body.classList.remove("rich"); }
    w.dir = detectDir(text || w.body.innerText);
  }

  function setLook(patch) {
    Object.assign(S, patch);
    store.set("local", patch);
    repaint();
    wins.forEach(applyLook);
  }

  function applyLook(w) {
    repaint();
    w.body.style.fontSize = S.fontSize + "px";
    w.body.style.lineHeight = String(S.lineHeight);
    w.body.style.fontFamily = FONTS[S.fontFamily] || FONTS.vazir;
    w.body.dir = w.dir;
    w.body.style.textAlign = w.dir === "rtl" ? "right" : "left";
    swapIcon(w, "theme", S.theme === "light" ? "sun" : S.theme === "dark" ? "moon" : "system");
    swapIcon(w, "direction", w.dir === "rtl" ? "rtl" : "ltr");
  }

  function setEditing(w, on) {
    w.editing = !!on;
    w.body.setAttribute("contenteditable", w.editing ? "true" : "false");
    w.body.spellcheck = false;
    w.editbar.classList.toggle("on", w.editing);
    w.el.querySelector('[data-act="edit"]').classList.toggle("active", w.editing);
    swapIcon(w, "edit", w.editing ? "done" : "edit", w.editing ? "tipEditDone" : "tipEdit");
    if (!w.editing) return;
    w.body.focus({ preventScroll: true });
    try {
      const range = document.createRange();
      range.selectNodeContents(w.body);
      range.collapse(true);
      const sel = (shadow.getSelection ? shadow.getSelection() : null) || window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (e) { /* caret lands on first click */ }
  }

  /* ---------- text helpers ---------- */

  const RTL_RE = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/g;
  const LTR_RE = /[A-Za-z\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF]/g;

  function detectDir(text) {
    const sample = String(text || "").slice(0, 4000);
    return (sample.match(RTL_RE) || []).length >= (sample.match(LTR_RE) || []).length ? "rtl" : "ltr";
  }

  const fa = (n) => (FA_DIGITS ? String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]) : String(n));

  function updateCount(w) {
    const text = w.body.innerText.trim();
    const words = text ? text.split(/\s+/).length : 0;
    w.count.textContent = `${fa(words)} ${t("statWords")} · ${fa(text.length)} ${t("statChars")}`;
  }

  function flash(w, msg) {
    w.toast.textContent = msg;
    clearTimeout(w.toastTimer);
    w.toastTimer = setTimeout(() => { w.toast.textContent = ""; }, 2800);
  }

  function textNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.nodeValue && n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT)
    });
    const list = [];
    while (walker.nextNode()) list.push(walker.currentNode);
    return list;
  }

  async function copyText(w) {
    const text = w.body.innerText;
    const html = w.body.classList.contains("rich") ? w.body.innerHTML : "";
    try {
      if (html && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" })
        })]);
      } else {
        await navigator.clipboard.writeText(text);
      }
      flash(w, t("msgCopied"));
    } catch (err) {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;";
      document.body.appendChild(ta); ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (e2) { ok = false; }
      ta.remove();
      flash(w, ok ? t("msgCopied") : t("msgCopyFailed"));
    }
  }

  /* The link lives inside the shadow root and is clicked with a non-composed
     event, so the click never crosses the shadow boundary. Sites that capture
     every anchor click for their own router — chatgpt.com among them — call
     preventDefault() on it and used to cancel the download before it started.
     A synthetic click still runs the anchor's activation behaviour, so the
     file is saved by Chrome exactly as a real click would save it. */
  /* Two things have to be right for a download to start, and the second one
     is easy to miss. The link lives in the shadow root so page-level handlers
     that hijack anchor clicks never see it. The address matters just as much:
     a blob URL minted inside a content script can come back owned by the
     extension's origin rather than the page's, and Chrome ignores `download`
     on a cross-origin address — it treats the click as a navigation instead,
     which a page may not make to an extension URL, so nothing happened at all
     and nothing was logged. When the blob comes back cross-origin the anchor
     gets a data: URL instead, which `download` always honours. */
  function saveFile(name, content, mime) {
    /* A page kept open across an extension reload holds a detached copy of
       this script; anything it hands Chrome is dead on arrival. */
    if (!alive()) return null;

    const body = "\ufeff" + content;
    let url = "", revoke = false;
    try {
      const candidate = URL.createObjectURL(new Blob([body], { type: mime }));
      if (candidate.indexOf("blob:" + location.origin + "/") === 0) { url = candidate; revoke = true; }
      else URL.revokeObjectURL(candidate);
    } catch (e) { /* fall through to the data: URL */ }
    if (!url) url = "data:" + mime + "," + encodeURIComponent(body);

    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.style.cssText = "position:absolute;width:0;height:0;opacity:0;pointer-events:none";
    (stage || document.body || document.documentElement).appendChild(a);

    /* A normal click first, so the page behaves as it always does. Some sites
       (techcrunch.com among them) capture every anchor click for their own
       router and call preventDefault(), which cancels the download; dispatch
       reports that, and the retry uses an event that cannot leave the shadow
       root, so no page listener is ever offered the chance to cancel it. */
    const opts = { bubbles: true, cancelable: true, view: window };
    let started = a.dispatchEvent(new MouseEvent("click", { ...opts, composed: true }));
    if (!started) started = a.dispatchEvent(new MouseEvent("click", { ...opts, composed: false }));

    setTimeout(() => { a.remove(); if (revoke) URL.revokeObjectURL(url); }, 4000);
    return started;
  }

  const downloadNote = (result) =>
    t(result === true ? "msgDownloaded" : result === false ? "msgDownloadFailed" : "msgStale");

  function downloadText(w) {
    const name = (document.title || "focus-reader").replace(/[\\/:*?"<>|]+/g, " ").trim().slice(0, 60) || "focus-reader";
    flash(w, downloadNote(saveFile(name + ".txt", w.body.innerText, "text/plain;charset=utf-8")));
  }

  const fixChars = (s) => s
    .replace(/[\u00AD\u200B\u200E\u200F\u2060\uFEFF]/g, "")
    .replace(/\u0640/g, "")
    .replace(/[\u064B-\u0652\u0670]/g, "")
    .replace(/\u064A/g, "\u06CC").replace(/\u0643/g, "\u06A9")
    .replace(/[\u0660-\u0669]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 0x06F0))
    .replace(/[ \t\u00A0]+/g, " ")
    .replace(/ +([،؛؟!:.,;?])/g, "$1")
    .replace(/([،؛])(?=\S)/g, "$1 ");

  function cleanCurrent(w) {
    let changed = false;
    if (w.body.classList.contains("rich")) {
      for (const node of textNodes(w.body)) {
        const fixed = fixChars(node.nodeValue);
        if (fixed !== node.nodeValue) { node.nodeValue = fixed; changed = true; }
      }
    } else {
      const before = w.body.innerText;
      let after = fixChars(before).replace(/([A-Za-z\u0600-\u06FF])-\n([A-Za-z\u0600-\u06FF])/g, "$1$2");
      after = after.split("\n").map((line) => line.trim()).join("\n").replace(/\n{3,}/g, "\n\n").trim();
      if (after !== before) { w.body.textContent = after; changed = true; }
    }
    updateCount(w);
    flash(w, changed ? t("msgCleaned") : t("msgNoChange"));
  }

  /* ---------- speech ---------- */

  function voiceFor(lang) {
    const synth = window.speechSynthesis;
    if (!synth) return null;
    const voices = synth.getVoices() || [];
    const code = String(lang || "en").toLowerCase().split("-")[0];
    return voices.find((v) => String(v.lang || "").toLowerCase().split("-")[0] === code) || null;
  }

  function speechLang(w) {
    if (w.lang && w.lang !== "src") return w.lang;
    return w.dir === "rtl" ? "fa" : "en";
  }

  function toggleSpeech(w) {
    if (w.speaking) { stopSpeech(w); return; }
    const text = w.body.innerText.trim();
    if (!text) return;
    const lang = speechLang(w);

    const start = () => {
      const voice = voiceFor(lang);
      if (voice) {
        const utter = new SpeechSynthesisUtterance(text);
        utter.voice = voice;
        utter.lang = voice.lang;
        utter.onend = () => setSpeaking(w, false);
        utter.onerror = () => { setSpeaking(w, false); flash(w, t("msgNoVoice")); };
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
        setSpeaking(w, true);
        return;
      }
      if (!S.ttsWeb) { flash(w, t("msgNoVoice")); return; }
      webSpeak(w, text, lang);
    };

    const synth = window.speechSynthesis;
    if (synth && (!synth.getVoices() || !synth.getVoices().length)) {
      synth.addEventListener("voiceschanged", start, { once: true });
      setTimeout(start, 400);
    } else {
      start();
    }
  }

  function webSpeak(w, text, lang) {
    setBusy(w, true);
    flash(w, t("aiWorking"));
    try {
      chrome.runtime.sendMessage({ type: "B8_TTS", text, lang }, (res) => {
        setBusy(w, false);
        if (chrome.runtime.lastError || !res || !res.ok || !res.clips || !res.clips.length) { flash(w, t("msgNoVoice")); return; }
        setSpeaking(w, true);
        let index = 0;
        const playNext = () => {
          if (!w.speaking || index >= res.clips.length) { setSpeaking(w, false); return; }
          audio = new Audio(res.clips[index++]);
          audio.onended = playNext;
          audio.onerror = () => setSpeaking(w, false);
          audio.play().catch(() => setSpeaking(w, false));
        };
        playNext();
      });
    } catch (e) { setBusy(w, false); flash(w, t("msgNoVoice")); }
  }

  function stopSpeech(w) {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (audio) { try { audio.pause(); } catch (e) { /* ignore */ } audio = null; }
    setSpeaking(w, false);
  }

  function setSpeaking(w, on) {
    w.speaking = on;
    w.el.querySelector('[data-act="speak"]').classList.toggle("active", on);
    swapIcon(w, "speak", on ? "stop" : "speak", on ? "tipStop" : "tipSpeak");
  }

  /* ---------- translation ---------- */

  function showTranslate(w, on) {
    w.trOpen = !!on;
    w.trSheet.classList.toggle("on", w.trOpen);
    w.el.querySelector('[data-act="translate"]').classList.toggle("active", w.trOpen);
    if (w.trOpen) { showAI(w, false); showLibrary(w, false); markLangs(w); }
  }

  function markLangs(w) {
    for (const chip of w.trSheet.querySelectorAll("[data-lang]")) {
      chip.classList.toggle("on", chip.dataset.lang === w.lang);
    }
  }

  async function detectSource(sample) {
    try {
      if ("LanguageDetector" in self) {
        const availability = await self.LanguageDetector.availability();
        if (availability !== "unavailable") {
          const detector = await self.LanguageDetector.create();
          const results = await detector.detect(sample);
          if (results && results[0] && results[0].detectedLanguage) return results[0].detectedLanguage.split("-")[0];
        }
      }
    } catch (e) { /* fall through */ }
    return detectDir(sample) === "rtl" ? "fa" : "en";
  }

  /* Returns the engine name it used, or null. Translates the nodes in place. */
  async function runEngines(nodes, source, target, onProgress) {
    if ("Translator" in self) {
      try {
        const options = { sourceLanguage: source, targetLanguage: target };
        const availability = await self.Translator.availability(options);
        if (availability !== "unavailable") {
          if (onProgress) onProgress(availability === "available" ? null : 0);
          const translator = await self.Translator.create({
            ...options,
            monitor(m) {
              m.addEventListener("downloadprogress", (e) => { if (onProgress) onProgress(Math.round((e.loaded || 0) * 100)); });
            }
          });
          for (let i = 0; i < nodes.length; i += 4) {
            const slice = nodes.slice(i, i + 4);
            const done = await Promise.all(slice.map((n) => translator.translate(n.nodeValue).catch(() => n.nodeValue)));
            slice.forEach((n, k) => { n.nodeValue = done[k]; });
          }
          if (translator.destroy) translator.destroy();
          return "chrome";
        }
      } catch (err) {
        if (String(err && err.name) === "NotAllowedError") return "gesture";
      }
    }

    if (S.trWeb) {
      try {
        const texts = nodes.map((n) => n.nodeValue);
        const reply = await new Promise((resolve) => {
          chrome.runtime.sendMessage({ type: "B8_TRANSLATE", texts, source, target }, (res) => {
            resolve(chrome.runtime.lastError ? null : res);
          });
        });
        if (reply && reply.ok && reply.texts) {
          nodes.forEach((n, i) => { n.nodeValue = reply.texts[i] != null ? reply.texts[i] : n.nodeValue; });
          return "web";
        }
      } catch (e) { /* fall through */ }
    }
    return null;
  }

  async function translateTo(w, target) {
    if (w.busy) return;

    if (target === "src") {
      w.body.innerHTML = w.versions.src || w.originalHtml;
      w.body.classList.toggle("rich", /<[a-z]/i.test(w.body.innerHTML));
      w.lang = "src";
      w.dir = detectDir(w.body.innerText);
      applyLook(w); updateCount(w); markLangs(w); showTranslate(w, false);
      flash(w, t("trCached"));
      return;
    }

    // already translated and not the language on screen → instant swap
    if (w.versions[target] && w.lang !== target) {
      w.body.innerHTML = w.versions[target];
      w.body.classList.toggle("rich", /<[a-z]/i.test(w.body.innerHTML));
      w.lang = target;
      w.dir = detectDir(w.body.innerText);
      applyLook(w); updateCount(w); markLangs(w); showTranslate(w, false);
      flash(w, t("trCached"));
      return;
    }

    setBusy(w, true);

    // always translate from the original, never from a translation
    const base = w.versions.src || w.originalHtml;
    if (base) {
      w.body.innerHTML = base;
      w.body.classList.toggle("rich", /<[a-z]/i.test(base));
    }

    if (!w.baseLang) w.baseLang = await detectSource(w.body.innerText.slice(0, 800));
    if (w.baseLang === target) {
      w.lang = "src"; markLangs(w);
      flash(w, t("trSame")); setBusy(w, false);
      return;
    }

    const nodes = textNodes(w.body);
    if (!nodes.length) { setBusy(w, false); flash(w, t("msgNoSelection")); return; }

    const engine = await runEngines(nodes, w.baseLang, target, (progress) => {
      flash(w, progress == null ? t("aiWorking") : `${t("trDownloading")} ${fa(progress)}%`);
    });

    if (engine === "gesture") { setBusy(w, false); flash(w, t("trRetry")); return; }

    if (engine) {
      w.versions[target] = w.body.innerHTML;
      w.lang = target;
      w.dir = detectDir(w.body.innerText);
      applyLook(w); updateCount(w); markLangs(w); showTranslate(w, false);
      flash(w, engine === "chrome" ? t("trViaChrome") : t("trViaWeb"));
      setBusy(w, false);
      schedulePinSave();
      return;
    }

    setBusy(w, false);
    flash(w, t("trFallback"));
    askAI(w, "ask", `Translate the text into ${langLabel(target)} (language code: ${target}). Keep the tone and the line breaks. Return only the translation.`);
  }

  /* the one-tap bubble: no window, just the meaning */
  async function quickTranslate() {
    const picked = readSelection();
    const text = picked.text.trim();
    if (!text) return;
    const rect = selectionRect();
    hideMini();
    showBubble(rect, t("aiWorking"), false);

    const source = await detectSource(text.slice(0, 400));
    const target = S.trTarget || "fa";
    if (source === target) { showBubble(rect, t("trSame"), false); return; }

    const holder = document.createElement("div");
    holder.textContent = text;
    const engine = await runEngines(textNodes(holder), source, target, null);
    if (!engine || engine === "gesture") { showBubble(rect, t("trRetry"), false); return; }
    showBubble(rect, holder.innerText, true);
  }

  function showBubble(rect, text, withActions) {
    ensureStage();
    bubble.dataset.text = text;
    const dir = detectDir(text);
    bubble.innerHTML = `<div dir="${dir}" style="text-align:${dir === "rtl" ? "right" : "left"}">${escapeHtml(text)}</div>` +
      (withActions ? `<div class="brow"><button class="btn" type="button" data-bubble="expand">${t("bubbleOpen")}</button><span class="grow"></span></div>` : "");
    bubble.style.fontFamily = FONTS[S.fontFamily] || FONTS.vazir;
    bubble.classList.add("on");
    const width = Math.min(340, bubble.offsetWidth || 340);
    let top = (rect ? rect.bottom : 60) + 10;
    if (top + bubble.offsetHeight > window.innerHeight - 8) top = Math.max(8, (rect ? rect.top : 60) - bubble.offsetHeight - 10);
    const anchor = rect ? (UI_DIR === "rtl" ? rect.right - width : rect.left) : 40;
    bubble.style.top = top + "px";
    bubble.style.left = Math.min(Math.max(8, anchor), window.innerWidth - width - 8) + "px";
  }

  function hideBubble() { if (bubble) bubble.classList.remove("on"); }

  /* ---------- AI ---------- */

  function showAI(w, on) {
    w.aiOpen = !!on;
    w.aiSheet.classList.toggle("on", w.aiOpen);
    w.el.querySelector('[data-act="ai"]').classList.toggle("active", w.aiOpen);
    if (w.aiOpen) { showTranslate(w, false); showLibrary(w, false); setTimeout(() => w.aiInput.focus(), 60); }
  }

  function setBusy(w, on) {
    w.busy = on;
    w.el.classList.toggle("busy", on);
    for (const btn of w.el.querySelectorAll(".tool, .chip")) {
      if (on) btn.setAttribute("disabled", "disabled"); else btn.removeAttribute("disabled");
    }
  }

  function askAI(w, task, instruction) {
    if (w.busy) return;
    const text = w.body.innerText.trim();
    if (!text) { flash(w, t("msgNoSelection")); return; }

    setBusy(w, true);
    flash(w, t("aiWorking"));
    try {
      chrome.runtime.sendMessage({ type: "B8_AI", task, text, instruction }, (res) => {
        setBusy(w, false);
        if (chrome.runtime.lastError || !res) { flash(w, t("aiFailed")); return; }
        if (!res.ok) { flash(w, res.error === "NO_KEY" ? t("aiNotSet") : `${t("aiFailed")}: ${res.error}`); return; }
        w.body.textContent = res.text;
        w.body.classList.remove("rich");
        w.dir = detectDir(res.text);
        applyLook(w); updateCount(w);
        w.body.parentElement.scrollTop = 0;
        showAI(w, false); showTranslate(w, false);
        w.aiInput.value = "";
        flash(w, t("aiDone"));
        schedulePinSave();
      });
    } catch (e) { setBusy(w, false); flash(w, t("aiFailed")); }
  }

  /* ---------- saved texts ---------- */

  const withSaved = (cb) => store.get("local", { saved: [] }, (v) => cb(v.saved || []));

  function saveCurrent(w) {
    const text = w.body.innerText.trim();
    if (!text) return;
    withSaved((saved) => {
      saved.unshift({
        id: String(Date.now()) + Math.random().toString(36).slice(2, 6),
        text: text.slice(0, 20000),
        html: w.body.classList.contains("rich") ? w.body.innerHTML.slice(0, 60000) : "",
        title: document.title || location.hostname,
        url: location.href,
        ts: Date.now()
      });
      store.set("local", { saved: saved.slice(0, 200) });
      flash(w, t("msgSaved"));
    });
  }

  function showLibrary(w, on) {
    w.inLibrary = !!on;
    w.body.classList.toggle("off", w.inLibrary);
    w.library.classList.toggle("on", w.inLibrary);
    w.el.querySelector('[data-act="library"]').classList.toggle("active", w.inLibrary);
    swapIcon(w, "library", w.inLibrary ? "back" : "library", w.inLibrary ? "tipReader" : "tipLibrary");
    if (w.inLibrary) { setEditing(w, false); showAI(w, false); showTranslate(w, false); renderLibrary(w); }
  }

  function renderLibrary(w) {
    withSaved((saved) => {
      const head = `<div class="libhead"><b>${t("libraryTitle")}</b><span class="grow"></span>
        ${saved.length ? `<button class="libbtn" type="button" data-act="libExport">${t("libExport")}</button>
        <button class="libbtn danger" type="button" data-act="libClear">${t("libraryClear")}</button>` : ""}</div>`;

      if (!saved.length) { w.library.innerHTML = head + `<div class="empty">${t("libraryEmpty")}</div>`; return; }

      w.library.innerHTML = head + saved.map((item) => {
        const dir = detectDir(item.text);
        const date = new Date(item.ts).toLocaleDateString(UI_LANG);
        return `<div class="item">
          <div class="txt">
            <div class="snip" dir="${dir}" style="text-align:${dir === "rtl" ? "right" : "left"}">${escapeHtml(item.text.slice(0, 220))}</div>
            <div class="meta">${escapeHtml(item.title)} · ${date}</div>
          </div>
          <div class="acts">
            <button class="tool" type="button" data-act="libOpen" data-id="${item.id}" title="${t("tipOpenItem")}" aria-label="${t("tipOpenItem")}">${icon("open")}</button>
            <button class="tool" type="button" data-act="libDelete" data-id="${item.id}" title="${t("tipDeleteItem")}" aria-label="${t("tipDeleteItem")}">${icon("trash")}</button>
          </div>
        </div>`;
      }).join("");
    });
  }

  function openSaved(w, id) {
    withSaved((saved) => {
      const item = saved.find((x) => x.id === id);
      if (!item) return;
      setContent(w, { html: item.html, text: item.text });
      w.originalHtml = w.body.innerHTML;
      w.versions = { src: w.originalHtml };
      w.lang = "src"; w.baseLang = "";
      w.src.textContent = item.title || "";
      showLibrary(w, false);
      applyLook(w); updateCount(w);
    });
  }

  function deleteSaved(w, id) {
    withSaved((saved) => {
      store.set("local", { saved: saved.filter((x) => x.id !== id) });
      flash(w, t("msgDeleted"));
      setTimeout(() => renderLibrary(w), 60);
    });
  }

  function clearLibrary(w) {
    store.set("local", { saved: [] });
    flash(w, t("msgDeleted"));
    setTimeout(() => renderLibrary(w), 60);
  }

  function exportLibrary(w) {
    withSaved((saved) => {
      const body = saved.map((item) =>
        `--- ${item.title}\n${item.url}\n${new Date(item.ts).toLocaleString(UI_LANG)}\n\n${item.text}\n`
      ).join("\n\n");
      flash(w, downloadNote(saveFile("focus-reader-saved.txt", body, "text/plain;charset=utf-8")));
    });
  }

  const escapeHtml = (str) => String(str).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- whole page ---------- */

  function extractArticle() {
    const seeds = document.querySelectorAll("article, main, [role='main'], #content, .content, .post, .entry-content, .article-body");
    let best = null, bestLen = 0;
    for (const el of seeds) {
      const len = (el.innerText || "").trim().length;
      if (len > bestLen) { best = el; bestLen = len; }
    }
    if (bestLen < 400) {
      const buckets = new Map();
      document.querySelectorAll("p").forEach((p) => {
        const len = (p.innerText || "").trim().length;
        if (len < 40 || !p.parentElement) return;
        buckets.set(p.parentElement, (buckets.get(p.parentElement) || 0) + len);
      });
      for (const [el, len] of buckets) if (len > bestLen) { best = el; bestLen = len; }
    }
    if (!best) return { text: "", html: "" };
    const clone = best.cloneNode(true);
    clone.querySelectorAll("nav, aside, footer, header, form, button, script, style, noscript").forEach((n) => n.remove());
    return { text: best.innerText.trim(), html: sanitizeFragment(clone) };
  }

  /* ---------- selection trigger ---------- */

  function selectionRect() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const rects = sel.getRangeAt(0).getClientRects();
    return rects.length ? rects[rects.length - 1] : null;
  }

  function showMini() {
    const rect = selectionRect();
    if (!rect) return;
    ensureStage();
    miniBar.classList.add("on");
    if (!scrollBound) {
      scrollBound = true;
      document.addEventListener("scroll", () => { hideMini(); hideBubble(); }, { capture: true, passive: true });
    }
    const width = miniBar.offsetWidth || 74, height = 38;
    let top = rect.bottom + 8;
    if (top + height > window.innerHeight - 6) top = Math.max(6, rect.top - height - 8);
    const anchor = UI_DIR === "rtl" ? rect.right - width : rect.left;
    miniBar.style.top = top + "px";
    miniBar.style.left = Math.min(Math.max(6, anchor), window.innerWidth - width - 6) + "px";
  }

  function hideMini() { if (miniBar) miniBar.classList.remove("on"); }

  const fromPanel = (e) => host && e.composedPath && e.composedPath().some((n) => n === host);

  function maybeShowMini() {
    const sel = window.getSelection();
    if (!sel || !sel.toString().trim()) { hideMini(); return; }
    ensureSettings(() => {
      if (!S.trgButton) { hideMini(); return; }
      const still = window.getSelection();
      if (still && still.toString().trim()) showMini();
    });
  }

  document.addEventListener("mouseup", (e) => {
    if (fromPanel(e)) return;
    setTimeout(maybeShowMini, 10);
  }, { capture: true, passive: true });

  document.addEventListener("mousedown", (e) => { if (!fromPanel(e)) { hideMini(); hideBubble(); } }, { capture: true, passive: true });
  window.addEventListener("blur", hideMini, { passive: true });
  document.addEventListener("keyup", (e) => { if (e.shiftKey && !fromPanel(e)) maybeShowMini(); }, { capture: true, passive: true });

  /* ---------- messages ---------- */

  try {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (!msg || !msg.type) return;

      if (msg.type === "B8_SHOW") {
        // Ctrl+B belongs to the editor while a window is being edited.
        const editing = editingWin();
        if (editing && !msg.translate) {
          editing.body.focus();
          document.execCommand("bold", false, null);
          sendResponse({ ok: true });
          return true;
        }
        const picked = readSelection();
        const framed = document.activeElement && document.activeElement.tagName === "IFRAME";
        let w = null;
        if (picked.text.trim()) w = openContent(picked);
        else if (msg.fallbackText) w = openContent({ text: msg.fallbackText, html: "" });
        else if (IS_TOP && !framed) w = openContent(null);
        if (w && msg.translate) ensureSettings(() => translateTo(w, S.trTarget || "fa"));
        sendResponse({ ok: true });
      }

      if (msg.type === "B8_READ_PAGE" && IS_TOP) {
        const article = extractArticle();
        const w = openContent(article.text ? article : null);
        if (!article.text) flash(w, t("msgNoArticle"));
        sendResponse({ ok: true });
      }

      if (msg.type === "B8_LIBRARY" && IS_TOP) {
        showLibrary(openContent(null, null, true), true);
        sendResponse({ ok: true });
      }

      if (msg.type === "B8_RESTORE" && IS_TOP && msg.wins) {
        ensureSettings(() => {
          for (const saved of msg.wins) {
            const w = openContent({ html: saved.html, text: saved.text }, saved.title, true);
            w.pinned = true;
            w.el.querySelector('[data-act="pin"]').classList.add("active");
            if (saved.dir) { w.dir = saved.dir; applyLook(w); }
            if (saved.geom) { w.geom = saved.geom; clampWin(w); }
            if (saved.state === "min") minimize(w);
          }
        });
        sendResponse({ ok: true });
      }

      return true;
    });
  } catch (e) { /* context gone */ }
})();
