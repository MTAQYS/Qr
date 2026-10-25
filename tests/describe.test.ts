import { describe, expect, it } from 'vitest';
import { previewAlt } from '../src/describe.ts';
import type { VCardInput } from '../src/payload/types.ts';

const card: VCardInput = {
  firstName: 'Ada',
  lastName: 'Lovelace',
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
};

describe('preview description', () => {
  it('describes each content type', () => {
    expect(previewAlt('fr', { type: 'url', url: ' https://exemple.org ' })).toBe(
      'Code QR contenant le lien https://exemple.org',
    );
    expect(previewAlt('en', { type: 'text', text: 'Hello' })).toContain('Hello');
    expect(previewAlt('en', { type: 'phone', number: '+33 1 23 45 67 89' })).toContain('+33123456789');
    expect(previewAlt('fr', { type: 'sms', number: '0612345678', message: 'salut' })).toContain('0612345678');
    expect(previewAlt('en', { type: 'email', address: 'ada@example.com', subject: '', body: '' })).toContain(
      'ada@example.com',
    );
    expect(previewAlt('fr', { type: 'vcard', card })).toBe('Code QR pour le contact Ada Lovelace');
  });

  it('does not put the Wi-Fi password in the alt text', () => {
    const description = previewAlt('en', {
      type: 'wifi',
      ssid: 'Cafe',
      password: 's3cret;x',
      encryption: 'WPA',
      hidden: false,
    });
    expect(description).toContain('Cafe');
    expect(description).not.toContain('s3cret');
  });

  it('collapses long text', () => {
    const description = previewAlt('en', { type: 'text', text: `  ${'word '.repeat(40)}` });
    expect(description.length).toBeLessThan(180);
    expect(description).toContain('…');
    expect(description).not.toContain('  ');
  });
});
