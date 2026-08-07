# Privacy Policy — Focus Reader

Last updated: 2026

## Short version

Focus Reader does not collect, transmit, or sell any data. Nothing leaves your browser.

## What the extension handles

- **Selected text.** When you trigger the panel, the extension reads the text you selected on the page and displays it. It is held in memory only and disappears when you close the panel.
- **Texts you save.** If you press the save button, the text (with its formatting), the page title, the page address, and the date are stored locally in your browser through `chrome.storage.local` — on disk in your own Chrome profile, never uploaded. You can delete any item, or all of them, from inside the panel.
- **Pinned windows and the side panel.** Their contents are held in `chrome.storage.session`, which Chrome clears when the browser closes, and are deleted as soon as the tab is closed. They never leave the device.
- **Read aloud.** Your system's voices are used by default and involve no network. If you switch on the online voice, the text is sent to Google's public text-to-speech endpoint, with the same caveat as online translation.
- **Your settings.** Which triggers are enabled, the theme, the font, the text size, and the line spacing are stored through `chrome.storage.sync`, which means Chrome may sync them to your other signed-in devices. That syncing is handled by Chrome itself, not by the developer.

- **AI requests (optional, off until you set it up).** If you enter an API key, the text currently shown in the panel and your chosen instruction are sent directly from your browser to the provider you selected — OpenAI, Anthropic, Google, or a custom endpoint you typed in. The developer operates no server and never receives that text. Your API key is stored locally through `chrome.storage.local` and is sent only to that provider. What the provider does with the text is governed by that provider's own policy. Leave the key empty and no request is ever made.

## What the extension does not do

- No servers of ours, no analytics, no tracking, no advertising.
- No network requests except the AI calls you explicitly trigger with your own key. The bundled font ships inside the extension.
- No reading or logging of page content unless you actively trigger the panel.
- Nothing is shared with the developer or with any third party.

## Permissions and why they are needed

- `<all_urls>` / host permissions — the panel must be able to read your selection on whatever site you are reading. Nothing is read until you trigger it.
- `contextMenus` — adds the right-click entry.
- `storage` — saves your settings and your saved texts, locally.
- `scripting`, `activeTab` — lets the panel work on tabs that were already open when the extension was installed or updated.

- **Translation.** Chrome's built-in on-device engine is tried first; when it runs, the text never leaves your machine. If it is unavailable and the online-translation switch is on (it is on by default), the text of the panel is sent to Google's public translate endpoint to be translated. No account, no key, and no identifier of yours is attached — but the text does leave your browser in that case. Turn the switch off in settings if you would rather it never did.

## Contact

byB8 — https://by.b8hnam.com/
