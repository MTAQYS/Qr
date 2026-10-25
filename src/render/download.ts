import { zipSync } from 'fflate';
import { renderCanvas, canvasToBlob, type RenderStyle } from './qr.ts';

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function copyCanvas(canvas: HTMLCanvasElement): Promise<void> {
  const blob = await canvasToBlob(canvas);
  if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
    throw new Error('clipboard');
  }
  await navigator.clipboard.write([
    new ClipboardItem({
      'image/png': blob,
    }),
  ]);
}

export async function zipQrCodes(
  items: { url: string; filename: string }[],
  style: RenderStyle,
): Promise<Uint8Array<ArrayBuffer>> {
  const files: Record<string, Uint8Array> = {};
  for (const item of items) {
    const canvas = await renderCanvas(item.url, { ...style, logo: null });
    const blob = await canvasToBlob(canvas);
    files[item.filename] = new Uint8Array(await blob.arrayBuffer());
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  }
  return zipSync(files, { level: 6 });
}
