import en from './i18n/en.json';
import fr from './i18n/fr.json';

export type Lang = 'fr' | 'en';
export type MessageKey = keyof typeof fr;

function catalog(dict: Record<MessageKey, string>): Record<MessageKey, string> {
  return dict;
}

const messages: Record<Lang, Record<MessageKey, string>> = {
  fr: catalog(fr),
  en: catalog(en),
};

export function t(lang: Lang, key: MessageKey, vars?: Record<string, string | number>): string {
  const template = messages[lang][key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name];
    return value === undefined ? match : String(value);
  });
}
