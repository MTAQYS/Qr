const LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']);

export function isLogoFile(file: { type: string; name: string }): boolean {
  if (LOGO_TYPES.has(file.type)) return true;
  if (file.type === '') return /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name);
  return false;
}
