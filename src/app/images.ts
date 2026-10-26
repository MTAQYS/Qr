const LOGO_LIMIT = 2 * 1024 * 1024;
const SCAN_LIMIT = 12 * 1024 * 1024;

export function readLogo(file: File): Promise<string> {
  if (file.size > LOGO_LIMIT) return Promise.reject(new Error('tooBig'));
  if (file.type && !file.type.startsWith('image/')) return Promise.reject(new Error('unreadable'));
  return drawFile(file, 512).then((canvas) => canvas.toDataURL('image/png'));
}

export function readScanImage(file: File): Promise<HTMLCanvasElement> {
  if (file.size > SCAN_LIMIT) return Promise.reject(new Error('tooBig'));
  if (file.type && !file.type.startsWith('image/')) return Promise.reject(new Error('unreadable'));
  return drawFile(file, 1400);
}

function drawFile(file: File, maxSide: number): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const width = img.naturalWidth || 256;
      const height = img.naturalHeight || 256;
      const factor = Math.min(1, maxSide / Math.max(width, height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(width * factor));
      canvas.height = Math.max(1, Math.round(height * factor));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('unreadable'));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('unreadable'));
    };
    img.src = url;
  });
}
