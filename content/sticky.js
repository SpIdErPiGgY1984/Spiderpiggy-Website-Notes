'use strict';
/* Serialized into Firefox's isolated content-script context only on explicit user click. */
/* Must remain self-contained: executeScript({func}) does not capture popup variables. */
function spwnLaunchSticky(payload) {
  // A navigation can race with the tab-complete fallback. Never show a note on
  // a different document after that navigation, even within the same domain.
  if (payload?.auto && payload.expectedUrl && location.href.split('#')[0] !== String(payload.expectedUrl).split('#')[0]) {
    return {opened: false, reason: 'navigation-changed'};
  }
  if (globalThis.__SPWN_Sticky?.open) return globalThis.__SPWN_Sticky.open(payload);

  const css = `
:host{all:initial;color-scheme:light;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;
--n-bg:#fffdf3;--n-head:#fff0b8;--n-strip:#fff8de;--n-fg:#283341;--n-muted:#67717b;--n-border:#dbcfa6;--n-selected:#fff;--n-hover:#0000000f}
:host([data-color="yellow"]){--n-bg:#fff8d4;--n-head:#ffe187;--n-strip:#fff0ae;--n-fg:#40351f;--n-muted:#74612e;--n-border:#e3c66b;--n-selected:#fffdf1}
:host([data-color="mint"]){--n-bg:#e7fff3;--n-head:#a6e9d0;--n-strip:#d1f8e5;--n-fg:#1c4033;--n-muted:#4d7667;--n-border:#90d1b4;--n-selected:#f4fff9}
:host([data-color="blue"]){--n-bg:#eaf7ff;--n-head:#b4def9;--n-strip:#d7edff;--n-fg:#213a54;--n-muted:#547088;--n-border:#9ec7e7;--n-selected:#f7fcff}
:host([data-color="pink"]){--n-bg:#fff0f5;--n-head:#ffc2d5;--n-strip:#ffe1eb;--n-fg:#4b2d3b;--n-muted:#876474;--n-border:#e9afc1;--n-selected:#fff8fa}
:host([data-color="lavender"]){--n-bg:#f5f0ff;--n-head:#d5c7ff;--n-strip:#e9dfff;--n-fg:#382d55;--n-muted:#74678c;--n-border:#c6b8ec;--n-selected:#fefaff}
:host([data-color="slate"]){color-scheme:dark;--n-bg:#222c3c;--n-head:#3d526b;--n-strip:#303f53;--n-fg:#f0f5ff;--n-muted:#c0cdde;--n-border:#556b83;--n-selected:#455d78;--n-hover:#ffffff1a}
@media(prefers-color-scheme:dark){:host([data-color="default"]:not([data-theme="light"])){color-scheme:dark;--n-bg:#252c39;--n-head:#3a4559;--n-strip:#2e3949;--n-fg:#e7ebf2;--n-muted:#b0bbca;--n-border:#48566a;--n-selected:#47566c;--n-hover:#ffffff1a}}
:host([data-color="default"][data-theme="dark"]){color-scheme:dark;--n-bg:#252c39;--n-head:#3a4559;--n-strip:#2e3949;--n-fg:#e7ebf2;--n-muted:#b0bbca;--n-border:#48566a;--n-selected:#47566c;--n-hover:#ffffff1a}
*{box-sizing:border-box}.panel{position:fixed;top:clamp(110px,27vh,210px);right:18px;z-index:2147483647;
width:min(320px,calc(100vw - 20px));max-height:calc(100vh - 14px);background:var(--n-bg);color:var(--n-fg);
border:1px solid var(--n-border);box-shadow:0 12px 40px #0003;border-radius:11px;overflow:hidden;font:12px/1.4 system-ui,sans-serif}
.panel[hidden],.palette[hidden],.titleEditor[hidden]{display:none!important}.head{background:var(--n-head);display:flex;align-items:center;padding:6px 8px;gap:5px;border-bottom:1px solid var(--n-border)}
.grab{flex:1;font-weight:700;cursor:grab;user-select:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;touch-action:none;font-size:12px}.grab:active{cursor:grabbing}
.head button{border:0;background:transparent;color:var(--n-fg);border-radius:5px;cursor:pointer;font-size:15px;min-width:25px;height:25px;padding:0 3px;display:inline-grid;place-items:center}
.head button.editTitle{font-size:14px;min-width:23px}
    .titleEditor{display:flex;gap:5px;align-items:center;padding:5px 7px;background:var(--n-strip);border-bottom:1px solid var(--n-border)}
    .titleEditor input{width:100%;min-width:0;border:1px solid var(--n-border);background:var(--n-bg);color:var(--n-fg);border-radius:5px;padding:5px 7px;font:12px system-ui,sans-serif;outline:none}
    .titleEditor input:focus{outline:2px solid var(--n-border)}
    .titleEditor button{border:1px solid var(--n-border);border-radius:5px;background:var(--n-selected);color:var(--n-fg);cursor:pointer;padding:4px 7px;font-size:12px}
    .head button.paint{border:1px solid var(--n-border);background:var(--n-selected);color:var(--n-fg);box-shadow:0 1px 3px #0002}
.head button.paint svg{width:17px;height:17px;display:block;stroke:currentColor;stroke-width:2;fill:none;stroke-linecap:round;stroke-linejoin:round}
.head button.paint[aria-expanded="true"]{outline:2px solid var(--n-fg);outline-offset:-2px}
.head button:hover,.footer button:hover{background:var(--n-hover)}
.head button.paint:hover{filter:brightness(.96)}
.scope{display:flex;background:var(--n-strip);border-bottom:1px solid var(--n-border);padding:4px 8px;gap:5px}.scope button{flex:1;background:transparent;border:1px solid transparent;color:var(--n-fg);border-radius:6px;padding:3px 6px;cursor:pointer;font:12px system-ui,sans-serif}
.scope button.selected{background:var(--n-selected);border-color:var(--n-border);font-weight:700}
.palette{display:flex;background:var(--n-strip);align-items:center;justify-content:space-between;gap:8px;padding:7px 9px;border-bottom:1px solid var(--n-border);font-size:11px}.colors{display:flex;gap:5px;align-items:center}.swatch{display:grid;place-items:center;padding:0;width:19px;height:19px;border:1px solid #0003;border-radius:50%;cursor:pointer}.swatch.active:after{content:'✓';font:bold 12px system-ui;color:#182332;text-shadow:0 1px 1px #fff}.swatch.slate.active:after{color:white;text-shadow:none}.swatch.default{background:linear-gradient(135deg,#fff1b6 50%,#41536b 50%)}.swatch.yellow{background:#ffe17a}.swatch.mint{background:#a9ead0}.swatch.blue{background:#aedbf6}.swatch.pink{background:#ffbed0}.swatch.lavender{background:#cfc3ff}.swatch.slate{background:#40516b}
textarea{display:block;width:100%;height:clamp(92px,21vh,160px);min-height:70px;max-height:45vh;background:transparent;resize:vertical;outline:none;border:0;padding:9px 11px;color:inherit;font:13px/1.55 system-ui,sans-serif;overflow:auto;white-space:pre-wrap}
textarea::placeholder{color:var(--n-muted)}.footer{display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--n-border);color:var(--n-muted);padding:4px 9px;font-size:10px;gap:8px}.footer button{border:0;background:none;color:var(--n-muted);font:inherit;cursor:pointer;border-radius:5px;padding:3px 5px}
.panel.minimized .scope,.panel.minimized .palette,.panel.minimized .titleEditor,.panel.minimized textarea,.panel.minimized .footer{display:none}.panel.minimized .head{border-bottom:0}
/* Keep the collapsed header functional and uncluttered: title, expand, close. */
.panel.minimized .head .editTitle,.panel.minimized .head .paint{display:none!important}
@media(max-height:540px){.panel{top:clamp(64px,21vh,110px)}textarea{height:94px;max-height:34vh}.head{padding:4px 7px}.scope{padding:3px 7px}.footer{padding:3px 8px}}
@media(max-width:400px){.panel{right:8px;width:min(292px,calc(100vw - 12px))}.palette{gap:4px;padding:6px}.colors{gap:3px}.swatch{width:17px;height:17px}}
  `;
  const hostElement = document.createElement('div');
  hostElement.id = 'spwn-sticky-root';
  hostElement.dataset.color = 'default';
  hostElement.style.cssText = 'all:initial;position:fixed;inset:0;width:0;height:0;z-index:2147483647;pointer-events:none';
  const shadow = hostElement.attachShadow({mode:'closed'});
  const style = document.createElement('style'); style.textContent = css; shadow.append(style);
  const panel = document.createElement('div'); panel.className = 'panel'; panel.hidden = true;
  panel.style.pointerEvents = 'auto';
  panel.innerHTML = `
    <div class="head"><span class="grab" title="Drag">📝 Spiderpiggy Notes</span><button type="button" class="editTitle" aria-label="Edit title" title="Edit title">✎</button><button type="button" class="paint" aria-expanded="false" aria-label="Colors"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3a9 9 0 1 0 0 18h1.1a2.1 2.1 0 0 0 1.6-3.5 1.9 1.9 0 0 1 1.5-3.1h2.2A3.6 3.6 0 0 0 22 10.8 9.1 9.1 0 0 0 12 3Z"/><circle cx="7.5" cy="11" r=".85" fill="currentColor" stroke="none"/><circle cx="10.2" cy="7.5" r=".85" fill="currentColor" stroke="none"/><circle cx="15" cy="7.5" r=".85" fill="currentColor" stroke="none"/><circle cx="17" cy="11.5" r=".85" fill="currentColor" stroke="none"/></svg></button><button type="button" class="minimize" aria-label="Minimize">−</button><button type="button" class="close" aria-label="Close" title="Close">×</button></div>
    <div class="titleEditor" hidden><input type="text" maxlength="70" autocomplete="off" aria-label="Note title"><button type="button" class="titleDone">✓</button></div>
    <div class="palette" hidden><span class="colorLabel"></span><div class="colors" role="group"></div></div>
    <div class="scope"><button type="button" class="site"></button><button type="button" class="page"></button></div>
    <textarea maxlength="20000" spellcheck="true"></textarea>
    <div class="footer"><span class="status"></span><button type="button" class="dismiss"></button></div>`;
  shadow.append(panel);
  (document.documentElement || document.body).append(hostElement);
  const $ = selector => panel.querySelector(selector);
  const edit = $('textarea'), status = $('.status');
  const t = (key, fallback) => browser.i18n.getMessage(key) || fallback;
  $('.site').textContent = t('website','Website');
  $('.page').textContent = t('thisPage','This page');
  $('.dismiss').textContent = t('close','Close');
  $('.close').title = t('close','Close');
  $('.close').setAttribute('aria-label',t('close','Close'));
  edit.placeholder = t('notePlaceholder','Type a note…');
  $('.colorLabel').textContent = t('noteColor', 'Note color');
  $('.colors').setAttribute('aria-label', t('chooseNoteColor', 'Choose a color'));
  let info = null, scope = 'site', key = '', currentColorKey = '', currentMinimizedKey = '', currentTitleKey = '', noteTitle = '', color = 'default', busy = false, positionRestored = false;
  let chain = Promise.resolve();

  const availableColors = ['default', 'yellow', 'mint', 'blue', 'pink', 'lavender', 'slate'];
  const validColor = value => availableColors.includes(value) ? value : 'default';
  const safeTitle = value => String(value || '').trim().slice(0, 70);
  const renderTitle = () => {$('.grab').textContent = '📝 ' + (noteTitle || 'Spiderpiggy Notes');};
  function renderColors() {
    hostElement.dataset.color = color;
    for (const swatch of $('.colors').querySelectorAll('button')) {
      const selected = swatch.dataset.color === color;
      swatch.classList.toggle('active', selected);
      swatch.setAttribute('aria-pressed', String(selected));
    }
  }
  for (const name of availableColors) {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'swatch ' + name;
    swatch.dataset.color = name;
    swatch.title = t('color_' + name, name);
    swatch.setAttribute('aria-label', swatch.title);
    swatch.addEventListener('click', async () => {
      if (!info || color === name) return;
      await chain;
      const noteKey = key, prefKey = currentColorKey;
      color = name;
      renderColors();
      try {
        const note = (await browser.storage.local.get(noteKey))[noteKey];
        const updates = {[prefKey]: name};
        if (note && typeof note.text === 'string') updates[noteKey] = {...note, color: name, updatedAt: Date.now()};
        await browser.storage.local.set(updates);
        status.textContent = t('savedAutomatically', 'Saved automatically');
      } catch (_) { status.textContent = t('saveFailed', 'Could not save'); }
      $('.palette').hidden = true;
      $('.paint').setAttribute('aria-expanded', 'false');
    });
    $('.colors').append(swatch);
  }
  renderColors();
  $('.paint').title = t('chooseNoteColor', 'Choose a color');
  $('.paint').setAttribute('aria-label', $('.paint').title);
  $('.paint').addEventListener('click', () => {
    $('.palette').hidden = !$('.palette').hidden;
    $('.paint').setAttribute('aria-expanded', String(!$('.palette').hidden));
    constrainPosition();
  });
  function setMinimized(minimized) {
    panel.classList.toggle('minimized', minimized);
    $('.minimize').textContent = minimized ? '▢' : '−';
    const label = minimized ? t('restore', 'Expand') : t('minimize', 'Minimize');
    $('.minimize').title = label;
    $('.minimize').setAttribute('aria-label', label);
    $('.minimize').setAttribute('aria-expanded', String(!minimized));
    constrainPosition();
  }
  setMinimized(false);
  $('.editTitle').title = t('editTitle', 'Edit title');
  $('.editTitle').setAttribute('aria-label', $('.editTitle').title);
  $('.titleEditor input').placeholder = t('customTitlePlaceholder', 'Optional title');
  $('.titleDone').title = t('save', 'Save');
  const closeTitleEditor = () => {$('.titleEditor').hidden = true; constrainPosition();};
  $('.editTitle').addEventListener('click', () => {
    const row = $('.titleEditor');
    row.hidden = !row.hidden;
    if (!row.hidden) { $('.titleEditor input').value = noteTitle; $('.titleEditor input').focus(); }
    constrainPosition();
  });
  $('.titleDone').addEventListener('click', closeTitleEditor);
  $('.titleEditor input').addEventListener('keydown', event => {
    if (event.key === 'Enter') {event.preventDefault(); closeTitleEditor();}
    if (event.key === 'Escape') {event.preventDefault(); closeTitleEditor();}
  });
  $('.titleEditor input').addEventListener('input', () => {
    if (busy || !info) return;
    const next = safeTitle($('.titleEditor input').value), prefKey = currentTitleKey, saveKey = key;
    noteTitle = next; renderTitle();
    status.textContent = t('saving', 'Saving…');
    chain = chain.catch(() => {}).then(async () => {
      const old = (await browser.storage.local.get(saveKey))[saveKey];
      const updates = {[prefKey]: next};
      if (old && typeof old.text === 'string') updates[saveKey] = {...old, customTitle: next};
      await browser.storage.local.set(updates);
    }).then(() => {if (prefKey === currentTitleKey) status.textContent = t('savedAutomatically', 'Saved automatically');})
      .catch(() => {status.textContent = t('saveFailed', 'Save failed');});
  });
  $('.minimize').addEventListener('click', async () => {
    if (!currentMinimizedKey || !info) return;
    const next = !panel.classList.contains('minimized');
    const prefKey = currentMinimizedKey;
    setMinimized(next);
    try {
      await browser.storage.local.set({[prefKey]: next});
    } catch (error) {
      setMinimized(!next);
      console.warn('Spiderpiggy Notes: could not save minimized state', error);
    }
  });

  function updateScope() {
    $('.site').classList.toggle('selected',scope === 'site');
    $('.page').classList.toggle('selected',scope === 'page');
    $('.site').setAttribute('aria-pressed', scope === 'site');
    $('.page').setAttribute('aria-pressed', scope === 'page');
  }
  async function loadNote() {
    if (!info) return;
    key = scope === 'site' ? info.siteKey : info.pageKey;
    currentColorKey = 'spwn:color:' + key.slice('spwn:note:'.length);
    currentMinimizedKey = 'spwn:minimized:' + key.slice('spwn:note:'.length);
    currentTitleKey = 'spwn:title:' + key.slice('spwn:note:'.length);
    busy = true;
    try {
      const data = await browser.storage.local.get([key, currentColorKey, currentMinimizedKey, currentTitleKey]);
      edit.value = data[key]?.text || '';
      noteTitle = safeTitle(data[currentTitleKey] ?? data[key]?.customTitle);
      $('.titleEditor input').value = noteTitle; renderTitle();
      color = validColor(data[currentColorKey] || data[key]?.color);
      renderColors();
      setMinimized(data[currentMinimizedKey] === true);
      status.textContent = t('savedAutomatically','Saved automatically');
      updateScope();
    } finally { busy = false; }
  }
  edit.addEventListener('input', () => {
    if (busy || !info) return;
    const value = edit.value, saveKey = key, saveScope = scope, saveInfo = info, saveColor = color, saveTitle = noteTitle;
    status.textContent = t('saving','Saving…');
    chain = chain.catch(()=>{}).then(() => {
      if (!value.trim()) return browser.storage.local.remove(saveKey);
      return browser.storage.local.set({[saveKey]: {
        text:value, scope:saveScope, host:saveInfo.host,
        page:saveScope === 'page' ? saveInfo.page : '',
        title:saveInfo.title.slice(0,180), customTitle:saveTitle, color:saveColor, updatedAt:Date.now()
      }});
    }).then(()=>{if(key===saveKey && edit.value===value)status.textContent=t('savedAutomatically','Saved automatically');})
    .catch(()=>{status.textContent=t('saveFailed','Save failed');});
  });
  async function savePreferredScope() {
    if (!info) return;
    const preference = 'spwn:activeScope:' + info.pageKey.slice('spwn:note:page:'.length);
    try { await browser.storage.local.set({[preference]: scope}); }
    catch (error) { console.warn('Spiderpiggy Notes: could not save selected scope', error); }
  }
  async function changeScope(next) {
    if (!info || scope === next) return;
    await chain;
    scope = next;
    closeTitleEditor();
    await loadNote();
    await savePreferredScope();
  }
  $('.site').addEventListener('click',()=>changeScope('site'));
  $('.page').addEventListener('click',()=>changeScope('page'));
  function close() {panel.hidden = true;}
  $('.close').addEventListener('click',close);
  $('.dismiss').addEventListener('click',close);
  browser.storage.onChanged.addListener((changes, area)=>{
    if(area!=='local')return;
    if(changes['spwn:theme'])setTheme();
    if(changes[currentColorKey]) {
      color = validColor(changes[currentColorKey].newValue);
      renderColors();
    }
    if (changes[currentTitleKey] && shadow.activeElement !== $('.titleEditor input')) {
      noteTitle = safeTitle(changes[currentTitleKey].newValue); renderTitle();
      $('.titleEditor input').value = noteTitle;
    }
    if (changes[currentMinimizedKey] && !panel.hidden) {
      setMinimized(changes[currentMinimizedKey].newValue === true);
    }
    if(changes[key] && document.activeElement!==hostElement && shadow.activeElement!==edit && shadow.activeElement!==$('.titleEditor input')) loadNote();
  });
  async function setTheme(){
    const data=await browser.storage.local.get('spwn:theme');
    const theme=data['spwn:theme'] || 'system';
    if(theme==='system')hostElement.removeAttribute('data-theme');
    else hostElement.dataset.theme=theme;
  }
  async function open(message) {
    // Both registered script and navigation fallback may fire. Do not erase edits
    // already being typed in an open note when the second automatic call arrives.
    if (message?.auto && !panel.hidden && info && info.siteKey === message.siteKey
      && info.pageKey === message.pageKey) return {opened: true, alreadyVisible: true};
    if (typeof message?.siteKey !== 'string' || typeof message?.pageKey !== 'string') {
      throw new Error('Invalid note information');
    }
    info = {siteKey: message.siteKey, pageKey: message.pageKey,
      host: String(message.host || ''),
      page: message.pageKey.slice('spwn:note:page:'.length),
      title: String(message.title || '')};
    scope = message.scope === 'page' ? 'page' : 'site';
    closeTitleEditor();
    await chain;
    await loadNote();
    await setTheme();
    panel.hidden = false;
    if (!message.auto) await savePreferredScope();
    if (!positionRestored) {
      positionRestored = true;
      try {
        const stored = (await browser.storage.local.get('spwn:position'))['spwn:position'];
        if (stored && Number.isFinite(stored.left) && Number.isFinite(stored.top)) {
          panel.style.right = 'auto';
          panel.style.left = Math.round(stored.left) + 'px';
          panel.style.top = Math.round(stored.top) + 'px';
        }
      } catch (_) { /* The default position is still usable. */ }
    }
    constrainPosition();
    if (!message.auto && !panel.classList.contains('minimized')) edit.focus();
    return {opened: true};
  }
  function constrainPosition() {
    if (panel.hidden) return;
    const rect = panel.getBoundingClientRect();
    const maxX = Math.max(0, innerWidth - rect.width - 5);
    const maxY = Math.max(0, innerHeight - rect.height - 5);
    if (panel.style.left) {
      panel.style.left = Math.min(maxX, Math.max(0, rect.left)) + 'px';
    }
    if (rect.bottom > innerHeight - 5 || rect.top < 0 || panel.style.top && parseFloat(panel.style.top) > maxY) {
      panel.style.top = Math.min(maxY, Math.max(0, rect.top)) + 'px';
    }
  }
  let dragging = null;
  const grab = $('.grab');
  grab.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    const rect = panel.getBoundingClientRect();
    dragging = {pointerId: event.pointerId, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top};
    panel.style.right = 'auto';
    panel.style.left = rect.left + 'px';
    panel.style.top = rect.top + 'px';
    grab.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  grab.addEventListener('pointermove', event => {
    if (!dragging || dragging.pointerId !== event.pointerId) return;
    const maxX = Math.max(0, innerWidth - panel.offsetWidth - 5);
    const maxY = Math.max(0, innerHeight - panel.offsetHeight - 5);
    const x = Math.max(0, Math.min(maxX, event.clientX - dragging.offsetX));
    const y = Math.max(0, Math.min(maxY, event.clientY - dragging.offsetY));
    panel.style.left = x + 'px';
    panel.style.top = y + 'px';
  });
  grab.addEventListener('pointerup', () => {
    if (!dragging) return;
    dragging = null;
    browser.storage.local.set({'spwn:position': {
      left: Math.round(parseFloat(panel.style.left)),
      top: Math.round(parseFloat(panel.style.top))
    }}).catch(() => {});
  });
  grab.addEventListener('pointercancel', () => { dragging = null; });
  window.addEventListener('resize', constrainPosition);
  // Only mark initialized after DOM and listeners exist.
  globalThis.__SPWN_Sticky = {open};
  return open(payload);
}
