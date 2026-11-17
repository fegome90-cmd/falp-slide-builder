import { describe, expect, it } from 'vitest';
import { clampSlide, slideFromHash } from '../studio/src/preview-app.js';

describe('Navigation helpers for the HTML preview', () => {
  it('clamps indexes without accepting NaN and Infinity', () => {
    expect(clampSlide(-10, 6)).toBe(0);
    expect(clampSlide(999, 6)).toBe(5);
    expect(clampSlide(Number.NaN, 6)).toBe(0);
    expect(clampSlide(Infinity, 6)).toBe(0);
    expect(clampSlide(2.9, 6)).toBe(2);
  });
  it('parses only strict numeric hashes and keeps out-of-range values bounded', () => {
    expect(slideFromHash('#0', 6)).toBe(0);
    expect(slideFromHash('#4', 6)).toBe(4);
    expect(slideFromHash('#9999', 6)).toBe(5);
    for (const hash of ['#-1', '#1abc', '#constructor', '#01', '#__proto__', '#2/1', '#']) {
      expect(slideFromHash(hash, 6)).toBe(0);
    }
  });
});
