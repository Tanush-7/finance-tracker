import type {
  FinanceState,
  Fund,
  FundCrossing,
  InflowSource,
  MonthEntry,
  MonthKey,
  Overspend,
  PlanBucket,
  PlanConfig,
  SubCategory,
  Subscription,
  TagRecord,
  Transaction,
  TxFlag,
} from './types';

/** Indian digit grouping: 107000 -> "1,07,000". */
export function formatINR(n: number): string {
  const rounded = Math.round(n);
  const sign = rounded < 0 ? '-' : '';
  const s = String(Math.abs(rounded));
  if (s.length <= 3) return sign + s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return sign + rest + ',' + last3;
}

export function getEntry(state: FinanceState, month: MonthKey, categoryId: string): MonthEntry {
  return state.actuals[month]?.[categoryId] ?? { actual: null };
}

/** All categories where actual > budget for the month. */
export function getOverspends(state: FinanceState, month: MonthKey): Overspend[] {
  const out: Overspend[] = [];
  for (const c of state.categories) {
    if (c.budget == null || c.budget <= 0) continue;
    const e = getEntry(state, month, c.id);
    if (e.actual == null) continue;
    if (e.actual > c.budget) {
      out.push({
        categoryId: c.id,
        categoryName: c.name,
        budget: c.budget,
        actual: e.actual,
        over: e.actual - c.budget,
        tag: e.tag,
        note: e.note,
      });
    }
  }
  return out.sort((a, b) => b.over - a.over);
}

export interface MonthTotals {
  totalBudget: number;
  totalActual: number;
  /** null when nothing entered yet */
  diff: number | null;
  enteredCount: number;
}

/** Totals for a month. Budgets of null/0 are excluded from totalBudget. */
export function monthTotals(state: FinanceState, month: MonthKey): MonthTotals {
  let totalBudget = 0;
  let totalActual = 0;
  let enteredCount = 0;
  for (const c of state.categories) {
    if (c.budget != null && c.budget > 0) totalBudget += c.budget;
    const e = getEntry(state, month, c.id);
    if (e.actual != null) {
      totalActual += e.actual;
      enteredCount++;
    }
  }
  return {
    totalBudget,
    totalActual,
    diff: enteredCount === 0 ? null : totalActual - totalBudget,
    enteredCount,
  };
}

function cloneEntry(e: MonthEntry): MonthEntry {
  return { actual: e.actual, ...(e.tag ? { tag: e.tag } : {}), ...(e.note ? { note: e.note } : {}) };
}

/** Immutable update helpers (state stays serializable for localStorage). */
export function setActual(state: FinanceState, month: MonthKey, categoryId: string, actual: number | null): FinanceState {
  const prev = getEntry(state, month, categoryId);
  const next: MonthEntry = { ...cloneEntry(prev), actual };
  // Clearing the actual clears a stale tag only if there is no actual left.
  if (actual == null) {
    delete next.tag;
    delete next.note;
  }
  return {
    ...state,
    actuals: {
      ...state.actuals,
      [month]: { ...(state.actuals[month] ?? {}), [categoryId]: next },
    },
  };
}

export function setBudget(state: FinanceState, categoryId: string, budget: number | null): FinanceState {
  return {
    ...state,
    categories: state.categories.map((c) => (c.id === categoryId ? { ...c, budget } : c)),
  };
}

export function setTag(
  state: FinanceState,
  month: MonthKey,
  categoryId: string,
  tag: string,
  note?: string,
): FinanceState {
  const prev = getEntry(state, month, categoryId);
  const next: MonthEntry = { ...cloneEntry(prev), tag };
  if (note !== undefined) {
    if (note) next.note = note;
    else delete next.note;
  }
  return {
    ...state,
    actuals: {
      ...state.actuals,
      [month]: { ...(state.actuals[month] ?? {}), [categoryId]: next },
    },
  };
}

