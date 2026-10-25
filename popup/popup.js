'use strict';
(async () => {
  SPWN.localize();
  await SPWN.applyTheme();
  const $ = id => document.getElementById(id);
  const editor = $('note'), titleInput = $('customTitle');
  let info = null, tab = null, scope = 'site', title = '', currentKey = '', currentColorKey = '', currentTitleKey = '', selectedColor = 'default', customTitle = '', loading = false;
  try {
    const tabs = await browser.tabs.query({active: true, currentWindow: true});
    tab = tabs[0];
    info = tab?.url ? SPWN.getSiteInfo(tab.url) : null;
    title = tab?.title || '';
  } catch (e) { /* Restricted browser page */ }
  function showNotice(key) { $('notice').textContent = SPWN.t(key); $('notice').hidden = false; }
  if (!info) {
    $('site').textContent = SPWN.t('unsupportedPage');
    editor.disabled = true; titleInput.disabled = true; $('sticky').disabled = true; $('delete').disabled = true;
    $('siteMode').disabled = true; $('pageMode').disabled = true;
    $('colors').setAttribute('aria-disabled', 'true');
    $('autoShow').disabled = true;
    showNotice('restrictedHelp');
  } else {
    $('site').textContent = info.host;
    $('site').title = info.page;
  }
  const origin = info ? new URL(tab.url).origin : null;
  const autoKey = origin ? SPWNAuto.key(origin) : null;
  const globalPatterns = ['http://*/*', 'https://*/*'];
  async function updateGlobalAccess() {
    try {
      const allowed = await browser.permissions.contains({origins: globalPatterns});
      $('allAccess').textContent = SPWN.t(allowed ? 'allSitesGranted' : 'grantAllSites');
      $('allAccess').disabled = allowed;
    } catch (_) { $('allAccess').disabled = true; }
  }
  $('allAccess').addEventListener('click', async () => {
    // A full tab avoids Firefox's permission bubble hiding under the toolbar popup.
    const url = browser.runtime.getURL('permission/permission.html') + '?mode=all' +
      (Number.isInteger(tab?.id) ? '&tabId=' + tab.id : '');
    await browser.tabs.create({url, active: true});
    window.close();
  });
  await updateGlobalAccess();
  async function updateAutoCheckbox() {
    if (!autoKey) return;
    try {
      const [saved, allowed] = await Promise.all([
        browser.storage.local.get(autoKey),
        browser.permissions.contains({origins: [SPWNAuto.pattern(origin)]})
      ]);
      $('autoShow').checked = saved[autoKey] === true && allowed;
      $('permissionHint').hidden = allowed;
    } catch (error) { $('autoShow').checked = false; $('permissionHint').hidden = true; }
  }
  $('autoShow').addEventListener('change', async () => {
    if (!autoKey) return;
    const checked = $('autoShow').checked;
    $('autoShow').disabled = true;
    try {
      if (checked) {
        const pattern = SPWNAuto.pattern(origin);
        // Never show Firefox's permission prompt underneath this small toolbar popup.
        // On first use, open a normal extension tab. The grant button in that tab
        // directly invokes permissions.request() from a fresh user gesture.
        const grantedAlready = await browser.permissions.contains({origins: [pattern]});
        if (!grantedAlready) {
          const url = browser.runtime.getURL('permission/permission.html') + '?' +
            new URLSearchParams({origin, tabId: String(tab?.id ?? ''), scope}).toString();
          await browser.tabs.create({url, active: true});
          window.close();
          return;
        }
        await SPWNAuto.register(origin);
        await browser.storage.local.set({[autoKey]: true});
        $('notice').hidden = true;
      } else {
        await browser.storage.local.remove(autoKey);
        await SPWNAuto.unregister(origin);
        // Preserve the broad permission if the user opted into all-sites access.
        // Turning off automatic display must not revoke an unrelated grant.
        const allGranted = await browser.permissions.contains({origins: globalPatterns});
        if (!allGranted) await browser.permissions.remove({origins: [SPWNAuto.pattern(origin)]});
        $('notice').hidden = true;
      }
    } catch (error) {
      console.error('Spiderpiggy Notes: automatic sticky setup failed', error);
      $('notice').textContent = `${SPWN.t('autoSetFailed')} ${String(error.message || error).slice(0, 180)}`;
      $('notice').hidden = false;
    } finally {
      await updateAutoCheckbox();
      $('autoShow').disabled = false;
    }
  });
  if (autoKey) await updateAutoCheckbox();
  const updateCount = () => $('count').textContent = `${editor.value.length.toLocaleString()} / 20.000`;
  function renderColors() {
    for (const button of $('colors').querySelectorAll('button')) {
      const active = button.dataset.color === selectedColor;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    }
  }
  for (const color of SPWN.colors) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'swatch color-' + color;
    button.dataset.color = color;
    button.title = SPWN.t('color_' + color);
    button.setAttribute('aria-label', button.title);
    button.addEventListener('click', async () => {
      if (!info || color === selectedColor) return;
      await pending;
      selectedColor = color;
      renderColors();
      const noteKey = currentKey, colorKey = currentColorKey;
      try {
        const existing = (await browser.storage.local.get(noteKey))[noteKey];
        const updates = {[colorKey]: color};
        if (existing && typeof existing.text === 'string') {
          updates[noteKey] = {...existing, color, updatedAt: Date.now()};
        }
        await browser.storage.local.set(updates);
      } catch (error) {
        $('saved').textContent = SPWN.t('saveFailed');
        $('saved').classList.add('error');
      }
    });
    $('colors').append(button);
  }
  renderColors();
  async function load() {
    if (!info) return;
    currentKey = SPWN.noteKey(scope, info);
    currentColorKey = SPWN.colorKey(scope, info);
    currentTitleKey = SPWN.titleKey(scope, info);
    loading = true;
    try {
      const stored = await browser.storage.local.get([currentKey, currentColorKey, currentTitleKey]);
      const value = stored[currentKey];
      selectedColor = SPWN.validColor(stored[currentColorKey] || value?.color);
      renderColors();
      editor.value = value?.text || '';
      customTitle = SPWN.customTitle(stored[currentTitleKey] ?? value?.customTitle);
      titleInput.value = customTitle;
      $('saved').textContent = SPWN.t('savedAutomatically');
      $('saved').classList.remove('error');
      updateCount();
    } finally { loading = false; }
    $('siteMode').classList.toggle('selected', scope === 'site');
    $('pageMode').classList.toggle('selected', scope === 'page');
    $('siteMode').setAttribute('aria-pressed', scope === 'site');
    $('pageMode').setAttribute('aria-pressed', scope === 'page');
  }
  let pending = Promise.resolve();
  editor.addEventListener('input', () => {
    if (loading || !info) return;
    const key = currentKey, text = editor.value, s = scope, color = selectedColor, noteTitle = customTitle;
    updateCount();
    $('saved').textContent = SPWN.t('saving');
    // Serialise edits so fast mode changes never overwrite newer input.
    pending = pending.catch(() => {}).then(async () => {
      if (text.trim()) {
        await browser.storage.local.set({[key]: SPWN.newNote(text, s, info, title, color, noteTitle)});
      } else {
        await browser.storage.local.remove(key);
      }
    }).then(() => {
      if (key === currentKey && editor.value === text) $('saved').textContent = SPWN.t('savedAutomatically');
    }).catch(() => {
      $('saved').textContent = SPWN.t('saveFailed'); $('saved').classList.add('error');
    });
  });
  titleInput.addEventListener('input', () => {
    if (loading || !info) return;
    const next = SPWN.customTitle(titleInput.value);
    const prefKey = currentTitleKey, noteKey = currentKey;
    customTitle = next;
    $('saved').textContent = SPWN.t('saving');
    pending = pending.catch(() => {}).then(async () => {
      const old = (await browser.storage.local.get(noteKey))[noteKey];
      const updates = {[prefKey]: next};
      if (old && typeof old.text === 'string') updates[noteKey] = {...old, customTitle: next};
      await browser.storage.local.set(updates);
    }).then(() => {
      if (prefKey === currentTitleKey && SPWN.customTitle(titleInput.value) === next)
        $('saved').textContent = SPWN.t('savedAutomatically');
    }).catch(() => {$('saved').textContent = SPWN.t('saveFailed');});
  });
  async function chooseScope(nextScope) {
    if (!info || scope === nextScope) return;
    await pending;
    scope = nextScope;
    await load();
  }
  $('siteMode').addEventListener('click', () => chooseScope('site'));
  $('pageMode').addEventListener('click', () => chooseScope('page'));
  $('settings').addEventListener('click', () => browser.runtime.openOptionsPage());
  $('overview').addEventListener('click', () => browser.runtime.openOptionsPage());
  $('delete').addEventListener('click', async () => {
    if (!info) return;
    if (!confirm(SPWN.t('confirmDelete'))) return;
    await pending;
    await browser.storage.local.remove(currentKey);
    editor.value = ''; updateCount();
    $('saved').textContent = SPWN.t('deleted');
  });
  $('sticky').addEventListener('click', async () => {
    if (!tab?.id || !info) return;
    await pending;
    $('sticky').disabled = true;
    try {
      // One injection both creates and opens the note. No race with tabs.sendMessage.
      // activeTab is granted when the user opens the toolbar popup.
      const results = await browser.scripting.executeScript({
        target: {tabId: tab.id},
        func: spwnLaunchSticky,
        args: [{siteKey: info.siteKey, pageKey: info.pageKey,
          scope, host: info.host, title}]
      });
      if (!results?.length || results[0]?.result?.opened !== true) {
        throw new Error('No confirmation from the website (sticky script did not finish).');
      }
      window.close();
    } catch(e) {
      console.error('Spiderpiggy Website Notes: sticky note failed', e);
      // Show the real error so permission problems are distinguishable from code errors.
      const message = String(e?.message || e || '').slice(0, 220);
      $('notice').textContent = `${SPWN.t('stickyFailed')} ${message}`;
      $('notice').hidden = false;
      $('sticky').disabled = false;
    }
  });
  browser.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes[SPWN.themeKey]) SPWN.applyTheme();
    // Do not replace text while the user is typing.
    if ((changes[currentKey] || changes[currentTitleKey]) && document.activeElement !== editor
      && document.activeElement !== titleInput) load();
  });
  await load();
})();
