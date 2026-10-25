'use strict';
(async () => {
  SPWN.localize();
  const $ = id => document.getElementById(id);
  $('theme').value = await SPWN.applyTheme();
  const t = key => SPWN.t(key);
  let noteRows = [], editing = null;
  const allPatterns = ['http://*/*', 'https://*/*'];

  function notify(message) {
    $('feedback').textContent = message;
    $('feedback').hidden = !message;
  }
  async function updateGlobalPermission() {
    const allowed = await browser.permissions.contains({origins: allPatterns});
    $('allAccessState').textContent = t(allowed ? 'allSitesGranted' : 'allSitesNotGranted');
    $('allSitesGrant').hidden = allowed;
    $('allSitesRevoke').hidden = !allowed;
  }
  $('allSitesGrant').addEventListener('click', () => {
    const url = browser.runtime.getURL('permission/permission.html') + '?mode=all';
    browser.tabs.create({url, active:true}).catch(error => notify(String(error.message || error)));
  });
  $('allSitesRevoke').addEventListener('click', async () => {
    if (!confirm(t('confirmRevokeAllSites'))) return;
    try {await browser.permissions.remove({origins: allPatterns}); await updateGlobalPermission();}
    catch (error) {notify(String(error.message || error));}
  });
  browser.permissions.onAdded.addListener(() => {void updateGlobalPermission();});
  browser.permissions.onRemoved.addListener(() => {void updateGlobalPermission();});
  await updateGlobalPermission();
  function asDate(ts) {
    return Number.isFinite(ts) ? new Date(ts).toLocaleString() : '';
  }
  function make(tag, cls, text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  async function reload() {
    const everything = await browser.storage.local.get(null);
    noteRows = Object.entries(everything).filter(([key,value]) =>
      key.startsWith(SPWN.prefix) && value && typeof value === 'object' && typeof value.text === 'string'
      && (value.scope === 'site' || value.scope === 'page')
    ).map(([key, value]) => ({key, ...value}));
    noteRows.sort((a,b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    $('total').textContent = noteRows.length;
    $('sites').textContent = new Set(noteRows.map(row=>row.host)).size;
    render();
  }
  function render() {
    const filter = $('filter').value, q = $('search').value.trim().toLocaleLowerCase();
    const list = $('notes'); list.replaceChildren();
    const filtered = noteRows.filter(n =>
      (filter === 'all' || n.scope === filter) &&
      (!q || `${n.host} ${n.title || ''} ${n.page || ''} ${n.text}`.toLocaleLowerCase().includes(q))
    );
    if(!filtered.length){list.append(make('div','empty',t('noNotes')));return;}
    const fragment = document.createDocumentFragment();
    for(const n of filtered){
      const card=make('article','noteCard');
      card.dataset.color=SPWN.validColor(n.color);
      const name = n.customTitle || (n.scope==='site' ? (n.host || t('website')) : (n.title || n.host || t('thisPage')));
      const h=make('h3','',name);h.title=name;
      const details=make('small','',`${n.scope==='site'?t('website'):t('thisPage')} · ${asDate(n.updatedAt)}`);
      details.title=n.page || n.host || '';
      const path = n.scope==='page' ? make('small','',n.page || '') : null;
      const pre=make('pre','',n.text);
      const actions=make('div','actions');
      const edit=make('button','',t('editNote'));
      edit.addEventListener('click',()=>openEdit(n));
      const del=make('button','danger',t('deleteNote'));
      del.addEventListener('click',()=>removeNote(n));
      actions.append(edit,del);card.append(h,details);
      if(path)card.append(path);
      card.append(pre,actions);fragment.append(card);
    }
    list.append(fragment);
  }
  function openEdit(n) {
    editing=n;
    $('dialogMeta').textContent = n.page || n.host || '';
    $('editText').value = n.text;
    $('editTitle').value = SPWN.customTitle(n.customTitle);
    $('modal').hidden = false;
    $('editText').focus();
  }
  function closeEdit() {$('modal').hidden=true;editing=null;}
  async function removeNote(n) {
    if(!confirm(t('confirmDelete')))return;
    await browser.storage.local.remove(n.key);
    notify(t('deleted'));
    await reload();
  }
  $('cancel').addEventListener('click',closeEdit);
  $('modal').addEventListener('click',event=>{if(event.target===$('modal'))closeEdit();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape' && !$('modal').hidden)closeEdit();});
  $('save').addEventListener('click',async()=>{
    if(!editing)return;
    const text = $('editText').value;
    if(!text.trim()){
      if(!confirm(t('confirmDelete')))return;
      await browser.storage.local.remove(editing.key);
    }else{
      const {key,...note} = editing;
      const customTitle = SPWN.customTitle($('editTitle').value);
      const prefKey = 'spwn:title:' + editing.key.slice(SPWN.prefix.length);
      await browser.storage.local.set({[key]:{...note,text,customTitle,updatedAt:Date.now()},[prefKey]:customTitle});
    }
    closeEdit(); notify(t('savedAutomatically')); await reload();
  });
  $('search').addEventListener('input',render);
  $('filter').addEventListener('change',render);
  $('theme').addEventListener('change',async()=>{
    await browser.storage.local.set({[SPWN.themeKey]:$('theme').value});
    await SPWN.applyTheme();
  });
  $('export').addEventListener('click',async()=>{
    await reload();
    const backup = JSON.stringify({format:'spiderpiggy-website-notes',version:1,
      exportedAt:new Date().toISOString(),notes:noteRows},null,2);
    const url=URL.createObjectURL(new Blob([backup],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;
    a.download=`spiderpiggy-website-notes-${new Date().toISOString().slice(0,10)}.json`;
    document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),2000);
    notify(t('backupCreated'));
  });
  $('import').addEventListener('change',async event=>{
    const file = event.target.files?.[0];
    event.target.value='';
    if(!file)return;
    if(file.size>3_000_000){notify(t('invalidBackup'));return;}
    try {
      const backup=JSON.parse(await file.text());
      if(backup.format!=='spiderpiggy-website-notes'||backup.version!==1||!Array.isArray(backup.notes)
          || backup.notes.length>2000)throw Error('invalid format');
      const imported = {};
      for(const n of backup.notes){
        if(!n||typeof n.text!=='string'||n.text.length>SPWN.maxChars||!['site','page'].includes(n.scope))
          throw Error('invalid entry');
        let info;
        if(n.scope==='page'){
          if(typeof n.page!=='string'||n.page.length>2048)throw Error('invalid page');
          info=SPWN.getSiteInfo(n.page);
          if(!info||info.page!==n.page)throw Error('invalid URL');
        }else{
          if(typeof n.host!=='string'||n.host.length>253||!n.host||!/^([a-z0-9-]+\.)*[a-z0-9-]+(?::\d{1,5})?$/i.test(n.host))
            throw Error('invalid host');
          info=SPWN.getSiteInfo('https://'+n.host+'/');
          if(!info||info.host!==n.host.toLowerCase())throw Error('invalid domain');
        }
        const key=SPWN.noteKey(n.scope,info);
        imported[key]={text:n.text,scope:n.scope,host:info.host,
          page:n.scope==='page'?info.page:'',
          title:String(n.title||info.host).slice(0,180),
          customTitle:SPWN.customTitle(n.customTitle),
          color:SPWN.validColor(n.color),
          updatedAt:Number.isFinite(n.updatedAt)?Math.min(Date.now(),Math.max(0,n.updatedAt)):Date.now()};
      }
      if(!confirm(`${t('confirmImport')} (${Object.keys(imported).length})`))return;
      const entries=Object.entries(imported);
      for(let i=0;i<entries.length;i+=80)await browser.storage.local.set(Object.fromEntries(entries.slice(i,i+80)));
      // Restore per-scope colour choices in addition to the note body.
      const palettes = {}, titles = {};
      for (const note of Object.values(imported)) {
        const key = SPWN.colorKey(note.scope, SPWN.getSiteInfo(note.page || 'https://' + note.host + '/'));
        palettes[key] = SPWN.validColor(note.color);
        const titleKey = SPWN.titleKey(note.scope, SPWN.getSiteInfo(note.page || 'https://' + note.host + '/'));
        titles[titleKey] = SPWN.customTitle(note.customTitle);
      }
      const paletteEntries = Object.entries(palettes);
      for(let i=0;i<paletteEntries.length;i+=80) {
        await browser.storage.local.set(Object.fromEntries(paletteEntries.slice(i,i+80)));
      }
      const titleEntries = Object.entries(titles);
      for(let i=0;i<titleEntries.length;i+=80) {
        await browser.storage.local.set(Object.fromEntries(titleEntries.slice(i,i+80)));
      }
      notify(`${t('importSuccessful')} (${entries.length})`);
      await reload();
    }catch(e){notify(t('invalidBackup'));}
  });
  browser.storage.onChanged.addListener((changes,area)=>{
    if(area==='local' && Object.keys(changes).some(key=>key.startsWith(SPWN.prefix)))reload();
  });
  await reload();
})();