/** Months where a fund's value met or exceeded its target. */
export function fundCrossings(fund: Fund, fundTags: Record<MonthKey, { tag: string; note?: string }>): FundCrossing[] {
  if (fund.target == null || fund.target <= 0) return [];
  return Object.entries(fund.values)
    .filter(([, v]) => v >= (fund.target as number))
    .map(([month, value]) => ({
      fundId: fund.id,
      fundName: fund.name,
      month,
      value,
      target: fund.target as number,
      tag: fundTags[month]?.tag,
      note: fundTags[month]?.note,
    }))
    .sort((a, b) => (a.month < b.month ? -1 : 1));
}

export function setFundValue(state: FinanceState, fundId: string, month: MonthKey, value: number | null): FinanceState {
  return {
    ...state,
    funds: state.funds.map((f) => {
      if (f.id !== fundId) return f;
      const values = { ...f.values };
      if (value == null) delete values[month];
      else values[month] = value;
      return { ...f, values };
    }),
  };
}

export function setFundTarget(state: FinanceState, fundId: string, target: number | null): FinanceState {
  return { ...state, funds: state.funds.map((f) => (f.id === fundId ? { ...f, target } : f)) };
}

export function setFundSip(state: FinanceState, fundId: string, sip: number): FinanceState {
  return { ...state, funds: state.funds.map((f) => (f.id === fundId ? { ...f, sip } : f)) };
}

export function setFundTag(
  state: FinanceState,
  fundId: string,
  month: MonthKey,
  tag: string,
  note?: string,
): FinanceState {
  const prev = state.fundTags[fundId]?.[month] ?? { tag: '' };
  const next = { ...prev, tag };
  if (note !== undefined) {
    if (note) next.note = note;
    else delete next.note;
  }
  return {
    ...state,
    fundTags: {
      ...state.fundTags,
      [fundId]: { ...(state.fundTags[fundId] ?? {}), [month]: next },
    },
  };
}

/** Every tagged event across months, newest first. */
export function allTags(state: FinanceState): TagRecord[] {
  const out: TagRecord[] = [];
  for (const month of Object.keys(state.actuals)) {
    for (const c of state.categories) {
      const e = state.actuals[month][c.id];
      if (e?.tag && c.budget != null && e.actual != null && e.actual > c.budget) {
        out.push({
          kind: 'overspend',
          month,
          label: c.name,
          amount: e.actual,
          reference: c.budget,
          delta: e.actual - c.budget,
          tag: e.tag,
          note: e.note,
        });
      }
    }
  }
  for (const f of state.funds) {
    for (const [month, rec] of Object.entries(state.fundTags[f.id] ?? {})) {
      const value = f.values[month];
      if (value == null || f.target == null) continue;
      out.push({
        kind: 'target',
        month,
        label: f.name,
        amount: value,
        reference: f.target,
        delta: value - f.target,
        tag: rec.tag,
        note: rec.note,
      });
    }
  }
  return out.sort((a, b) => (a.month < b.month ? 1 : -1));
}

// ===================== Inflows =====================

export function addInflow(
  state: FinanceState,
  month: MonthKey,
  sourceId: string,
  amount: number,
): FinanceState {
  const list = [...(state.inflows[month] ?? []), { sourceId, amount }];
  return { ...state, inflows: { ...state.inflows, [month]: list } };
}

export function removeInflow(state: FinanceState, month: MonthKey, index: number): FinanceState {
  const list = (state.inflows[month] ?? []).filter((_, i) => i !== index);
  return { ...state, inflows: { ...state.inflows, [month]: list } };
}

export function addInflowSource(state: FinanceState, name: string): FinanceState {
  const clean = name.trim();
  if (!clean) return state;
  const id =
    clean
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `src-${Date.now()}`;
  if (state.inflowSources.some((s) => s.id === id)) return state;
  const source: InflowSource = { id, name: clean };
  return { ...state, inflowSources: [...state.inflowSources, source] };
}

export function removeInflowSource(state: FinanceState, sourceId: string): FinanceState {
  return { ...state, inflowSources: state.inflowSources.filter((s) => s.id !== sourceId) };
}

