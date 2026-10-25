# Spiderpiggy Website Notes 1.0.0

Firefox extension for private notes linked to a website or an individual web page. Notes are stored locally in Firefox. No account, cloud sync, advertisements, tracking or analytics.

## Features

- A quick note in the browser toolbar and a draggable sticky note over the active website.
- Optional automatic reappearance on a website that you explicitly enable.
- Optional access to **all** HTTP(S) websites, requested only when you choose it; separate site permissions are also supported.
- Individual titles and seven color palettes for site notes and page notes.
- Remembered position and collapsed/expanded state across reloads.
- When collapsed, only the note title, restore and close controls are shown.
- Searchable note manager, editing, deletion, and JSON import/export.
- Dutch and English translations and light/dark appearance.

## Install for development

Open `about:debugging#/runtime/this-firefox` in Firefox, click **Load Temporary Add-on**, and select the root `manifest.json` from the extracted archive. A production installation needs Mozilla's signature.

For an existing temporary installation, first export a backup, replace the files in the same directory, then use **Reload**, not **Remove** (which can remove local storage).

## Permissions and privacy

- `storage`: save notes, colors, titles and preferences locally.
- `activeTab` and `scripting`: show a sticky note only on the active page when you request it.
- **Optional** `http://*/*` and `https://*/*`: only after user confirmation, to allow automatic notes on explicitly enabled sites without repeating permissions per site. Choosing all-sites access alone never automatically enables notes everywhere.
- Browser-restricted pages (such as `about:`) are not supported.
- The extension stores the site domain and normalized page URL as note identifiers. Some forum IDs can be retained in those URLs; arbitrary URL query parameters are deliberately removed.
- No data leaves the browser through this extension. Export and import are initiated by the user and handled locally. Do not use ordinary notes for passwords or other secrets.

## Packaging for Mozilla Add-ons

Source and upload package are identical in functionality. All application code is plain JavaScript, HTML and CSS; no transpiling, minifying, bundling, remotely loaded code or dependencies. The manifest file is at the ZIP root. The stable Firefox ID is `websitenotes@spiderpiggy.com`.

Run `web-ext lint --source-dir .` with an installed copy of Mozilla's `web-ext` tool, then upload the ZIP at https://addons.mozilla.org/developers/addon/submit/ for Mozilla validation and signing.

See `AMO_SUBMISSION.md`, `PRIVACY.md`, and `CHANGELOG.md` in the accompanying source package.
