import { seedState } from './seed';
import type { FinanceState } from './types';

const KEY = 'finance-tracker-v1';

export function loadState(): FinanceState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seedState();
    const parsed = JSON.parse(raw) as FinanceState;
    if (parsed.version !== 1 || !Array.isArray(parsed.categories)) return seedState();
    return {
      ...seedState(),
      ...parsed,
      // Re-seed categories/funds if the seed ever grows, keep user data.
      categories: mergeSeed(parsed.categories, seedState().categories),
      funds: mergeFunds(parsed.funds, seedState().funds),
    };
  } catch {
    return seedState();
  }
}

function mergeSeed(
  user: FinanceState['categories'],
  seed: FinanceState['categories'],
): FinanceState['categories'] {
  const ids = new Set(user.map((c) => c.id));
  return [...user, ...seed.filter((c) => !ids.has(c.id))];
}

function mergeFunds(user: FinanceState['funds'], seed: FinanceState['funds']): FinanceState['funds'] {
  const ids = new Set(user.map((f) => f.id));
  return [...user, ...seed.filter((f) => !ids.has(f.id))];
}

export function saveState(state: FinanceState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable: app keeps working in-memory.
  }
}

export function exportJSON(state: FinanceState): string {
  return JSON.stringify(state, null, 2);
}

export function importJSON(raw: string): FinanceState {
  const parsed = JSON.parse(raw) as FinanceState;
  if (parsed.version !== 1 || !Array.isArray(parsed.categories) || !Array.isArray(parsed.funds)) {
    throw new Error('Not a finance-tracker backup file.');
  }
  return parsed;
}