export function sourceName(state: FinanceState, sourceId: string): string {
  return state.inflowSources.find((s) => s.id === sourceId)?.name ?? 'Unknown source';
}

/** Total income logged for a month. */
export function monthInflow(state: FinanceState, month: MonthKey): number {
  return (state.inflows[month] ?? []).reduce((sum, e) => sum + e.amount, 0);
}

export interface SavingsSummary {
  inflow: number;
  outflow: number;
  net: number;
  /** Percent of inflow saved; null when there is no inflow. */
  rate: number | null;
}

/** Inflow vs outflow for a month. Outflow = sum of entered actuals. */
export function savingsSummary(state: FinanceState, month: MonthKey): SavingsSummary {
  const inflow = monthInflow(state, month);
  const outflow = monthTotals(state, month).totalActual;
  const net = inflow - outflow;
  return { inflow, outflow, net, rate: inflow > 0 ? (net / inflow) * 100 : null };
}

// ===================== Transactions (radar) =====================

export function newTxId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `tx-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

export function normalizeMerchant(s: string): string {
  return s.trim().toLowerCase();
}

export function addTransaction(state: FinanceState, tx: Transaction): FinanceState {
  return { ...state, transactions: [...state.transactions, tx] };
}

export function removeTransaction(state: FinanceState, id: string): FinanceState {
  return {
    ...state,
    transactions: state.transactions.filter((t) => t.id !== id),
    dismissedTx: state.dismissedTx.filter((d) => d !== id),
  };
}

/**
 * "Mark safe": dismisses this transaction's flags and remembers the merchant
 * as known, so first-time-large-payment never fires for it again.
 */
export function markTxSafe(state: FinanceState, id: string): FinanceState {
  const tx = state.transactions.find((t) => t.id === id);
  if (!tx) return state;
  const m = normalizeMerchant(tx.merchant);
  return {
    ...state,
    safeMerchants: state.safeMerchants.includes(m) ? state.safeMerchants : [...state.safeMerchants, m],
    dismissedTx: state.dismissedTx.includes(id) ? state.dismissedTx : [...state.dismissedTx, id],
  };
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Whole-day difference between two YYYY-MM-DD dates (b - a). */
export function dayDiff(a: string, b: string): number {
  const pa = a.split('-').map(Number);
  const pb = b.split('-').map(Number);
  const da = new Date(pa[0], pa[1] - 1, pa[2]);
  const db = new Date(pb[0], pb[1] - 1, pb[2]);
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

export interface FlaggedTx {
  tx: Transaction;
  flags: TxFlag[];
}

/**
 * Client-side anomaly engine. Pure function of the transaction list:
 *  - outlier: amount > 3x the median of that category's prior history (>=3 priors)
 *  - duplicate: same amount + same merchant within the 7 days before it
 *  - first-large: merchant never seen before (and not marked safe) + amount >= 10000
 * Dismissed transactions never appear flagged.
 */
export function analyzeTransactions(state: FinanceState): FlaggedTx[] {
  const dismissed = new Set(state.dismissedTx);
  const safe = new Set(state.safeMerchants);
  const out: FlaggedTx[] = [];

  for (const tx of state.transactions) {
    if (dismissed.has(tx.id)) continue;
    const flags: TxFlag[] = [];

    // a. Outlier vs category history (strictly prior by date).
    const priors = state.transactions.filter(
      (t) => t.id !== tx.id && t.categoryId === tx.categoryId && dayDiff(t.date, tx.date) > 0,
    );
    if (priors.length >= 3) {
      const med = median(priors.map((t) => t.amount));
      if (med > 0 && tx.amount > 3 * med) {
        const cname = state.categories.find((c) => c.id === tx.categoryId)?.name ?? 'this category';
        flags.push({
          txId: tx.id,
          kind: 'outlier',
          message: `Unusually high for ${cname} — ${formatINR(tx.amount)} vs a typical ${formatINR(med)}`,
        });
      }
    }

    // b. Possible duplicate: same merchant + same amount within the 7 days before.
    const m = normalizeMerchant(tx.merchant);
    const dup = state.transactions.some(
      (t) =>
        t.id !== tx.id &&
        normalizeMerchant(t.merchant) === m &&
        t.amount === tx.amount &&
        dayDiff(t.date, tx.date) > 0 &&
        dayDiff(t.date, tx.date) <= 7,
    );
    if (dup) {
      flags.push({ txId: tx.id, kind: 'duplicate', message: 'Possible duplicate charge' });
    }

    // c. First-time large payment.
    const seenBefore = state.transactions.some(
      (t) => t.id !== tx.id && normalizeMerchant(t.merchant) === m,
    );
    if (!seenBefore && !safe.has(m) && tx.amount >= 10000) {
      flags.push({ txId: tx.id, kind: 'first-large', message: 'First-time large payment — verify' });
    }

    if (flags.length > 0) out.push({ tx, flags });
  }

  return out.sort((a, b) => (a.tx.date < b.tx.date ? 1 : -1));
}

// ===================== CSV import (bank statements) =====================

/** Minimal RFC-4180-ish CSV parser: handles quoted fields, commas and newlines inside quotes. */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    // Skip fully-empty rows.
    if (row.some((f) => f.trim() !== '')) rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      pushField();
    } else if (ch === '\r') {
      // ignore, \n handles the break
    } else if (ch === '\n') {
      pushField();
      pushRow();
    } else {
      field += ch;
    }
  }
  pushField();
  pushRow();
  return rows;
}

export interface CsvMapping {
  dateCol: number;
  descCol: number;
  /** 'split' = separate debit/credit columns; 'single' = one signed amount column */
  mode: 'split' | 'single';
  debitCol: number;
  creditCol: number;
  amountCol: number;
}

/** Heuristic column detection for ICICI-style statements. Returns -1 for not found. */
export function detectMapping(headers: string[]): CsvMapping {
  const h = headers.map((x) => x.trim().toLowerCase());
  const find = (res: RegExp[]): number => {
    for (const re of res) {
      const i = h.findIndex((x) => re.test(x));
      if (i >= 0) return i;
    }
    return -1;
  };
  const dateCol = find([/transaction date|txn date/, /value date/, /\bdate\b/]);
  const descCol = find([/narration/, /description/, /particulars/, /remarks/, /details/]);
  const debitCol = find([/withdrawal/, /\bdebit\b/, /\bdr\b/, /paid/]);
  const creditCol = find([/\bdeposit\b/, /\bcredit\b/, /\bcr\b/, /received/]);
  const amountCol = find([/^amount$/, /txn amount/, /transaction amount/]);
  const mode: 'split' | 'single' = debitCol >= 0 || creditCol >= 0 ? 'split' : 'single';
  return { dateCol, descCol, mode, debitCol, creditCol, amountCol };
}

/** Parse DD-MM-YYYY / DD/MM/YYYY / YYYY-MM-DD / DD-Mon-YY(YY) to YYYY-MM-DD. */
export function parseICICIDate(s: string): string | null {
  const t = s.trim();
  let m = t.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    const mo = Number(m[2]);
    const d = Number(m[1]);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return `${m[1]}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  m = t.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/i);
  if (m) {
    const months: Record<string, number> = {
      jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
      jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
    };
    const mo = months[m[2].toLowerCase()];
    if (!mo) return null;
    const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    const d = Number(m[1]);
    return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return null;
}

