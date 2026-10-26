import { t, type Lang } from '../i18n';

export function applyDocumentMeta(lang: Lang, section: string): void {
  document.documentElement.lang = lang;
  document.title = t(lang, 'meta.titleWith', { section });
  setContent('meta[name="description"]', t(lang, 'meta.description'));
  setContent('meta[property="og:title"]', t(lang, 'meta.title'));
  setContent('meta[property="og:description"]', t(lang, 'meta.description'));
  setContent('meta[property="og:locale"]', lang === 'fr' ? 'fr_FR' : 'en_US');
  setContent('meta[property="og:image:alt"]', t(lang, 'meta.imageAlt'));
  setContent('meta[name="twitter:title"]', t(lang, 'meta.title'));
  setContent('meta[name="twitter:description"]', t(lang, 'meta.description'));
  setContent('meta[name="twitter:image:alt"]', t(lang, 'meta.imageAlt'));
}

export function applyThemeColor(): void {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!(meta instanceof HTMLMetaElement)) return;
  meta.content = getComputedStyle(document.documentElement).getPropertyValue('--dg-bg').trim();
}

function setContent(selector: string, value: string): void {
  const node = document.head.querySelector(selector);
  if (node) node.setAttribute('content', value);
}
