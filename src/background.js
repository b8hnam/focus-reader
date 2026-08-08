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
 *  Focus Reader — background service worker
 *  byB8 · https://by.b8hnam.com/focus-reader/
 *  ============================================================ */

const MENU_OPEN = "b8-open";
const MENU_TRANSLATE = "b8-translate";
const TRIGGER_DEFAULTS = { trgButton: true, trgKey: true, trgMenu: true };

const AI_DEFAULTS = { aiProvider: "openai", aiKey: "", aiModel: "", aiBase: "" };
const AI_FALLBACK = {
  openai:    { base: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  anthropic: { base: "https://api.anthropic.com", model: "claude-sonnet-5" },
  gemini:    { base: "https://generativelanguage.googleapis.com/v1beta", model: "gemini-2.5-flash" },
  custom:    { base: "", model: "" }
};

const PROMPTS = {
  summarize:   "Summarize the text below clearly and concisely. Reply in the same language as the text. Return only the summary, with no preamble.",
  keyPoints:   "Pull out the key points of the text below as a short list, one point per line, each starting with •. Reply in the same language as the text. Return only the list.",
  simplify:    "Rewrite the text below in plain language that a newcomer to the topic can follow. Keep every fact intact. Reply in the same language as the text. Return only the rewritten text.",
  proofread:   "Correct the spelling, grammar, and punctuation of the text below without changing its meaning, tone, or structure. Reply in the same language as the text. Return only the corrected text."
};

/* ---------- menus ---------- */

let menuRefreshChain = Promise.resolve();

function refreshMenu() {
  // Chained so overlapping calls (onInstalled + onStartup + a rapid
  // settings toggle) never run removeAll()/create() concurrently —
  // that race is what caused "Cannot create item with duplicate id".
  menuRefreshChain = menuRefreshChain.then(async () => {
    await chrome.contextMenus.removeAll();
    const settings = await chrome.storage.sync.get(TRIGGER_DEFAULTS);
    if (!settings.trgMenu) return;
    await chrome.contextMenus.create({ id: MENU_OPEN, title: chrome.i18n.getMessage("menuShow"), contexts: ["selection"] });
    await chrome.contextMenus.create({ id: MENU_TRANSLATE, title: chrome.i18n.getMessage("menuTranslate"), contexts: ["selection"] });
  }).catch((err) => console.warn("Focus Reader: menu refresh failed", err));
  return menuRefreshChain;
}

chrome.runtime.onInstalled.addListener(refreshMenu);
chrome.runtime.onStartup.addListener(refreshMenu);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.trgMenu) refreshMenu();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || tab.id == null) return;
  if (info.menuItemId === MENU_OPEN) {
    deliver(tab.id, { type: "B8_SHOW", fallbackText: info.selectionText || "" }, info.frameId);
  } else if (info.menuItemId === MENU_TRANSLATE) {
    deliver(tab.id, { type: "B8_SHOW", fallbackText: info.selectionText || "", translate: true }, info.frameId);
  }
});

/* ---------- shortcuts ---------- */

chrome.commands.onCommand.addListener(async (command) => {
  const settings = await chrome.storage.sync.get(TRIGGER_DEFAULTS);
  if (!settings.trgKey) return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || tab.id == null) return;
  if (command === "show-selection") deliver(tab.id, { type: "B8_SHOW", fallbackText: "" });
  if (command === "translate-selection") deliver(tab.id, { type: "B8_SHOW", fallbackText: "", translate: true });
});

/* ---------- messages ---------- */

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return;
  const tabId = sender.tab && sender.tab.id;

  if (msg.type === "B8_RELAY") {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (!tab || tab.id == null || /^(chrome|edge|about|devtools)/.test(tab.url || "")) { sendResponse({ ok: false }); return; }
      deliver(tab.id, msg.payload);
      sendResponse({ ok: true });
    });
    return true;
  }

  if (msg.type === "B8_OPTIONS") { chrome.runtime.openOptionsPage(); sendResponse({ ok: true }); return true; }

  if (msg.type === "B8_TRANSLATE") {
    webTranslate(msg.texts || [], msg.source, msg.target)
      .then((texts) => sendResponse({ ok: true, texts }))
      .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
    return true;
  }

  if (msg.type === "B8_TTS") {
    webSpeech(msg.text || "", msg.lang || "en")
      .then((clips) => sendResponse({ ok: true, clips }))
      .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
    return true;
  }

  if (msg.type === "B8_AI") {
    runAI(msg.task, msg.text, msg.instruction)
      .then((text) => sendResponse({ ok: true, text }))
      .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
    return true;
  }

  /* pinned windows survive navigation inside the same tab */
  if (msg.type === "B8_PIN_SAVE") {
    if (tabId != null) {
      if (msg.wins && msg.wins.length) chrome.storage.session.set({ [`pin:${tabId}`]: msg.wins });
      else chrome.storage.session.remove(`pin:${tabId}`);
    }
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === "B8_SIDE") {
    if (tabId == null) { sendResponse({ ok: false }); return true; }
    chrome.storage.session.set({ [`side:${tabId}`]: msg.payload || null }, () => {
      try {
        chrome.sidePanel.open({ tabId });
        sendResponse({ ok: true });
      } catch (err) {
        sendResponse({ ok: false, error: String(err.message || err) });
      }
    });
    return true;
  }

  if (msg.type === "B8_SIDE_GET") {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (!tab || tab.id == null) { sendResponse({ ok: true, payload: null }); return; }
      chrome.storage.session.get(`side:${tab.id}`, (data) => {
        sendResponse({ ok: true, payload: data[`side:${tab.id}`] || null });
      });
    });
    return true;
  }
});

