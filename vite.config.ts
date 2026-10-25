import { defineConfig, type Plugin } from 'vitest/config';

/** Project site path. Set BASE_PATH=/ when building for Cloudflare Pages. */
function basePath(): string {
  const raw = process.env.BASE_PATH?.trim() || '/Qr/';
  if (raw === '/') return '/';
  return raw.endsWith('/') ? raw : `${raw}/`;
}

function stripCspInDev(): Plugin {
  return {
    name: 'strip-csp-in-dev',
    apply: 'serve',
    transformIndexHtml(html) {
      return html.replace(/\s*<meta http-equiv="Content-Security-Policy"[^>]*>\s*/i, '\n');
    },
  };
}

export default defineConfig({
  base: basePath(),
  plugins: [stripCspInDev()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
