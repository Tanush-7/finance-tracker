import type { Category, FinanceState, Fund, InflowSource, PlanBucket, PlanConfig, Subscription } from './types';

// Budget config seeded from the "Finances 2" Google Sheet (Monthly budget tab).
// null = no budget set in the sheet (tracked spend only).

const CATEGORIES: Array<[string, string, number | null]> = [
  ['sip', 'SIP', 15000],
  ['stocks', 'Stocks', 0],
  ['gold', 'Gold', 0],
  ['car-emi', 'Car EMI', 15189],
  ['bike-emi', 'Bike EMI', 5782],
  ['tv-emi', 'TV EMI', null],
  ['bills', 'Bills', 5000],
  ['credit-card', 'Credit Card', null],
  ['groceries', 'Groceries', 4000],
  ['travel', 'Travel', 4000],
  ['insurance', 'Insurance', 5000],
  ['fitness', 'Fitness', 7000],
  ['swimming', 'Swimming', 5000],
  ['protein', 'Protein', 2500],
  ['shopping', 'Shopping', 3000],
  ['entertainment', 'Entertainment', 2000],
  ['goals', 'Goals', 100000],
  ['donation', 'Donation', null],
  ['misc', 'Misc', null],
];

const FUNDS: Array<[string, string]> = [
  ['ppfas', 'PPFAS'],
  ['index-fund', 'Index Fund'],
  ['small-cap', 'Small Cap'],
  ['gold', 'Gold'],
];

export const QUICK_TAGS = [
  'Wedding',
  'Travel',
  'Medical',
  'One-off',
  'Festival',
  'Emergency',
  'Impulse',
] as const;

export function seedCategories(): Category[] {
  return CATEGORIES.map(([id, name, budget]) => ({ id, name, budget }));
}

export function seedFunds(): Fund[] {
  return FUNDS.map(([id, name]) => ({ id, name, sip: 0, target: null, values: {} }));
}

export function seedState(): FinanceState {
  return {
    version: 1,
    categories: seedCategories(),
    actuals: {},
    funds: seedFunds(),
    fundTags: {},
    inflowSources: seedInflowSources(),
    inflows: {},
    transactions: [],
    safeMerchants: [],
    dismissedTx: [],
    subscriptions: seedSubscriptions(),
    learnedCategories: {},
    plan: seedPlan(),
  };
}

const INFLOW_SOURCES: Array<[string, string]> = [
  ['salary', 'Salary'],
  ['freelance', 'Freelance'],
  ['refund', 'Refund'],
  ['cashback', 'Cashback'],
  ['gift', 'Gift'],
  ['other', 'Other'],
];

export function seedInflowSources(): InflowSource[] {
  return INFLOW_SOURCES.map(([id, name]) => ({ id, name }));
}

/** YYYY-MM-DD for a Date (local time). */
export function toISODate(d: Date): string {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${d.getFullYear()}-${m < 10 ? '0' : ''}${m}-${day < 10 ? '0' : ''}${day}`;
}

/**
 * One planned/example subscription so the tab isn't empty. NOT a real charge —
 * T hasn't bought it yet; he edits or deletes it.
 */
export function seedSubscriptions(): Subscription[] {
  const renewal = new Date();
  renewal.setDate(renewal.getDate() + 30);
  return [
    {
      id: 'claude-pro-planned',
      name: 'Claude Pro (planned)',
      category: 'AI',
      amount: 1950,
      cycle: 'monthly',
      renewalDate: toISODate(renewal),
      status: 'trial',
    },
  ];
}

/** "YYYY-MM" for the current month. */
export function currentMonthKey(d: Date = new Date()): string {
  const m = d.getMonth() + 1;
  return `${d.getFullYear()}-${m < 10 ? '0' : ''}${m}`;
}

/**
 * Plan defaults: 50/30/20 split, take-home prefilled from ₹17.5L fixed / 12
 * (pre-tax — T edits to his actual take-home), bucket classification seeded
 * from his 19 categories.
 */
export function seedPlan(): PlanConfig {
  const buckets: Record<string, PlanBucket> = {
    'car-emi': 'needs',
    'bike-emi': 'needs',
    'tv-emi': 'needs',
    bills: 'needs',
    'credit-card': 'needs',
    groceries: 'needs',
    insurance: 'needs',
    protein: 'needs',
    travel: 'wants',
    fitness: 'wants',
    swimming: 'wants',
    shopping: 'wants',
    entertainment: 'wants',
    donation: 'wants',
    misc: 'wants',
    sip: 'save',
    stocks: 'save',
    gold: 'save',
    goals: 'save',
  };
  return {
    takeHome: 145833,
    needsPct: 50,
    wantsPct: 30,
    savePct: 20,
    buckets,
    emergencySaved: 0,
    savingsTargetPct: 30,
  };
}

/** Previous n month keys ending at `key` (inclusive), oldest first. */
export function monthRange(key: string, n: number): string[] {
  const [y, m] = key.split('-').map(Number);
  const out: string[] = [];
  const d = new Date(y, m - 1, 1);
  for (let i = n - 1; i >= 0; i--) {
    const t = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(currentMonthKey(t));
  }
  return out;
}

/** "Nov 26" style label for a month key. */
export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleString('en-IN', { month: 'short' }) + ' ' + String(y).slice(2);
}
