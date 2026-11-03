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
