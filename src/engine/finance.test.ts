import { describe, expect, it } from 'vitest';
import {
  allTags,
  formatINR,
  fundCrossings,
  getOverspends,
  monthTotals,
  setActual,
  setFundTag,
  setFundTarget,
  setFundValue,
  setTag,
} from './finance';
import { seedState } from './seed';

const M = '2026-11';

describe('formatINR', () => {
  it('groups Indian digits', () => {
    expect(formatINR(107000)).toBe('1,07,000');
    expect(formatINR(15000)).toBe('15,000');
    expect(formatINR(999)).toBe('999');
    expect(formatINR(10000000)).toBe('1,00,00,000');
  });
});

describe('getOverspends', () => {
  it('flags actual above budget', () => {
    let s = seedState();
    s = setActual(s, M, 'travel', 6872);
    const over = getOverspends(s, M);
    expect(over).toHaveLength(1);
    expect(over[0].categoryName).toBe('Travel');
    expect(over[0].over).toBe(2872);
  });

  it('ignores under-budget, equal, and missing actuals', () => {
    let s = seedState();
    s = setActual(s, M, 'travel', 4000); // equal
    s = setActual(s, M, 'groceries', 3000); // under
    expect(getOverspends(s, M)).toHaveLength(0);
  });

  it('ignores categories with no budget', () => {
    let s = seedState();
    s = setActual(s, M, 'tv-emi', 99999);
    expect(getOverspends(s, M)).toHaveLength(0);
  });

  it('sorts by over amount, largest first', () => {
    let s = seedState();
    s = setActual(s, M, 'travel', 5000); // over by 1000
    s = setActual(s, M, 'shopping', 8000); // over by 5000
    const over = getOverspends(s, M);
    expect(over[0].categoryName).toBe('Shopping');
    expect(over[1].categoryName).toBe('Travel');
  });
});

describe('setTag', () => {
  it('attaches tag and note to the entry, keeps the actual', () => {
    let s = seedState();
    s = setActual(s, M, 'travel', 6872);
    s = setTag(s, M, 'travel', 'Wedding', 'Cousin wedding in Jaipur');
    const over = getOverspends(s, M);
    expect(over[0].tag).toBe('Wedding');
    expect(over[0].note).toBe('Cousin wedding in Jaipur');
    expect(over[0].actual).toBe(6872);
  });

  it('does not disturb other months or categories', () => {
    let s = seedState();
    s = setActual(s, M, 'travel', 6872);
    s = setActual(s, '2026-10', 'travel', 9000);
    s = setTag(s, M, 'travel', 'Impulse');
    expect(getOverspends(s, '2026-10')[0].tag).toBeUndefined();
  });
});

describe('monthTotals', () => {
  it('sums budgets and actuals, diff null when nothing entered', () => {
    const s = seedState();
    const t = monthTotals(s, M);
    expect(t.enteredCount).toBe(0);
    expect(t.diff).toBeNull();
    expect(t.totalBudget).toBeGreaterThan(0);
  });

  it('computes over-budget diff', () => {
    let s = seedState();
    s = setActual(s, M, 'travel', 5000);
    s = setActual(s, M, 'groceries', 3000);
    const t = monthTotals(s, M);
    expect(t.totalActual).toBe(8000);
    expect(t.diff).toBe(8000 - t.totalBudget);
  });
});

describe('fund target crossings', () => {
  it('flags months at or above target', () => {
    let s = seedState();
    s = setFundTarget(s, 'ppfas', 100000);
    s = setFundValue(s, 'ppfas', '2026-09', 95000);
    s = setFundValue(s, 'ppfas', '2026-10', 100000);
    s = setFundValue(s, 'ppfas', '2026-11', 112000);
    const c = fundCrossings(s.funds[0], s.fundTags['ppfas'] ?? {});
    expect(c.map((x) => x.month)).toEqual(['2026-10', '2026-11']);
  });

  it('never flags without a target', () => {
    let s = seedState();
    s = setFundValue(s, 'ppfas', M, 99999999);
    expect(fundCrossings(s.funds[0], {})).toHaveLength(0);
  });

  it('carries tags on crossings', () => {
    let s = seedState();
    s = setFundTarget(s, 'ppfas', 100000);
    s = setFundValue(s, 'ppfas', M, 112000);
    s = setFundTag(s, 'ppfas', M, 'One-off', 'Market rally');
    const c = fundCrossings(s.funds[0], s.fundTags['ppfas'] ?? {});
    expect(c[0].tag).toBe('One-off');
    expect(c[0].note).toBe('Market rally');
  });
});

describe('allTags', () => {
  it('lists tagged overspends and crossings newest-first', () => {
    let s = seedState();
    s = setActual(s, '2026-10', 'travel', 9000);
    s = setTag(s, '2026-10', 'travel', 'Wedding');
    s = setActual(s, M, 'shopping', 8000);
    s = setTag(s, M, 'shopping', 'Festival', 'Diwali');
    s = setFundTarget(s, 'ppfas', 100000);
    s = setFundValue(s, 'ppfas', M, 112000);
    s = setFundTag(s, 'ppfas', M, 'One-off');
    const tags = allTags(s);
    expect(tags).toHaveLength(3);
    expect(tags[0].month).toBe(M);
    expect(tags[2].month).toBe('2026-10');
    expect(tags.map((t) => t.kind)).toContain('target');
  });

  it('excludes untagged overspends', () => {
    let s = seedState();
    s = setActual(s, M, 'travel', 9000);
    expect(allTags(s)).toHaveLength(0);
  });
});
