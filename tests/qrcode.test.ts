import { describe, expect, it } from 'vitest';
import { contrastRatio, normalizeHex } from '../src/lib/color';
import { decodeRgba } from '../src/lib/decode';
import { DEFAULT_BACKGROUND, DEFAULT_FOREGROUND, MIN_CONTRAST } from '../src/lib/brand';
import {
  encodeMatrix,
  fillHex,
  logoBox,
  QrEncodeError,
  rasterize,
  renderSvg,
  resolveEcc,
} from '../src/lib/qrcode';

const render = { margin: 4, scale: 8, foreground: DEFAULT_FOREGROUND, background: DEFAULT_BACKGROUND };

describe('qr codes', () => {
  it('round-trips a URL', () => {
    const text = 'https://dynamogic.com/';
    const matrix = encodeMatrix(text, 'medium');
    const image = rasterize(matrix, render);
    expect(decodeRgba(image)).toBe(text);
  });

  it('round-trips Wi-Fi, a contact and a place', () => {
    const samples = [
      'WIFI:T:WPA;S:Cafe;P:secret;H:false;;',
      'BEGIN:VCARD\r\nVERSION:3.0\r\nN:Lovelace;Ada;;;\r\nFN:Ada Lovelace\r\nEND:VCARD',
      'geo:48.856614,2.352222',
    ];
    for (const text of samples) {
      const image = rasterize(encodeMatrix(text, 'medium'), render);
      expect(decodeRgba(image)).toBe(text);
    }
  });

  it('stays readable when the centre is covered at high correction', () => {
    const text = 'https://dynamogic.com/';
    const matrix = encodeMatrix(text, 'high');
    const image = rasterize(matrix, render);
    const box = logoBox(matrix.length, render.margin, render.scale);
    fillHex(image, box.x - box.pad, box.y - box.pad, box.size + box.pad * 2, box.size + box.pad * 2, render.background);
    expect(decodeRgba(image)).toBe(text);
  });

  it('forces high correction while a logo is present', () => {
    expect(resolveEcc('low', true)).toBe('high');
    expect(resolveEcc('quartile', false)).toBe('quartile');
  });

  it('maps an oversized payload to a capacity error', () => {
    expect(() => encodeMatrix('x'.repeat(8000), 'high')).toThrow(QrEncodeError);
  });

  it('draws an SVG without putting the title in as markup', () => {
    const svg = renderSvg(encodeMatrix('QR', 'low'), { ...render, title: 'A <QR> & "code"' });
    expect(svg).toContain('<title>A &lt;QR&gt; &amp; &quot;code&quot;</title>');
    expect(svg).toContain(`fill="${DEFAULT_BACKGROUND.toLowerCase()}"`);
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
  });
});

describe('contrast', () => {
  it('expands short hex and measures the default pair above the scanner floor', () => {
    expect(normalizeHex('#ABC')).toBe('#aabbcc');
    expect(normalizeHex('abc')).toBeNull();
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(contrastRatio('#16171A', '#16171A')).toBeCloseTo(1, 5);
    expect(contrastRatio(DEFAULT_FOREGROUND, DEFAULT_BACKGROUND)).toBeGreaterThan(MIN_CONTRAST);
  });
});
