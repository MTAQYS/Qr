import { describe, expect, it } from 'vitest';
import { MIN_CONTRAST, contrastRatio, normalizeHex } from '../src/contrast.ts';

describe('contrast', () => {
  it('normalizes short and full hex colors', () => {
    expect(normalizeHex('#abc')).toBe('#aabbcc');
    expect(normalizeHex('ABCDEF')).toBe('#abcdef');
    expect(normalizeHex('#12')).toBeNull();
    expect(normalizeHex('#gg0000')).toBeNull();
    expect(normalizeHex('')).toBeNull();
  });

  it('rates black on white as high contrast', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 5);
    expect(contrastRatio('#1b1914', '#f7f4ee')).toBeGreaterThan(MIN_CONTRAST);
  });

  it('warns when two colors are too close to scan', () => {
    const ratio = contrastRatio('#888888', '#777777');
    expect(ratio).not.toBeNull();
    expect(ratio!).toBeLessThan(MIN_CONTRAST);
    expect(contrastRatio('nope', '#ffffff')).toBeNull();
  });
});