/** Parse an amount cell: strips ₹, commas, spaces; keeps digits, dot, minus. */
export function parseCSVAmount(s: string): number | null {
  const clean = s.replace(/[₹,\s]/g, '').trim();
  if (clean === '' || clean === '-' || clean === '.') return null;
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
}

export interface ImportResult {
  txs: Transaction[];
  skipped: number;
}

/**
 * Convert CSV data rows to transactions. Debits and credits both become
 * positive-amount entries (spend tracking). Each row is auto-categorized from
 * the narration (learned mappings, then keyword rules); unmatched rows get an
 * empty category and land in the "Needs category" queue.
 */
export function rowsToTransactions(
  rows: string[][],
  mapping: CsvMapping,
  state: FinanceState,
): ImportResult {
  const txs: Transaction[] = [];
  let skipped = 0;
  for (const row of rows) {
    const cell = (i: number): string => (i >= 0 && i < row.length ? row[i] : '');
    const date = parseICICIDate(cell(mapping.dateCol));
    const merchant = cell(mapping.descCol).trim();
    let amount: number | null = null;
    if (mapping.mode === 'split') {
      const debit = parseCSVAmount(cell(mapping.debitCol));
      const credit = parseCSVAmount(cell(mapping.creditCol));
      if (debit != null && debit > 0) amount = Math.abs(debit);
      else if (credit != null && credit > 0) amount = Math.abs(credit);
    } else {
      const a = parseCSVAmount(cell(mapping.amountCol));
      if (a != null && a !== 0) amount = Math.abs(a);
    }
    if (!date || !merchant || amount == null || amount <= 0) {
      skipped++;
      continue;
    }
    const cat = autoCategorize(state, merchant);
    txs.push({
      id: newTxId(),
      date,
      merchant,
      amount,
      categoryId: cat.categoryId ?? '',
      source: 'csv',
      autoCategorized: cat.via != null,
    });
  }
  return { txs, skipped };
}

