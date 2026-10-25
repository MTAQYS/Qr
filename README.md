# QR

A QR code generator that runs entirely in the browser. French by default, English as well. Nothing is uploaded.

Live page (after GitHub Pages is enabled): <https://mtaqys.github.io/Qr/>

## What it does

- Link, plain text, Wi-Fi, email, phone, SMS, and a vCard contact. Each form builds the payload scanners expect.
- The preview updates while you type, and shows how much room is left for the chosen error correction level.
- Foreground and background colors, error correction (L, M, Q, H), quiet-zone margin, and export size. A centered logo stays on the device and forces level H. Low contrast is called out before you print a code that will not scan.
- Download PNG (at the size you pick), SVG, or copy the image. Paste a list of links and download every code as a ZIP.

Wi-Fi follows the `WIFI:` format used by Android and iOS. `\ ; , : "` in the network name and password are escaped. vCard 3.0 escapes `\`, `;`, `,`, and newlines, and folds long lines.

## Privacy

No analytics, no cookies, no requests. Language and theme are stored in `localStorage` on the device. An uploaded logo is drawn locally and never sent. The page ships a strict Content-Security-Policy (`index.html`, and `public/_headers` for a later Cloudflare Pages deploy).

## Develop

```bash
npm install
npm test
npm run lint
npm run dev
npm run build
```

Node 20 or newer. The dev server strips the Content-Security-Policy meta tag so Vite can reload; the production build keeps it.

`BASE_PATH` sets the Vite base (default `/Qr/`, the GitHub Pages project path). For Cloudflare Pages:

```bash
BASE_PATH=/ npm run build
```

Strings live in `src/i18n/fr.json` and `src/i18n/en.json`. French is the default.

Encoding uses [`qrcode`](https://github.com/soldair/node-qrcode). ZIP files use [`fflate`](https://github.com/101arrowz/fflate), synchronously, so the page does not need a worker.

## Deploy

`.github/workflows/ci.yml` runs lint, tests, and a production build on every push.

`.github/workflows/pages.yml` publishes `dist/` to GitHub Pages when `main` is updated. The repository setting **Pages → Build and deployment → Source** must be **GitHub Actions**.

## License

MIT. Copyright 2026 Dynamogic.
