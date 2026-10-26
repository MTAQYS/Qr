import { announce } from './announce';
import { copyText, downloadBlob } from './download';
import { el, field, showText } from './dom';
import { readLogo } from './images';
import { t, type Lang } from '../i18n';
import {
  DEFAULT_BACKGROUND,
  DEFAULT_FOREGROUND,
  MIN_CONTRAST,
} from '../lib/brand';
import { contrastRatio, normalizeHex } from '../lib/color';
import { encodeContent, PHONE_KINDS, WIFI_SECURITIES, type ContentInput, type PhoneKind, type WifiSecurity } from '../lib/payload';
import {
  ECC_LETTER,
  ECC_LEVELS,
  encodeMatrix,
  pixelSize,
  QrEncodeError,
  renderSvg,
  resolveEcc,
  type EccLevel,
} from '../lib/qrcode';
import { CREATE_MODES, type CreateMode } from '../lib/routes';
import { drawQr } from './paint';

const DEFAULT_TEXT = 'https://dynamogic.com/';

interface Draft {
  text: string;
  ssid: string;
  password: string;
  security: WifiSecurity;
  hidden: boolean;
  showPassword: boolean;
  email: string;
  subject: string;
  body: string;
  phone: string;
  phoneKind: PhoneKind;
  sms: string;
  first: string;
  last: string;
  org: string;
  title: string;
  vphone: string;
  vemail: string;
  url: string;
  street: string;
  city: string;
  region: string;
  postal: string;
  country: string;
  note: string;
  latitude: string;
  longitude: string;
  label: string;
  ecc: EccLevel;
  eccBeforeLogo: EccLevel;
  scale: number;
  margin: number;
  foreground: string;
  background: string;
  logo: string | null;
  logoName: string;
}

export interface CreateView {
  show: (mode: CreateMode) => void;
  sync: () => void;
}

