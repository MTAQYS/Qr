import { t, type Lang } from './i18n.ts';
import { normalizePhone } from './payload/build.ts';
import type { QrForm } from './payload/types.ts';

export function clip(value: string, max = 120): string {
  const flat = value.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max - 1)}…`;
}

export function previewAlt(lang: Lang, form: QrForm): string {
  switch (form.type) {
    case 'url':
      return t(lang, 'alt.url', { value: clip(form.url.trim()) });
    case 'text':
      return t(lang, 'alt.text', { value: clip(form.text) });
    case 'wifi':
      return t(lang, 'alt.wifi', { value: clip(form.ssid) });
    case 'email':
      return t(lang, 'alt.email', { value: clip(form.address.trim()) });
    case 'phone':
      return t(lang, 'alt.phone', { value: clip(normalizePhone(form.number)) });
    case 'sms':
      return t(lang, 'alt.sms', { value: clip(normalizePhone(form.number)) });
    case 'vcard': {
      const card = form.card;
      const name =
        [card.firstName, card.lastName]
          .map((part) => part.trim())
          .filter((part) => part !== '')
          .join(' ') ||
        card.organization.trim() ||
        card.email.trim() ||
        normalizePhone(card.phone);
      return t(lang, 'alt.vcard', { value: clip(name) });
    }
  }
}
