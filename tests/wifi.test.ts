import { describe, expect, it } from 'vitest';
import { analyzeCapacity } from '../src/payload/capacity.ts';
import { escapeWifi } from '../src/payload/escape.ts';
import { buildWifi } from '../src/payload/build.ts';

describe('Wi-Fi payload', () => {
  it('builds a WPA network', () => {
    expect(
      buildWifi({ ssid: 'Cafe', password: 'correct horse', encryption: 'WPA', hidden: false }),
    ).toBe('WIFI:T:WPA;S:Cafe;P:correct horse;H:false;;');
  });

  it('escapes backslash, semicolon, comma, colon and quote', () => {
    expect(escapeWifi('a;b:c,d\\e"f')).toBe('a\\;b\\:c\\,d\\\\e\\"f');
    expect(
      buildWifi({
        ssid: 'a;b:c,d\\e"f',
        password: 'p;q',
        encryption: 'WPA',
        hidden: false,
      }),
    ).toBe('WIFI:T:WPA;S:a\\;b\\:c\\,d\\\\e\\"f;P:p\\;q;H:false;;');
  });

  it('marks a hidden network and keeps a WEP password', () => {
    expect(
      buildWifi({ ssid: 'old', password: 'abcde', encryption: 'WEP', hidden: true }),
    ).toBe('WIFI:T:WEP;S:old;P:abcde;H:true;;');
  });

  it('omits the password on an open network', () => {
    expect(buildWifi({ ssid: 'guest', password: '', encryption: 'nopass', hidden: false })).toBe(
      'WIFI:T:nopass;S:guest;H:false;;',
    );
  });

  it('does not treat spaces as special characters', () => {
    expect(escapeWifi('my net')).toBe('my net');
  });

  it('fits a normal network and rejects a pathological SSID at level H', () => {
    const normal = buildWifi({ ssid: 'Cafe', password: 'correct horse', encryption: 'WPA', hidden: false });
    expect(analyzeCapacity(normal, 'H').fits).toBe(true);

    const huge = buildWifi({
      ssid: 'é'.repeat(800),
      password: 'é'.repeat(800),
      encryption: 'WPA',
      hidden: false,
    });
    const report = analyzeCapacity(huge, 'H');
    expect(report.fits).toBe(false);
    expect(report.remaining).toBeLessThan(0);
  });
});
