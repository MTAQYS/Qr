function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/** Insert a centered logo into an SVG QR code. The href must already be a local data URL. */
export function embedLogo(svg: string, href: string, background: string): string {
  const match = svg.match(/viewBox="0 0 ([0-9.]+) ([0-9.]+)"/);
  if (!match?.[1] || !match[2]) return svg;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return svg;

  const side = Math.min(width, height);
  const logo = side * 0.18;
  const pad = logo * 0.16;
  const box = logo + pad * 2;
  const x = (width - box) / 2;
  const y = (height - box) / 2;
  const markup =
    `<rect x="${x}" y="${y}" width="${box}" height="${box}" fill="${escapeAttr(background)}"/>` +
    `<image href="${escapeAttr(href)}" x="${x + pad}" y="${y + pad}" width="${logo}" height="${logo}" preserveAspectRatio="xMidYMid meet"/>`;
  return svg.replace('</svg>', `${markup}</svg>`);
}
