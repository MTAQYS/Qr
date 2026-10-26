/* Keep the keys in sync with STORAGE_LANG and STORAGE_THEME in src/lib/brand.ts. */
(function () {
  try {
    var theme = localStorage.getItem('qr.theme');
    var lang = localStorage.getItem('qr.lang');
    if (theme === 'light' || theme === 'dark') {
      document.documentElement.setAttribute('data-theme', theme);
    }
    if (lang === 'fr' || lang === 'en') document.documentElement.lang = lang;
  } catch (error) {
    /* Storage can throw in private mode. */
  }
})();
