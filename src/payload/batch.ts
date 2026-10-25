import { buildUrl } from './build.ts';
import { analyzeCapacity } from './capacity.ts';
import { LIMITS } from './limits.ts';
import type { Ecc } from './types.ts';
import { urlIssue, type ValidationIssue } from './validate.ts';

export interface BatchItem {
  line: number;
  url: string;
  filename: string;
}

export interface BatchIssue {
  line: number;
  messageKey: ValidationIssue['messageKey'];
  vars?: ValidationIssue['vars'];
}

export interface BatchPlan {
  items: BatchItem[];
  issues: BatchIssue[];
  overLimit: boolean;
}

export function batchFilename(url: string, index: number): string {
  let host = 'lien';
  try {
    const hostname = new URL(url).hostname.replace(/[^a-zA-Z0-9.-]/g, '');
    if (hostname) host = hostname;
  } catch {
    host = 'lien';
  }
  return `${String(index + 1).padStart(3, '0')}-${host}.png`;
}

export function planBatch(text: string, ecc: Ecc): BatchPlan {
  const nonEmpty: { line: number; value: string }[] = [];
  text.split(/\r?\n/).forEach((raw, index) => {
    const value = raw.trim();
    if (value) nonEmpty.push({ line: index + 1, value });
  });

  if (nonEmpty.length > LIMITS.batchMax) {
    return { items: [], issues: [], overLimit: true };
  }

  const items: BatchItem[] = [];
  const issues: BatchIssue[] = [];

  for (const entry of nonEmpty) {
    const problem = urlIssue(entry.value);
    if (problem && problem.messageKey !== 'error.required') {
      issues.push({ line: entry.line, messageKey: problem.messageKey, vars: problem.vars });
      continue;
    }
    const payload = buildUrl(entry.value);
    const capacity = analyzeCapacity(payload, ecc);
    if (!capacity.fits) {
      issues.push({ line: entry.line, messageKey: 'error.capacity', vars: { level: ecc } });
      continue;
    }
    items.push({ line: entry.line, url: payload, filename: batchFilename(payload, items.length) });
  }

  return { items, issues, overLimit: false };
}
