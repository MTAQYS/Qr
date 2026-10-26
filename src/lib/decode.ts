import decodeQR from 'qr/decode.js';
import type { Raster } from './qrcode';

/** Still images can spend longer than a camera frame. The camera passes a short budget. */
export function decodeRgba(image: Pick<Raster, 'width' | 'height' | 'data'>, timeLimit = 750): string {
  return decodeQR(
    { width: image.width, height: image.height, data: image.data },
    { format: 'RGBA', effort: timeLimit > 80 ? 4 : 1, timeLimit },
  );
}
