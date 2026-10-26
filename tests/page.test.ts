import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolveBase } from '../src/lib/base';
import { CONTENT_SECURITY_POLICY } from '../src/lib/csp';
import { MARK_BEAK, MARK_FACE } from '../src/app/mark';

const root = new URL('..', import.meta.url);

function read(path: string): string {
  return readFileSync(new URL(path, root), 'utf8');
}

describe('page', () => {
  it('publishes one content security policy', () => {
    const html = read('./index.html');
    const headers = read('./public/_headers');
    expect(html).toContain(`content="${CONTENT_SECURITY_POLICY}"`);
    expect(headers).toContain(`Content-Security-Policy: ${CONTENT_SECURITY_POLICY}`);
    expect(headers).toContain('camera=(self)');
  });

  it('links the final favicons, the touch icon and the manifest icons', () => {
    const html = read('./index.html');
    expect(html).not.toContain('%BASE_URL%');
    expect(html).toContain('href="/favicon.ico" sizes="48x48"');
    expect(html).toContain('href="/favicon.svg" type="image/svg+xml"');
    expect(html).toContain('href="/favicon-16.svg" type="image/svg+xml" sizes="16x16"');
    expect(html).toContain('href="/apple-touch-icon-180.png"');
    expect(html).toContain('href="/manifest.webmanifest"');
    expect(html).toContain('src="/theme-init.js"');
    expect(html).toContain('href="/boot.css"');
    const manifest = JSON.parse(read('./public/manifest.webmanifest')) as {
      icons: { src: string; sizes: string }[];
      background_color: string;
    };
    expect(manifest.icons.map((icon) => icon.src)).toEqual(['app-icon-192.png', 'app-icon-512.png']);
    expect(manifest.background_color).toBe('#0E0F11');
  });

  it('points social cards at the rendered Open Graph image', () => {
    const html = read('./index.html');
    expect(html).toContain('https://mtaqys.github.io/Qr/og.png');
    const png = readFileSync(new URL('./public/og.png', root));
    expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
  });

  it('paints the footer mark with the official geometry', () => {
    const svg = read('./public/mark.svg');
    expect(svg).toContain(`d="${MARK_FACE}"`);
    expect(svg).toContain(`d="${MARK_BEAK}"`);
    expect(read('./public/theme-init.js')).toContain('qr.theme');
    expect(read('./public/theme-init.js')).toContain('qr.lang');
  });
});

describe('base path', () => {
  it('prefers VITE_BASE_PATH, then VITE_BASE, then /Qr/', () => {
    expect(resolveBase({})).toBe('/Qr/');
    expect(resolveBase({ VITE_BASE: '/Wheel' })).toBe('/Wheel/');
    expect(resolveBase({ VITE_BASE_PATH: '/', VITE_BASE: '/Qr/' })).toBe('/');
    expect(resolveBase({ VITE_BASE_PATH: 'Qr' })).toBe('/Qr/');
  });
});

describe('privacy', () => {
  it('does not call the network or measure an audience', () => {
    const files = [
      'src/main.ts',
      'src/app/shell.ts',
      'src/app/create.ts',
      'src/app/scan.ts',
      'src/app/paint.ts',
      'src/app/images.ts',
      'src/lib/brand.ts',
      'src/lib/payload.ts',
      'src/lib/qrcode.ts',
      'src/lib/decode.ts',
    ];
    const bundled = files.map((path) => read(`./${path}`)).join('\n');
    expect(bundled).not.toMatch(/fetch\s*\(/);
    expect(bundled).not.toMatch(/XMLHttpRequest/);
    expect(bundled).not.toMatch(/sendBeacon/);
    expect(bundled).not.toMatch(/google-analytics|googletagmanager|gtag\s*\(/);
    expect(bundled).not.toMatch(/Math\.random/);
    expect(bundled).toContain('https://dynamogic.com/');
    expect(bundled).not.toContain('mtaqys.github.io');
  });
});
