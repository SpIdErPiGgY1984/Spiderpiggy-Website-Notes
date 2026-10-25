'use strict';
/* Shared helpers. No website content is read, and no network calls are made. */
const SPWN = Object.freeze({
  prefix: 'spwn:note:',
  themeKey: 'spwn:theme',
  positionKey: 'spwn:position',
  maxChars: 20000,
  maxTitleChars: 70,
  titleKey(scope, info) { return 'spwn:title:' + this.noteKey(scope, info).slice(this.prefix.length); },
  customTitle(value) { return String(value || '').trim().slice(0, this.maxTitleChars); },
  colors: ['default', 'yellow', 'mint', 'blue', 'pink', 'lavender', 'slate'],
  validColor(value) { return this.colors.includes(value) ? value : 'default'; },
  colorKey(scope, info) { return 'spwn:color:' + (scope === 'page' ? info.pageKey : info.siteKey).slice(this.prefix.length); },
  getSiteInfo(url) {
    const u = new URL(url);
    if (!['https:', 'http:'].includes(u.protocol)) return null;
    const host = u.host.toLowerCase().replace(/^www\./, '');
    // Only keep known public page identifiers. Strip sessions, tokens, searches,
    // and arbitrary query parameters. phpBB topic links rely on ?t= and ?f=.
    const safeParams = new Set(['t', 'f', 'p', 'u', 'id', 'mode', 'topic_id', 'forum_id', 'thread', 'post_id', 'page', 'article']);
    const kept = [...u.searchParams.entries()]
      .filter(([name, value]) => safeParams.has(name.toLowerCase()) && /^[a-z0-9_-]{1,60}$/i.test(value))
      .sort(([nameA,valueA],[nameB,valueB]) => nameA.localeCompare(nameB) || valueA.localeCompare(valueB));
    const params = new URLSearchParams();
    for (const [name,value] of kept) params.append(name,value);
    const page = `${u.origin}${u.pathname}${params.size ? `?${params}` : ''}`;
    return {
      siteKey: `spwn:note:site:${host}`,
      pageKey: `spwn:note:page:${page}`,
      host, page
    };
  },
  noteKey(scope, info) { return scope === 'page' ? info.pageKey : info.siteKey; },
  newNote(text, scope, info, title, color = 'default', customTitle = '') {
    return {text: String(text).slice(0, this.maxChars), scope,
      host: info.host, page: scope === 'page' ? info.page : '',
      title: String(title || info.host).slice(0, 180), customTitle: this.customTitle(customTitle),
      color: this.validColor(color), updatedAt: Date.now()};
  },
  t(key, fallback = '') { return browser.i18n.getMessage(key) || fallback || key; },
  localize(root = document) {
    document.documentElement.lang = browser.i18n.getUILanguage?.().toLowerCase().startsWith('nl') ? 'nl' : 'en';
    root.querySelectorAll('[data-i18n]').forEach(el => {el.textContent = this.t(el.dataset.i18n);});
    root.querySelectorAll('[data-i18n-title]').forEach(el => {el.title = this.t(el.dataset.i18nTitle);});
    root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {el.placeholder = this.t(el.dataset.i18nPlaceholder);});
  },
  async applyTheme() {
    const value = (await browser.storage.local.get(this.themeKey))[this.themeKey] || 'system';
    document.documentElement.dataset.theme = value;
    return value;
  }
});
