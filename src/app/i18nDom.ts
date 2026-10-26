import { t, type Lang } from '../i18n';

export function applyI18n(root: ParentNode, lang: Lang): void {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((node) => {
    const key = node.dataset.i18n;
    if (key) node.textContent = t(lang, key);
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-placeholder]').forEach((node) => {
    const key = node.dataset.i18nPlaceholder;
    if (!key) return;
    if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) node.placeholder = t(lang, key);
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach((node) => {
    const key = node.dataset.i18nAria;
    if (key) node.setAttribute('aria-label', t(lang, key));
  });
}
