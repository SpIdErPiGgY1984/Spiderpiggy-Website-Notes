'use strict';
(async () => {
  SPWN.localize();
  await SPWN.applyTheme();
  const $ = id => document.getElementById(id);
  const qs = new URLSearchParams(location.search);
  const allSites = qs.get('mode') === 'all';
  const origin = qs.get('origin');
  const tabIdText = qs.get('tabId') || '';
  const tabId = /^\d+$/.test(tabIdText) ? Number(tabIdText) : null;
  const scope = qs.get('scope') === 'page' ? 'page' : 'site';
  let pattern = null;
  try { pattern = allSites ? null : SPWNAuto.pattern(origin); } catch (_) { /* Reject unsafe origins. */ }
  if (allSites) {
    $('site').textContent = SPWN.t('allSitesLabel');
    $('intro').textContent = SPWN.t('allSitesPermissionIntro');
    $('explanation').textContent = SPWN.t('allSitesPermissionExplain');
    $('detail').textContent = SPWN.t('allSitesPermissionDetail');
    $('grant').textContent = SPWN.t('grantAllSites');
  } else if (!pattern) {
    $('site').textContent = SPWN.t('permissionInvalid');
    $('grant').disabled = true;
  } else {
    $('site').textContent = new URL(origin).host;
  }
  const message = (key, details) => {
    $('status').textContent = SPWN.t(key) + (details ? ` ${String(details).slice(0, 160)}` : '');
    $('status').hidden = false;
  };
  async function closeThisTab() {
    try {
      const current = await browser.tabs.getCurrent();
      if (current?.id != null) return await browser.tabs.remove(current.id);
    } catch (_) { /* Fall back if the permission tab was already closed. */ }
    window.close();
  }
  $('skip').addEventListener('click', () => { void closeThisTab(); });
  $('grant').addEventListener('click', async () => {
    if (!pattern && !allSites) return;
    $('grant').disabled = true;
    try {
      // Keep this request FIRST in the direct click handler.
      // Firefox requires a genuine user gesture for permissions.request().
      const allowed = await browser.permissions.request({origins: allSites ? ['http://*/*', 'https://*/*'] : [pattern]});
      if (!allowed) {
        message('permissionDeclined');
        $('grant').disabled = false;
        return;
      }
      if (allSites) {
        message('allSitesSuccess');
        $('grant').disabled = true;
        // Return automatically when this page was opened from the toolbar popup.
        if (tabId !== null && Number.isSafeInteger(tabId)) {
          try {
            await browser.tabs.update(tabId, {active: true});
            await closeThisTab();
          } catch (error) {
            console.debug('Spiderpiggy Notes: return tab is no longer open', error);
          }
        }
        return;
      }
      // Register only after permission is confirmed: no arbitrary website access.
      await SPWNAuto.register(origin);
      await browser.storage.local.set({[SPWNAuto.key(origin)]: true});
      message('permissionSuccess');
      if (tabId !== null && Number.isSafeInteger(tabId)) {
        try {
          const tab = await browser.tabs.get(tabId);
          const url = new URL(tab.url);
          // Don't inject if the original tab has navigated to another origin.
          if (url.origin === origin) {
            const info = SPWN.getSiteInfo(tab.url);
            const saved = await browser.storage.local.get([info.siteKey, info.pageKey]);
            const useScope = scope === 'page' && saved[info.pageKey]?.text?.trim() ? 'page'
              : saved[info.siteKey]?.text?.trim() ? 'site'
              : saved[info.pageKey]?.text?.trim() ? 'page' : scope;
            const noteKey = SPWN.noteKey(useScope, info);
            if (saved[noteKey]?.text?.trim()) {
              await browser.scripting.executeScript({
                target: {tabId},
                func: spwnLaunchSticky,
                args: [{siteKey: info.siteKey, pageKey: info.pageKey,
                  scope: useScope, host: info.host, title: String(tab.title || info.host),
                  auto: true, expectedUrl: tab.url}]
              });
            }
            await browser.tabs.update(tabId, {active: true});
            await closeThisTab();
            return;
          }
        } catch (error) {
          console.warn('Spiderpiggy Notes: website tab no longer accessible', error);
        }
      }
      message('permissionCompleted');
    } catch (error) {
      console.error('Spiderpiggy Notes: site permission could not be configured', error);
      message('permissionError', error?.message || error);
      $('grant').disabled = false;
    }
  });
})();
