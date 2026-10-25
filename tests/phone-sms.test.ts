import { describe, expect, it } from 'vitest';
import { buildPhone, buildSms, normalizePhone } from '../src/payload/build.ts';
import { analyzeCapacity } from '../src/payload/capacity.ts';

describe('phone payload', () => {
  it('keeps a leading plus and strips punctuation', () => {
    expect(normalizePhone('+33 1 23 45 67 89')).toBe('+33123456789');
    expect(buildPhone({ number: '(01) 23.45.67.89' })).toBe('tel:0123456789');
  });

  it('keeps a leading plus and drops letters around it', () => {
    expect(buildPhone({ number: '+33 (0) 6 abc' })).toBe('tel:+3306');
  });

  it('rejects a digit string past level H', () => {
    const payload = buildPhone({ number: '1'.repeat(4000) });
    expect(analyzeCapacity(payload, 'H').fits).toBe(false);
    expect(analyzeCapacity(buildPhone({ number: '+33123456789' }), 'L').fits).toBe(true);
  });
});

describe('SMS payload', () => {
  it('builds a number without a message', () => {
    expect(buildSms({ number: '+1 202 555 0143', message: '' })).toBe('sms:+12025550143');
  });

  it('encodes ampersands, spaces and newlines in the body', () => {
    expect(buildSms({ number: '+33 6 12-34.56.78', message: 'a&b\nhi' })).toBe(
      'sms:+33612345678?body=a%26b%0Ahi',
    );
  });

  it('rejects a message past level Q', () => {
    const payload = buildSms({ number: '+33123456789', message: 'a'.repeat(1700) });
    expect(analyzeCapacity(payload, 'Q').fits).toBe(false);
    expect(analyzeCapacity(payload, 'L').fits).toBe(true);
  });
});
