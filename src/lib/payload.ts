export const WIFI_SECURITIES = ['WPA', 'WEP', 'nopass'] as const;
export type WifiSecurity = (typeof WIFI_SECURITIES)[number];

export const PHONE_KINDS = ['call', 'sms'] as const;
export type PhoneKind = (typeof PHONE_KINDS)[number];

export const PAYLOAD_ISSUES = [
  'empty',
  'wifi_ssid',
  'wifi_password',
  'email',
  'phone',
  'vcard',
  'vcard_email',
  'geo_lat',
  'geo_lng',
] as const;

export type PayloadIssue = (typeof PAYLOAD_ISSUES)[number];

export type PayloadResult = { ok: true; text: string } | { ok: false; issue: PayloadIssue };

export interface WifiInput {
  ssid: string;
  password: string;
  security: WifiSecurity;
  hidden: boolean;
}

export interface EmailInput {
  address: string;
  subject: string;
  body: string;
}

export interface PhoneInput {
  number: string;
  kind: PhoneKind;
  message: string;
}

export interface VCardInput {
  first: string;
  last: string;
  org: string;
  title: string;
  phone: string;
  email: string;
  url: string;
  street: string;
  city: string;
  region: string;
  postal: string;
  country: string;
  note: string;
}

export interface GeoInput {
  latitude: string;
  longitude: string;
  label: string;
}

export type ContentInput =
  | { mode: 'text'; text: string }
  | ({ mode: 'wifi' } & WifiInput)
  | ({ mode: 'email' } & EmailInput)
  | ({ mode: 'phone' } & PhoneInput)
  | { mode: 'vcard'; contact: VCardInput }
  | ({ mode: 'geo' } & GeoInput);

export function encodeContent(input: ContentInput): PayloadResult {
  switch (input.mode) {
    case 'text':
      return textPayload(input.text);
    case 'wifi':
      return wifiPayload(input);
    case 'email':
      return emailPayload(input);
    case 'phone':
      return phonePayload(input);
    case 'vcard':
      return vcardPayload(input.contact);
    case 'geo':
      return geoPayload(input);
    default: {
      const unreachable: never = input;
      return unreachable;
    }
  }
}

export function textPayload(text: string): PayloadResult {
  const value = text.trim();
  if (!value) return { ok: false, issue: 'empty' };
  return { ok: true, text: value };
}

/**
 * WIFI:T:WPA;S:ssid;P:password;H:false;;
 * Backslash, semicolon, comma, colon and double quote are escaped in the
 * SSID and the password, which is the set ZXing documents.
 */
export function wifiPayload(input: WifiInput): PayloadResult {
  const ssid = input.ssid.trim();
  if (!ssid) return { ok: false, issue: 'wifi_ssid' };
  const parts = [`T:${input.security}`, `S:${escapeWifi(ssid)}`];
  if (input.security !== 'nopass') {
    if (!input.password) return { ok: false, issue: 'wifi_password' };
    parts.push(`P:${escapeWifi(input.password)}`);
  }
  parts.push(`H:${input.hidden ? 'true' : 'false'}`);
  return { ok: true, text: `WIFI:${parts.join(';')};;` };
}

export function emailPayload(input: EmailInput): PayloadResult {
  const address = input.address.trim();
  if (!isEmail(address)) return { ok: false, issue: 'email' };
  const params: string[] = [];
  const subject = input.subject.trim();
  const body = input.body.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body.trim()) params.push(`body=${encodeURIComponent(body)}`);
  const query = params.join('&');
  return { ok: true, text: query ? `mailto:${address}?${query}` : `mailto:${address}` };
}

export function phonePayload(input: PhoneInput): PayloadResult {
  const number = normalizePhone(input.number);
  if (!number) return { ok: false, issue: 'phone' };
  if (input.kind === 'sms') {
    const message = input.message.replaceAll('\r\n', '\n').replaceAll('\r', '\n').trim();
    return {
      ok: true,
      text: message ? `sms:${number}?body=${encodeURIComponent(message)}` : `sms:${number}`,
    };
  }
  return { ok: true, text: `tel:${number}` };
}

