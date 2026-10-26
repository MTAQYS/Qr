import { announce } from './announce';
import { copyText } from './download';
import { el, showText } from './dom';
import { readScanImage } from './images';
import { decodeRgba } from '../lib/decode';
import { externalHref } from '../lib/payload';
import { t, type Lang } from '../i18n';

export interface ScanView {
  sync: () => void;
  stop: () => void;
}

export function mountScan(root: HTMLElement, getLang: () => Lang): ScanView {
  const lead = el('p', { class: 'lead', 'data-i18n': 'scan.lead' });
  const drop = el('div', { class: 'drop' });
  const file = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif', id: 'scan-file' });
  const fileLabel = el('label', { class: 'button button-secondary', for: 'scan-file', 'data-i18n': 'scan.fileLabel' });
  drop.append(
    el('p', { 'data-i18n': 'scan.drop' }),
    el('p', { class: 'hint', 'data-i18n': 'scan.dropHint' }),
    file,
    fileLabel,
  );

  const camera = el('button', { type: 'button', class: 'button button-primary', 'data-i18n': 'scan.camera', 'data-i18n-aria': 'scan.cameraLabel' });
  const unsupported = el('p', { class: 'hint', hidden: '', 'data-i18n': 'scan.unsupported' });
  const video = el('video', { playsinline: '', muted: '', hidden: '' });
  video.muted = true;
  const notice = el('p', { class: 'issue', hidden: '' });
  const result = el('textarea', {
    class: 'scan-result',
    readonly: '',
    rows: '4',
    'data-i18n-placeholder': 'scan.placeholder',
    'data-i18n-aria': 'scan.result',
  }) as HTMLTextAreaElement;
  const copy = el('button', { type: 'button', class: 'button button-secondary', 'data-i18n': 'scan.copy' });
  const open = el('a', {
    class: 'button button-primary',
    hidden: '',
    target: '_blank',
    rel: 'noreferrer noopener',
    'data-i18n': 'scan.open',
    'data-i18n-aria': 'scan.openLabel',
  });

  const cameraOk =
    window.isSecureContext && typeof navigator.mediaDevices?.getUserMedia === 'function';
  camera.hidden = !cameraOk;
  unsupported.hidden = cameraOk;

  root.append(lead, drop, el('div', { class: 'actions' }, [camera]), unsupported, video, notice, fieldResult(), el('div', { class: 'actions' }, [copy, open]));

  let timer = 0;
  let running = false;
  const grab = document.createElement('canvas');

  file.addEventListener('change', () => {
    const chosen = file.files?.[0];
    file.value = '';
    if (chosen) void readFile(chosen);
  });
  drop.addEventListener('dragover', (event) => {
    event.preventDefault();
    drop.classList.add('drag');
  });
  drop.addEventListener('dragleave', () => drop.classList.remove('drag'));
  drop.addEventListener('drop', (event) => {
    event.preventDefault();
    drop.classList.remove('drag');
    const chosen = event.dataTransfer?.files[0];
    if (chosen) void readFile(chosen);
  });
  camera.addEventListener('click', () => {
    if (running) stop();
    else void startCamera();
  });
  copy.addEventListener('click', () => {
    void copyResult();
  });

  function fieldResult(): HTMLElement {
    const label = el('label', { for: 'scan-result', 'data-i18n': 'scan.result' });
    result.id = 'scan-result';
    return el('div', { class: 'field' }, [label, result]);
  }

  function sync(): void {
    const lang = getLang();
    const key = running ? 'scan.stop' : 'scan.camera';
    const aria = running ? 'scan.stopLabel' : 'scan.cameraLabel';
    camera.dataset.i18n = key;
    camera.dataset.i18nAria = aria;
    camera.textContent = t(lang, key);
    camera.setAttribute('aria-label', t(lang, aria));
    paintLink(result.value);
  }

  function paintLink(text: string): void {
    const href = externalHref(text);
    if (!href) {
      open.hidden = true;
      open.removeAttribute('href');
      return;
    }
    open.href = href;
    open.hidden = false;
  }

  async function readFile(chosen: File): Promise<void> {
    stop();
    showText(notice, '');
    try {
      const canvas = await readScanImage(chosen);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('unreadable');
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let text = '';
      try {
        text = decodeRgba(image);
      } catch {
        text = '';
      }
      if (!text) {
        result.value = '';
        paintLink('');
        const message = t(getLang(), 'scan.none');
        showText(notice, message);
        announce(message);
        return;
      }
      showFound(text);
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      const key = code === 'tooBig' ? 'scan.tooBig' : 'scan.unreadable';
      const message = t(getLang(), key);
      showText(notice, message);
      announce(message);
    }
  }

  function showFound(text: string): void {
    result.value = text;
    paintLink(text);
    showText(notice, '');
    announce(t(getLang(), 'scan.found'));
  }

  async function startCamera(): Promise<void> {
    showText(notice, '');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      video.srcObject = stream;
      video.hidden = false;
      await video.play();
      running = true;
      sync();
      announce(t(getLang(), 'scan.looking'));
      timer = window.setTimeout(tick, 200);
    } catch (error) {
      const name = error instanceof DOMException ? error.name : '';
      const key = name === 'NotAllowedError' ? 'scan.denied' : name === 'NotFoundError' ? 'scan.missing' : 'scan.failed';
      const message = t(getLang(), key);
      showText(notice, message);
      announce(message);
      stop();
    }
  }

  function tick(): void {
    if (!running) return;
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (width > 0 && height > 0) {
      grab.width = width;
      grab.height = height;
      const ctx = grab.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, width, height);
        const image = ctx.getImageData(0, 0, width, height);
        try {
          const text = decodeRgba(image, 40);
          if (text) {
            showFound(text);
            stop();
            return;
          }
        } catch {
          /* The next frame tries again. */
        }
      }
    }
    timer = window.setTimeout(tick, 200);
  }

  function stop(): void {
    running = false;
    window.clearTimeout(timer);
    const stream = video.srcObject;
    if (stream instanceof MediaStream) {
      for (const track of stream.getTracks()) track.stop();
    }
    video.srcObject = null;
    video.hidden = true;
    sync();
  }

  async function copyResult(): Promise<void> {
    const lang = getLang();
    if (!result.value) return;
    const ok = await copyText(result.value);
    const message = t(lang, ok ? 'scan.copied' : 'scan.copyFailed');
    showText(notice, ok ? '' : message);
    announce(message);
  }

  return { sync, stop };
}
