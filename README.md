# QR

A QR code generator that runs entirely in the browser. Type a link, a Wi-Fi network, an email, a phone number, a contact or a place, and the code updates as you type. Nothing is sent to a server.

French is the default language. English is one click away. The page is dark by default. Light is a choice, saved on this browser, and it does not follow the system theme.

## Privacy

- No analytics, no cookies, no account.
- The only values stored in `localStorage` are the language (`qr.lang`) and the theme (`qr.theme`). The contents of a code, including a Wi-Fi password, are not saved.
- A Wi-Fi password is written into the image. Sharing the image shares the password.
- Scanning an image or the camera stays on this device.
- The page sets a strict Content-Security-Policy (`connect-src 'none'`, no workers, no remote fonts). `public/_headers` repeats it for a Cloudflare Pages deploy, and allows the camera only for this origin.

## Develop

```bash
npm install
npm run dev
```

The dev server uses the GitHub Pages base path, so the app is at `http://localhost:5173/Qr/`.

```bash
npm test
npm run lint
npm run build
```

`VITE_BASE_PATH` sets the Vite base path. `VITE_BASE` is accepted as an alias, and `VITE_BASE_PATH` wins when both are set. The default is `/Qr/`, with a trailing slash. For Cloudflare Pages, build with `VITE_BASE_PATH=/`.

Fonts (Instrument Serif, Geist, Geist Mono) are self-hosted. The dev server relaxes the content security policy so Vite can reload. The production build does not.

## What it encodes

- Text or a URL, unchanged.
- Wi-Fi (`WIFI:T:…;S:…;P:…;H:…;;`). `\ ; , : "` are escaped in the network name and the password. An open network omits the password.
- Email (`mailto:`).
- A phone call (`tel:`) or a text (`sms:`). Spaces, dots, dashes and parentheses are removed. A leading `+` is kept.
- A contact card (vCard 3.0).
- A place (`geo:`), in decimal degrees. A decimal comma is accepted.

The preview shows the size in pixels, the error correction and the margin. The default margin is 4 modules, the usual quiet zone. If the contrast between the two colours falls below 3:1, the page says so. An optional logo in the centre switches error correction to H. Download a PNG or an SVG, or copy the image.

## Scan

**Lire** decodes a PNG, JPEG, WebP or GIF, up to 12 MB, on this device. The camera is offered in a secure context when the browser allows `getUserMedia`. Leaving the tab, hiding the page or switching section stops the camera.

A decoded `http`, `https`, `mailto`, `tel`, `sms` or `geo` link can be opened. Other contents stay as text.

## Deploy

Pushing to `main` runs [`.github/workflows/pages.yml`](.github/workflows/pages.yml), which publishes `dist/` to GitHub Pages with `VITE_BASE_PATH=/Qr/` and `VITE_BASE=/Qr/`. The site is [https://mtaqys.github.io/Qr/](https://mtaqys.github.io/Qr/).

Pages has to use **GitHub Actions** as its source (Settings → Pages → Build and deployment). Enabling that needs permission to change the repository settings.

Every push also runs lint, tests and the production build.

## License

[MIT](LICENSE) © Dynamogic
