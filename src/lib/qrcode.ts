import encodeQR, { type ErrorCorrection } from 'qr';
import { hexToRgb, normalizeHex, type Rgb } from './color';

export const ECC_LEVELS = ['low', 'medium', 'quartile', 'high'] as const;
export type EccLevel = (typeof ECC_LEVELS)[number];

export const ECC_LETTER: Record<EccLevel, string> = {
  low: 'L',
  medium: 'M',
  quartile: 'Q',
  high: 'H',
};

/** Side of the centred logo, as a fraction of the module grid. High ECC covers it. */
export const LOGO_RATIO = 0.18;

const SCALE_MAX = 16;
const MARGIN_MAX = 16;

export class QrEncodeError extends Error {
  readonly code = 'capacity' as const;

  constructor() {
    super('Capacity overflow');
    this.name = 'QrEncodeError';
  }
}

export function resolveEcc(ecc: EccLevel, hasLogo: boolean): EccLevel {
  return hasLogo ? 'high' : ecc;
}

export interface RenderOptions {
  margin: number;
  scale: number;
  foreground: string;
  background: string;
  /** PNG data URL drawn in the centre. The quiet pad uses the background colour. */
  logo?: string | null;
  title?: string;
}

export interface LogoBox {
  x: number;
  y: number;
  size: number;
  pad: number;
}

export interface Raster {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

/** True cells are dark modules. The matrix has no quiet zone. */
export function encodeMatrix(text: string, ecc: EccLevel): boolean[][] {
  if (!text) throw new QrEncodeError();
  let raw: boolean[][];
  try {
    // border 0 is rejected. A one-module ring is sliced off so the matrix is the symbol only.
    raw = encodeQR(text, 'raw', { ecc: ecc as ErrorCorrection, border: 1 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Capacity overflow') throw new QrEncodeError();
    throw error;
  }
  const body = raw.slice(1, -1).map((row) => row.slice(1, -1).map((cell) => cell === true));
  if (body.length < 21 || body.length !== (body[0]?.length ?? -1)) throw new QrEncodeError();
  return body;
}

export function pixelSize(modules: number, margin: number, scale: number): number {
  assertRender(modules, margin, scale);
  return (modules + margin * 2) * scale;
}

export function logoBox(modules: number, margin: number, scale: number): LogoBox {
  assertRender(modules, margin, scale);
  const code = modules * scale;
  let size = Math.max(scale * 3, Math.round(code * LOGO_RATIO));
  let pad = Math.max(scale, Math.round(size * 0.14));
  const limit = Math.floor(code * 0.3);
  if (size + pad * 2 > limit) {
    pad = scale;
    size = Math.max(scale * 3, limit - pad * 2);
  }
  const origin = margin * scale + Math.round((code - size) / 2);
  return { x: origin, y: origin, size, pad };
}

export function renderSvg(matrix: readonly (readonly boolean[])[], options: RenderOptions): string {
  const modules = matrix.length;
  const margin = options.margin;
  const scale = options.scale;
  const foreground = requireHex(options.foreground);
  const background = requireHex(options.background);
  const size = pixelSize(modules, margin, scale);
  const title = xmlText(options.title?.trim() || 'QR');
  const rects: string[] = [];
  for (let y = 0; y < modules; y += 1) {
    const row = matrix[y];
    if (!row) continue;
    let x = 0;
    while (x < modules) {
      if (row[x] !== true) {
        x += 1;
        continue;
      }
      let width = 1;
      while (x + width < modules && row[x + width] === true) width += 1;
      rects.push(
        `<rect x="${(x + margin) * scale}" y="${(y + margin) * scale}" width="${width * scale}" height="${scale}"/>`,
      );
      x += width;
    }
  }
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img">`,
    `<title>${title}</title>`,
    `<rect width="${size}" height="${size}" fill="${background}"/>`,
    `<g fill="${foreground}">${rects.join('')}</g>`,
  ];
  const logo = options.logo ? pngDataUrl(options.logo) : null;
  if (logo) {
    const box = logoBox(modules, margin, scale);
    parts.push(
      `<rect x="${box.x - box.pad}" y="${box.y - box.pad}" width="${box.size + box.pad * 2}" height="${box.size + box.pad * 2}" fill="${background}"/>`,
      `<image href="${logo}" xlink:href="${logo}" x="${box.x}" y="${box.y}" width="${box.size}" height="${box.size}" preserveAspectRatio="xMidYMid meet"/>`,
    );
  }
  parts.push('</svg>');
  return parts.join('');
}

export function rasterize(matrix: readonly (readonly boolean[])[], options: RenderOptions): Raster {
  const modules = matrix.length;
  const { margin, scale } = options;
  const foreground = hexToRgb(requireHex(options.foreground));
  const background = hexToRgb(requireHex(options.background));
  const size = pixelSize(modules, margin, scale);
  const data = new Uint8ClampedArray(size * size * 4);
  fill(data, size, 0, 0, size, size, background);
  for (let y = 0; y < modules; y += 1) {
    const row = matrix[y];
    if (!row) continue;
    for (let x = 0; x < modules; x += 1) {
      if (row[x] !== true) continue;
      fill(data, size, (x + margin) * scale, (y + margin) * scale, scale, scale, foreground);
    }
  }
  return { width: size, height: size, data };
}

/** Paints a rectangle. Used by tests that cover the centre the way a logo does. */
export function fillHex(raster: Raster, x: number, y: number, width: number, height: number, hex: string): void {
  fill(raster.data, raster.width, x, y, width, height, hexToRgb(requireHex(hex)));
}

function fill(
  data: Uint8ClampedArray,
  size: number,
  x: number,
  y: number,
  width: number,
  height: number,
  color: Rgb,
): void {
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(size, x + width);
  const y1 = Math.min(size, y + height);
  for (let py = y0; py < y1; py += 1) {
    for (let px = x0; px < x1; px += 1) {
      const index = (py * size + px) * 4;
      data[index] = color.r;
      data[index + 1] = color.g;
      data[index + 2] = color.b;
      data[index + 3] = 255;
    }
  }
}

function assertRender(modules: number, margin: number, scale: number): void {
  if (!Number.isInteger(modules) || modules < 21 || modules > 177) {
    throw new RangeError('modules');
  }
  if (!Number.isInteger(margin) || margin < 0 || margin > MARGIN_MAX) throw new RangeError('margin');
  if (!Number.isInteger(scale) || scale < 1 || scale > SCALE_MAX) throw new RangeError('scale');
}

function requireHex(value: string): string {
  const hex = normalizeHex(value);
  if (!hex) throw new Error('Invalid colour');
  return hex;
}

export function pngDataUrl(value: string): string | null {
  if (!value.startsWith('data:image/png;base64,')) return null;
  const body = value.slice('data:image/png;base64,'.length);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(body)) return null;
  return value;
}

function xmlText(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
