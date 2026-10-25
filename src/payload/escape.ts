/** Escape SSID and password for the ZXing / Android WIFI: payload. */
export function escapeWifi(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/:/g, '\\:');
}

/** Escape a vCard 3.0 value (RFC 2426). Structural separators are escaped by the caller per component. */
export function escapeVCard(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\n|\r/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

export function hasControlChars(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

/** Fold a vCard line at 75 octets. Continuation lines start with a space. */
export function foldVCardLine(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;

  const decoder = new TextDecoder();
  const parts: string[] = [];
  let offset = 0;
  let budget = 75;

  while (offset < bytes.length) {
    let end = Math.min(offset + budget, bytes.length);
    while (end > offset && (bytes[end]! & 0b1100_0000) === 0b1000_0000) {
      end -= 1;
    }
    if (end === offset) end = Math.min(offset + budget, bytes.length);
    parts.push(decoder.decode(bytes.subarray(offset, end)));
    offset = end;
    budget = 74;
  }

  return parts.map((part, index) => (index === 0 ? part : ` ${part}`)).join('\r\n');
}