export function mountCreate(root: HTMLElement, getLang: () => Lang): CreateView {
  const draft: Draft = {
    text: DEFAULT_TEXT,
    ssid: '',
    password: '',
    security: 'WPA',
    hidden: false,
    showPassword: false,
    email: '',
    subject: '',
    body: '',
    phone: '',
    phoneKind: 'call',
    sms: '',
    first: '',
    last: '',
    org: '',
    title: '',
    vphone: '',
    vemail: '',
    url: '',
    street: '',
    city: '',
    region: '',
    postal: '',
    country: '',
    note: '',
    latitude: '',
    longitude: '',
    label: '',
    ecc: 'medium',
    eccBeforeLogo: 'medium',
    scale: 8,
    margin: 4,
    foreground: DEFAULT_FOREGROUND,
    background: DEFAULT_BACKGROUND,
    logo: null,
    logoName: '',
  };

  const panels = new Map<CreateMode, HTMLElement>();
  const textInput = area('text-value', 'text.placeholder');
  textInput.value = draft.text;
  panels.set('text', panel('text', [field('text-value', 'text.label', textInput, 'text.hint')]));

  const ssid = line('wifi-ssid', 'text');
  const password = line('wifi-password', 'password', 'off');
  const security = select('wifi-security', WIFI_SECURITIES, (value) => `wifi.security.${value}`);
  const hidden = el('input', { type: 'checkbox', id: 'wifi-hidden' }) as HTMLInputElement;
  const showPassword = el('button', {
    type: 'button',
    class: 'button button-secondary',
    'data-i18n': 'wifi.show',
    'data-i18n-aria': 'wifi.showLabel',
  });
  panels.set(
    'wifi',
    panel('wifi', [
      field('wifi-ssid', 'wifi.ssid', ssid),
      el('div', { class: 'field' }, [
        el('label', { for: 'wifi-password', 'data-i18n': 'wifi.password' }),
        el('div', { class: 'inline' }, [password, showPassword]),
      ]),
      field('wifi-security', 'wifi.securityLabel', security),
      el('label', { class: 'check' }, [hidden, el('span', { 'data-i18n': 'wifi.hidden' })]),
      el('p', { class: 'hint', 'data-i18n': 'wifi.hint' }),
    ]),
  );

  const email = line('email-address', 'email', 'email');
  const subject = line('email-subject', 'text');
  const body = area('email-body');
  panels.set(
    'email',
    panel('email', [
      field('email-address', 'email.address', email),
      field('email-subject', 'email.subject', subject),
      field('email-body', 'email.body', body),
    ]),
  );

  const phone = line('phone-number', 'tel', 'tel');
  const phoneKind = select('phone-kind', PHONE_KINDS, (value) => `phone.kind.${value}`);
  const sms = area('phone-message');
  const smsField = field('phone-message', 'phone.message', sms);
  panels.set(
    'phone',
    panel('phone', [
      field('phone-number', 'phone.number', phone),
      field('phone-kind', 'phone.kindLabel', phoneKind),
      smsField,
      el('p', { class: 'hint', 'data-i18n': 'phone.hint' }),
    ]),
  );

  const first = line('vcard-first', 'text', 'given-name');
  const last = line('vcard-last', 'text', 'family-name');
  const org = line('vcard-org', 'text', 'organization');
  const title = line('vcard-title', 'text', 'organization-title');
  const vphone = line('vcard-phone', 'tel', 'tel');
  const vemail = line('vcard-email', 'email', 'email');
  const url = line('vcard-url', 'url', 'url');
  const street = line('vcard-street', 'text', 'street-address');
  const city = line('vcard-city', 'text', 'address-level2');
  const region = line('vcard-region', 'text', 'address-level1');
  const postal = line('vcard-postal', 'text', 'postal-code');
  const country = line('vcard-country', 'text', 'country-name');
  const note = area('vcard-note');
  panels.set(
    'vcard',
    panel('vcard', [
      el('div', { class: 'grid-2' }, [
        field('vcard-first', 'vcard.first', first),
        field('vcard-last', 'vcard.last', last),
      ]),
      el('div', { class: 'grid-2' }, [
        field('vcard-org', 'vcard.org', org),
        field('vcard-title', 'vcard.title', title),
      ]),
      el('div', { class: 'grid-2' }, [
        field('vcard-phone', 'vcard.phone', vphone),
        field('vcard-email', 'vcard.email', vemail),
      ]),
      field('vcard-url', 'vcard.url', url),
      field('vcard-street', 'vcard.street', street),
      el('div', { class: 'grid-2' }, [
        field('vcard-city', 'vcard.city', city),
        field('vcard-region', 'vcard.region', region),
      ]),
      el('div', { class: 'grid-2' }, [
        field('vcard-postal', 'vcard.postal', postal),
        field('vcard-country', 'vcard.country', country),
      ]),
      field('vcard-note', 'vcard.note', note),
    ]),
  );

  const latitude = line('geo-lat', 'text');
  const longitude = line('geo-lng', 'text');
  const label = line('geo-label', 'text');
  panels.set(
    'geo',
    panel('geo', [
      el('div', { class: 'grid-2' }, [field('geo-lat', 'geo.lat', latitude), field('geo-lng', 'geo.lng', longitude)]),
      field('geo-label', 'geo.label', label),
      el('p', { class: 'hint', 'data-i18n': 'geo.hint' }),
    ]),
  );

  const issue = el('p', { class: 'issue', hidden: '' });
  const ecc = el('select', { id: 'ecc' }) as HTMLSelectElement;
  for (const level of ECC_LEVELS) {
    ecc.append(el('option', { value: level, 'data-i18n': `ecc.${level}` }));
  }
  ecc.value = draft.ecc;
  const eccHint = el('p', { class: 'hint', 'data-i18n': 'ecc.hint' });
  const scale = range('size-range', '4', '12', String(draft.scale));
  const scaleValue = el('span');
  const margin = range('margin-range', '0', '8', String(draft.margin));
  const marginValue = el('span');
  const fgPicker = colorInput('fg-picker', draft.foreground);
  const fgHex = hexInput('fg-hex', draft.foreground);
  const bgPicker = colorInput('bg-picker', draft.background);
  const bgHex = hexInput('bg-hex', draft.background);
  const contrast = el('p', { id: 'contrast' });
  const contrastWarn = el('p', { class: 'warn', hidden: '', 'data-i18n': 'color.warn' });
  const colorIssue = el('p', { class: 'issue', hidden: '' });
  const reset = el('button', { type: 'button', class: 'button button-secondary', 'data-i18n': 'color.reset' });
  const logoInput = el('input', {
    type: 'file',
    id: 'logo-file',
    accept: 'image/png,image/jpeg,image/webp,image/gif',
  });
  const logoName = el('span', { class: 'filename' });
  const removeLogo = el('button', { type: 'button', class: 'button button-secondary', hidden: '', 'data-i18n': 'logo.remove' });
  const logoIssue = el('p', { class: 'issue', hidden: '' });

  const settings = el('section', { class: 'settings' }, [
    el('h2', { 'data-i18n': 'settings.title' }),
    field('ecc', 'ecc.label', ecc),
    eccHint,
    el('div', { class: 'field' }, [
      el('div', { class: 'range-label' }, [el('label', { for: 'size-range', 'data-i18n': 'size.label' }), scaleValue]),
      scale,
    ]),
    el('div', { class: 'field' }, [
      el('div', { class: 'range-label' }, [el('label', { for: 'margin-range', 'data-i18n': 'margin.label' }), marginValue]),
      margin,
      el('p', { class: 'hint', 'data-i18n': 'margin.hint' }),
    ]),
    el('div', { class: 'grid-2' }, [
      el('div', { class: 'field' }, [
        el('label', { for: 'fg-hex', 'data-i18n': 'color.foreground' }),
        el('div', { class: 'color-row' }, [fgPicker, fgHex]),
      ]),
      el('div', { class: 'field' }, [
        el('label', { for: 'bg-hex', 'data-i18n': 'color.background' }),
        el('div', { class: 'color-row' }, [bgPicker, bgHex]),
      ]),
    ]),
    contrast,
    contrastWarn,
    colorIssue,
    reset,
    el('div', { class: 'field' }, [
      el('label', { for: 'logo-file', class: 'legend', 'data-i18n': 'logo.label' }),
      el('div', { class: 'file' }, [logoInput, logoName, removeLogo]),
      el('p', { class: 'hint', 'data-i18n': 'logo.hint' }),
      logoIssue,
    ]),
  ]);

  const composer = el('div', { class: 'composer stack' });
  for (const mode of CREATE_MODES) {
    const node = panels.get(mode);
    if (node) composer.append(node);
  }
  composer.append(issue, settings);

  const plateMessage = el('p');
  const canvas = el('canvas', { hidden: '' });
  canvas.setAttribute('role', 'img');
  const plate = el('div', { class: 'plate' }, [plateMessage, canvas]);
  const meta = el('p', { class: 'meta', hidden: '' });
  const png = el('button', { type: 'button', class: 'button button-primary', 'data-i18n': 'action.png', 'data-i18n-aria': 'action.pngLabel' });
  const svg = el('button', { type: 'button', class: 'button button-secondary', 'data-i18n': 'action.svg', 'data-i18n-aria': 'action.svgLabel' });
  const copy = el('button', { type: 'button', class: 'button button-secondary', 'data-i18n': 'action.copy', 'data-i18n-aria': 'action.copyLabel' });
  const preview = el('section', { class: 'preview card' }, [
    el('h2', { 'data-i18n': 'preview.title' }),
    plate,
    meta,
    el('div', { class: 'actions' }, [png, svg, copy]),
  ]);

  root.append(composer, preview);

  let mode: CreateMode = 'text';
  let payload = '';
  let matrix: boolean[][] | null = null;
  let generation = 0;
  let lastCategory = '';
  let fgInvalid = false;
  let bgInvalid = false;

  const inputs: Array<[HTMLInputElement | HTMLTextAreaElement, (value: string) => void]> = [
    [textInput, (value) => (draft.text = value)],
    [ssid, (value) => (draft.ssid = value)],
    [password, (value) => (draft.password = value)],
    [email, (value) => (draft.email = value)],
    [subject, (value) => (draft.subject = value)],
    [body, (value) => (draft.body = value)],
    [phone, (value) => (draft.phone = value)],
    [sms, (value) => (draft.sms = value)],
    [first, (value) => (draft.first = value)],
    [last, (value) => (draft.last = value)],
    [org, (value) => (draft.org = value)],
    [title, (value) => (draft.title = value)],
    [vphone, (value) => (draft.vphone = value)],
    [vemail, (value) => (draft.vemail = value)],
    [url, (value) => (draft.url = value)],
    [street, (value) => (draft.street = value)],
    [city, (value) => (draft.city = value)],
    [region, (value) => (draft.region = value)],
    [postal, (value) => (draft.postal = value)],
    [country, (value) => (draft.country = value)],
    [note, (value) => (draft.note = value)],
    [latitude, (value) => (draft.latitude = value)],
    [longitude, (value) => (draft.longitude = value)],
    [label, (value) => (draft.label = value)],
  ];
  for (const [node, write] of inputs) {
    node.addEventListener('input', () => {
      write(node.value);
      void refresh();
    });
  }
  security.addEventListener('change', () => {
    draft.security = security.value as WifiSecurity;
    void refresh();
  });
  hidden.addEventListener('change', () => {
    draft.hidden = hidden.checked;
    void refresh();
  });
  showPassword.addEventListener('click', () => {
    draft.showPassword = !draft.showPassword;
    sync();
  });
  phoneKind.addEventListener('change', () => {
    draft.phoneKind = phoneKind.value as PhoneKind;
    void refresh();
  });
  ecc.addEventListener('change', () => {
    draft.ecc = ecc.value as EccLevel;
    draft.eccBeforeLogo = draft.ecc;
    void refresh();
  });
  scale.addEventListener('input', () => {
    draft.scale = Number(scale.value);
    void refresh();
  });
  margin.addEventListener('input', () => {
    draft.margin = Number(margin.value);
    void refresh();
  });
  fgPicker.addEventListener('input', () => applyColor('fg', fgPicker.value));
  bgPicker.addEventListener('input', () => applyColor('bg', bgPicker.value));
  fgHex.addEventListener('input', () => applyColor('fg', fgHex.value));
  bgHex.addEventListener('input', () => applyColor('bg', bgHex.value));
  fgHex.addEventListener('blur', () => {
    const hex = normalizeHex(fgHex.value);
    if (hex) fgHex.value = hex;
  });
  bgHex.addEventListener('blur', () => {
    const hex = normalizeHex(bgHex.value);
    if (hex) bgHex.value = hex;
  });
  reset.addEventListener('click', () => {
    draft.foreground = DEFAULT_FOREGROUND;
    draft.background = DEFAULT_BACKGROUND;
    fgInvalid = false;
    bgInvalid = false;
    fgPicker.value = DEFAULT_FOREGROUND;
    bgPicker.value = DEFAULT_BACKGROUND;
    fgHex.value = DEFAULT_FOREGROUND;
    bgHex.value = DEFAULT_BACKGROUND;
    void refresh();
  });
  logoInput.addEventListener('change', () => {
    const file = logoInput.files?.[0];
    logoInput.value = '';
    if (file) void addLogo(file);
  });
  removeLogo.addEventListener('click', () => {
    draft.logo = null;
    draft.logoName = '';
    draft.ecc = draft.eccBeforeLogo;
    ecc.value = draft.ecc;
    showText(logoIssue, '');
    void refresh();
  });
  png.addEventListener('click', () => download('png'));
  svg.addEventListener('click', () => download('svg'));
  copy.addEventListener('click', () => {
    void copyImage();
  });

  function show(next: CreateMode): void {
    mode = next;
    for (const [name, node] of panels) node.hidden = name !== next;
    void refresh();
  }

  function sync(): void {
    const lang = getLang();
    const hasLogo = Boolean(draft.logo);
    const eccLevel = resolveEcc(draft.ecc, hasLogo);
    const pixels = matrix ? pixelSize(matrix.length, draft.margin, draft.scale) : 0;
    const ratio = contrastRatio(draft.foreground, draft.background);
    const ratioText = ratio >= 10 ? ratio.toFixed(1) : ratio.toFixed(2);
    scaleValue.textContent = t(lang, 'size.value', { pixels: pixels || '—' });
    scale.setAttribute('aria-valuetext', scaleValue.textContent);
    marginValue.textContent = t(lang, 'margin.value', { count: draft.margin });
    margin.setAttribute('aria-valuetext', marginValue.textContent);
    contrast.textContent = t(lang, 'color.contrast', { ratio: ratioText });
    contrastWarn.hidden = ratio >= MIN_CONTRAST;
    ecc.disabled = hasLogo;
    ecc.value = eccLevel;
    eccHint.dataset.i18n = hasLogo ? 'ecc.logo' : 'ecc.hint';
    eccHint.textContent = t(lang, hasLogo ? 'ecc.logo' : 'ecc.hint');
    password.type = draft.showPassword ? 'text' : 'password';
    password.disabled = draft.security === 'nopass';
    showPassword.dataset.i18n = draft.showPassword ? 'wifi.hide' : 'wifi.show';
    showPassword.dataset.i18nAria = draft.showPassword ? 'wifi.hideLabel' : 'wifi.showLabel';
    showPassword.textContent = t(lang, draft.showPassword ? 'wifi.hide' : 'wifi.show');
    showPassword.setAttribute('aria-label', t(lang, draft.showPassword ? 'wifi.hideLabel' : 'wifi.showLabel'));
    smsField.hidden = draft.phoneKind !== 'sms';
    logoName.textContent = draft.logoName;
    logoName.hidden = !draft.logoName;
    removeLogo.hidden = !draft.logo;
    plate.style.backgroundColor = draft.background;
    const kind = t(lang, `tab.${mode}`);
    canvas.setAttribute('aria-label', t(lang, 'preview.label', { kind }));
    fgPicker.setAttribute('aria-label', t(lang, 'color.foreground'));
    bgPicker.setAttribute('aria-label', t(lang, 'color.background'));
  }

  function applyColor(which: 'fg' | 'bg', value: string): void {
    const hex = normalizeHex(value);
    if (which === 'fg') {
      fgInvalid = !hex;
      if (hex) {
        draft.foreground = hex;
        fgPicker.value = hex;
        if (document.activeElement !== fgHex) fgHex.value = hex;
        else if (value.trim().toLowerCase() === hex) fgHex.value = hex;
      }
    } else {
      bgInvalid = !hex;
      if (hex) {
        draft.background = hex;
        bgPicker.value = hex;
        if (document.activeElement !== bgHex) bgHex.value = hex;
      }
    }
    void refresh();
  }

  async function addLogo(file: File): Promise<void> {
    try {
      const data = await readLogo(file);
      if (!draft.logo) draft.eccBeforeLogo = draft.ecc;
      draft.logo = data;
      draft.logoName = file.name;
      showText(logoIssue, '');
      await refresh();
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      const key = code === 'tooBig' ? 'logo.tooBig' : 'logo.unreadable';
      const message = t(getLang(), key);
      showText(logoIssue, message);
      announce(message);
    }
  }

  function content(): ContentInput {
    if (mode === 'text') return { mode, text: draft.text };
    if (mode === 'wifi') {
      return { mode, ssid: draft.ssid, password: draft.password, security: draft.security, hidden: draft.hidden };
    }
    if (mode === 'email') return { mode, address: draft.email, subject: draft.subject, body: draft.body };
    if (mode === 'phone') return { mode, number: draft.phone, kind: draft.phoneKind, message: draft.sms };
    if (mode === 'geo') return { mode, latitude: draft.latitude, longitude: draft.longitude, label: draft.label };
    return {
      mode: 'vcard',
      contact: {
        first: draft.first,
        last: draft.last,
        org: draft.org,
        title: draft.title,
        phone: draft.vphone,
        email: draft.vemail,
        url: draft.url,
        street: draft.street,
        city: draft.city,
        region: draft.region,
        postal: draft.postal,
        country: draft.country,
        note: draft.note,
      },
    };
  }

  async function refresh(): Promise<void> {
    const id = ++generation;
    const lang = getLang();
    const encoded = encodeContent(content());
    let category = 'ready';
    let message = '';
    payload = '';
    matrix = null;
    if (!encoded.ok) {
      category = encoded.issue === 'empty' ? 'empty' : 'invalid';
      message = t(lang, encoded.issue === 'empty' ? 'preview.empty' : `error.${encoded.issue}`);
    } else {
      try {
        matrix = encodeMatrix(encoded.text, resolveEcc(draft.ecc, Boolean(draft.logo)));
        payload = encoded.text;
        if (fgInvalid || bgInvalid) {
          category = 'color';
          message = t(lang, 'color.invalid');
        } else {
          message = t(lang, 'preview.ready');
        }
      } catch (error) {
        category = error instanceof QrEncodeError ? 'capacity' : 'unexpected';
        message = t(lang, category === 'capacity' ? 'error.capacity' : 'error.unexpected');
      }
    }
    if (id !== generation) return;
    showText(issue, category === 'ready' || category === 'color' ? '' : message);
    showText(colorIssue, category === 'color' ? message : '');
    plateMessage.textContent = matrix ? '' : message;
    plateMessage.hidden = Boolean(matrix);
    canvas.hidden = !matrix;
    const ready = Boolean(matrix);
    png.disabled = !ready;
    svg.disabled = !ready;
    copy.disabled = !ready;
    if (matrix) {
      const pixels = pixelSize(matrix.length, draft.margin, draft.scale);
      meta.hidden = false;
      meta.textContent = t(lang, 'preview.meta', {
        pixels,
        ecc: ECC_LETTER[resolveEcc(draft.ecc, Boolean(draft.logo))],
        margin: draft.margin,
      });
      const options = {
        margin: draft.margin,
        scale: draft.scale,
        foreground: draft.foreground,
        background: draft.background,
        logo: draft.logo,
        title: t(lang, `tab.${mode}`),
      };
      try {
        await drawQr(canvas, matrix, options);
      } catch {
        if (id !== generation) return;
        category = 'unexpected';
        message = t(lang, 'error.unexpected');
        showText(issue, message);
      }
    } else {
      meta.hidden = true;
      meta.textContent = '';
    }
    sync();
    if (id !== generation) return;
    if (category !== lastCategory) {
      lastCategory = category;
      announce(message);
    }
  }

  function renderOptions() {
    return {
      margin: draft.margin,
      scale: draft.scale,
      foreground: draft.foreground,
      background: draft.background,
      logo: draft.logo,
      title: t(getLang(), `tab.${mode}`),
    };
  }

  function download(kind: 'png' | 'svg'): void {
    if (!matrix) return;
    const filename = `qr-${mode}.${kind}`;
    if (kind === 'svg') {
      downloadBlob(new Blob([renderSvg(matrix, renderOptions())], { type: 'image/svg+xml' }), filename);
      announce(t(getLang(), 'action.downloaded'));
      return;
    }
    canvas.toBlob((blob) => {
      if (!blob) return;
      downloadBlob(blob, filename);
      announce(t(getLang(), 'action.downloaded'));
    }, 'image/png');
  }

  async function copyImage(): Promise<void> {
    const lang = getLang();
    if (!matrix) return;
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob || typeof ClipboardItem === 'undefined') throw new Error('clipboard');
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      announce(t(lang, 'action.copied'));
    } catch {
      const ok = payload ? await copyText(payload) : false;
      announce(t(lang, ok ? 'action.copiedText' : 'action.copyFailed'));
    }
  }

  smsField.hidden = true;
  return { show, sync };
}

