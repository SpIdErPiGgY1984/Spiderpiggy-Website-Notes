'use strict';
/* Recover per-site automatic sticky registrations after Firefox restarts/updates.
   A revoked website permission never causes a new permission prompt. */
let syncing = Promise.resolve();
function scheduleReconcile() {
  syncing = syncing.catch(() => {}).then(reconcile).catch(error => {
    console.error('Spiderpiggy Notes: automatic sticky registration failed', error);
  });
}
async function reconcile() {
  const [stored, existing] = await Promise.all([
    browser.storage.local.get(null),
    browser.scripting.getRegisteredContentScripts()
  ]);
  const enabled = Object.entries(stored).filter(([key, value]) =>
    key.startsWith(SPWNAuto.prefix) && value === true
  );
  const wanted = new Set();
  for (const [key] of enabled) {
    const origin = key.slice(SPWNAuto.prefix.length);
    try {
      const permitted = await browser.permissions.contains({origins: [SPWNAuto.pattern(origin)]});
      if (permitted) wanted.add(SPWNAuto.id(origin));
      else await browser.storage.local.remove(key); // Permission was revoked elsewhere.
    } catch (_) { await browser.storage.local.remove(key); }
  }
  const stale = existing.filter(s => s.id.startsWith('spwn-auto-') && !wanted.has(s.id));
  if (stale.length) await browser.scripting.unregisterContentScripts({ids: stale.map(s => s.id)});
  const registered = new Set(existing.filter(s => !stale.some(x => x.id === s.id)).map(s => s.id));
  for (const [key] of enabled) {
    const origin = key.slice(SPWNAuto.prefix.length);
    if (!wanted.has(SPWNAuto.id(origin)) || registered.has(SPWNAuto.id(origin))) continue;
    try { await SPWNAuto.register(origin); }
    catch (error) { console.error('Could not activate auto sticky for', origin, error); }
  }
}
browser.runtime.onInstalled.addListener(scheduleReconcile);
browser.runtime.onStartup.addListener(scheduleReconcile);
browser.permissions.onRemoved.addListener(scheduleReconcile);
browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && Object.keys(changes).some(key => key.startsWith(SPWNAuto.prefix))) {
    scheduleReconcile();
  }
});
// Also covers waking the Firefox event page outside onInstalled/onStartup.
scheduleReconcile();


/* Firefox reload fallback. Dynamically registered scripts can sometimes fail to
   reappear in an existing tab; onUpdated provides an independent recovery path.
   It never asks for access or reads a page. The per-origin permission and the
   user's per-origin opt-in are both checked before injecting anything. */
async function showAutoStickyAfterLoad(tabId, tab) {
  const tabUrl = tab?.url;
  if (typeof tabUrl !== 'string') return;
  let origin, info;
  try {
    const parsed = new URL(tabUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return;
    origin = parsed.origin;
    info = SPWN.getSiteInfo(tabUrl);
  } catch (_) { return; }
  if (!info) return;
  const autoKey = SPWNAuto.key(origin);
  try {
    const preferredScopeKey = 'spwn:activeScope:' + info.page;
    const stored = await browser.storage.local.get([autoKey, info.siteKey, info.pageKey, preferredScopeKey]);
    if (stored[autoKey] !== true) return;
    // Verify the origin-specific permission wasn't revoked in Firefox settings.
    if (!(await browser.permissions.contains({origins: [SPWNAuto.pattern(origin)]}))) return;
    const pageText = stored[info.pageKey]?.text;
    const siteText = stored[info.siteKey]?.text;
    const pageExists = typeof pageText === 'string' && !!pageText.trim();
    const siteExists = typeof siteText === 'string' && !!siteText.trim();
    const scope = stored[preferredScopeKey] === 'site' && siteExists ? 'site'
      : stored[preferredScopeKey] === 'page' && pageExists ? 'page'
      : pageExists ? 'page' : siteExists ? 'site' : null;
    if (!scope) return;
    const results = await browser.scripting.executeScript({
      target: {tabId},
      func: spwnLaunchSticky,
      args: [{siteKey: info.siteKey, pageKey: info.pageKey, host: info.host,
        title: String(tab.title || info.host), scope, auto: true, expectedUrl: tabUrl}]
    });
    if (results?.length && results[0]?.result?.opened === false) {
      // The tab navigated elsewhere before injection, deliberately do nothing.
      return;
    }
  } catch (error) {
    // Normal if a tab closes or navigates while an awaited check is pending.
    console.debug('Spiderpiggy Notes: automatic sticky fallback skipped', error);
  }
}
// Register synchronously at top level so Firefox event pages wake on navigation.
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  void showAutoStickyAfterLoad(tabId, tab);
});
