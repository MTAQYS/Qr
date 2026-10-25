import { describe, expect, it } from 'vitest';
import { LIMITS } from '../src/payload/limits.ts';
import type { QrForm, VCardInput } from '../src/payload/types.ts';
import { contentEcc, validateContent, validateSettings } from '../src/payload/validate.ts';

function emptyCard(overrides: Partial<VCardInput> = {}): VCardInput {
  return {
    firstName: '',
    lastName: '',
    organization: '',
    title: '',
    phone: '',
    email: '',
    url: '',
    street: '',
    city: '',
    region: '',
    postalCode: '',
    country: '',
    note: '',
    ...overrides,
  };
}

function keys(form: QrForm, ecc: 'L' | 'M' | 'Q' | 'H' = 'M') {
  return validateContent(form, ecc).issues.map((entry) => `${entry.field}:${entry.messageKey}`);
}

describe('validation', () => {
  it('stays quiet on an empty form', () => {
    const result = validateContent({ type: 'url', url: '  ' }, 'M');
    expect(result.ok).toBe(false);
    expect(result.payload).toBeNull();
    expect(result.issues).toEqual([]);
    expect(result.capacity.remaining).toBe(result.capacity.capacity);
  });

  it('accepts a normal URL and rejects bad ones', () => {
    const ok = validateContent({ type: 'url', url: ' https://example.com/a ' }, 'M');
    expect(ok.ok).toBe(true);
    expect(ok.payload).toBe('https://example.com/a');
    expect(keys({ type: 'url', url: 'notaurl' })).toContain('url:error.url.format');
    expect(keys({ type: 'url', url: 'javascript:alert(1)' })).toContain('url:error.url.protocol');
    expect(keys({ type: 'url', url: 'ftp://example.com' })).toContain('url:error.url.protocol');
    expect(keys({ type: 'url', url: `https://example.com/${'a'.repeat(LIMITS.url)}` })).toContain('url:error.url.length');
  });

  it('checks Wi-Fi lengths, WEP, open networks and control characters', () => {
    expect(
      validateContent(
        { type: 'wifi', ssid: 'Cafe', password: 'correct horse', encryption: 'WPA', hidden: false },
        'M',
      ).ok,
    ).toBe(true);
    expect(keys({ type: 'wifi', ssid: '', password: 'correct horse', encryption: 'WPA', hidden: false })).toContain(
      'ssid:error.required',
    );
    expect(keys({ type: 'wifi', ssid: 'é'.repeat(17), password: 'correct horse', encryption: 'WPA', hidden: false })).toContain(
      'ssid:error.ssid.length',
    );
    expect(keys({ type: 'wifi', ssid: 'Cafe', password: 'short', encryption: 'WPA', hidden: false })).toContain(
      'wifi-password:error.wifi.passwordLength',
    );
    expect(keys({ type: 'wifi', ssid: 'Cafe', password: 'abcde', encryption: 'WEP', hidden: false }).length).toBe(0);
    expect(keys({ type: 'wifi', ssid: 'Cafe', password: 'zzzz', encryption: 'WEP', hidden: false })).toContain(
      'wifi-password:error.wifi.wep',
    );
    expect(keys({ type: 'wifi', ssid: 'Cafe', password: 'secret', encryption: 'nopass', hidden: true })).toContain(
      'wifi-password:error.wifi.nopass',
    );
    expect(keys({ type: 'wifi', ssid: 'bad\nname', password: 'correct horse', encryption: 'WPA', hidden: false })).toContain(
      'ssid:error.wifi.control',
    );
  });

  it('checks email, phone and SMS fields', () => {
    expect(validateContent({ type: 'email', address: 'ada@example.com', subject: 'Hi', body: 'Hello' }, 'M').payload).toBe(
      'mailto:ada@example.com?subject=Hi&body=Hello',
    );
    expect(keys({ type: 'email', address: 'ada', subject: '', body: 'x' })).toContain('email:error.email.format');
    expect(keys({ type: 'email', address: `${'a'.repeat(250)}@b.co`, subject: '', body: '' })).toContain(
      'email:error.email.length',
    );
    expect(keys({ type: 'email', address: 'a@b.co', subject: 's'.repeat(201), body: '' })).toContain(
      'email-subject:error.subject.length',
    );
    expect(validateContent({ type: 'phone', number: '+33 1 23 45 67 89' }, 'M').payload).toBe('tel:+33123456789');
    expect(keys({ type: 'phone', number: '123' })).toContain('phone:error.phone.format');
    expect(keys({ type: 'sms', number: 'not-a-number', message: 'hi' })).toContain('sms-number:error.phone.format');
    expect(validateContent({ type: 'sms', number: '+33123456789', message: '' }, 'H').ok).toBe(true);
  });

  it('requires a vCard identity and checks optional fields', () => {
    expect(keys({ type: 'vcard', card: emptyCard({ note: 'only a note' }) })).toContain('vcard:error.vcard.identity');
    expect(validateContent({ type: 'vcard', card: emptyCard({ organization: 'Dynamogic' }) }, 'M').ok).toBe(true);
    expect(keys({ type: 'vcard', card: emptyCard({ firstName: 'A'.repeat(65) }) })).toContain(
      'vcard-first:error.name.length',
    );
    expect(keys({ type: 'vcard', card: emptyCard({ phone: '12', firstName: 'Ada' }) })).toContain(
      'vcard-phone:error.phone.format',
    );
    expect(keys({ type: 'vcard', card: emptyCard({ email: 'nope', lastName: 'Lovelace' }) })).toContain(
      'vcard-email:error.email.format',
    );
    expect(keys({ type: 'vcard', card: emptyCard({ url: 'ftp://example.com', firstName: 'Ada' }) })).toContain(
      'vcard-url:error.url.protocol',
    );
    expect(keys({ type: 'vcard', card: emptyCard({ note: 'n'.repeat(501), firstName: 'Ada' }) })).toContain(
      'vcard-note:error.note.length',
    );
  });

  it('reports capacity on the field that overflowed', () => {
    const result = validateContent({ type: 'text', text: 'a'.repeat(1300) }, 'H');
    expect(result.ok).toBe(false);
    expect(result.issues.some((entry) => entry.messageKey === 'error.capacity' && entry.vars?.level === 'H')).toBe(true);
    expect(result.capacity.fits).toBe(false);
  });

  it('uses level H for capacity when a logo is present', () => {
    const text = 'a'.repeat(1600);
    expect(contentEcc({ ecc: 'L', margin: 4, size: 256, fg: '#000000', bg: '#ffffff', hasLogo: true })).toBe('H');
    expect(validateContent({ type: 'text', text }, 'L').ok).toBe(true);
    expect(validateContent({ type: 'text', text }, 'H').ok).toBe(false);
  });

  it('validates margin, size and colors', () => {
    expect(
      validateSettings({ ecc: 'M', margin: 4, size: 1024, fg: '#111111', bg: '#ffffff', hasLogo: false }),
    ).toEqual([]);
    expect(validateSettings({ ecc: 'M', margin: 11, size: 10, fg: 'red', bg: '#gg0000', hasLogo: false }).map((entry) => entry.field)).toEqual(
      ['margin', 'size', 'fg-hex', 'bg-hex'],
    );
    expect(validateSettings({ ecc: 'nope', margin: 4, size: 256, fg: '#abc', bg: 'AABBCC', hasLogo: true })).toEqual([
      expect.objectContaining({ field: 'ecc' }),
    ]);
  });
});
