import '@fontsource/source-sans-3/latin-400.css';
import '@fontsource/source-sans-3/latin-600.css';
import '@fontsource/source-serif-4/latin-600.css';
import './styles.css';

import { previewAlt } from './describe.ts';
import { MIN_CONTRAST, contrastRatio, normalizeHex } from './contrast.ts';
import { t, type Lang, type MessageKey } from './i18n.ts';
import { isLogoFile } from './logo.ts';
import { planBatch } from './payload/batch.ts';
import { LIMITS } from './payload/limits.ts';
import type { Ecc } from './payload/types.ts';
import {
  contentEcc,
  validateContent,
  validateSettings,
  type ValidationIssue,
} from './payload/validate.ts';
import { browserStorage, loadLang, loadTheme, saveLang, saveTheme } from './preferences.ts';
import { canvasToBlob, renderCanvas, renderPreviewUrl, renderSvg, type RenderStyle } from './render/qr.ts';
import { copyCanvas, downloadBlob, zipQrCodes } from './render/download.ts';
import { byId, fieldValue, setText } from './ui/dom.ts';
import { readForm, readSettings } from './ui/read-form.ts';
import { applyTranslations } from './ui/translate-dom.ts';

let lang: Lang = 'fr';
let logo: HTMLImageElement | null = null;
let logoUrl: string | null = null;
let savedEcc: string | null = null;
let logoIssue: ValidationIssue | null = null;
let batchBusy = false;
let previewToken = 0;
let refreshTimer = 0;
let shownPayload = '';

function formatNumber(value: number): string {
  return new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-US').format(value);
}

