import type {
  FinanceState,
  Fund,
  FundCrossing,
  MonthEntry,
  MonthKey,
  Overspend,
  TagRecord,
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
