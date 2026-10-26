export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Accepts #rgb and #rrggbb. Returns a lowercase #rrggbb, or null. */
export function normalizeHex(input: string): string | null {
  const value = input.trim();
  const short = /^#([0-9a-fA-F]{3})$/.exec(value);
  if (short?.[1]) {
    const hex = short[1];
    const r = hex[0] ?? '';
    const g = hex[1] ?? '';
    const b = hex[2] ?? '';
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  const full = /^#([0-9a-fA-F]{6})$/.exec(value);
  if (full?.[1]) return `#${full[1].toLowerCase()}`;
  return null;
}

export function hexToRgb(hex: string): Rgb {
  const normal = normalizeHex(hex);
  if (!normal) throw new Error(`Invalid colour ${hex}`);
  return {
    r: Number.parseInt(normal.slice(1, 3), 16),
    g: Number.parseInt(normal.slice(3, 5), 16),
    b: Number.parseInt(normal.slice(5, 7), 16),
  };
}

function channel(value: number): number {
  const s = value / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG 2 contrast ratio. 21 is black on white, 1 is identical colours. */
export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}
