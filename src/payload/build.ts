import { escapeVCard, escapeWifi, foldVCardLine } from './escape.ts';
import type { EmailInput, PhoneInput, SmsInput, VCardInput, WifiInput } from './types.ts';

export function buildUrl(raw: string): string {
  return raw.trim();
}

export function buildText(text: string): string {
  return text;
}

export function normalizePhone(input: string): string {
  const trimmed = input.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  return `${hasPlus ? '+' : ''}${digits}`;
}

export function buildPhone(input: PhoneInput): string {
  return `tel:${normalizePhone(input.number)}`;
}

export function buildSms(input: SmsInput): string {
  const number = normalizePhone(input.number);
  if (input.message === '') return `sms:${number}`;
  return `sms:${number}?body=${encodeURIComponent(input.message)}`;
}

export function buildEmail(input: EmailInput): string {
  const address = input.address.trim();
  const query: string[] = [];
  if (input.subject !== '') query.push(`subject=${encodeURIComponent(input.subject)}`);
  if (input.body !== '') query.push(`body=${encodeURIComponent(input.body)}`);
  return query.length > 0 ? `mailto:${address}?${query.join('&')}` : `mailto:${address}`;
}

export function buildWifi(input: WifiInput): string {
  const ssid = escapeWifi(input.ssid);
  const hidden = input.hidden ? 'true' : 'false';
  if (input.encryption === 'nopass') {
    return `WIFI:T:nopass;S:${ssid};H:${hidden};;`;
  }
  return `WIFI:T:${input.encryption};S:${ssid};P:${escapeWifi(input.password)};H:${hidden};;`;
}

function charsetProp(name: string, escapedValue: string, params = ''): string {
  const extra = params ? `;${params}` : '';
  return `${name}${extra};CHARSET=UTF-8:${escapedValue}`;
}

function optionalPlain(name: string, value: string, params = ''): string | null {
  if (value === '') return null;
  const extra = params ? `;${params}` : '';
  return `${name}${extra}:${value}`;
}

function addressLine(card: VCardInput): string | null {
  const street = card.street.trim();
  const city = card.city.trim();
  const region = card.region.trim();
  const postal = card.postalCode.trim();
  const country = card.country.trim();
  if (![street, city, region, postal, country].some((part) => part !== '')) return null;
  const value = ['', '', street, city, region, postal, country].map((part) => escapeVCard(part)).join(';');
  return charsetProp('ADR', value, 'TYPE=HOME');
}

export function buildVCard(card: VCardInput): string {
  const first = card.firstName.trim();
  const last = card.lastName.trim();
  const organization = card.organization.trim();
  const title = card.title.trim();
  const email = card.email.trim();
  const url = card.url.trim();
  const phone = card.phone.trim();
  const note = card.note.trim();
  const personal = [first, last].filter((part) => part !== '').join(' ');
  const normalizedPhone = phone === '' ? '' : normalizePhone(phone);
  const fn = personal || organization || email || normalizedPhone;

  const rows = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    charsetProp('N', [last, first, '', '', ''].map((part) => escapeVCard(part)).join(';')),
    charsetProp('FN', escapeVCard(fn)),
    organization ? charsetProp('ORG', escapeVCard(organization)) : null,
    title ? charsetProp('TITLE', escapeVCard(title)) : null,
    optionalPlain('TEL', normalizedPhone, 'TYPE=CELL'),
    optionalPlain('EMAIL', escapeVCard(email)),
    optionalPlain('URL', escapeVCard(url)),
    addressLine(card),
    note ? charsetProp('NOTE', escapeVCard(note)) : null,
    'END:VCARD',
  ];

  return `${rows
    .filter((row): row is string => row !== null)
    .map((row) => foldVCardLine(row))
    .join('\r\n')}\r\n`;
}
