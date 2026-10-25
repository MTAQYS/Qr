import { describe, expect, it } from 'vitest';
import { buildText, buildUrl } from '../src/payload/build.ts';
import { analyzeCapacity } from '../src/payload/capacity.ts';

describe('URL payload', () => {
  it('trims and keeps the address as typed', () => {
    expect(buildUrl('  https://example.com/a?b=1&c=2  ')).toBe('https://example.com/a?b=1&c=2');
  });

  it('preserves special characters', () => {
    expect(buildUrl('https://example.com/a b?x=%20&y=é')).toBe('https://example.com/a b?x=%20&y=é');
  });

  it('rejects an address past level L', () => {
    const payload = buildUrl(`https://example.com/${'a'.repeat(3000)}`);
    expect(analyzeCapacity(payload, 'L').fits).toBe(false);
    expect(analyzeCapacity(buildUrl('https://example.com'), 'H').fits).toBe(true);
  });
});

describe('text payload', () => {
  it('preserves punctuation and whitespace', () => {
    expect(buildText('  <>&"\'  \n')).toBe('  <>&"\'  \n');
  });

  it('counts a multibyte character as more than one byte', () => {
    const report = analyzeCapacity(buildText('é'), 'M');
    expect(report.mode).toBe('byte');
    expect(report.used).toBe(2);
    expect(report.unit).toBe('bytes');
  });

  it('rejects text past the Q byte budget and accepts it at L', () => {
    const payload = buildText('a'.repeat(1664));
    expect(analyzeCapacity(payload, 'Q')).toMatchObject({ fits: false, remaining: -1, capacity: 1663 });
    expect(analyzeCapacity(payload, 'L').fits).toBe(true);
  });
});
