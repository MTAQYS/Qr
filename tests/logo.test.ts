import { describe, expect, it } from 'vitest';
import { isLogoFile } from '../src/logo.ts';

describe('logo files', () => {
  it('accepts image types and extension-only names', () => {
    expect(isLogoFile({ type: 'image/png', name: 'mark.png' })).toBe(true);
    expect(isLogoFile({ type: 'image/svg+xml', name: 'mark.svg' })).toBe(true);
    expect(isLogoFile({ type: '', name: 'mark.jpeg' })).toBe(true);
    expect(isLogoFile({ type: 'text/plain', name: 'notes.txt' })).toBe(false);
    expect(isLogoFile({ type: '', name: 'notes.txt' })).toBe(false);
  });
});
