import en from './en.json' with { type: 'json' };
import fr from './fr.json' with { type: 'json' };

export type Lang = 'fr' | 'en';

const dictionaries = { fr, en } as const;

export function isLang(value: unknown): value is Lang {
  return value === 'fr' || value === 'en';
}

function lookup(lang: Lang, key: string): string {
  const parts = key.split('.');
  let node: unknown = dictionaries[lang];
  for (const part of parts) {
    if (typeof node !== 'object' || node === null || !(part in node)) {
      throw new Error(`Missing translation ${lang}.${key}`);
    }
    node = (node as Record<string, unknown>)[part];
  }
  if (typeof node !== 'string') throw new Error(`Translation ${lang}.${key} is not a string`);
  return node;
}

export function t(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  const template = lookup(lang, key);
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_match, name: string) => {
    const value = vars[name];
    return value === undefined ? '' : String(value);
  });
}
