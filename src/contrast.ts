export const MIN_CONTRAST = 3;

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function normalizeHex(input: string): string | null {
  const raw = input.trim();
  const body = raw.startsWith('#') ? raw.slice(1) : raw;
  const full = body.length === 3 ? body.split('').map((char) => `${char}${char}`).join('') : body;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return `#${full.toLowerCase()}`;
}

export function parseHex(input: string): Rgb | null {
  const hex = normalizeHex(input);
  if (!hex) return null;
  const value = Number.parseInt(hex.slice(1), 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

function channel(value: number): number {
  const scaled = value / 255;
  return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

export function contrastRatio(foreground: string, background: string): number | null {
  const fg = parseHex(foreground);
  const bg = parseHex(background);
  if (!fg || !bg) return null;
  const l1 = 0.2126 * channel(fg.r) + 0.7152 * channel(fg.g) + 0.0722 * channel(fg.b);
  const l2 = 0.2126 * channel(bg.r) + 0.7152 * channel(bg.g) + 0.0722 * channel(bg.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
