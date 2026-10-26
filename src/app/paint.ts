import { logoBox, pngDataUrl, rasterize, type RenderOptions } from '../lib/qrcode';

const images = new Map<string, HTMLImageElement>();

export async function drawQr(
  canvas: HTMLCanvasElement,
  matrix: readonly (readonly boolean[])[],
  options: RenderOptions,
): Promise<void> {
  const image = rasterize(matrix, { ...options, logo: null });
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  const pixels = new Uint8ClampedArray(image.width * image.height * 4);
  pixels.set(image.data);
  ctx.putImageData(new ImageData(pixels, image.width, image.height), 0, 0);
  const href = options.logo ? pngDataUrl(options.logo) : null;
  if (!href) return;
  const logo = await loadImage(href);
  const box = logoBox(matrix.length, options.margin, options.scale);
  ctx.fillStyle = options.background;
  ctx.fillRect(box.x - box.pad, box.y - box.pad, box.size + box.pad * 2, box.size + box.pad * 2);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(logo, box.x, box.y, box.size, box.size);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = images.get(src);
  if (cached) return Promise.resolve(cached);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      images.set(src, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error('logo'));
    img.src = src;
  });
}
