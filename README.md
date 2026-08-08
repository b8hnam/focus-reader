# Focus Reader

Open any selected text in a clean reading panel — right-to-left and left-to-right, dark mode, editing, translation, AI actions, and saved snippets.

A Chrome extension in plain JavaScript. No build step, no framework, no bundler, no server.

Built byB8 · [by.b8hnam.com](https://by.b8hnam.com/) · [فارسی](README.fa.md)

![Focus Reader settings](docs/media/settings.png)

<!-- VIDEO: drag final.mp4 into this line in GitHub's web editor, then delete this comment -->

**In the video:** three ways to open the panel · multiple windows and the dock · translation in place · bring-your-own-key AI actions · saved texts · side panel · reading style

---

## About this project

Focus Reader is a personal tool — built for the author's own use, and released because it might be useful to others too. There's no public roadmap and no support commitment. Updates happen when something in daily use needs fixing, when an idea is worth building, or simply when there's time for it — not on a schedule.

Practically, that means:

- Issues and pull requests are read, but there's no promised response time and no guarantee anything gets acted on.
- New releases show up when they show up. There's no calendar behind them.
- If Chrome changes something and it breaks the extension, it gets fixed when it gets fixed.

If you need something more predictable — guaranteed fixes, a roadmap, active review of contributions — the code is GPL-licensed specifically so you can fork it and run it your way.

---

## Install

### From source (unpacked)

1. Download the source, or the `.zip` from the [latest release](../../releases/latest).
2. Unzip it somewhere permanent — for example `C:\Users\<you>\ChromeExtensions\focus-reader`. Chrome reads the extension from that path every time; if the folder moves, the extension stops working.
3. Open `chrome://extensions`.
4. Turn on **Developer mode**.
5. Click **Load unpacked** and pick the folder containing `manifest.json` (that is `src/` if you cloned the repository, or the unzipped folder if you took a release).
6. Pin the icon to the toolbar.

Requires Chrome 116 or newer. Chrome 138+ additionally enables the on-device translation engine.

### From the Chrome Web Store

Not published there at the moment. If that changes, the link will appear here.

---

## Three ways to open the panel

Each one can be switched off independently from the settings popup:

| Trigger | Behaviour |
| --- | --- |
| Button near selection | A small icon button appears under the selection. |
| Keyboard shortcut | `Ctrl + B` opens the reader, `Alt + T` opens it already translated. Chrome silently drops a suggested key when another extension owns it, so the settings page shows the keys Chrome actually assigned — click **Set shortcut** to change either one. While a window is in edit mode, `Ctrl + B` goes back to meaning **bold**. |
| Right-click menu | Adds *Open in Focus Reader* to the selection menu. |

## Inside the panel

**Windows, plural.** Every time you open the reader you get a new window — up to eight at once. Minimize, maximize, close, drag by the title bar, resize by dragging any edge or corner, double-click the title bar to maximize, `Esc` to close the front one. Every state change is animated with an iOS-style spring curve.

**The dock.** Minimized windows stack on each other in a corner, like taskbar buttons. Drag any one of them and the whole stack moves. Click a stacked window's restore button (or double-click it) to bring it back to the size and position it had.

**The page stays readable.** The window floats over the page without dimming or blurring it, so you can read both at once and keep clicking around the site. If you prefer the page dimmed, there is a switch for it in settings.

**Formatting is preserved.** Headings, bold, italics, lists, quotes, links, tables, and code blocks come across from the page. The markup is rebuilt from a strict allowlist — scripts, styles, images, iframes, and every attribute except link targets are dropped — so nothing from the source page can style or script the panel.

**Tools.** Copy · Save (with page title, address, and date) · Download as `.txt` · Read aloud · Clean up Persian text (Arabic ya/kaf, tatweel, diacritics, invisible characters, Arabic-Indic digits, hyphen-split words) · Direction · Text size · Theme · Edit (off by default) · Saved texts.

**Translation.** Three engines, tried in order, formatting preserved throughout because each text node is translated in place:

1. **Chrome's on-device engine** (Chrome 138+) — free, private, offline after the first language-pack download. Chrome's language list is limited and it needs room for the models, so it is not always available.
2. **Online translation** — free and keyless, through Google's public translate endpoint. That endpoint is *not* a documented API: it can change or stop working without notice. There is a switch for it in settings.
3. **Your own AI key**, if you configured one.

Once a text has been translated, switching between the original and any translation you already made is instant and costs no request.

**AI actions.** Connect your own API key (OpenAI, Anthropic, Google, or any OpenAI-compatible endpoint) in the settings, and the sparkle button gives you: summarize, key points, translate to Persian, translate to English, explain simply, fix grammar, and a free-form question box. Requests go from the extension's own service worker straight to the provider you chose. There is no server in the middle, because there is no server at all.

**Pin and side panel.** Pin a window and it follows you to the next page in that tab, or push it to Chrome's side panel where it stays put no matter where you browse.

**Whole-page reading.** *Read this page* pulls the main article out of the page and opens it in the panel, without ads or sidebars.

---

## Performance

The content script is deliberately inert until you use it. On page load it attaches four passive listeners and nothing else: no DOM is created, no settings are read from storage, no font is fetched, no timers run. The panel's markup, stylesheet, and font are built on the first selection and reused afterwards. Frames smaller than 260×200 (ad slots, tracking pixels) are skipped entirely, and the scroll listener is registered only while the selection button is on screen — passively, so it can never block scrolling.

## Privacy

No servers, no analytics, no tracking, no accounts. The only network requests are translation and the AI calls you explicitly configure and trigger. Full details in [PRIVACY.md](PRIVACY.md).

## Language

The interface follows Chrome's UI language; English and Persian are bundled in `src/_locales/`. Text direction inside the panel is detected per text, so mixed Persian/English browsing works without switching anything.

---

## Repository layout

```
src/                  the extension itself — this folder is what Chrome loads
  manifest.json       Manifest V3
  background.js       service worker: menus, shortcuts, AI and translation requests
  content.js          the panel, windows, dock, tools — everything on the page
  palette.js          accent colour generation
  popup.*             settings page (also used as the options page)
  sidepanel.*         Chrome side-panel view
  _locales/           en, fa
  fonts/              Vazirmatn (OFL 1.1)
  icons/              16 / 32 / 48 / 128
docs/store-listing.md Chrome Web Store copy
PRIVACY.md            privacy policy
CHANGELOG.md          version history
TRADEMARK.md          what the licence does not cover
```

There is no build step. Edit a file in `src/`, reload the extension on `chrome://extensions`, done.

## Releases

Pushing a tag such as `v1.9.0` triggers [`.github/workflows/release.yml`](.github/workflows/release.yml), which checks that the tag matches the `version` field in `src/manifest.json`, zips the **contents** of `src/` (Chrome requires `manifest.json` at the root of the archive), and publishes the zip as a GitHub release asset. See [CONTRIBUTING.md](CONTRIBUTING.md) for the exact steps.

## Contributing

Read the project-status warning above first, then [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Licence

[GNU General Public License v3.0 or later](LICENSE) — with one additional term under GPLv3 section 7(e): **the name "Focus Reader", the byB8 and B8hnam names, and the logo and icon files are not licensed.** If you fork this, keep the code, change the name and the icons. See [TRADEMARK.md](TRADEMARK.md).

Copyright © 2026 Behnam Azimi (B8hnam).

Vazirmatn by Saber Rastikerdar, SIL Open Font License 1.1 — see `src/fonts/VAZIRMATN-OFL.txt`. It is bundled unmodified and stays under its own licence, not the GPL.
