import { create } from 'qrcode';
import type { Ecc, QrMode } from './types.ts';

/**
 * Version 40 character capacities from ISO/IEC 18004, confirmed against `qrcode`.
 * Byte counts are UTF-8 octets. Segmented encoding can pack some mixed strings
 * past the single byte-mode budget; that case is checked with the library.
 */
const CAPACITY: Record<QrMode, Record<Ecc, number>> = {
  numeric: { L: 7089, M: 5596, Q: 3993, H: 3057 },
  alphanumeric: { L: 4296, M: 3391, Q: 2420, H: 1852 },
  byte: { L: 2953, M: 2331, Q: 1663, H: 1273 },
};

export interface CapacityReport {
  mode: QrMode;
  unit: 'bytes' | 'chars';
  used: number;
  capacity: number;
  remaining: number;
  fits: boolean;
}

export function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

export function detectMode(payload: string): QrMode {
  if (payload.length === 0) return 'byte';
  if (/^[0-9]+$/.test(payload)) return 'numeric';
  if (/^[0-9A-Z $%*+./:-]+$/.test(payload)) return 'alphanumeric';
  return 'byte';
}

export function effectiveEcc(ecc: Ecc, hasLogo: boolean): Ecc {
  return hasLogo ? 'H' : ecc;
}

function capacityFor(mode: QrMode, ecc: Ecc): number {
  const value = CAPACITY[mode][ecc];
  if (value === undefined) throw new Error(`Missing capacity for ${mode} ${ecc}`);
  return value;
}

function libraryFits(payload: string, ecc: Ecc): boolean {
  if (payload.length === 0) return false;
  try {
    create(payload, { errorCorrectionLevel: ecc });
    return true;
  } catch {
    return false;
  }
}

function overflowBytes(payload: string, ecc: Ecc): number {
  let low = 0;
  let high = payload.length;
  while (low + 1 < high) {
    const mid = Math.floor((low + high) / 2);
    const slice = payload.slice(0, mid);
    if (slice.length > 0 && libraryFits(slice, ecc)) low = mid;
    else high = mid;
  }
  return byteLength(payload.slice(low));
}

function extraAscii(payload: string, ecc: Ecc): number {
  let step = 1;
  while (libraryFits(`${payload}${'a'.repeat(step)}`, ecc)) {
    if (step >= 8000) return step;
    step *= 2;
  }
  let low = Math.floor(step / 2);
  let high = step;
  while (low + 1 < high) {
    const mid = Math.floor((low + high) / 2);
    if (libraryFits(`${payload}${'a'.repeat(mid)}`, ecc)) low = mid;
    else high = mid;
  }
  return low;
}

export function analyzeCapacity(payload: string, ecc: Ecc): CapacityReport {
  const mode = detectMode(payload);
  const unit = mode === 'byte' ? 'bytes' : 'chars';
  const used = mode === 'byte' ? byteLength(payload) : payload.length;
  const capacity = capacityFor(mode, ecc);
  const tableRemaining = capacity - used;

  if (mode !== 'byte' || tableRemaining >= 0) {
    return { mode, unit, used, capacity, remaining: tableRemaining, fits: tableRemaining >= 0 };
  }

  if (!libraryFits(payload, ecc)) {
    const over = overflowBytes(payload, ecc);
    return { mode, unit, used, capacity, remaining: -over, fits: false };
  }

  const extra = extraAscii(payload, ecc);
  return { mode, unit, used, capacity: used + extra, remaining: extra, fits: true };
}