export function addTransactions(state: FinanceState, txs: Transaction[]): FinanceState {
  if (txs.length === 0) return state;
  return { ...state, transactions: [...state.transactions, ...txs] };
}

// ===================== Auto-categorization =====================

/**
 * Keyword -> category rules for Indian bank-statement narrations.
 * Order matters: specific rules first (car/bike EMI before generic EMI/loan).
 * Matching is case-insensitive substring on the narration.
 */
export const MERCHANT_RULES: Array<{ keywords: string[]; categoryId: string }> = [
  { keywords: ['car emi', 'car loan', 'tata motors finance', 'four wheeler loan'], categoryId: 'car-emi' },
  { keywords: ['bike emi', 'bike loan', 'two wheeler', '2 wheeler'], categoryId: 'bike-emi' },
  { keywords: ['swiggy', 'zomato', 'dominos', 'blinkit', 'zepto', 'bigbasket', 'licious'], categoryId: 'groceries' },
  { keywords: ['uber', 'ola', 'irctc', 'indigo', 'spicejet', 'air india', 'makemytrip', 'goibibo', 'yatra', 'redbus'], categoryId: 'travel' },
  { keywords: ['netflix', 'hotstar', 'prime video', 'spotify', 'youtube premium', 'sonyliv', 'zee5'], categoryId: 'entertainment' },
  { keywords: ['amazon', 'flipkart', 'myntra', 'ajio', 'meesho'], categoryId: 'shopping' },
  { keywords: ['cultpass', 'cultfit', 'cult.fit', 'curefit'], categoryId: 'fitness' },
  { keywords: ['decathlon'], categoryId: 'fitness' },
  { keywords: ['apollo', '1mg', 'pharmeasy', 'netmeds', 'medplus'], categoryId: 'misc' },
  { keywords: ['sip', 'mutual fund'], categoryId: 'sip' },
  { keywords: ['lic ', 'lic/', 'insurance premium'], categoryId: 'insurance' },
  { keywords: ['electricity', 'bescom', 'water bill', 'gas bill', 'broadband', 'jio recharge', 'airtel'], categoryId: 'bills' },
  { keywords: ['emi', 'loan'], categoryId: 'misc' },
];

export type CategorizeVia = 'learned' | 'rule' | null;

export interface CategorizeResult {
  categoryId: string | null;
  via: CategorizeVia;
}

/**
 * Categorize a narration: learned merchant mappings first (longest matching
 * key wins, so "UPI/SWIGGY/123" matches a learned "swiggy" despite the
 * reference number), then keyword rules.
 * Returns null categoryId when nothing matches (goes to the "Needs category" queue).
 */