function currentTheme(): 'light' | 'dark' {
  const chosen = document.documentElement.dataset.theme;
  if (chosen === 'light' || chosen === 'dark') return chosen;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function updateThemeButton(): void {
  const name = t(lang, currentTheme() === 'dark' ? 'theme.dark' : 'theme.light');
  const button = byId<HTMLButtonElement>('theme');
  button.textContent = name;
  button.setAttribute('aria-label', t(lang, 'theme.label', { theme: name.toLocaleLowerCase(lang) }));
}

function updateLangButtons(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach((button) => {
    button.setAttribute('aria-pressed', button.dataset.lang === lang ? 'true' : 'false');
  });
}

interface Gathered {
  ecc: Ecc;
  content: ReturnType<typeof validateContent>;
  settingIssues: ValidationIssue[];
  previewStyle: RenderStyle | null;
  exportStyle: RenderStyle | null;
}

function gather(): Gathered {
  const form = readForm();
  const settings = readSettings(logo !== null);
  const settingIssues = validateSettings(settings);
  const ecc = contentEcc(settings);
  const content = validateContent(form, ecc);
  const fg = normalizeHex(settings.fg);
  const bg = normalizeHex(settings.bg);
  const colorsReady = Boolean(fg && bg);
  const previewBlocked = settingIssues.some((entry) => entry.field !== 'size');
  const base = colorsReady && fg && bg
    ? { ecc, margin: settings.margin, size: settings.size, fg, bg, logo }
    : null;
  return {
    ecc,
    content,
    settingIssues,
    previewStyle: base && !previewBlocked ? base : null,
    exportStyle: base && settingIssues.length === 0 ? base : null,
  };
}

function showIssues(issues: ValidationIssue[]): void {
  const first = new Map<string, ValidationIssue>();
  for (const entry of issues) {
    if (!first.has(entry.field)) first.set(entry.field, entry);
  }
  document.querySelectorAll<HTMLElement>('[data-error-for]').forEach((element) => {
    const field = element.dataset.errorFor;
    if (!field) return;
    const entry = first.get(field);
    setText(element, entry ? t(lang, entry.messageKey, entry.vars) : '');
  });
  document.querySelectorAll<HTMLElement>('input, textarea, select').forEach((element) => {
    if (!element.id) return;
    element.setAttribute('aria-invalid', first.has(element.id) ? 'true' : 'false');
  });
}

function focusIssue(issues: ValidationIssue[]): void {
  for (const entry of issues) {
    const element = document.getElementById(entry.field);
    if (element instanceof HTMLElement && !element.hasAttribute('disabled')) {
      element.focus();
      return;
    }
  }
}

function updateCapacity(report: Gathered['content']['capacity']): void {
  const key: MessageKey =
    report.remaining < 0
      ? report.unit === 'bytes'
        ? 'capacity.overBytes'
        : 'capacity.overChars'
      : report.unit === 'bytes'
        ? 'capacity.bytes'
        : 'capacity.chars';
  setText(
    byId('capacity'),
    t(lang, key, {
      remaining: formatNumber(Math.max(0, report.remaining)),
      capacity: formatNumber(report.capacity),
      over: formatNumber(Math.abs(report.remaining)),
    }),
  );
  const bar = byId('meter-bar');
  const ratio = report.capacity <= 0 ? 1 : Math.min(1, Math.max(0, report.used / report.capacity));
  bar.style.width = `${Math.round(ratio * 1000) / 10}%`;
  bar.dataset.state = report.remaining < 0 ? 'over' : 'ok';
}

function updateContrast(fg: string, bg: string): void {
  const target = byId('contrast');
  const foreground = normalizeHex(fg);
  const background = normalizeHex(bg);
  if (!foreground || !background) {
    setText(target, '');
    return;
  }
  const ratio = contrastRatio(foreground, background);
  if (ratio !== null && ratio < MIN_CONTRAST) {
    setText(target, t(lang, 'contrast.low', { ratio: ratio.toFixed(1) }));
  } else {
    setText(target, '');
  }
}

function updateBatch(data: Gathered): void {
  const text = fieldValue('batch-input');
  const plan = planBatch(text, data.ecc);
  const summary = byId('batch-summary');
  if (text.trim() === '') setText(summary, '');
  else if (plan.overLimit) setText(summary, t(lang, 'error.batch.limit', { max: LIMITS.batchMax }));
  else {
    setText(summary, t(lang, 'batch.summary', { valid: plan.items.length, invalid: plan.issues.length }));
  }

  const list = byId<HTMLUListElement>('batch-errors');
  list.replaceChildren();
  if (!plan.overLimit) {
    for (const entry of plan.issues.slice(0, 8)) {
      const item = document.createElement('li');
      item.textContent = t(lang, 'batch.line', {
        line: entry.line,
        detail: t(lang, entry.messageKey, entry.vars),
      });
      list.append(item);
    }
    if (plan.issues.length > 8) {
      const item = document.createElement('li');
      item.textContent = t(lang, 'batch.more', { count: plan.issues.length - 8 });
      list.append(item);
    }
  }

  byId<HTMLButtonElement>('batch-download').disabled =
    batchBusy || data.exportStyle === null || plan.overLimit || plan.items.length === 0;
}

function clearPreview(): void {
  shownPayload = '';
  const image = byId<HTMLImageElement>('preview');
  image.hidden = true;
  image.removeAttribute('src');
  image.alt = '';
  byId('preview-empty').hidden = false;
}

async function refresh(): Promise<void> {
  const token = ++previewToken;
  const data = gather();
  const issues = [...data.content.issues, ...data.settingIssues];
  if (logoIssue) issues.push(logoIssue);
  showIssues(issues);
  updateCapacity(data.content.capacity);
  updateContrast(fieldValue('fg-hex'), fieldValue('bg-hex'));
  updateBatch(data);

  const canExport = data.content.ok && data.exportStyle !== null;
  byId<HTMLButtonElement>('export-png').disabled = !canExport;
  byId<HTMLButtonElement>('export-svg').disabled = !canExport;
  byId<HTMLButtonElement>('export-copy').disabled = !canExport;

  const payload = data.content.ok ? data.content.payload : null;
  if (!payload) {
    clearPreview();
    return;
  }
  if (!data.previewStyle) {
    if (shownPayload !== payload) clearPreview();
    return;
  }

  try {
    const url = await renderPreviewUrl(payload, data.previewStyle);
    if (token !== previewToken) return;
    const image = byId<HTMLImageElement>('preview');
    image.alt = previewAlt(lang, readForm());
    image.src = url;
    image.hidden = false;
    byId('preview-empty').hidden = true;
    shownPayload = payload;
  } catch {
    if (token !== previewToken) return;
    clearPreview();
    setText(byId('form-error'), t(lang, 'error.capacity', { level: data.ecc }));
  }
}

function schedule(): void {
  window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => {
    void refresh();
  }, 60);
}