/* restore pinned windows after the tab navigates */
chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status !== "complete") return;
  chrome.storage.session.get(`pin:${tabId}`, (data) => {
    const wins = data[`pin:${tabId}`];
    if (wins && wins.length) deliver(tabId, { type: "B8_RESTORE", wins });
  });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.remove([`pin:${tabId}`, `side:${tabId}`]);
});

/* ---------- online translation (backup engine) ----------
 * Google's public translate endpoint. No key, no quota, but it is not a
 * documented API — it can change without notice, and it is the one piece
 * here a Web Store reviewer may question. Switchable off in settings;
 * Chrome's on-device engine is always tried first.
 */

async function webTranslate(texts, source, target) {
  const out = [];
  for (let i = 0; i < texts.length; i += 4) {
    const slice = texts.slice(i, i + 4);
    const done = await Promise.all(slice.map((text) => translateChunk(text, source, target)));
    out.push(...done);
  }
  return out;
}

async function translateChunk(text, source, target) {
  if (!text.trim()) return text;
  const pieces = text.length > 4000 ? text.match(/[\s\S]{1,4000}/g) : [text];
  const parts = [];
  for (const piece of pieces) {
    const url = "https://translate.googleapis.com/translate_a/single"
      + `?client=gtx&sl=${encodeURIComponent(source || "auto")}&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(piece)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    parts.push((data[0] || []).map((row) => row[0] || "").join(""));
  }
  return parts.join("");
}

/* ---------- online voice (same caveat as above) ---------- */

async function webSpeech(text, lang) {
  const sentences = String(text).replace(/\s+/g, " ").trim().match(/[^.!?؟،]{1,180}[.!?؟،]?/g) || [];
  const clips = [];
  for (const sentence of sentences.slice(0, 40)) {
    const url = "https://translate.google.com/translate_tts"
      + `?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(lang)}&q=${encodeURIComponent(sentence.trim())}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = await response.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    clips.push("data:audio/mpeg;base64," + btoa(binary));
  }
  return clips;
}

/* ---------- AI ---------- */

async function runAI(task, text, instruction) {
  const cfg = await chrome.storage.local.get(AI_DEFAULTS);
  const provider = cfg.aiProvider || "openai";
  const key = (cfg.aiKey || "").trim();
  if (!key) throw new Error("NO_KEY");

  const fallback = AI_FALLBACK[provider] || AI_FALLBACK.openai;
  const base = ((cfg.aiBase || "").trim() || fallback.base).replace(/\/+$/, "");
  const model = (cfg.aiModel || "").trim() || fallback.model;
  if (!base) throw new Error("NO_BASE");
  if (!model) throw new Error("NO_MODEL");

  const system = task === "ask"
    ? `${(instruction || "").trim()}\n\nAnswer in the same language the user wrote their question in. Return only the answer.`
    : (PROMPTS[task] || PROMPTS.summarize);

  const body = String(text || "").slice(0, 24000);
  let url, headers = { "Content-Type": "application/json" }, payload;

  if (provider === "anthropic") {
    url = `${base}/v1/messages`;
    headers["x-api-key"] = key;
    headers["anthropic-version"] = "2023-06-01";
    headers["anthropic-dangerous-direct-browser-access"] = "true";
    payload = { model, max_tokens: 4000, system, messages: [{ role: "user", content: body }] };
  } else if (provider === "gemini") {
    url = `${base}/models/${encodeURIComponent(model)}:generateContent`;
    headers["x-goog-api-key"] = key;
    payload = { systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: body }] }] };
  } else {
    url = `${base}/chat/completions`;
    headers["Authorization"] = "Bearer " + key;
    payload = { model, temperature: 0.3, messages: [{ role: "system", content: system }, { role: "user", content: body }] };
  }

  const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || data?.message || `HTTP ${response.status}`);

  let out = "";
  if (provider === "anthropic") out = (data.content || []).map((b) => b.text || "").join("");
  else if (provider === "gemini") out = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
  else out = data.choices?.[0]?.message?.content || "";

  out = String(out).trim();
  if (!out) throw new Error("EMPTY");
  return out;
}

/* ---------- delivery ---------- */

function deliver(tabId, message, frameId) {
  const options = typeof frameId === "number" ? { frameId } : {};
  chrome.tabs.sendMessage(tabId, message, options, () => {
    if (!chrome.runtime.lastError) return;
    const target = typeof frameId === "number" ? { tabId, frameIds: [frameId] } : { tabId, allFrames: true };
    chrome.scripting.executeScript({ target, files: ["palette.js", "content.js"] }, () => {
      if (chrome.runtime.lastError) return;
      chrome.tabs.sendMessage(tabId, message, options, () => void chrome.runtime.lastError);
    });
  });
}
