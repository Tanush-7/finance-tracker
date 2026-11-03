// Core domain types. MonthKey is "YYYY-MM", e.g. "2026-11".

export type MonthKey = string;

export interface Category {
  id: string;
  name: string;
  /** Monthly budget in INR. null = no budget (tracked only). */
  budget: number | null;
}

export interface MonthEntry {
  /** Actual spend in INR. null = not entered yet. */
  actual: number | null;
  /** Reason tag for an overspend / crossing, e.g. "Wedding". */
  tag?: string;
  /** Free-text note attached to the tag. */
  note?: string;
}

export interface Fund {
  id: string;
  name: string;
  /** Monthly SIP in INR. */
  sip: number;
  /** Target value in INR. null = no target set. */
  target: number | null;
  /** MonthKey -> portfolio value in INR. */
  values: Record<MonthKey, number>;
}

export interface FinanceState {
  version: 1;
  categories: Category[];
  /** month -> categoryId -> entry */
  actuals: Record<MonthKey, Record<string, MonthEntry>>;
  funds: Fund[];
  /** fundId -> month -> tag/note for target crossings */
  fundTags: Record<string, Record<MonthKey, { tag: string; note?: string }>>;
  inflowSources: InflowSource[];
  /** month -> income entries */
  inflows: Record<MonthKey, InflowEntry[]>;
  transactions: Transaction[];
  /** normalized (lowercased, trimmed) merchant names the user marked safe */
  safeMerchants: string[];
  /** transaction ids whose flags were dismissed */
  dismissedTx: string[];
  subscriptions: Subscription[];
  /** learned merchant -> categoryId overrides (normalized merchant names) */
  learnedCategories: Record<string, string>;
  plan: PlanConfig;
}

// ---- Inflows ----

export interface InflowSource {
  id: string;
  name: string;
}

export interface InflowEntry {
  sourceId: string;
  amount: number;
}

// ---- Transactions (suspicious-transaction radar) ----

export interface Transaction {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  merchant: string;
  amount: number;
  /** '' = needs category (auto-categorization found no match) */
  categoryId: string;
  source: 'manual' | 'csv';
  /** true when the category came from learned mapping or keyword rules */
  autoCategorized?: boolean;
}

export type FlagKind = 'outlier' | 'duplicate' | 'first-large';

export interface TxFlag {
  txId: string;
  kind: FlagKind;
  message: string;
}

// ---- Subscriptions ----

export type SubCycle = 'monthly' | 'yearly';
export type SubStatus = 'active' | 'trial' | 'cancelled';
export type SubCategory = 'AI' | 'OTT' | 'Apps' | 'Music' | 'Cloud' | 'Other';

export interface Subscription {
  id: string;
  name: string;
  category: SubCategory;
  /** Amount per billing cycle, INR. */
  amount: number;
  cycle: SubCycle;
  /** YYYY-MM-DD */
  renewalDate: string;
  status: SubStatus;
}

export interface Overspend {
  categoryId: string;
  categoryName: string;
  budget: number;
  actual: number;
  over: number;
  tag?: string;
  note?: string;
}

export interface FundCrossing {
  fundId: string;
  fundName: string;
  month: MonthKey;
  value: number;
  target: number;
  tag?: string;
  note?: string;
}

export interface TagRecord {
  kind: 'overspend' | 'target';
  month: MonthKey;
  label: string;
  amount: number;
  reference: number;
  delta: number;
  tag: string;
  note?: string;
}

// ---- Plan (CA-style framework) ----

export type PlanBucket = 'needs' | 'wants' | 'save';

export interface PlanConfig {
  /** Monthly take-home pay, INR. */
  takeHome: number;
  needsPct: number;
  wantsPct: number;
  savePct: number;
  /** categoryId -> bucket */
  buckets: Record<string, PlanBucket>;
  /** Current emergency-fund savings, INR. */
  emergencySaved: number;
  /** Savings-rate target %, default 30. */
  savingsTargetPct: number;
}
