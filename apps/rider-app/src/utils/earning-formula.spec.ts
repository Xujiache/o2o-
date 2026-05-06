import { describe, expect, it } from 'vitest';

import { fmtCents, fmtPercent } from './earning-formula';

describe('earning-formula utils', () => {
  it('fmtCents', () => {
    expect(fmtCents('5000')).toBe('50.00');
    expect(fmtCents(123)).toBe('1.23');
  });

  it('fmtPercent', () => {
    expect(fmtPercent('0.95')).toBe('95.00%');
    expect(fmtPercent(0.5)).toBe('50.00%');
  });
});
