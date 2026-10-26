/**
 * Vite's base path. Convert calls the variable VITE_BASE_PATH and Wheel calls
 * it VITE_BASE. Either one works. VITE_BASE_PATH wins when both are set.
 */
export function resolveBase(env: { VITE_BASE_PATH?: string; VITE_BASE?: string }): string {
  const raw = env.VITE_BASE_PATH || env.VITE_BASE || '/Qr/';
  const withSlash = raw.endsWith('/') ? raw : `${raw}/`;
  return withSlash.startsWith('/') ? withSlash : `/${withSlash}`;
}
