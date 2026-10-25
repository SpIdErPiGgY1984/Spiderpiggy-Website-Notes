# Mozilla Add-ons submission checklist (v1.0.0)

1. Upload **Spiderpiggy-Website-Notes-1.0.0-AMO.zip** at https://addons.mozilla.org/developers/addon/submit/ as a new Firefox extension. Choose **On this site** for a publicly listed add-on, if desired. The ZIP contains `manifest.json` at its root.
2. Keep the add-on ID `websitenotes@spiderpiggy.com` unchanged for future updates.
3. For data collection, verify **No data collected/transmitted** matches current behavior. The manifest declares `data_collection_permissions.required: ["none"]` (required for new AMO submissions).
4. Permissions to explain: local storage, toolbar-triggered access to the active tab, script insertion for sticky notes, and *optional* HTTP/HTTPS website access for automatic display. The broad permission is **not granted on installation** and must be explicitly accepted.
5. Privacy policy: the text in `PRIVACY.md` can be used in Mozilla's listing and/or on the Spiderpiggy support website. It must remain accurate if functionality changes.
6. Source code: the upload package already contains all unmodified original JavaScript, HTML and CSS. No dependencies or build step. If Mozilla requests a separate source archive, use **Spiderpiggy-Website-Notes-1.0.0-SOURCE.zip**. Explain: “No build required: the source is the submitted extension.”
7. Add listing descriptions (see `STORE_LISTING.md`), a support link, the icons provided, and screenshots of the actual browser extension (not artificial product mockups).
8. Run Mozilla `web-ext lint --source-dir .` locally before uploading. This workspace could not download `web-ext`, so its official lint report and Mozilla signing **have not been completed**. Browser simulation and static tests are not a substitute for AMO review.
9. Upload the archive and fix any AMO warnings or errors shown. Mozilla provides a signed XPI after review/signing. The supplied ZIP is not itself signed.
10. Back up existing notes before replacing test builds; preserve the extension ID and the same temporary installation for testing.

License: source includes a copyright notice. Choose a suitable AMO license setting as the rights holder. Do not claim third-party library dependencies.
