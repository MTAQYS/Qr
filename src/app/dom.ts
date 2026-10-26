type Attrs = Record<string, string | undefined>;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined) continue;
    if (key === 'class') node.className = value;
    else node.setAttribute(key, value);
  }
  for (const child of children) node.append(child);
  return node;
}

export function field(id: string, labelKey: string, control: HTMLElement, hintKey?: string): HTMLElement {
  control.id = id;
  const label = el('label', { for: id, 'data-i18n': labelKey });
  const wrap = el('div', { class: 'field' }, [label, control]);
  if (hintKey) {
    const hint = el('p', { class: 'hint', id: `${id}-hint`, 'data-i18n': hintKey });
    const described = control.getAttribute('aria-describedby');
    control.setAttribute('aria-describedby', described ? `${described} ${id}-hint` : `${id}-hint`);
    wrap.append(hint);
  }
  return wrap;
}

export function showText(node: HTMLElement, text: string): void {
  node.textContent = text;
  node.hidden = text === '';
}