function syncColor(target: EventTarget | null): void {
  if (!(target instanceof HTMLInputElement)) return;
  if (target.type === 'color') {
    const hex = document.getElementById(`${target.id}-hex`);
    if (hex instanceof HTMLInputElement) hex.value = target.value;
    return;
  }
  if (target.id === 'fg-hex' || target.id === 'bg-hex') {
    const hex = normalizeHex(target.value);
    const picker = document.getElementById(target.id.replace('-hex', ''));
    if (hex && picker instanceof HTMLInputElement) picker.value = hex;
  }
}

function releaseLogo(): void {
  if (logoUrl) URL.revokeObjectURL(logoUrl);
  logo = null;
  logoUrl = null;
  setText(byId('logo-name'), '');
  byId('logo-clear').hidden = true;
  const select = byId<HTMLSelectElement>('ecc');
  if (select.disabled) {
    select.disabled = false;
    if (savedEcc) select.value = savedEcc;
    savedEcc = null;
  }
  byId('ecc-note').hidden = true;
}

function clearLogo(): void {
  releaseLogo();
  logoIssue = null;
  byId<HTMLInputElement>('logo').value = '';
  void refresh();
}

function applyLogoEcc(): void {
  const select = byId<HTMLSelectElement>('ecc');
  if (savedEcc === null) savedEcc = select.value;
  select.value = 'H';
  select.disabled = true;
  byId('ecc-note').hidden = false;
}

function decodeImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      if (image.naturalWidth < 1 || image.naturalHeight < 1) reject(new Error('size'));
      else resolve(image);
    };
    image.onerror = () => reject(new Error('load'));
    image.src = url;
  });
}

async function onLogo(file: File | undefined): Promise<void> {
  if (!file) {
    clearLogo();
    return;
  }
  if (!isLogoFile(file)) {
    releaseLogo();
    logoIssue = { field: 'logo', messageKey: 'error.logo.type' };
    byId<HTMLInputElement>('logo').value = '';
    void refresh();
    return;
  }
  if (file.size > LIMITS.logoBytes) {
    releaseLogo();
    logoIssue = { field: 'logo', messageKey: 'error.logo.size', vars: { max: LIMITS.logoMegabytes } };
    byId<HTMLInputElement>('logo').value = '';
    void refresh();
    return;
  }

  const url = URL.createObjectURL(file);
  try {
    const image = await decodeImage(url);
    if (logoUrl) URL.revokeObjectURL(logoUrl);
    logo = image;
    logoUrl = url;
    logoIssue = null;
    setText(byId('logo-name'), file.name);
    byId('logo-clear').hidden = false;
    applyLogoEcc();
    void refresh();
  } catch {
    URL.revokeObjectURL(url);
    releaseLogo();
    logoIssue = { field: 'logo', messageKey: 'error.logo.read' };
    byId<HTMLInputElement>('logo').value = '';
    void refresh();
  }
}

function requireExport(): Gathered | null {
  const data = gather();
  if (!data.content.ok || !data.content.payload || !data.exportStyle) {
    setText(byId('export-status'), t(lang, 'export.needContent'));
    focusIssue([...data.content.issues, ...data.settingIssues]);
    return null;
  }
  return data;
}

async function onPng(): Promise<void> {
  const data = requireExport();
  if (!data?.content.payload || !data.exportStyle) return;
  try {
    const canvas = await renderCanvas(data.content.payload, data.exportStyle);
    downloadBlob(await canvasToBlob(canvas), 'qr.png');
    setText(byId('export-status'), t(lang, 'export.saved'));
  } catch {
    setText(byId('export-status'), t(lang, 'export.fail'));
  }
}

async function onSvg(): Promise<void> {
  const data = requireExport();
  if (!data?.content.payload || !data.exportStyle) return;
  try {
    const svg = await renderSvg(data.content.payload, data.exportStyle);
    downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), 'qr.svg');
    setText(byId('export-status'), t(lang, 'export.saved'));
  } catch {
    setText(byId('export-status'), t(lang, 'export.fail'));
  }
}

