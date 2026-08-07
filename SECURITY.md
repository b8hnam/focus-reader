# Security

## Reporting

Report a vulnerability privately through GitHub's **Security → Report a vulnerability** form, not as a public issue.

Please state what an attacker could actually do — read a page the user did not select, run code inside the panel, reach a stored API key, escape the allowlist that rebuilds the markup — and how to reproduce it.

## What to expect

This project is not actively maintained. There is **no promised response time and no guaranteed fix**. A report will be read, and a genuine vulnerability will be acknowledged publicly here, but the honest expectation is that a fix may be slow or may not come at all. A pull request with a fix is the fastest path.

Only the latest release is looked at. Older versions get nothing.

## Design notes that are relevant to reports

- Markup taken from the page is rebuilt from a strict allowlist: scripts, styles, images, iframes and all attributes except link targets are dropped. A bypass of that allowlist is a real vulnerability.
- API keys are stored in `chrome.storage.local` and sent only to the provider the user configured. Any path that leaks a key elsewhere is a real vulnerability.
- The extension holds `<all_urls>` host permission. Anything that causes page content to be read or transmitted without the user triggering it is a real vulnerability.
- Online translation and online voice go to Google's public endpoints. This is documented in `PRIVACY.md` and can be switched off; it is a known trade-off, not a vulnerability.
