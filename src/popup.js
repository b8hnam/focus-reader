/*
 * Focus Reader — Copyright (C) 2026 Behnam Azimi (B8hnam)
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
 * The name "Focus Reader", the byB8 and B8hnam names, and the logo and icon
 * files are NOT covered by this licence — see TRADEMARK.md.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/* Focus Reader — settings · byB8 · https://by.b8hnam.com/focus-reader/ */

const TRIGGERS = { trgButton: true, trgKey: true, trgMenu: true };
const SEGMENTS = { theme: "system", fontFamily: "vazir", lineHeight: 2 };
const SWITCHES = { dimPage: false, trWeb: true, ttsWeb: false };
const AI = { aiProvider: "openai", aiKey: "", aiModel: "", aiBase: "" };
const LANGS = ["fa", "en", "ar", "ku", "tr", "de", "fr", "es", "ru", "zh", "hi", "ja"];

const AI_HINTS = {
  openai:    { model: "gpt-4o-mini", base: "https://api.openai.com/v1" },
  anthropic: { model: "claude-sonnet-5", base: "https://api.anthropic.com" },
  gemini:    { model: "gemini-2.5-flash", base: "https://generativelanguage.googleapis.com/v1beta" },
  custom:    { model: "model-name", base: "https://…/v1" }
};

const UI_LANG = chrome.i18n.getUILanguage();
document.documentElement.dir = chrome.i18n.getMessage("@@bidi_dir") || "ltr";
document.documentElement.lang = UI_LANG;

for (const node of document.querySelectorAll("[data-i18n]")) {
  node.textContent = chrome.i18n.getMessage(node.dataset.i18n);
}
document.getElementById("aiKey").placeholder = chrome.i18n.getMessage("aiKeyPlaceholder");

/* The same page serves the toolbar popup and the full options tab, but they
   are used differently. The popup sits on top of a page, so it leads with the
   three actions; the options tab has no page to act on, so it drops them and
   spreads the remaining sections over two columns of roughly equal height
   instead of one tall one. */
if (window.innerWidth > 460) {
  document.body.classList.add("wide");
  layoutOptions();
}

function layoutOptions() {
  // "Dim the page behind" belongs with the panel settings once the actions go
  document.getElementById("panelRows").prepend(document.getElementById("dimRow"));
  document.getElementById("secActions").hidden = true;

  const colA = document.getElementById("colA");
  const colB = document.getElementById("colB");
  colA.append(document.getElementById("secLook"), document.getElementById("secPanel"));
  colB.append(document.getElementById("secAI"), document.getElementById("secHow"));
}

/* ---------- colours ---------- */

const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
let accentMode = "brand", themeMode = "system";

function repaint() {
  const dark = themeMode === "dark" || (themeMode === "system" && darkQuery.matches);
  self.B8Palette.paint(document.documentElement, accentMode, dark);
}
darkQuery.addEventListener("change", repaint);

/* ---------- triggers ---------- */

chrome.storage.sync.get(TRIGGERS, (settings) => {
  for (const key of Object.keys(TRIGGERS)) {
    const box = document.getElementById(key);
    box.checked = !!settings[key];
    box.addEventListener("change", () => chrome.storage.sync.set({ [key]: box.checked }));
  }
});

const keyHint = document.getElementById("keyHint");
chrome.commands.getAll((commands) => {
  const label = (name, textKey) => {
    const found = (commands || []).find((c) => c.name === name);
    return `${chrome.i18n.getMessage(textKey)}: ${found && found.shortcut ? found.shortcut : "—"}`;
  };
  keyHint.textContent = `${label("show-selection", "shortcutNow")} · ${label("translate-selection", "trShortcut")}`;
});

document.getElementById("shortcut").addEventListener("click", () => {
  chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
});

/* ---------- segmented controls ---------- */

function segment(key, onPick) {
  const group = document.getElementById(key);
  const paint = (value) => {
    for (const btn of group.children) btn.classList.toggle("on", btn.dataset.value === String(value));
  };
  group.addEventListener("click", (event) => {
    const btn = event.target.closest("button");
    if (!btn) return;
    paint(btn.dataset.value);
    onPick(btn.dataset.value);
  });
  return paint;
}

