import { describe, expect, it } from 'vitest';
import { loadLang, loadTheme, saveLang, saveTheme } from '../src/preferences.ts';

function memory() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

describe('preferences', () => {
  it('stores language and theme on the provided store', () => {
    const store = memory();
    expect(loadLang(store)).toBeNull();
    saveLang(store, 'en');
    saveTheme(store, 'dark');
    expect(loadLang(store)).toBe('en');
    expect(loadTheme(store)).toBe('dark');
  });

  it('ignores unknown values and a missing store', () => {
    const store = memory();
    store.setItem('qr.lang', 'de');
    store.setItem('qr.theme', 'blue');
    expect(loadLang(store)).toBeNull();
    expect(loadTheme(store)).toBeNull();
    expect(loadLang(null)).toBeNull();
    saveTheme(null, 'light');
  });
});
