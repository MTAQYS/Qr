import type { Lang } from './i18n.ts';

const LANG_KEY = 'qr.lang';
const THEME_KEY = 'qr.theme';

type Store = Pick<Storage, 'getItem' | 'setItem'>;

export function browserStorage(): Storage | null {
  try {
    const store = globalThis.localStorage;
    if (!store) return null;
    return store;
  } catch {
    return null;
  }
}

export function loadLang(store: Store | null): Lang | null {
  if (!store) return null;
  try {
    const value = store.getItem(LANG_KEY);
    return value === 'fr' || value === 'en' ? value : null;
  } catch {
    return null;
  }
}

export function saveLang(store: Store | null, lang: Lang): void {
  if (!store) return;
  try {
    store.setItem(LANG_KEY, lang);
  } catch {
    /* Preference storage is optional. */
  }
}

export function loadTheme(store: Store | null): 'light' | 'dark' | null {
  if (!store) return null;
  try {
    const value = store.getItem(THEME_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

export function saveTheme(store: Store | null, theme: 'light' | 'dark'): void {
  if (!store) return;
  try {
    store.setItem(THEME_KEY, theme);
  } catch {
    /* Preference storage is optional. */
  }
}
