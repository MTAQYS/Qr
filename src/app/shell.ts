import { CREDIT_HREF, STORAGE_LANG, STORAGE_THEME } from '../lib/brand';
import { isLang, t, type Lang } from '../i18n';
import { isMode, MODES, parseMode, type Mode } from '../lib/routes';
import { mountCreate } from './create';
import { el } from './dom';
import { applyI18n } from './i18nDom';
import { brandMark } from './mark';
import { applyDocumentMeta, applyThemeColor } from './meta';
import { mountScan } from './scan';

export function start(): void {
  const app = document.getElementById('app');
  if (!app) return;

  let lang = readLang();
  const createRoot = el('div', { id: 'create', class: 'stage' });
  const scanRoot = el('div', { id: 'scan', class: 'scan', hidden: '' });
  const crash = el('p', { id: 'crash', class: 'crash', hidden: '', 'data-i18n': 'app.crash' });
  const status = el('div', { id: 'status', class: 'sr', 'aria-live': 'polite', 'aria-atomic': 'true' });

  const fr = el('button', { type: 'button', 'data-i18n': 'lang.fr', 'data-i18n-aria': 'lang.frLabel' });
  const en = el('button', { type: 'button', 'data-i18n': 'lang.en', 'data-i18n-aria': 'lang.enLabel' });
  const langGroup = el('div', { class: 'segment', role: 'group', 'data-i18n-aria': 'lang.group' }, [fr, en]);
  const themeButton = el('button', { type: 'button', class: 'button button-secondary', id: 'theme' });

  const tabs = el('div', { class: 'tabs', role: 'tablist', 'data-i18n-aria': 'nav.label' });
  const tabButtons = new Map<Mode, HTMLButtonElement>();
  for (const mode of MODES) {
    const button = el('button', {
      type: 'button',
      class: 'tab',
      role: 'tab',
      id: `tab-${mode}`,
      'data-i18n': `tab.${mode}`,
      'aria-controls': mode === 'scan' ? 'scan' : 'create',
    });
    button.addEventListener('click', () => {
      location.hash = `#/${mode}`;
    });
    tabButtons.set(mode, button);
    tabs.append(button);
  }

  const credit = el('a', { class: 'credit', href: CREDIT_HREF, rel: 'noreferrer noopener' });
  credit.append(brandMark('mark'), el('span', { 'data-i18n': 'footer.credit' }));

  const lockup = el('div', { class: 'lockup' });
  lockup.append(
    brandMark('mark'),
    el('div', {}, [
      el('h1', { 'data-i18n': 'header.title' }),
      el('p', { class: 'tagline', 'data-i18n': 'header.tagline' }),
    ]),
  );

  const main = el('main', { id: 'content' }, [crash, createRoot, scanRoot]);
  const page = el('div', { class: 'page' }, [
    el('a', { class: 'skip', href: '#content', 'data-i18n': 'skip' }),
    el('header', { class: 'top' }, [lockup, el('div', { class: 'tools' }, [langGroup, themeButton])]),
    tabs,
    main,
    el('footer', { class: 'footer' }, [
      el('p', { class: 'hint', 'data-i18n': 'footer.privacy' }),
      credit,
    ]),
    status,
  ]);
  app.append(page);

  const createView = mountCreate(createRoot, () => lang);
  const scanView = mountScan(scanRoot, () => lang);

  function section(mode: Mode): string {
    return t(lang, `tab.${mode}`);
  }

  function paintChrome(mode: Mode): void {
    const light = document.documentElement.getAttribute('data-theme') === 'light';
    themeButton.textContent = t(lang, light ? 'theme.dark' : 'theme.light');
    themeButton.setAttribute('aria-label', t(lang, light ? 'theme.switchToDark' : 'theme.switchToLight'));
    fr.setAttribute('aria-pressed', lang === 'fr' ? 'true' : 'false');
    en.setAttribute('aria-pressed', lang === 'en' ? 'true' : 'false');
    for (const [name, button] of tabButtons) {
      const selected = name === mode;
      button.setAttribute('aria-selected', selected ? 'true' : 'false');
      button.tabIndex = selected ? 0 : -1;
    }
  }

  function render(mode: Mode): void {
    createRoot.hidden = mode === 'scan';
    scanRoot.hidden = mode !== 'scan';
    if (mode === 'scan') scanView.sync();
    else {
      scanView.stop();
      createView.show(mode);
    }
    applyDocumentMeta(lang, section(mode));
    paintChrome(mode);
  }

  function setLang(next: Lang): void {
    lang = next;
    document.documentElement.lang = next;
    try {
      localStorage.setItem(STORAGE_LANG, next);
    } catch {
      /* Storage can throw in private mode. */
    }
    applyI18n(page, lang);
    const mode = parseMode(location.hash);
    applyDocumentMeta(lang, section(mode));
    paintChrome(mode);
    if (mode === 'scan') scanView.sync();
    else createView.show(mode);
  }

  fr.addEventListener('click', () => setLang('fr'));
  en.addEventListener('click', () => setLang('en'));
  themeButton.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(STORAGE_THEME, next);
    } catch {
      /* Storage can throw in private mode. */
    }
    paintChrome(parseMode(location.hash));
    window.requestAnimationFrame(applyThemeColor);
  });

  tabs.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Home' && event.key !== 'End') {
      return;
    }
    event.preventDefault();
    const current = parseMode(location.hash);
    const index = MODES.indexOf(current);
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % MODES.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + MODES.length) % MODES.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = MODES.length - 1;
    const mode = MODES[next];
    if (!mode) return;
    location.hash = `#/${mode}`;
    tabButtons.get(mode)?.focus();
  });

  window.addEventListener('hashchange', () => render(parseMode(location.hash)));
  window.addEventListener('error', (event) => {
    if (event.target !== window) return;
    crash.hidden = false;
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) scanView.stop();
  });

  const raw = location.hash.replace(/^#\/?/, '').split(/[?&]/)[0] ?? '';
  if (!isMode(raw)) history.replaceState(null, '', `${location.pathname}${location.search}#/text`);

  applyI18n(page, lang);
  render(parseMode(location.hash));
  applyThemeColor();
}

function readLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_LANG);
    if (isLang(stored)) return stored;
  } catch {
    /* Storage can throw in private mode. */
  }
  return document.documentElement.lang === 'en' ? 'en' : 'fr';
}
