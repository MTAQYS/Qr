import { create } from 'qrcode';
import { describe, expect, it } from 'vitest';
import { analyzeCapacity, detectMode, effectiveEcc } from '../src/payload/capacity.ts';
import type { Ecc, QrMode } from '../src/payload/types.ts';

const MAXIMA: Record<QrMode, Record<Ecc, number>> = {
  numeric: { L: 7089, M: 5596, Q: 3993, H: 3057 },
  alphanumeric: { L: 4296, M: 3391, Q: 2420, H: 1852 },
  byte: { L: 2953, M: 2331, Q: 1663, H: 1273 },
};

const SAMPLE: Record<QrMode, string> = {
  numeric: '1',
  alphanumeric: 'A',
  byte: 'a',
};

describe('capacity', () => {
  it('detects numeric, alphanumeric and byte modes', () => {
    expect(detectMode('')).toBe('byte');
    expect(detectMode('12345')).toBe('numeric');
    expect(detectMode('HELLO WORLD')).toBe('alphanumeric');
    expect(detectMode('A:B/$%*+-')).toBe('alphanumeric');
    expect(detectMode('Hello')).toBe('byte');
    expect(detectMode('café')).toBe('byte');
  });

  it.each(['L', 'M', 'Q', 'H'] as const)('matches version 40 limits at %s', (ecc) => {
    for (const mode of ['numeric', 'alphanumeric', 'byte'] as const) {
      const cap = MAXIMA[mode][ecc];
      const exact = SAMPLE[mode].repeat(cap);
      const over = SAMPLE[mode].repeat(cap + 1);
      const exactReport = analyzeCapacity(exact, ecc);
      const overReport = analyzeCapacity(over, ecc);
      expect(exactReport).toMatchObject({ fits: true, remaining: 0, capacity: cap, mode });
      expect(overReport.fits).toBe(false);
      expect(overReport.remaining).toBe(-1);
      expect(() => create(exact, { errorCorrectionLevel: ecc })).not.toThrow();
      expect(() => create(over, { errorCorrectionLevel: ecc })).toThrow();
    }
  });

  it('reports remaining room for a short payload', () => {
    expect(analyzeCapacity('12345', 'L')).toMatchObject({
      mode: 'numeric',
      used: 5,
      capacity: 7089,
      remaining: 7084,
      fits: true,
      unit: 'chars',
    });
    expect(analyzeCapacity('', 'H')).toMatchObject({
      mode: 'byte',
      used: 0,
      capacity: 1273,
      remaining: 1273,
      fits: true,
    });
  });

  it('counts UTF-8 bytes and leaves a single byte of room', () => {
    const report = analyzeCapacity('é'.repeat(636), 'H');
    expect(report).toMatchObject({ used: 1272, capacity: 1273, remaining: 1, fits: true, unit: 'bytes' });
    expect(analyzeCapacity(`${'é'.repeat(636)}a`, 'H').fits).toBe(true);
    expect(analyzeCapacity('é'.repeat(637), 'H').fits).toBe(false);
  });

  it('accepts mixed data that segmented encoding can still store', () => {
    const payload = `${'1'.repeat(4000)}a`;
    const report = analyzeCapacity(payload, 'L');
    expect(report.fits).toBe(true);
    expect(report.remaining).toBeGreaterThanOrEqual(0);
    expect(() => create(payload, { errorCorrectionLevel: 'L' })).not.toThrow();
  });

  it('raises error correction to H when a logo is present', () => {
    expect(effectiveEcc('L', true)).toBe('H');
    expect(effectiveEcc('Q', false)).toBe('Q');
    expect(effectiveEcc('H', true)).toBe('H');
  });
});
