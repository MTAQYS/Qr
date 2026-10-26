import { defineConfig, type Plugin } from 'vitest/config';
import { CONTENT_SECURITY_POLICY } from './src/lib/csp';
import { resolveBase } from './src/lib/base';

/**
 * Vite's dev server needs eval and a websocket. The published page keeps the
 * strict policy from index.html; this plugin only relaxes it while serving.
 */
function relaxCspInDev(): Plugin {
  return {
    name: 'relax-csp-in-dev',
    apply: 'serve',
    transformIndexHtml(html) {
      return html.replace(
        CONTENT_SECURITY_POLICY,
        [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob:",
          "font-src 'self'",
          "connect-src 'self' ws:",
          "media-src 'self' blob: mediastream:",
          "worker-src 'self' blob:",
        ].join('; '),
      );
    },
  };
}

export default defineConfig({
  base: resolveBase(process.env),
  plugins: [relaxCspInDev()],
  build: {
    sourcemap: false,
    target: 'es2022',
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
