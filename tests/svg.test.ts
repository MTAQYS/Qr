import { describe, expect, it } from 'vitest';
import { embedLogo } from '../src/render/svg.ts';

describe('SVG logo', () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 29 29"><path d="M0 0h29v29H0z"/></svg>';

  it('centers a logo inside the viewBox', () => {
    const result = embedLogo(svg, 'data:image/png;base64,aaaa', '#ffffff');
    expect(result).toContain('</svg>');
    expect(result).toContain('href="data:image/png;base64,aaaa"');
    expect(result).toContain('fill="#ffffff"');
    const image = result.match(/<image href="[^"]+" x="([^"]+)" y="([^"]+)" width="([^"]+)"/);
    expect(image).not.toBeNull();
    const x = Number(image?.[1]);
    const width = Number(image?.[3]);
    expect(x).toBeGreaterThan(0);
    expect(x + width).toBeLessThan(29);
  });

  it('escapes characters that would break the markup', () => {
    const result = embedLogo(svg, 'data:image/png;base64,a&b"<c', '#fff');
    expect(result).toContain('href="data:image/png;base64,a&amp;b&quot;&lt;c"');
    expect(result).not.toContain('b"<c');
  });
});
