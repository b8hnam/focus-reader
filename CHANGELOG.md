# Changelog

All notable changes to Focus Reader are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html). The `version` field in `src/manifest.json` is the single source of truth; every release tag must match it.

This project is not actively maintained — see the note in the README. Gaps between entries are expected and are not a sign that anything is wrong.

## [Unreleased]

### Fixed

- Dark mode: the "Translate into" language list (and other `<select>` dropdowns) showed unreadable light-grey-on-white options because only the closed box was themed, not the open list. Options are now explicitly themed to match dark/light mode.
- Background worker: `Unchecked runtime.lastError: Cannot create item with duplicate id b8-open`. `onInstalled`, `onStartup`, and the settings-change listener could each trigger a menu rebuild; if two rebuilds overlapped, a `create()` from one call landed before the other's `removeAll()` finished, producing the duplicate-id error. Rebuilds are now chained so only one runs at a time.

## [1.8.0] — 2026-08-07

First public release. Earlier versions were private builds used by the author and were never distributed; there is no changelog for them.

### Added

- **Reading panel** — opens the selected text in a floating window, with automatic right-to-left / left-to-right detection per text.
- **Three independent triggers** — a button beside the selection, the `Ctrl+B` / `Alt+T` shortcuts, and a right-click menu entry. Each can be switched off separately.
- **Multiple windows** — up to eight at once, with minimize, maximize, close, drag, double-click-to-maximize and `Esc`, all animated with an iOS-style spring curve.
- **Dock** — minimized windows stack in a corner like taskbar buttons; dragging one moves the whole stack.
- **Formatting preserved** — headings, bold, italics, lists, quotes, links, tables and code blocks are rebuilt from the page through a strict allowlist that drops scripts, styles, images, iframes and all attributes except link targets.
- **Translation** — Chrome's on-device engine (Chrome 138+) first, then a keyless online fallback, then your own AI key. Each text node is translated in place so formatting survives. Translations are cached per text, so switching between original and translation costs no request.
- **Inline translation bubble** — a globe in the selection bar translates in place without opening a window; one click turns the bubble into a full window.
- **AI actions** — bring your own key (OpenAI, Anthropic, Google, or any OpenAI-compatible endpoint) for summarize, key points, translate to Persian, translate to English, explain simply, fix grammar, and free-form questions. Requests go straight from the service worker to the chosen provider.
- **Tools** — copy, save, download as `.txt`, read aloud, Persian text clean-up, manual direction flip, text size, and theme.
- **Saved texts** — items keep their formatting along with the page title, address and date, in `chrome.storage.local`, with a bulk plain-text export.
- **Edit mode** — off by default; enables bold, italic, underline, undo and restore-original.
- **Pin and side panel** — a pinned window follows the tab to the next page; the side panel keeps the text regardless of navigation.
- **Whole-page reading** — extracts the main article from the page and opens it without ads or sidebars.
- **Accent colours** — the brand pair (`#411530` / `#FF3000`), Moss, and a random accent that stays inside a readable lightness and saturation band.
- **Themes** — light, dark, and follow-system.
- **Bilingual interface** — English and Persian via `_locales/`, following Chrome's UI language.
- **Bundled Vazirmatn font**, shipped with its OFL 1.1 licence; no network fetch.

### Notes

- Requires Chrome 116 or newer; the on-device translation engine needs Chrome 138 or newer.
- The content script stays inert until first use — four passive listeners on page load and nothing else.
- No servers, no analytics, no accounts. See `PRIVACY.md`.

[Unreleased]: https://github.com/byb8hnam/focus-reader/compare/v1.8.0...HEAD
[1.8.0]: https://github.com/byb8hnam/focus-reader/releases/tag/v1.8.0
