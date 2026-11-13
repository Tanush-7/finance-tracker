import { describe, expect, it } from 'vitest';
import {
  addInflow,
  addInflowSource,
  addTransaction,
  aiOverload,
  allTags,
  analyzeTransactions,
  autoCategorize,
  correctTxCategory,
  detectMapping,
  emergencyPlan,
  emiCheck,
  formatINR,
  fundCrossings,
  getOverspends,
  learnCategory,
  markTxSafe,
  monthlyBurn,
  monthInflow,
  monthTotals,
  parseCSV,
  parseCSVAmount,
  parseICICIDate,
  planBucketInfo,
  planEnvelopes,
  removeInflowSource,
  renewingSoon,
  rowsToTransactions,
  savingsSummary,
  setActual,
  setFundTag,
  setFundTarget,
  setFundValue,
  setTag,
  subCategoryTotals,
  uncategorizedTransactions,
  yearlyCost,
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
    expect(over[0].over).toBe(1872); // 6872 actual - 5000 example budget
  });

  it('ignores under-budget, equal, and missing actuals', () => {
    let s = seedState();
    s = setActual(s, M, 'travel', 5000); // equal
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
    s = setActual(s, M, 'travel', 7000); // over by 2000
    s = setActual(s, M, 'shopping', 8000); // over by 4000
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

describe('inflows and savings', () => {
  it('totals inflows and computes net + rate', () => {
    let s = seedState();
    s = addInflow(s, M, 'salary', 100000);
    s = addInflow(s, M, 'freelance', 20000);
    expect(monthInflow(s, M)).toBe(120000);
    s = setActual(s, M, 'travel', 4000);
    const r = savingsSummary(s, M);
    expect(r.inflow).toBe(120000);
    expect(r.outflow).toBe(4000);
    expect(r.net).toBe(116000);
    expect(r.rate).toBeCloseTo(96.667, 2);
  });

  it('rate is null with no inflow', () => {
    const s = seedState();
    expect(savingsSummary(s, M).rate).toBeNull();
  });

  it('adds and removes custom sources', () => {
    let s = seedState();
    s = addInflowSource(s, 'Bonus');
    expect(s.inflowSources.map((x) => x.name)).toContain('Bonus');
    const id = s.inflowSources.find((x) => x.name === 'Bonus')!.id;
    s = addInflow(s, M, id, 5000);
    expect(monthInflow(s, M)).toBe(5000);
    s = removeInflowSource(s, id);
    expect(s.inflowSources.find((x) => x.id === id)).toBeUndefined();
  });
});

const mkTx = (
  overrides: Partial<import('./types').Transaction> & { date: string; merchant: string; amount: number },
): import('./types').Transaction => ({
  id: `tx-${overrides.date}-${overrides.merchant}-${overrides.amount}-${Math.random()}`,
  categoryId: 'groceries',
  source: 'manual',
  ...overrides,
});

describe('anomaly engine', () => {
  it('flags outlier above 3x median with >=3 priors', () => {
    let s = seedState();
    for (const [d, a] of [['2026-09-01', 2000], ['2026-09-10', 2200], ['2026-09-20', 1800]] as const) {
      s = addTransaction(s, mkTx({ date: d, merchant: 'BigBasket', amount: a }));
    }
    s = addTransaction(s, mkTx({ date: '2026-10-05', merchant: 'BigBasket', amount: 7000 }));
    const flagged = analyzeTransactions(s);
    expect(flagged).toHaveLength(1);
    expect(flagged[0].flags[0].kind).toBe('outlier');
  });

  it('needs 3 prior entries for the outlier rule', () => {
    let s = seedState();
    s = addTransaction(s, mkTx({ date: '2026-09-01', merchant: 'BigBasket', amount: 2000 }));
    s = addTransaction(s, mkTx({ date: '2026-09-10', merchant: 'BigBasket', amount: 2200 }));
    s = addTransaction(s, mkTx({ date: '2026-10-05', merchant: 'BigBasket', amount: 50000 }));
    expect(analyzeTransactions(s)).toHaveLength(0);
  });

  it('does not flag amounts within 3x median', () => {
    let s = seedState();
    for (const d of ['2026-09-01', '2026-09-10', '2026-09-20']) {
      s = addTransaction(s, mkTx({ date: d, merchant: 'BigBasket', amount: 2000 }));
    }
    s = addTransaction(s, mkTx({ date: '2026-10-05', merchant: 'BigBasket', amount: 5000 }));
    expect(analyzeTransactions(s)).toHaveLength(0);
  });

  it('flags possible duplicate within 7 days', () => {
    let s = seedState();
    s = addTransaction(s, mkTx({ date: '2026-10-01', merchant: 'Netflix', amount: 649 }));
    s = addTransaction(s, mkTx({ date: '2026-10-06', merchant: 'netflix', amount: 649 }));
    const flagged = analyzeTransactions(s);
    expect(flagged).toHaveLength(1);
    expect(flagged[0].tx.date).toBe('2026-10-06');
    expect(flagged[0].flags[0].kind).toBe('duplicate');
  });

  it('ignores same charge 8 days apart', () => {
    let s = seedState();
    s = addTransaction(s, mkTx({ date: '2026-10-01', merchant: 'Netflix', amount: 649 }));
    s = addTransaction(s, mkTx({ date: '2026-10-09', merchant: 'Netflix', amount: 649 }));
    expect(analyzeTransactions(s)).toHaveLength(0);
  });

  it('flags first-time large payment', () => {
    let s = seedState();
    s = addTransaction(s, mkTx({ date: '2026-10-05', merchant: 'New Vendor XYZ', amount: 15000 }));
    const flagged = analyzeTransactions(s);
    expect(flagged).toHaveLength(1);
    expect(flagged[0].flags[0].kind).toBe('first-large');
  });

  it('does not flag first-time payment under 10000', () => {
    let s = seedState();
    s = addTransaction(s, mkTx({ date: '2026-10-05', merchant: 'New Vendor XYZ', amount: 9000 }));
    expect(analyzeTransactions(s)).toHaveLength(0);
  });

  it('does not flag known or seen merchants as first-time', () => {
    let s = seedState();
    s = addTransaction(s, mkTx({ date: '2026-09-01', merchant: 'Known Shop', amount: 500 }));
    s = addTransaction(s, mkTx({ date: '2026-10-05', merchant: 'Known Shop', amount: 15000 }));
    expect(analyzeTransactions(s)).toHaveLength(0);
  });

  it('mark safe dismisses flags and remembers the merchant', () => {
    let s = seedState();
    s = addTransaction(s, mkTx({ date: '2026-10-05', merchant: 'New Vendor XYZ', amount: 15000 }));
    const id = s.transactions[0].id;
    s = markTxSafe(s, id);
    expect(analyzeTransactions(s)).toHaveLength(0);
    // Future tx from the same merchant is known now.
    s = addTransaction(s, mkTx({ date: '2026-10-20', merchant: 'new vendor xyz', amount: 20000 }));
    expect(analyzeTransactions(s)).toHaveLength(0);
  });
});

describe('CSV import', () => {
  it('parses quoted fields with commas', () => {
    const rows = parseCSV('a,"b, c",d\n1,2,3');
    expect(rows).toEqual([['a', 'b, c', 'd'], ['1', '2', '3']]);
  });

  it('detects ICICI-style columns', () => {
    const m = detectMapping(['Transaction Date', 'Description', 'Debit', 'Credit']);
    expect(m.dateCol).toBe(0);
    expect(m.descCol).toBe(1);
    expect(m.mode).toBe('split');
    expect(m.debitCol).toBe(2);
    expect(m.creditCol).toBe(3);
  });

  it('parses DD-MM-YYYY dates', () => {
    expect(parseICICIDate('03-11-2026')).toBe('2026-11-03');
    expect(parseICICIDate('3/1/26')).toBe('2026-01-03');
    expect(parseICICIDate('2026-11-03')).toBe('2026-11-03');
    expect(parseICICIDate('nonsense')).toBeNull();
  });

  it('parses amounts with rupee signs and commas', () => {
    expect(parseCSVAmount('₹1,07,000.50')).toBe(107000.5);
    expect(parseCSVAmount('')).toBeNull();
  });

  it('converts split debit/credit rows to transactions', () => {
    const s = seedState();
    const rows = [
      ['03-11-2026', 'UPI/SWIGGY/123', '450', ''],
      ['04-11-2026', 'NEFT SALARY', '', '120000'],
      ['bad-row'],
    ];
    const { txs, skipped } = rowsToTransactions(
      rows,
      { dateCol: 0, descCol: 1, mode: 'split', debitCol: 2, creditCol: 3, amountCol: -1 },
      s,
    );
    expect(txs).toHaveLength(2);
    expect(txs[0].amount).toBe(450);
    expect(txs[1].amount).toBe(120000);
    expect(skipped).toBe(1);
  });

  it('handles a single signed amount column', () => {
    const s = seedState();
    const rows = [['03-11-2026', 'ATM WDL', '-20000']];
    const { txs } = rowsToTransactions(
      rows,
      { dateCol: 0, descCol: 1, mode: 'single', debitCol: -1, creditCol: -1, amountCol: 2 },
      s,
    );
    expect(txs).toHaveLength(1);
    expect(txs[0].amount).toBe(20000);
  });
});

describe('auto-categorization', () => {
  it('maps seeded keywords', () => {
    const s = seedState();
    expect(autoCategorize(s, 'UPI/SWIGGY/12345').categoryId).toBe('groceries');
    expect(autoCategorize(s, 'UBER INDIA').categoryId).toBe('travel');
    expect(autoCategorize(s, 'NETFLIX.COM').categoryId).toBe('entertainment');
    expect(autoCategorize(s, 'AMAZON PAY').categoryId).toBe('shopping');
    expect(autoCategorize(s, 'CULTPASS').categoryId).toBe('fitness');
    expect(autoCategorize(s, 'APOLLO PHARMACY').categoryId).toBe('misc');
    expect(autoCategorize(s, 'SIP/HDFC/123').categoryId).toBe('sip');
    expect(autoCategorize(s, 'CAR LOAN EMI').categoryId).toBe('car-emi');
    expect(autoCategorize(s, 'LOAN PROCESSING FEE').categoryId).toBe('misc');
  });

  it('learned mappings beat keyword rules', () => {
    let s = seedState();
    s = learnCategory(s, 'Swiggy', 'entertainment');
    const r = autoCategorize(s, 'UPI/SWIGGY/999');
    expect(r.categoryId).toBe('entertainment');
    expect(r.via).toBe('learned');
  });

  it('unmatched narrations go to the queue', () => {
    const s = seedState();
    expect(autoCategorize(s, 'RANDOM XYZ 123').categoryId).toBeNull();
    let s2 = addTransaction(s, mkTx({ date: '2026-10-05', merchant: 'Random XYZ', amount: 500, categoryId: '' }));
    expect(uncategorizedTransactions(s2)).toHaveLength(1);
  });

  it('correcting a category learns it for next time', () => {
    let s = seedState();
    s = addTransaction(s, mkTx({ date: '2026-10-05', merchant: 'Corner Bakery', amount: 300, categoryId: '' }));
    const id = s.transactions[0].id;
    s = correctTxCategory(s, id, 'groceries');
    expect(s.transactions[0].categoryId).toBe('groceries');
    expect(autoCategorize(s, 'CORNER BAKERY').via).toBe('learned');
  });
});

describe('subscriptions', () => {
  const subs = (): import('./types').Subscription[] => [
    { id: 'a', name: 'Claude Pro', category: 'AI', amount: 1950, cycle: 'monthly', renewalDate: '2026-12-03', status: 'active' },
    { id: 'b', name: 'Cloud VPS', category: 'Cloud', amount: 12000, cycle: 'yearly', renewalDate: '2027-06-01', status: 'active' },
    { id: 'c', name: 'Old App', category: 'Apps', amount: 500, cycle: 'monthly', renewalDate: '2026-11-01', status: 'cancelled' },
  ];

  it('computes monthly burn and yearly cost', () => {
    expect(monthlyBurn(subs())).toBe(1950 + 1000);
    expect(yearlyCost(subs())).toBe(1950 * 12 + 12000);
  });

  it('finds renewals in the next 30 days', () => {
    const r = renewingSoon(subs(), 30, '2026-11-03');
    expect(r.map((x) => x.id)).toEqual(['a']);
    expect(r[0].daysLeft).toBe(30);
    // Cancelled sub excluded even though its date is near.
    expect(r.find((x) => x.id === 'c')).toBeUndefined();
  });

  it('flags more than one billable AI subscription', () => {
    expect(aiOverload(subs())).toBe(false);
    const two = [...subs(), { id: 'd', name: 'ChatGPT', category: 'AI' as const, amount: 1999, cycle: 'monthly' as const, renewalDate: '2026-12-01', status: 'active' as const }];
    expect(aiOverload(two)).toBe(true);
  });

  it('subtotals per category monthly', () => {
    const totals = subCategoryTotals(subs());
    expect(totals.find((t) => t.category === 'AI')!.total).toBe(1950);
    expect(totals.find((t) => t.category === 'Cloud')!.total).toBe(1000);
  });
});

describe('plan', () => {
  it('computes 50/30/20 envelopes', () => {
    const s = seedState();
    const env = planEnvelopes(s.plan);
    expect(env.needs).toBeCloseTo(50000, 1);
    expect(env.wants).toBeCloseTo(30000, 1);
    expect(env.save).toBeCloseTo(20000, 1);
  });

  it('flags buckets over envelope', () => {
    const s = seedState();
    const info = planBucketInfo(s, s.plan);
    const save = info.find((b) => b.bucket === 'save')!;
    // SIP 10000 + Goals 20000 example budgets > 20000 save envelope.
    expect(save.over).toBe(true);
    expect(save.budgeted).toBe(30000);
  });

  it('emergency target is 6x monthly outflow', () => {
    let s = seedState();
    s = setActual(s, M, 'travel', 4000);
    s = setActual(s, M, 'groceries', 3000);
    const e = emergencyPlan(s, { ...s.plan, emergencySaved: 21000 }, M);
    expect(e.target).toBe(42000);
    expect(e.pct).toBeCloseTo(50, 5);
  });

  it('flags EMI load over 40% of take-home', () => {
    let s = seedState();
    const ok = emiCheck(s, s.plan, M);
    expect(ok.over).toBe(false);
    expect(ok.total).toBe(12000 + 4000);
    const tight = emiCheck(s, { ...s.plan, takeHome: 30000 }, M);
    expect(tight.over).toBe(true);
    expect(tight.ratioPct).toBeCloseTo(53.3, 1);
  });
});
