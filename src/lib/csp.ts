/** Keep this string identical in index.html and public/_headers. */
export const CONTENT_SECURITY_POLICY =
  "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'none'; media-src 'self' blob: mediastream:; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'; frame-src 'none'; worker-src 'none'";
