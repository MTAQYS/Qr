import { describe, expect, it } from 'vitest';
import { buildEmail } from '../src/payload/build.ts';
import { analyzeCapacity } from '../src/payload/capacity.ts';

describe('email payload', () => {
  it('builds a bare mailto', () => {
    expect(buildEmail({ address: 'ada@example.com', subject: '', body: '' })).toBe('mailto:ada@example.com');
  });

  it('encodes spaces, ampersands, newlines and accents', () => {
    expect(
      buildEmail({
        address: ' ada@example.com ',
        subject: 'Hello & bye',
        body: 'line\né',
      }),
    ).toBe('mailto:ada@example.com?subject=Hello%20%26%20bye&body=line%0A%C3%A9');
  });

  it('omits empty query parts', () => {
    expect(buildEmail({ address: 'a@b.co', subject: 'Hi', body: '' })).toBe('mailto:a@b.co?subject=Hi');
  });

  it('rejects a body past the H byte budget', () => {
    const payload = buildEmail({ address: 'a@b.co', subject: '', body: 'a'.repeat(1300) });
    expect(analyzeCapacity(payload, 'H').fits).toBe(false);
    expect(analyzeCapacity(payload, 'L').fits).toBe(true);
  });
});
