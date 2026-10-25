'use strict';
/* This script runs only for individual websites explicitly authorized by the user.
   Check saved notes before making any visible changes to the page. */
(async () => {
  try {
    if (window.top !== window.self || !document.documentElement) return;
    const info = SPWN.getSiteInfo(location.href);
    if (!info) return;
    const origin = location.origin;
    const preferredScopeKey = 'spwn:activeScope:' + info.page;
    const stored = await browser.storage.local.get([
      'spwn:auto:' + origin, info.siteKey, info.pageKey, preferredScopeKey
    ]);
    if (stored['spwn:auto:' + origin] !== true) return;
    const pageNote = stored[info.pageKey];
    const siteNote = stored[info.siteKey];
    // Show the page-specific note if present; otherwise show the site's general note.
    // Avoid blank overlays on pages with no saved note.
    const pageExists = typeof pageNote?.text === 'string' && !!pageNote.text.trim();
    const siteExists = typeof siteNote?.text === 'string' && !!siteNote.text.trim();
    const scope = stored[preferredScopeKey] === 'site' && siteExists ? 'site'
      : stored[preferredScopeKey] === 'page' && pageExists ? 'page'
      : pageExists ? 'page' : siteExists ? 'site' : null;
    if (!scope) return;
    await spwnLaunchSticky({siteKey: info.siteKey, pageKey: info.pageKey,
      scope, host: info.host, title: document.title || info.host, auto: true});
  } catch (error) {
    console.warn('Spiderpiggy Notes: could not automatically open sticky note', error);
  }
})();
