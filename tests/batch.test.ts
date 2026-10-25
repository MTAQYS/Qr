import { describe, expect, it } from 'vitest';
import { batchFilename, planBatch } from '../src/payload/batch.ts';
import { LIMITS } from '../src/payload/limits.ts';

describe('batch URLs', () => {
  it('skips blank lines and names files from the host', () => {
    const plan = planBatch(' \nhttps://example.com/a\n\nhttps://cdn.example.org/b\n', 'M');
    expect(plan.overLimit).toBe(false);
    expect(plan.issues).toEqual([]);
    expect(plan.items.map((item) => item.filename)).toEqual(['001-example.com.png', '002-cdn.example.org.png']);
    expect(plan.items[0]?.line).toBe(2);
  });

  it('reports invalid protocols and keeps the valid rows', () => {
    const plan = planBatch('https://ok.example\njavascript:alert(1)\nnotaurl\nftp://files.example', 'M');
    expect(plan.items).toHaveLength(1);
    expect(plan.issues.map((entry) => entry.messageKey)).toEqual([
      'error.url.protocol',
      'error.url.format',
      'error.url.protocol',
    ]);
  });

  it('rejects a list above the batch cap', () => {
    const lines = Array.from({ length: LIMITS.batchMax + 1 }, (_, index) => `https://example.com/${index}`).join('\n');
    expect(planBatch(lines, 'M')).toEqual({ items: [], issues: [], overLimit: true });
  });

  it('flags a URL that does not fit the chosen level', () => {
    const plan = planBatch(`https://example.com/${'a'.repeat(2000)}`, 'H');
    expect(plan.items).toEqual([]);
    expect(plan.issues[0]?.messageKey).toBe('error.capacity');
  });

  it('sanitizes odd hostnames', () => {
    expect(batchFilename('https://example.com', 0)).toBe('001-example.com.png');
    expect(batchFilename('not a url', 4)).toBe('005-lien.png');
  });
});
