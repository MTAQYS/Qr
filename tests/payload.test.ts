import { describe, expect, it } from 'vitest';
import {
  emailPayload,
  externalHref,
  geoPayload,
  normalizePhone,
  phonePayload,
  textPayload,
  vcardPayload,
  wifiPayload,
} from '../src/lib/payload';

describe('text', () => {
  it('trims and rejects an empty value', () => {
    expect(textPayload('  https://dynamogic.com/  ')).toEqual({ ok: true, text: 'https://dynamogic.com/' });
    expect(textPayload('   ').ok).toBe(false);
  });
});

describe('wifi', () => {
  it('escapes the SSID and the password', () => {
    expect(
      wifiPayload({ ssid: 'Cafe: "net";1,2', password: 'a\\b:c', security: 'WPA', hidden: true }),
    ).toEqual({
      ok: true,
      text: 'WIFI:T:WPA;S:Cafe\\: \\"net\\"\\;1\\,2;P:a\\\\b\\:c;H:true;;',
    });
  });

  it('omits the password when the network is open', () => {
    expect(wifiPayload({ ssid: 'Guest', password: 'ignored', security: 'nopass', hidden: false })).toEqual({
      ok: true,
      text: 'WIFI:T:nopass;S:Guest;H:false;;',
    });
  });

  it('requires a name, and a password when security needs one', () => {
    expect(wifiPayload({ ssid: '  ', password: 'secret', security: 'WPA', hidden: false })).toEqual({
      ok: false,
      issue: 'wifi_ssid',
    });
    expect(wifiPayload({ ssid: 'Cafe', password: '', security: 'WEP', hidden: false })).toEqual({
      ok: false,
      issue: 'wifi_password',
    });
  });

  it('does not trim the password', () => {
    expect(wifiPayload({ ssid: 'Cafe', password: ' secret ', security: 'WPA', hidden: false })).toEqual({
      ok: true,
      text: 'WIFI:T:WPA;S:Cafe;P: secret ;H:false;;',
    });
  });
});

describe('email', () => {
  it('encodes the subject and the body', () => {
    expect(emailPayload({ address: 'a@b.co', subject: 'Bonjour & cie', body: 'ligne 1\nligne 2' })).toEqual({
      ok: true,
      text: 'mailto:a@b.co?subject=Bonjour%20%26%20cie&body=ligne%201%0Aligne%202',
    });
  });

  it('rejects an empty or invalid address', () => {
    expect(emailPayload({ address: '', subject: '', body: '' })).toEqual({ ok: false, issue: 'email' });
    expect(emailPayload({ address: 'not an email', subject: '', body: '' })).toEqual({ ok: false, issue: 'email' });
    expect(emailPayload({ address: 'a@b', subject: '', body: '' })).toEqual({ ok: false, issue: 'email' });
  });
});

describe('phone', () => {
  it('keeps a leading plus and strips separators', () => {
    expect(normalizePhone('+33 6 12-34.56.78')).toBe('+33612345678');
    expect(normalizePhone('(06) 12 34 56 78')).toBe('0612345678');
    expect(normalizePhone('12')).toBeNull();
    expect(normalizePhone('1234567890123456')).toBeNull();
    expect(normalizePhone('abc')).toBeNull();
  });

  it('builds a call or a text', () => {
    expect(phonePayload({ number: '+33 1 23 45 67 89', kind: 'call', message: 'ignored' })).toEqual({
      ok: true,
      text: 'tel:+33123456789',
    });
    expect(phonePayload({ number: '0612345678', kind: 'sms', message: 'Bonjour' })).toEqual({
      ok: true,
      text: 'sms:0612345678?body=Bonjour',
    });
    expect(phonePayload({ number: 'nope', kind: 'call', message: '' })).toEqual({ ok: false, issue: 'phone' });
  });
});

describe('vcard', () => {
  it('writes vCard 3.0 with CRLF and escaped punctuation', () => {
    const result = vcardPayload({
      first: 'Ada',
      last: 'Lovelace',
      org: 'Analytical, Engines',
      title: 'Engineer',
      phone: '+44 20 7946 0000',
      email: 'ada@example.com',
      url: 'https://example.com',
      street: '1 St James',
      city: 'London',
      region: '',
      postal: 'SW1',
      country: 'UK',
      note: 'line\nwith; comma,',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.text.startsWith('BEGIN:VCARD\r\nVERSION:3.0\r\n')).toBe(true);
    expect(result.text).toContain('N:Lovelace;Ada;;;\r\n');
    expect(result.text).toContain('FN:Ada Lovelace\r\n');
    expect(result.text).toContain('ORG:Analytical\\, Engines\r\n');
    expect(result.text).toContain('NOTE:line\\nwith\\; comma\\,\r\n');
    expect(result.text).toContain('ADR;TYPE=HOME:;;1 St James;London;;SW1;UK\r\n');
    expect(result.text.endsWith('END:VCARD')).toBe(true);
  });

  it('requires a name or an organisation, and a valid email when one is set', () => {
    const empty = {
      first: '',
      last: '',
      org: ' ',
      title: '',
      phone: '',
      email: '',
      url: '',
      street: '',
      city: '',
      region: '',
      postal: '',
      country: '',
      note: '',
    };
    expect(vcardPayload(empty)).toEqual({ ok: false, issue: 'vcard' });
    expect(vcardPayload({ ...empty, org: 'Dynamogic', email: 'not-an-email' })).toEqual({
      ok: false,
      issue: 'vcard_email',
    });
    expect(vcardPayload({ ...empty, org: 'Dynamogic' }).ok).toBe(true);
  });
});

describe('geo', () => {
  it('accepts a decimal comma and formats six places', () => {
    expect(geoPayload({ latitude: '48,856614', longitude: '2.352222', label: '' })).toEqual({
      ok: true,
      text: 'geo:48.856614,2.352222',
    });
    expect(geoPayload({ latitude: '48.856614', longitude: '2,352222', label: 'Café' })).toEqual({
      ok: true,
      text: 'geo:48.856614,2.352222?q=48.856614%2C2.352222(Caf%C3%A9)',
    });
  });

  it('rejects coordinates outside their range', () => {
    expect(geoPayload({ latitude: '91', longitude: '0', label: '' })).toEqual({ ok: false, issue: 'geo_lat' });
    expect(geoPayload({ latitude: '0', longitude: '181', label: '' })).toEqual({ ok: false, issue: 'geo_lng' });
    expect(geoPayload({ latitude: '', longitude: '0', label: '' })).toEqual({ ok: false, issue: 'geo_lat' });
  });
});

describe('external links', () => {
  it('allows the schemes a reader can open, and nothing else', () => {
    expect(externalHref('https://dynamogic.com/path')).toBe('https://dynamogic.com/path');
    expect(externalHref('mailto:a@b.co')).toBe('mailto:a@b.co');
    expect(externalHref('tel:+33123456789')).toBe('tel:+33123456789');
    expect(externalHref('sms:+33123456789')).toBe('sms:+33123456789');
    expect(externalHref('geo:48.8,2.3')).toBe('geo:48.8,2.3');
    expect(externalHref('javascript:alert(1)')).toBeNull();
    expect(externalHref('data:text/html,hi')).toBeNull();
    expect(externalHref('https://example.com/a b')).toBeNull();
    expect(externalHref('https://example.com/<script>')).toBeNull();
  });
});
