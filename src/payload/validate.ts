import type { MessageKey } from '../i18n.ts';
import { buildEmail, buildPhone, buildSms, buildText, buildUrl, buildVCard, buildWifi } from './build.ts';
import { analyzeCapacity, byteLength, effectiveEcc, type CapacityReport } from './capacity.ts';
import { hasControlChars } from './escape.ts';
import { LIMITS } from './limits.ts';
import {
  isEcc,
  isEncryption,
  type Ecc,
  type QrForm,
  type StyleSettings,
  type VCardInput,
} from './types.ts';

export interface ValidationIssue {
  field: string;
  messageKey: MessageKey;
  vars?: Record<string, string | number>;
}

export interface ContentResult {
  ok: boolean;
  payload: string | null;
  capacity: CapacityReport;
  issues: ValidationIssue[];
}

function issue(field: string, messageKey: MessageKey, vars?: Record<string, string | number>): ValidationIssue {
  return vars ? { field, messageKey, vars } : { field, messageKey };
}

function isDirty(form: QrForm): boolean {
  switch (form.type) {
    case 'url':
      return form.url.trim() !== '';
    case 'text':
      return form.text !== '';
    case 'wifi':
      return form.ssid !== '' || form.password !== '' || form.hidden;
    case 'email':
      return form.address.trim() !== '' || form.subject !== '' || form.body !== '';
    case 'phone':
      return form.number.trim() !== '';
    case 'sms':
      return form.number.trim() !== '' || form.message !== '';
    case 'vcard':
      return Object.values(form.card).some((value) => value.trim() !== '');
  }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function urlIssue(value: string): ValidationIssue | null {
  const trimmed = value.trim();
  if (trimmed === '') return issue('url', 'error.required');
  if (trimmed.length > LIMITS.url) return issue('url', 'error.url.length', { max: LIMITS.url });
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return issue('url', 'error.url.format');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return issue('url', 'error.url.protocol');
  if (parsed.hostname === '') return issue('url', 'error.url.format');
  return null;
}

export function phoneIssue(value: string, field: string): ValidationIssue | null {
  const trimmed = value.trim();
  if (trimmed === '') return issue(field, 'error.required');
  if (!/^\+?[\d\s().-]+$/.test(trimmed)) {
    return issue(field, 'error.phone.format', { min: LIMITS.phoneMin, max: LIMITS.phoneMax });
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < LIMITS.phoneMin || digits.length > LIMITS.phoneMax) {
    return issue(field, 'error.phone.format', { min: LIMITS.phoneMin, max: LIMITS.phoneMax });
  }
  return null;
}

function emailAddressIssue(value: string, field: string, required: boolean): ValidationIssue | null {
  const trimmed = value.trim();
  if (trimmed === '') return required ? issue(field, 'error.required') : null;
  if (trimmed.length > LIMITS.email) return issue(field, 'error.email.length', { max: LIMITS.email });
  if (!EMAIL_PATTERN.test(trimmed)) return issue(field, 'error.email.format');
  return null;
}

function isWepPassword(password: string): boolean {
  if (password.length === 5 || password.length === 13) return true;
  return (password.length === 10 || password.length === 26) && /^[0-9a-fA-F]+$/.test(password);
}

function lengthIssue(value: string, max: number, field: string, messageKey: MessageKey): ValidationIssue | null {
  if (value.trim().length > max) return issue(field, messageKey, { max });
  return null;
}

function capacityField(type: QrForm['type']): string {
  switch (type) {
    case 'url':
      return 'url';
    case 'text':
      return 'text';
    case 'wifi':
      return 'ssid';
    case 'email':
      return 'email-body';
    case 'phone':
      return 'phone';
    case 'sms':
      return 'sms-message';
    case 'vcard':
      return 'vcard-note';
  }
}

function wifiIssues(ssid: string, password: string, encryption: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (ssid === '') issues.push(issue('ssid', 'error.required'));
  else if (hasControlChars(ssid)) issues.push(issue('ssid', 'error.wifi.control'));
  else if (byteLength(ssid) > LIMITS.ssidBytes) {
    issues.push(issue('ssid', 'error.ssid.length', { max: LIMITS.ssidBytes }));
  }

  if (!isEncryption(encryption)) {
    issues.push(issue('wifi-encryption', 'error.encryption'));
    return issues;
  }

  if (hasControlChars(password)) {
    issues.push(issue('wifi-password', 'error.wifi.control'));
    return issues;
  }

  if (encryption === 'nopass') {
    if (password !== '') issues.push(issue('wifi-password', 'error.wifi.nopass'));
  } else if (encryption === 'WPA') {
    if (password.length < LIMITS.wpaMin || password.length > LIMITS.wpaMax) {
      issues.push(issue('wifi-password', 'error.wifi.passwordLength', { min: LIMITS.wpaMin, max: LIMITS.wpaMax }));
    }
  } else if (!isWepPassword(password)) {
    issues.push(issue('wifi-password', 'error.wifi.wep'));
  }

  return issues;
}

function vcardIssues(card: VCardInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const first = lengthIssue(card.firstName, LIMITS.name, 'vcard-first', 'error.name.length');
  const last = lengthIssue(card.lastName, LIMITS.name, 'vcard-last', 'error.name.length');
  const organization = lengthIssue(card.organization, LIMITS.org, 'vcard-org', 'error.org.length');
  const title = lengthIssue(card.title, LIMITS.title, 'vcard-title', 'error.title.length');
  const note = lengthIssue(card.note, LIMITS.note, 'vcard-note', 'error.note.length');
  for (const entry of [first, last, organization, title, note]) {
    if (entry) issues.push(entry);
  }

  for (const [value, field] of [
    [card.street, 'vcard-street'],
    [card.city, 'vcard-city'],
    [card.region, 'vcard-region'],
    [card.postalCode, 'vcard-postal'],
    [card.country, 'vcard-country'],
  ] as const) {
    const entry = lengthIssue(value, LIMITS.address, field, 'error.address.length');
    if (entry) issues.push(entry);
  }

  if (card.phone.trim() !== '') {
    const phone = phoneIssue(card.phone, 'vcard-phone');
    if (phone) issues.push(phone);
  }
  if (card.email.trim() !== '') {
    const email = emailAddressIssue(card.email, 'vcard-email', false);
    if (email) issues.push(email);
  }
  if (card.url.trim() !== '') {
    const url = urlIssue(card.url);
    if (url) issues.push({ ...url, field: 'vcard-url' });
  }

  const identity = [card.firstName, card.lastName, card.organization, card.phone, card.email].some(
    (value) => value.trim() !== '',
  );
  if (!identity) issues.push(issue('vcard', 'error.vcard.identity'));
  return issues;
}

function payloadFor(form: QrForm): string {
  switch (form.type) {
    case 'url':
      return buildUrl(form.url);
    case 'text':
      return buildText(form.text);
    case 'wifi':
      return buildWifi({
        ssid: form.ssid,
        password: form.password,
        encryption: isEncryption(form.encryption) ? form.encryption : 'WPA',
        hidden: form.hidden,
      });
    case 'email':
      return buildEmail(form);
    case 'phone':
      return buildPhone(form);
    case 'sms':
      return buildSms(form);
    case 'vcard':
      return buildVCard(form.card);
  }
}

function fieldIssues(form: QrForm): ValidationIssue[] {
  switch (form.type) {
    case 'url': {
      const url = urlIssue(form.url);
      return url ? [url] : [];
    }
    case 'text':
      return form.text === '' ? [issue('text', 'error.required')] : [];
    case 'wifi':
      return wifiIssues(form.ssid, form.password, form.encryption);
    case 'email': {
      const issues: ValidationIssue[] = [];
      const address = emailAddressIssue(form.address, 'email', true);
      if (address) issues.push(address);
      if (form.subject.length > LIMITS.subject) {
        issues.push(issue('email-subject', 'error.subject.length', { max: LIMITS.subject }));
      }
      return issues;
    }
    case 'phone': {
      const phone = phoneIssue(form.number, 'phone');
      return phone ? [phone] : [];
    }
    case 'sms': {
      const phone = phoneIssue(form.number, 'sms-number');
      return phone ? [phone] : [];
    }
    case 'vcard':
      return vcardIssues(form.card);
  }
}

export function validateContent(form: QrForm, ecc: Ecc): ContentResult {
  const emptyCapacity = analyzeCapacity('', ecc);
  if (!isDirty(form)) {
    return { ok: false, payload: null, capacity: emptyCapacity, issues: [] };
  }

  const issues = fieldIssues(form);
  const payload = payloadFor(form);
  const capacity = analyzeCapacity(payload, ecc);
  if (payload.length > 0 && !capacity.fits) {
    const field = capacityField(form.type);
    const target = issues.some((entry) => entry.field === field) ? 'form' : field;
    issues.push(issue(target, 'error.capacity', { level: ecc }));
  }

  return { ok: issues.length === 0 && payload.length > 0, payload, capacity, issues };
}

export function validateSettings(settings: StyleSettings): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isEcc(settings.ecc)) issues.push(issue('ecc', 'error.encryption'));
  if (!Number.isInteger(settings.margin) || settings.margin < LIMITS.marginMin || settings.margin > LIMITS.marginMax) {
    issues.push(issue('margin', 'error.margin', { min: LIMITS.marginMin, max: LIMITS.marginMax }));
  }
  if (!Number.isInteger(settings.size) || settings.size < LIMITS.sizeMin || settings.size > LIMITS.sizeMax) {
    issues.push(issue('size', 'error.size', { min: LIMITS.sizeMin, max: LIMITS.sizeMax }));
  }
  if (!/^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(settings.fg.trim())) issues.push(issue('fg-hex', 'error.color'));
  if (!/^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(settings.bg.trim())) issues.push(issue('bg-hex', 'error.color'));
  return issues;
}

export function contentEcc(settings: StyleSettings): Ecc {
  const ecc = isEcc(settings.ecc) ? settings.ecc : 'M';
  return effectiveEcc(ecc, settings.hasLogo);
}
