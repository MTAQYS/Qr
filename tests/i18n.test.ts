import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import en from '../src/i18n/en.json' with { type: 'json' };
import fr from '../src/i18n/fr.json' with { type: 'json' };
import { t } from '../src/i18n';
import { ECC_LEVELS } from '../src/lib/qrcode';
import { PAYLOAD_ISSUES, PHONE_KINDS, WIFI_SECURITIES } from '../src/lib/payload';
import { MODES } from '../src/lib/routes';

const root = new URL('..', import.meta.url);

function keys(node: unknown, prefix = ''): string[] {
  if (typeof node === 'string') return [prefix];
  if (typeof node !== 'object' || node === null) return [];
  return Object.entries(node).flatMap(([key, value]) => keys(value, prefix ? `${prefix}.${key}` : key));
}

function sourceFiles(dir: string): string[] {
  const found: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) found.push(...sourceFiles(path));
    else if (name.endsWith('.ts') || name.endsWith('.html')) found.push(path);
  }
  return found;
}

describe('catalogues', () => {
  it('gives French and English the same keys', () => {
    expect(keys(en).sort()).toEqual(keys(fr).sort());
  });

  it('keeps the bilingual credit identical', () => {
    expect(fr.footer.credit).toBe('Un outil Dynamogic / A Dynamogic tool');
    expect(en.footer.credit).toBe(fr.footer.credit);
  });

  it('uses the French description in the document head', () => {
    const html = readFileSync(new URL('./index.html', root), 'utf8');
    expect(html).toContain(fr.meta.description);
    expect(t('fr', 'meta.description')).toBe(fr.meta.description);
    expect(t('en', 'header.tagline')).toBe(en.header.tagline);
  });

  it('has a string for every key the interface asks for', () => {
    const used = new Set<string>();
    const roots = new Set(Object.keys(fr));
    for (const file of sourceFiles(new URL('./src', root).pathname)) {
      const text = readFileSync(file, 'utf8');
      for (const match of text.matchAll(/'([a-z][a-z0-9]*(?:\.[a-z0-9]+)+)'/g)) {
        const key = match[1];
        const head = key?.split('.')[0];
        if (key && head && roots.has(head)) used.add(key);
      }
    }
    for (const mode of MODES) used.add(`tab.${mode}`);
    for (const level of ECC_LEVELS) used.add(`ecc.${level}`);
    for (const issue of PAYLOAD_ISSUES) used.add(`error.${issue}`);
    used.add('error.capacity');
    used.add('error.unexpected');
    for (const security of WIFI_SECURITIES) used.add(`wifi.security.${security}`);
    for (const kind of PHONE_KINDS) used.add(`phone.kind.${kind}`);
    const french = new Set(keys(fr));
    const missing = [...used].filter((key) => !french.has(key));
    expect(missing).toEqual([]);
  });
});