function panel(mode: CreateMode, children: HTMLElement[]): HTMLElement {
  return el('section', { 'data-panel': mode, hidden: mode === 'text' ? undefined : '' }, [
    el('p', { class: 'lead', 'data-i18n': `${mode}.lead` }),
    ...children,
  ]);
}

function line(id: string, type: string, autocomplete?: string): HTMLInputElement {
  return el('input', {
    id,
    type,
    autocomplete: autocomplete ?? 'off',
    spellcheck: 'false',
  }) as HTMLInputElement;
}

function area(id: string, placeholderKey?: string): HTMLTextAreaElement {
  return el('textarea', {
    id,
    rows: '4',
    autocomplete: 'off',
    'data-i18n-placeholder': placeholderKey,
  }) as HTMLTextAreaElement;
}

function select<T extends string>(id: string, values: readonly T[], key: (value: T) => string): HTMLSelectElement {
  const node = el('select', { id }) as HTMLSelectElement;
  for (const value of values) node.append(el('option', { value, 'data-i18n': key(value) }));
  return node;
}

function range(id: string, min: string, max: string, value: string): HTMLInputElement {
  return el('input', { id, type: 'range', min, max, step: '1', value }) as HTMLInputElement;
}

function colorInput(id: string, value: string): HTMLInputElement {
  return el('input', { id, type: 'color', value }) as HTMLInputElement;
}

function hexInput(id: string, value: string): HTMLInputElement {
  return el('input', {
    id,
    type: 'text',
    class: 'mono',
    value,
    maxlength: '7',
    spellcheck: 'false',
    autocapitalize: 'off',
    autocomplete: 'off',
  }) as HTMLInputElement;
}
