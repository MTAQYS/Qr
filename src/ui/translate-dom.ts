import { t, type Lang, type MessageKey } from '../i18n.ts';

export function applyTranslations(lang: Lang): void {
  document.documentElement.lang = lang;
  document.title = t(lang, 'title');
  const description = document.querySelector('meta[name="description"]');
  if (description) description.setAttribute('content', t(lang, 'meta'));

  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((element) => {
    const key = element.dataset.i18n;
    if (!key) return;
    element.textContent = t(lang, key as MessageKey);
  });

  document.querySelectorAll<HTMLElement>('[data-i18n-placeholder]').forEach((element) => {
    const key = element.dataset.i18nPlaceholder;
    if (!key) return;
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.placeholder = t(lang, key as MessageKey);
    }
  });

  document.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach((element) => {
    const key = element.dataset.i18nAria;
    if (!key) return;
    element.setAttribute('aria-label', t(lang, key as MessageKey));
  });
}
