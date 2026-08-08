# Chrome Web Store listing — Focus Reader

## Name
Focus Reader

## Short description (132 characters max)
Open any selected text in a clean reading panel — right-to-left and left-to-right, dark mode, editing, and saved snippets.

## Detailed description

Select text on any page and read it the way it deserves to be read.

Focus Reader lifts your selection out of the page and into a quiet panel: no ads, no sidebars, no colour clashes, no cramped line spacing. It was built for people who read across scripts — Persian, Arabic, Hebrew, English — and got tired of right-to-left text rendering badly inside left-to-right layouts.

HOW TO OPEN IT
• A small button that appears next to your selection
• A keyboard shortcut (Ctrl+Shift+Y, editable)
• The right-click menu
Each one can be switched off, so you keep only the trigger you actually use.

READING
• Direction detected automatically per text, and switchable by hand
• Bundled Vazirmatn font, plus sans, serif, and monospace options
• Adjustable text size and line spacing
• Light theme, dark theme, or follow your system
• A real window: drag it, maximize it, minimize it out of the way

WORKING WITH THE TEXT
• Copy, or download as a plain text file
• Read aloud with your browser's built-in speech
• Clean up: fixes Arabic ya and kaf in Persian text, removes tatweel, diacritics and invisible characters, converts Arabic-Indic digits, rejoins hyphen-split words, tidies spacing
• Edit mode with bold, italic, underline, undo, and restore-original
• Save texts to a local library with their source and date
• Read this page: pulls the main article out of a cluttered page

FREE TRANSLATION
Translate with Chrome's built-in on-device engine — no key, no account, no quota, and offline after the first language-pack download. When a language pair isn't available on your device, an online fallback covers it. Formatting survives the translation either way.

ONE-TAP TRANSLATION
Select anything and the translation appears in a bubble right where you're reading. A shortcut opens the selection already translated. Switching back to the original is instant, because every translation is remembered.

PIN IT OR PARK IT
Pin a window and it follows you to the next page. Or send it to Chrome's side panel, where it stays put across the whole session.

FLOATING WINDOWS
Open as many readers as you need. They float over the page without dimming it, so you can read and browse at the same time. Minimized windows stack in a corner like taskbar buttons, and the whole stack drags wherever you want it.

KEEPS THE FORMATTING
Headings, bold, italics, lists, quotes, links, tables and code blocks come across from the page instead of collapsing into flat text.

BRING YOUR OWN AI (optional)
Connect your own OpenAI, Claude, Gemini, or OpenAI-compatible API key and get summarize, key points, translate, explain simply, fix grammar, and a free-form question box — right inside the panel. No account, no subscription, no middleman: requests go straight from your browser to the provider you chose. Leave it empty and the extension never touches the network.

PRIVACY
No servers of ours. No analytics. Your text never leaves your browser, and saved texts live only in your own browser storage.

Interface available in English and Persian.

byB8 — https://by.b8hnam.com/focus-reader/

## Category
Productivity

## Language
English (also localized in Persian)

sidePanel:
Offers the reader as a Chrome side panel, so a text can stay open while the user keeps browsing.

## Permission justifications

Host permission (<all_urls>):
The extension displays text the user selects on a page, so its content script must be present on whichever site the user is reading. It reads nothing until the user explicitly triggers the panel via the selection button, the keyboard shortcut, or the right-click menu, and it transmits nothing anywhere.

contextMenus:
Adds a single "Open in Focus Reader" entry to the selection context menu.

storage:
Stores the user's own settings (theme, font, text size, spacing, which triggers are on) and the texts the user chooses to save. All local; nothing is sent off-device.

scripting:
Injects the content script into tabs that were already open when the extension was installed or updated, so the shortcut and menu work without a page reload.

activeTab:
Lets the "Read this page" and "Saved texts" buttons in the popup act on the tab the user is currently viewing.

Remote code: No. All code and the bundled font ship inside the package.

Data usage disclosures:
The extension collects nothing. The translation feature may send the text being read to Google's public translate endpoint when Chrome's on-device engine cannot handle the language pair; this is user-controllable in settings. The optional AI feature sends the text the user is viewing, plus the user's own API key, directly from the user's browser to the AI provider the user configured. The developer runs no server and receives no data. The feature is inactive until the user enters a key.

## Screenshot plan (1280×800, five images)
1. Persian article with the panel open, light theme, panel centered.
2. English article, dark theme, larger text.
3. Edit mode with the formatting bar visible.
4. Saved texts view.
5. The settings popup, showing the three triggers and the reading-style controls.
