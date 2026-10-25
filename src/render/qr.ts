import { toCanvas, toString as qrToString } from 'qrcode';
import type { Ecc } from '../payload/types.ts';
import { embedLogo } from './svg.ts';

export interface RenderStyle {
  ecc: Ecc;
  margin: number;
  size: number;
  fg: string;
  bg: string;
  logo: HTMLImageElement | null;
}

const PREVIEW_SIZE = 512;

function drawLogo(canvas: HTMLCanvasElement, logo: HTMLImageElement, background: string): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const side = canvas.width;
  const naturalWidth = logo.naturalWidth || 1;
  const naturalHeight = logo.naturalHeight || 1;
  const maxSide = Math.round(side * 0.18);
  const scale = Math.min(maxSide / naturalWidth, maxSide / naturalHeight);
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));
  const pad = Math.max(2, Math.round(Math.max(width, height) * 0.16));
  const boxWidth = width + pad * 2;
  const boxHeight = height + pad * 2;
  const x = Math.round((side - boxWidth) / 2);
  const y = Math.round((side - boxHeight) / 2);
  ctx.fillStyle = background;
  ctx.fillRect(x, y, boxWidth, boxHeight);
  ctx.drawImage(logo, x + pad, y + pad, width, height);
}

export async function renderCanvas(payload: string, style: RenderStyle): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  await toCanvas(canvas, payload, {
    errorCorrectionLevel: style.ecc,
    margin: style.margin,
    width: style.size,
    color: { dark: style.fg, light: style.bg },
  });
  if (style.logo) drawLogo(canvas, style.logo, style.bg);
  return canvas;
}

export async function renderPreviewUrl(payload: string, style: RenderStyle): Promise<string> {
  const canvas = await renderCanvas(payload, { ...style, size: PREVIEW_SIZE });
  return canvas.toDataURL('image/png');
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('png'));
    }, 'image/png');
  });
}

function logoDataUrl(logo: HTMLImageElement): string {
  const canvas = document.createElement('canvas');
  const width = logo.naturalWidth || 256;
  const height = logo.naturalHeight || 256;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.drawImage(logo, 0, 0, width, height);
  return canvas.toDataURL('image/png');
}

export async function renderSvg(payload: string, style: RenderStyle): Promise<string> {
  const svg = await qrToString(payload, {
    type: 'svg',
    errorCorrectionLevel: style.ecc,
    margin: style.margin,
    width: style.size,
    color: { dark: style.fg, light: style.bg },
  });
  if (!style.logo) return svg;
  return embedLogo(svg, logoDataUrl(style.logo), style.bg);
}
