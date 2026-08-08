# Changelog

All notable changes to Focus Reader are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html). The `version` field in `src/manifest.json` is the single source of truth; every release tag must match it.

This is a personal project, updated when there's time for it — see the README for how it's maintained. Gaps between entries are expected and are not a sign that anything is wrong.

## [Unreleased]

Nothing yet.

## [1.9.3] — 2026-08-08

### Added

- **A quiet footer on the settings page** — source code, problem reports, privacy policy, and the version number, in caption-sized muted type as the last thing on the page. The version is read from the manifest, so it never needs updating by hand. Nothing here interrupts anyone: the reader window, which is where people are actually working, gains nothing at all.

### Changed

- **The byB8 signature points at the site root again** — in the reader window's footer and in the console badge. That signature is the author's mark, not a link to this product, so it belongs on the studio's front page. `homepage_url` in the manifest, the privacy notice and the store listing still point at `by.b8hnam.com/focus-reader/`, which is the extension's own page.

## [1.9.2] — 2026-08-08

### Fixed

- **Download did nothing after the extension was updated** — a page that stayed open across an extension reload keeps a copy of the content script that Chrome has already detached. The temporary link used for downloads belongs to that detached world, so Chrome dropped the download without a word while the panel still reported success. Downloads now check for this and say the page needs reloading, and a window opened on such a page says so as soon as it appears, rather than failing quietly one tool at a time.
- **Download did nothing at all** — the *Download* tool and the library's plain-text export reported success while Chrome started no download and logged no error. The temporary link they build pointed at a blob address, and a blob minted inside a content script can come back owned by the extension's origin rather than the page's; Chrome ignores the `download` attribute on a cross-origin address and treats the click as a navigation instead, which a page is not permitted to make to an extension URL, so the click quietly went nowhere. The address is now checked, and a `data:` URL — which `download` always honours — is used when the blob comes back cross-origin. The link is also created inside the extension's shadow root now, and the click is checked: sites that capture every anchor click for their own router and call `preventDefault()` on it — techcrunch.com among them — cancelled the download silently, so the click is retried with an event that cannot leave the shadow root, where no page listener is offered the chance to cancel it. If a download is still refused, the panel says so instead of reporting a file that was never written.

## [1.9.1] — 2026-08-08

### Changed

- **Brand name capitalisation** — the author name is written `B8hnam` everywhere it appears as a name: the copyright lines in the READMEs and in every source file header, and the trademark clause. Domain names and the GitHub handle stay lowercase, as they must.

- **Toolbar popup order** — the three actions (*Read this page*, *Saved texts*, *Open side panel*) now sit at the top of the popup instead of the bottom, with *Dim the page behind* directly beneath them, and the three "how to open the panel" switches — set once and rarely touched again — moved to the end. The controls themselves are unchanged.
- **Extension website** — the `byB8` signature in the popup, the side panel and the reader window, along with `homepage_url` in the manifest and the address in the privacy notice and store listing, now point at `https://by.b8hnam.com/focus-reader/` rather than the site root. The author and brand links in the README and `TRADEMARK.md` still point at the root, which is where they belong.
- **Options page** — the three actions are hidden here. They act on the page underneath the popup, and the options tab has no page underneath it, so they had nothing to do; *Dim the page behind* returns to the panel settings where it started. The remaining four sections are split across the two columns by height (reading style and panel on one side, AI connection and how-to-open on the other) rather than one short column beside one very long one, which roughly halves the height of the page.

### Fixed

- Options page: the accent wash stopped where the content stopped, leaving a hard horizontal edge across the lower half of the window. The wash moved from `<body>` to `<html>` with fixed attachment, so it covers the whole window as one even gradient at any height, and the sheet is now centred on both axes instead of sitting against the top.
- Content script: `Uncaught (in promise) Error: Extension context invalidated`. Reloading, updating or removing the extension detaches its context from pages that are already open, while the content script keeps running in them; every later `chrome.*` call then throws. `chrome.i18n` is reached from async paths, so the throw surfaced as an unhandled rejection. All `chrome.i18n` and `chrome.runtime.getURL` calls are now guarded, labels already fetched are cached so open windows keep their wording, and a settings read that can't reach storage falls back to the defaults instead of leaving the panel waiting.

## [1.9.0] — 2026-08-07

### Added

- **Resizable windows** — every edge and corner of a normal (non-maximized, non-minimized) window can now be dragged to resize it, the same as any native OS window. Works together with the existing drag-to-move, maximize, and minimize; resized dimensions are what "restore" returns to after maximizing, and what a pinned window remembers across pages.
- **Themed scrollbars** — scrollbars in the settings popup, the side panel, and the reader window now follow the current accent colour and theme instead of the browser's default grey, matching the site.

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

[Unreleased]: https://github.com/b8hnam/focus-reader/compare/v1.9.3...HEAD
[1.9.3]: https://github.com/b8hnam/focus-reader/compare/v1.9.2...v1.9.3
[1.9.2]: https://github.com/b8hnam/focus-reader/compare/v1.9.1...v1.9.2
[1.9.1]: https://github.com/b8hnam/focus-reader/compare/v1.9.0...v1.9.1
[1.9.0]: https://github.com/b8hnam/focus-reader/compare/v1.8.0...v1.9.0
[1.8.0]: https://github.com/b8hnam/focus-reader/releases/tag/v1.8.0
