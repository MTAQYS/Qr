import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) files.push(...walk(path));
    else files.push(path);
  }
  return files;
}

const BANNED = [
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\bsendBeacon\b/,
  /\bWebSocket\b/,
  /\bdocument\.cookie\b/,
  /\bgtag\s*\(/,
  /google-analytics/i,
  /googletagmanager/i,
];

describe('privacy', () => {
  const sources = walk('src').filter((file) => file.endsWith('.ts'));

  it('does not call the network or write cookies', () => {
    for (const file of sources) {
      const text = readFileSync(file, 'utf8');
      for (const pattern of BANNED) {
        expect(text, file).not.toMatch(pattern);
      }
    }
  });

  it('keeps preference storage inside preferences.ts', () => {
    for (const file of sources) {
      if (file.endsWith('preferences.ts')) continue;
      expect(readFileSync(file, 'utf8'), file).not.toContain('localStorage');
    }
  });

  it('ships a strict content security policy in HTML and Cloudflare headers', () => {
    const html = readFileSync('index.html', 'utf8');
    const match = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/);
    expect(match?.[1]).toBeTruthy();
    const policy = match?.[1] ?? '';
    expect(policy).not.toContain('unsafe-inline');
    expect(policy).not.toContain('unsafe-eval');
    expect(policy).toContain("connect-src 'none'");
    expect(policy).toContain("default-src 'none'");
    expect(readFileSync('public/_headers', 'utf8')).toContain(`Content-Security-Policy: ${policy}`);

    for (const script of html.matchAll(/<script[^>]*src="([^"]+)"/g)) {
      expect(script[1]?.startsWith('http')).toBe(false);
    }
  });
});
