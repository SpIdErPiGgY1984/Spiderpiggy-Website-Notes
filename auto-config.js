'use strict';
/* A single origin gets access only after the user opts in. */
const SPWNAuto = Object.freeze({
  prefix: 'spwn:auto:',
  key(origin) { return this.prefix + origin; },
  pattern(origin) {
    const u = new URL(origin);
    if (!['https:', 'http:'].includes(u.protocol) || u.origin !== origin) throw Error('Invalid website origin');
    return `${origin}/*`;
  },
  id(origin) {
    // Two simple deterministic hashes, restricted to safe ASCII ID characters.
    let h1 = 2166136261, h2 = 2246822519;
    for (let i = 0; i < origin.length; i++) {
      const c = origin.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
      h2 = Math.imul(h2 ^ c, 3266489917) >>> 0;
    }
    return `spwn-auto-${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
  },
  script(origin) {
    return {id: this.id(origin), matches: [this.pattern(origin)],
      js: ['shared.js', 'content/sticky.js', 'content/auto.js'],
      runAt: 'document_idle', allFrames: false, persistAcrossSessions: true};
  },
  async register(origin) {
    const id = this.id(origin);
    const scripts = await browser.scripting.getRegisteredContentScripts({ids: [id]});
    if (scripts.length) return;
    await browser.scripting.registerContentScripts([this.script(origin)]);
  },
  async unregister(origin) {
    const id = this.id(origin);
    const scripts = await browser.scripting.getRegisteredContentScripts({ids: [id]});
    if (scripts.length) await browser.scripting.unregisterContentScripts({ids: [id]});
  }
});
