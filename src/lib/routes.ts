export const CREATE_MODES = ['text', 'wifi', 'email', 'phone', 'vcard', 'geo'] as const;
export const MODES = [...CREATE_MODES, 'scan'] as const;

export type CreateMode = (typeof CREATE_MODES)[number];
export type Mode = (typeof MODES)[number];

export function isMode(value: string): value is Mode {
  return (MODES as readonly string[]).includes(value);
}

export function parseMode(hash: string): Mode {
  const value = hash.replace(/^#\/?/, '').split(/[?&]/)[0] ?? '';
  return isMode(value) ? value : 'text';
}
