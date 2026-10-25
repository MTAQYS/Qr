import { describe, expect, it } from 'vitest';
import en from '../src/i18n/en.json';
import fr from '../src/i18n/fr.json';
import { t } from '../src/i18n.ts';

describe('i18n catalogs', () => {
  it('uses the same keys in French and English', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort());
  });

  it('keeps the bilingual footer link in both languages', () => {
    expect(fr['footer.link']).toBe('Un outil Dynamogic / A Dynamogic tool');
    expect(en['footer.link']).toBe('Un outil Dynamogic / A Dynamogic tool');
    expect(t('fr', 'footer.link')).toBe(fr['footer.link']);
  });

  it('interpolates variables', () => {
    expect(t('en', 'capacity.bytes', { remaining: '10', capacity: '20' })).toBe('10 bytes left of 20');
    expect(t('fr', 'error.capacity', { level: 'H' })).toContain('H');
  });
});