async function onCopy(): Promise<void> {
  const data = requireExport();
  if (!data?.content.payload || !data.exportStyle) return;
  try {
    const canvas = await renderCanvas(data.content.payload, data.exportStyle);
    await copyCanvas(canvas);
    setText(byId('export-status'), t(lang, 'export.copied'));
  } catch {
    setText(byId('export-status'), t(lang, 'export.copyFail'));
  }
}

async function onBatch(): Promise<void> {
  const data = gather();
  const plan = planBatch(fieldValue('batch-input'), data.ecc);
  const status = byId('batch-status');
  if (!data.exportStyle || plan.overLimit || plan.items.length === 0) {
    setText(status, t(lang, plan.overLimit ? 'error.batch.limit' : 'export.needContent', { max: LIMITS.batchMax }));
    return;
  }
  batchBusy = true;
  const button = byId<HTMLButtonElement>('batch-download');
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  setText(status, t(lang, 'batch.working'));
  try {
    const zip = await zipQrCodes(plan.items, data.exportStyle);
    downloadBlob(new Blob([zip], { type: 'application/zip' }), 'qr-codes.zip');
    setText(status, t(lang, 'batch.done', { count: String(plan.items.length) }));
  } catch {
    setText(status, t(lang, 'export.fail'));
  } finally {
    batchBusy = false;
    button.removeAttribute('aria-busy');
    void refresh();
  }
}

function bindTabs(): void {
  const tabs = [...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const select = (next: HTMLButtonElement, focus: boolean): void => {
    for (const tab of tabs) {
      const selected = tab === next;
      tab.setAttribute('aria-selected', selected ? 'true' : 'false');
      tab.tabIndex = selected ? 0 : -1;
      const panelId = tab.getAttribute('aria-controls');
      const panel = panelId ? document.getElementById(panelId) : null;
      if (panel) panel.hidden = !selected;
    }
    if (focus) next.focus();
    void refresh();
  };

  for (const tab of tabs) {
    tab.addEventListener('click', () => select(tab, false));
    tab.addEventListener('keydown', (event) => {
      const index = tabs.indexOf(tab);
      const nextIndex =
        event.key === 'ArrowRight' || event.key === 'ArrowDown'
          ? (index + 1) % tabs.length
          : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
            ? (index - 1 + tabs.length) % tabs.length
            : event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? tabs.length - 1
                : -1;
      if (nextIndex < 0) return;
      event.preventDefault();
      const next = tabs[nextIndex];
      if (next) select(next, true);
    });
  }
}

function bind(): void {
  bindTabs();
  const main = byId('main');
  main.addEventListener('input', (event) => {
    syncColor(event.target);
    setText(byId('export-status'), '');
    if (event.target instanceof HTMLTextAreaElement && event.target.id === 'batch-input') {
      setText(byId('batch-status'), '');
    }
    schedule();
  });
  main.addEventListener('change', (event) => {
    if (event.target instanceof HTMLInputElement && event.target.type === 'file') return;
    schedule();
  });

  byId<HTMLInputElement>('logo').addEventListener('change', () => {
    const file = byId<HTMLInputElement>('logo').files?.[0];
    void onLogo(file);
  });
  byId('logo-clear').addEventListener('click', () => clearLogo());
  byId('export-png').addEventListener('click', () => void onPng());
  byId('export-svg').addEventListener('click', () => void onSvg());
  byId('export-copy').addEventListener('click', () => void onCopy());
  byId('batch-download').addEventListener('click', () => void onBatch());

  byId('theme').addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    saveTheme(browserStorage(), next);
    updateThemeButton();
  });

  document.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach((button) => {
    button.addEventListener('click', () => {
      const next = button.dataset.lang;
      if (next !== 'fr' && next !== 'en') return;
      lang = next;
      saveLang(browserStorage(), lang);
      applyTranslations(lang);
      updateLangButtons();
      updateThemeButton();
      void refresh();
    });
  });
}

function init(): void {
  const store = browserStorage();
  lang = loadLang(store) ?? 'fr';
  const theme = loadTheme(store);
  if (theme) document.documentElement.dataset.theme = theme;
  applyTranslations(lang);
  updateLangButtons();
  updateThemeButton();
  bind();
  void refresh();
}

init();