export function autoCategorize(state: FinanceState, description: string): CategorizeResult {
  const norm = normalizeMerchant(description);
  if (!norm) return { categoryId: null, via: null };
  const learned = Object.entries(state.learnedCategories)
    .filter(([k]) => k && norm.includes(k))
    .sort((a, b) => b[0].length - a[0].length)[0];
  if (learned) return { categoryId: learned[1], via: 'learned' };
  for (const rule of MERCHANT_RULES) {
    if (rule.keywords.some((k) => norm.includes(k))) {
      return { categoryId: rule.categoryId, via: 'rule' };
    }
  }
  return { categoryId: null, via: null };
}

/** Remember a merchant -> category correction for future imports. */
export function learnCategory(state: FinanceState, merchant: string, categoryId: string): FinanceState {
  const norm = normalizeMerchant(merchant);
  if (!norm) return state;
  return { ...state, learnedCategories: { ...state.learnedCategories, [norm]: categoryId } };
}

/** Apply a category correction to one transaction (also learns the mapping). */
export function correctTxCategory(state: FinanceState, txId: string, categoryId: string): FinanceState {
  const tx = state.transactions.find((t) => t.id === txId);
  if (!tx) return state;
  const learned = learnCategory(state, tx.merchant, categoryId);
  return {
    ...learned,
    transactions: learned.transactions.map((t) =>
      t.id === txId ? { ...t, categoryId, autoCategorized: false } : t,
    ),
  };
}