chrome.storage.local.get({ ...SEGMENTS, accent: "brand" }, (values) => {
  themeMode = values.theme;
  accentMode = values.accent;
  repaint();

  for (const key of Object.keys(SEGMENTS)) {
    const paint = segment(key, (raw) => {
      const value = key === "lineHeight" ? Number(raw) : raw;
      chrome.storage.local.set({ [key]: value });
      if (key === "theme") { themeMode = value; repaint(); }
    });
    paint(values[key]);
  }

  const paintAccent = segment("accent", (raw) => {
    // a random accent only ever rolls the hue — lightness and saturation stay safe
    accentMode = raw === "random" ? self.B8Palette.rollHue() : raw;
    chrome.storage.local.set({ accent: accentMode });
    repaint();
  });
  paintAccent(typeof values.accent === "number" ? "random" : values.accent);
});

/* ---------- panel switches ---------- */

chrome.storage.local.get(SWITCHES, (values) => {
  for (const key of Object.keys(SWITCHES)) {
    const box = document.getElementById(key);
    box.checked = !!values[key];
    box.addEventListener("change", () => chrome.storage.local.set({ [key]: box.checked }));
  }
});

/* ---------- default translation language ---------- */

const target = document.getElementById("trTarget");
let names;
try { names = new Intl.DisplayNames([UI_LANG], { type: "language" }); } catch (e) { names = { of: (c) => c }; }
for (const code of LANGS) {
  const option = document.createElement("option");
  option.value = code;
  option.textContent = names.of(code) || code;
  target.appendChild(option);
}
chrome.storage.local.get({ trTarget: "fa" }, (values) => {
  target.value = values.trTarget;
  target.addEventListener("change", () => chrome.storage.local.set({ trTarget: target.value }));
});

/* ---------- AI connection ---------- */

const aiKey = document.getElementById("aiKey");
const aiModel = document.getElementById("aiModel");
const aiBase = document.getElementById("aiBase");
const aiNote = document.getElementById("aiNote");

function applyHints(provider) {
  const hint = AI_HINTS[provider] || AI_HINTS.openai;
  aiModel.placeholder = hint.model;
  aiBase.placeholder = hint.base;
}

chrome.storage.local.get(AI, (cfg) => {
  const paint = segment("aiProvider", (raw) => {
    chrome.storage.local.set({ aiProvider: raw });
    applyHints(raw);
  });
  paint(cfg.aiProvider);
  applyHints(cfg.aiProvider);
  aiKey.value = cfg.aiKey || "";
  aiModel.value = cfg.aiModel || "";
  aiBase.value = cfg.aiBase || "";
});

let saveTimer;
for (const [field, key] of [[aiKey, "aiKey"], [aiModel, "aiModel"], [aiBase, "aiBase"]]) {
  field.addEventListener("input", () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => chrome.storage.local.set({ [key]: field.value.trim() }), 250);
  });
}

document.getElementById("aiTest").addEventListener("click", (event) => {
  const button = event.currentTarget;
  chrome.storage.local.set({ aiKey: aiKey.value.trim(), aiModel: aiModel.value.trim(), aiBase: aiBase.value.trim() }, () => {
    button.textContent = chrome.i18n.getMessage("aiWorking");
    chrome.runtime.sendMessage(
      { type: "B8_AI", task: "ask", text: "ping", instruction: "Reply with the single word OK." },
      (res) => {
        button.textContent = chrome.i18n.getMessage("aiTest");
        aiNote.classList.remove("ok");
        if (chrome.runtime.lastError || !res) { aiNote.textContent = chrome.i18n.getMessage("aiFailed"); return; }
        if (res.ok) { aiNote.textContent = chrome.i18n.getMessage("aiTestOk"); aiNote.classList.add("ok"); }
        else {
          aiNote.textContent = res.error === "NO_KEY"
            ? chrome.i18n.getMessage("aiNotSet")
            : `${chrome.i18n.getMessage("aiFailed")}: ${res.error}`;
        }
      }
    );
  });
});

/* ---------- panel actions ---------- */

const note = document.getElementById("note");

function relay(type) {
  chrome.runtime.sendMessage({ type: "B8_RELAY", payload: { type } }, (response) => {
    if (chrome.runtime.lastError || !response || !response.ok) {
      note.textContent = chrome.i18n.getMessage("pageUnavailable");
      note.hidden = false;
      return;
    }
    window.close();
  });
}

document.getElementById("readPage").addEventListener("click", () => relay("B8_READ_PAGE"));
document.getElementById("openLibrary").addEventListener("click", () => relay("B8_LIBRARY"));

document.getElementById("openSide").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab || tab.id == null) return;
    try { chrome.sidePanel.open({ tabId: tab.id }); window.close(); }
    catch (e) { note.textContent = chrome.i18n.getMessage("pageUnavailable"); note.hidden = false; }
  });
});
