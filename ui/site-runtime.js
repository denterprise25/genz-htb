(function () {
  'use strict';

  // A local file URL does not perform a web server's directory-index lookup.
  // Resolve against <base> so the same links work on nested static pages.
  function href(value) {
    if (location.protocol !== 'file:' || typeof value !== 'string' ||
        !value.trim() || value.trim().startsWith('#')) return value;
    let target;
    try { target = new URL(value, document.baseURI); } catch { return value; }
    if (target.protocol !== 'file:' || target.host || !target.pathname.endsWith('/')) return value;
    target.pathname += 'index.html';
    return target.href;
  }

  function fixLink(link) {
    const original = link.getAttribute('href');
    const resolved = href(original);
    if (resolved !== original) link.setAttribute('href', resolved);
  }

  function fixLinks(container = document) {
    if (container.matches?.('a[href]')) fixLink(container);
    container.querySelectorAll('a[href]').forEach(fixLink);
  }

  window.GenzSite = Object.assign(window.GenzSite || {}, { href, fixLinks });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => fixLinks(), { once: true });
  } else {
    fixLinks();
  }

  // Renderers call fixLinks explicitly. This also covers a link added by a
  // future component without changing the browser's normal click behaviour.
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href]');
    if (link) fixLink(link);
  }, true);
}());