export function vcardPayload(input: VCardInput): PayloadResult {
  const first = input.first.trim();
  const last = input.last.trim();
  const org = input.org.trim();
  if (!first && !last && !org) return { ok: false, issue: 'vcard' };
  const email = input.email.trim();
  if (email && !isEmail(email)) return { ok: false, issue: 'vcard_email' };

  const fn = [first, last].filter((part) => part.length > 0).join(' ') || org;
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${escapeVCard(last)};${escapeVCard(first)};;;`,
    `FN:${escapeVCard(fn)}`,
  ];
  pushField(lines, 'ORG', org);
  pushField(lines, 'TITLE', input.title.trim());
  pushField(lines, 'TEL;TYPE=CELL', input.phone.trim());
  pushField(lines, 'EMAIL', email);
  pushField(lines, 'URL', input.url.trim());
  const street = input.street.trim();
  const city = input.city.trim();
  const region = input.region.trim();
  const postal = input.postal.trim();
  const country = input.country.trim();
  if (street || city || region || postal || country) {
    lines.push(
      `ADR;TYPE=HOME:;;${escapeVCard(street)};${escapeVCard(city)};${escapeVCard(region)};${escapeVCard(postal)};${escapeVCard(country)}`,
    );
  }
  pushField(lines, 'NOTE', input.note.trim());
  lines.push('END:VCARD');
  return { ok: true, text: lines.join('\r\n') };
}

export function geoPayload(input: GeoInput): PayloadResult {
  const latitude = parseCoord(input.latitude, -90, 90);
  if (latitude === null) return { ok: false, issue: 'geo_lat' };
  const longitude = parseCoord(input.longitude, -180, 180);
  if (longitude === null) return { ok: false, issue: 'geo_lng' };
  const coords = `${formatCoord(latitude)},${formatCoord(longitude)}`;
  const label = input.label.trim();
  if (!label) return { ok: true, text: `geo:${coords}` };
  return { ok: true, text: `geo:${coords}?q=${encodeURIComponent(`${coords}(${label})`)}` };
}

/** A link the user may open. Rejects scripts, data URLs and embedded whitespace. */
export function externalHref(payload: string): string | null {
  const value = payload.trim();
  if (!/^(https?:|mailto:|tel:|sms:|geo:)/i.test(value)) return null;
  if (hasUnsafe(value)) return null;
  return value;
}

function hasUnsafe(value: string): boolean {
  if (/[\s<>]/.test(value)) return true;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 32 || code === 127) return true;
  }
  return false;
}

function pushField(lines: string[], name: string, value: string): void {
  if (value) lines.push(`${name}:${escapeVCard(value)}`);
}

function escapeWifi(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
    .replaceAll(':', '\\:')
    .replaceAll('"', '\\"');
}

function escapeVCard(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .replaceAll('\n', '\\n')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,');
}

function isEmail(value: string): boolean {
  if (value.length === 0 || value.length > 254) return false;
  return /^[^\s@<>?#&]+@[^\s@<>?#&]+\.[^\s@<>?#&]+$/.test(value);
}

export function normalizePhone(input: string): string | null {
  const trimmed = input.trim();
  if (!/^\+?[\d\s().-]+$/.test(trimmed)) return null;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 3 || digits.length > 15) return null;
  return trimmed.startsWith('+') ? `+${digits}` : digits;
}

function parseCoord(raw: string, min: number, max: number): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let normalized = trimmed;
  if (trimmed.includes(',')) {
    if (trimmed.includes('.') || trimmed.split(',').length !== 2) return null;
    normalized = trimmed.replace(',', '.');
  }
  if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(normalized)) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < min || value > max) return null;
  return value;
}

function formatCoord(value: number): string {
  const rounded = Math.round(value * 1e6) / 1e6;
  if (Object.is(rounded, -0)) return '0';
  return String(rounded);
}
