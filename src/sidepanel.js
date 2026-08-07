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

/* Focus Reader — side panel · byB8 · https://by.b8hnam.com/
 * Stays put while you browse: the panel belongs to the tab, not the page. */

const LOOK = { fontSize: 19, lineHeight: 2, fontFamily: "vazir", theme: "system", accent: "brand", trTarget: "fa", trWeb: true };
const FONTS = {
  vazir: '"B8 Vazirmatn", Vazirmatn, Tahoma, sans-serif',
  sans: '"Segoe UI", Roboto, "Noto Sans", Tahoma, Arial, sans-serif',
  serif: '"Noto Naskh Arabic", "Times New Roman", Georgia, serif',
  mono: '"Cascadia Mono", Consolas, "Courier New", monospace'
};

const UI_LANG = chrome.i18n.getUILanguage();
document.documentElement.dir = chrome.i18n.getMessage("@@bidi_dir") || "ltr";
document.documentElement.lang = UI_LANG;

const reader = document.getElementById("reader");
const titleEl = document.getElementById("title");
const hintEl = document.getElementById("hint");
const copyBtn = document.getElementById("copy");
const translateBtn = document.getElementById("translate");

copyBtn.textContent = chrome.i18n.getMessage("tipCopy");
translateBtn.textContent = chrome.i18n.getMessage("tipTranslate");
hintEl.textContent = chrome.i18n.getMessage("sidePanelHint");

const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
const S = { ...LOOK };

function repaint() {
  const dark = S.theme === "dark" || (S.theme === "system" && darkQuery.matches);
  self.B8Palette.paint(document.documentElement, S.accent, dark);
  reader.style.fontSize = S.fontSize + "px";
  reader.style.lineHeight = String(S.lineHeight);
  reader.style.fontFamily = FONTS[S.fontFamily] || FONTS.vazir;
}
darkQuery.addEventListener("change", repaint);

chrome.storage.local.get(LOOK, (values) => { Object.assign(S, values); repaint(); });
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  for (const key in changes) if (key in S) S[key] = changes[key].newValue;
  repaint();
});

const RTL_RE = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\uFB1D-\uFDFF\uFE70-\uFEFF]/g;
const LTR_RE = /[A-Za-z\u00C0-\u024F\u0400-\u04FF]/g;
const detectDir = (text) =>
  (String(text).match(RTL_RE) || []).length >= (String(text).match(LTR_RE) || []).length ? "rtl" : "ltr";

function render(payload) {
  if (!payload || !String(payload.text || "").trim()) {
    reader.innerHTML = `<div class="empty">${chrome.i18n.getMessage("sideEmpty")}</div>`;
    reader.classList.remove("rich");
    copyBtn.hidden = translateBtn.hidden = true;
    return;
  }
  copyBtn.hidden = translateBtn.hidden = false;
  if (payload.html) { reader.innerHTML = payload.html; reader.classList.add("rich"); }
  else { reader.textContent = payload.text; reader.classList.remove("rich"); }
  const dir = payload.dir || detectDir(payload.text);
  reader.dir = dir;
  reader.style.textAlign = dir === "rtl" ? "right" : "left";
  titleEl.textContent = payload.title || "Focus Reader";
}

function load() {
  chrome.runtime.sendMessage({ type: "B8_SIDE_GET" }, (res) => {
    if (chrome.runtime.lastError) { render(null); return; }
    render(res && res.payload);
  });
}
load();
chrome.tabs.onActivated.addListener(load);
setInterval(load, 4000);

copyBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(reader.innerText).then(() => {
    hintEl.textContent = chrome.i18n.getMessage("msgCopied");
    setTimeout(() => { hintEl.textContent = chrome.i18n.getMessage("sidePanelHint"); }, 2000);
  }).catch(() => { /* ignore */ });
});

translateBtn.addEventListener("click", async () => {
  const nodes = [];
  const walker = document.createTreeWalker(reader, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.nodeValue && n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT)
  });
  while (walker.nextNode()) nodes.push(walker.currentNode);
  if (!nodes.length) return;

  const source = detectDir(reader.innerText) === "rtl" ? "fa" : "en";
  const target = S.trTarget || "fa";
  if (source === target) { hintEl.textContent = chrome.i18n.getMessage("trSame"); return; }

  translateBtn.textContent = chrome.i18n.getMessage("aiWorking");

  if ("Translator" in self) {
    try {
      const options = { sourceLanguage: source, targetLanguage: target };
      if (await self.Translator.availability(options) !== "unavailable") {
        const translator = await self.Translator.create(options);
        for (const node of nodes) node.nodeValue = await translator.translate(node.nodeValue).catch(() => node.nodeValue);
        finish(chrome.i18n.getMessage("trViaChrome"));
        return;
      }
    } catch (e) { /* fall through */ }
  }

  if (S.trWeb) {
    chrome.runtime.sendMessage({ type: "B8_TRANSLATE", texts: nodes.map((n) => n.nodeValue), source, target }, (res) => {
      if (!chrome.runtime.lastError && res && res.ok && res.texts) {
        nodes.forEach((n, i) => { n.nodeValue = res.texts[i] != null ? res.texts[i] : n.nodeValue; });
        finish(chrome.i18n.getMessage("trViaWeb"));
      } else {
        finish(chrome.i18n.getMessage("aiFailed"));
      }
    });
    return;
  }
  finish(chrome.i18n.getMessage("aiFailed"));
});

function finish(message) {
  translateBtn.textContent = chrome.i18n.getMessage("tipTranslate");
  hintEl.textContent = message;
  const dir = detectDir(reader.innerText);
  reader.dir = dir;
  reader.style.textAlign = dir === "rtl" ? "right" : "left";
  setTimeout(() => { hintEl.textContent = chrome.i18n.getMessage("sidePanelHint"); }, 2600);
}