/** Transactions with no category match — the "Needs category" queue. */
export function uncategorizedTransactions(state: FinanceState): Transaction[] {
  return state.transactions
    .filter((t) => !t.categoryId)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

// ===================== Subscriptions =====================

export function addSubscription(state: FinanceState, sub: Subscription): FinanceState {
  return { ...state, subscriptions: [...state.subscriptions, sub] };
}

export function updateSubscription(
  state: FinanceState,
  id: string,
  patch: Partial<Subscription>,
): FinanceState {
  return {
    ...state,
    subscriptions: state.subscriptions.map((s) => (s.id === id ? { ...s, ...patch } : s)),
  };
}

export function removeSubscription(state: FinanceState, id: string): FinanceState {
  return { ...state, subscriptions: state.subscriptions.filter((s) => s.id !== id) };
}

function billable(s: Subscription): boolean {
  return s.status === 'active' || s.status === 'trial';
}

/** Monthly-equivalent cost of one subscription. */
export function subMonthly(s: Subscription): number {
  return s.cycle === 'monthly' ? s.amount : s.amount / 12;
}

/** Total monthly burn across active + trial subscriptions. */
export function monthlyBurn(subs: Subscription[]): number {
  return subs.filter(billable).reduce((sum, s) => sum + subMonthly(s), 0);
}

/** Projected yearly cost across active + trial subscriptions. */
export function yearlyCost(subs: Subscription[]): number {
  return subs
    .filter(billable)
    .reduce((sum, s) => sum + (s.cycle === 'monthly' ? s.amount * 12 : s.amount), 0);
}

/** Monthly-equivalent subtotal per category (active + trial only). */
export function subCategoryTotals(subs: Subscription[]): Array<{ category: SubCategory; total: number }> {
  const map = new Map<SubCategory, number>();
  for (const s of subs) {
    if (!billable(s)) continue;
    map.set(s.category, (map.get(s.category) ?? 0) + subMonthly(s));
  }
  return [...map.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

export interface Renewal extends Subscription {
  daysLeft: number;
}

/**
 * Active/trial subscriptions renewing within `withinDays` days (default 30),
 * soonest first. `todayISO` is YYYY-MM-DD (defaults to today, injectable for tests).
 */
export function renewingSoon(subs: Subscription[], withinDays = 30, todayISO?: string): Renewal[] {
  const today = todayISO ?? toLocalISODate(new Date());
  return subs
    .filter(billable)
    .map((s) => ({ ...s, daysLeft: dayDiff(today, s.renewalDate) }))
    .filter((r) => r.daysLeft >= 0 && r.daysLeft <= withinDays)
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

function toLocalISODate(d: Date): string {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${d.getFullYear()}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** True when more than one billable AI subscription exists — T's one-AI-sub rule. */
export function aiOverload(subs: Subscription[]): boolean {
  return subs.filter((s) => billable(s) && s.category === 'AI').length > 1;
}

// ===================== Plan (CA-style framework) =====================

export interface PlanBucketInfo {
  bucket: PlanBucket;
  label: string;
  pct: number;
  envelope: number;
  budgeted: number;
  over: boolean;
}

/** Rupee envelopes from the 50/30/20-style split. */
export function planEnvelopes(cfg: PlanConfig): { needs: number; wants: number; save: number } {
  return {
    needs: (cfg.takeHome * cfg.needsPct) / 100,
    wants: (cfg.takeHome * cfg.wantsPct) / 100,
    save: (cfg.takeHome * cfg.savePct) / 100,
  };
}

/**
 * Per-bucket check: sum of category budgets in the bucket vs its envelope.
 * Flags the bucket (and its categories) when budgets collectively eat more
 * than the envelope allows.
 */
export function planBucketInfo(state: FinanceState, cfg: PlanConfig): PlanBucketInfo[] {
  const env = planEnvelopes(cfg);
  const defs = [
    { bucket: 'needs' as const, label: 'Needs', pct: cfg.needsPct, envelope: env.needs },
    { bucket: 'wants' as const, label: 'Wants', pct: cfg.wantsPct, envelope: env.wants },
    { bucket: 'save' as const, label: 'Save & Invest', pct: cfg.savePct, envelope: env.save },
  ];
  return defs.map((d) => {
    const budgeted = state.categories
      .filter((c) => cfg.buckets[c.id] === d.bucket)
      .reduce((sum, c) => sum + (c.budget ?? 0), 0);
    return { ...d, budgeted, over: budgeted > d.envelope };
  });
}

/** Monthly outflow: entered actuals, falling back to total budget. */
export function monthlyOutflow(state: FinanceState, month: MonthKey): number {
  const t = monthTotals(state, month);
  return t.enteredCount > 0 ? t.totalActual : t.totalBudget;
}

/** Emergency fund target = 6x monthly outflow, with progress. */
export function emergencyPlan(
  state: FinanceState,
  cfg: PlanConfig,
  month: MonthKey,
): { target: number; saved: number; pct: number | null } {
  const target = 6 * monthlyOutflow(state, month);
  return {
    target,
    saved: cfg.emergencySaved,
    pct: target > 0 ? (cfg.emergencySaved / target) * 100 : null,
  };
}

/** Total EMIs: categories whose name contains "emi" (budget preferred, else actual). */
export function emiTotal(state: FinanceState, month: MonthKey): number {
  return state.categories
    .filter((c) => c.name.toLowerCase().includes('emi'))
    .reduce((sum, c) => {
      const e = getEntry(state, month, c.id);
      return sum + (c.budget ?? e.actual ?? 0);
    }, 0);
}

/** Debt-load check: EMIs at or under 40% of take-home passes. */
export function emiCheck(
  state: FinanceState,
  cfg: PlanConfig,
  month: MonthKey,
): { total: number; ratioPct: number | null; over: boolean } {
  const total = emiTotal(state, month);
  const ratioPct = cfg.takeHome > 0 ? (total / cfg.takeHome) * 100 : null;
  return { total, ratioPct, over: ratioPct != null && ratioPct > 40 };
}

/** SIP actual for the month (the 'sip' category actual). */
export function sipActual(state: FinanceState, month: MonthKey): number | null {
  const e = getEntry(state, month, 'sip');
  return e.actual;
}

export function setPlan(state: FinanceState, patch: Partial<PlanConfig>): FinanceState {
  return { ...state, plan: { ...state.plan, ...patch } };
}

export function setPlanBucket(
  state: FinanceState,
  categoryId: string,
  bucket: PlanBucket,
): FinanceState {
  return setPlan(state, { buckets: { ...state.plan.buckets, [categoryId]: bucket } });
}
