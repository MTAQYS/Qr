import { describe, expect, it } from 'vitest';
import { buildVCard } from '../src/payload/build.ts';
import { analyzeCapacity } from '../src/payload/capacity.ts';
import type { VCardInput } from '../src/payload/types.ts';

function card(overrides: Partial<VCardInput> = {}): VCardInput {
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

function unfold(value: string): string {
  return value.replace(/\r\n[ \t]/g, '');
}

describe('vCard payload', () => {
  it('builds a minimal card with CRLF, N and FN', () => {
    const payload = buildVCard(card({ firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' }));
    expect(payload).toBe(
      [
        'BEGIN:VCARD',
        'VERSION:3.0',
        'N;CHARSET=UTF-8:Lovelace;Ada;;;',
        'FN;CHARSET=UTF-8:Ada Lovelace',
        'EMAIL:ada@example.com',
        'END:VCARD',
        '',
      ].join('\r\n'),
    );
  });

  it('escapes comma, semicolon, backslash and newlines', () => {
    const payload = unfold(
      buildVCard(
        card({
          firstName: 'Ann;Marie',
          lastName: 'Doe, Jr',
          organization: 'A\\B',
          note: 'line1\nline2\\end',
          street: '12; rue',
          city: 'Paris',
        }),
      ),
    );
    expect(payload).toContain('N;CHARSET=UTF-8:Doe\\, Jr;Ann\\;Marie;;;');
    expect(payload).toContain('FN;CHARSET=UTF-8:Ann\\;Marie Doe\\, Jr');
    expect(payload).toContain('ORG;CHARSET=UTF-8:A\\\\B');
    expect(payload).toContain('NOTE;CHARSET=UTF-8:line1\\nline2\\\\end');
    expect(payload).toContain('ADR;TYPE=HOME;CHARSET=UTF-8:;;12\\; rue;Paris;;;');
  });

  it('keeps accented letters and falls back to the organization name', () => {
    const payload = buildVCard(card({ organization: 'Société Générale', phone: '+33 1 42 14 20 00' }));
    expect(payload).toContain('FN;CHARSET=UTF-8:Société Générale');
    expect(payload).toContain('TEL;TYPE=CELL:+33142142000');
    expect(payload).toContain('N;CHARSET=UTF-8:;;;;');
  });

  it('folds a long note and round-trips after unfolding', () => {
    const note = `café ${'n'.repeat(120)}`;
    const payload = buildVCard(card({ firstName: 'Ada', note }));
    expect(payload).toContain('\r\n ');
    const restored = unfold(payload);
    expect(restored).toContain(`NOTE;CHARSET=UTF-8:café ${'n'.repeat(120)}`);
    expect(restored.endsWith('END:VCARD\r\n')).toBe(true);
  });

  it('rejects a note that exceeds level H', () => {
    const payload = buildVCard(card({ firstName: 'Ada', note: 'é'.repeat(800) }));
    const report = analyzeCapacity(payload, 'H');
    expect(report.fits).toBe(false);
    expect(report.remaining).toBeLessThan(0);
    expect(analyzeCapacity(buildVCard(card({ firstName: 'Ada' })), 'L').fits).toBe(true);
  });
});
