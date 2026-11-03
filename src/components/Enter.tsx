import { currentMonthKey, monthLabel } from '../engine/seed';
import { formatINR, getEntry, monthTotals, setActual, setBudget, setTag } from '../engine/finance';
import type { FinanceState } from '../engine/types';
import NumInput from './NumInput';
import TagPrompt from './TagPrompt';

interface Props {
  state: FinanceState;
  month: string;
  setMonth: (m: string) => void;
  update: (fn: (s: FinanceState) => FinanceState) => void;
}

export default function Enter({ state, month, setMonth, update }: Props) {
  const totals = monthTotals(state, month);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <input
          type="month"
          value={month}
          onChange={(e) => e.target.value && setMonth(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium"
          aria-label="Select month"
        />
        <button
          onClick={() => setMonth(currentMonthKey())}
          className="rounded-lg bg-slate-200 px-3 py-2 text-xs font-medium text-slate-700"
        >
          This month
        </button>
      </div>

      <div
        className={`mb-4 rounded-xl p-4 text-white ${
          totals.diff == null ? 'bg-slate-500' : totals.diff > 0 ? 'bg-red-600' : 'bg-emerald-600'
        }`}
      >
        <p className="text-xs uppercase tracking-wide opacity-80">{monthLabel(month)} total</p>
        <p className="text-2xl font-bold tabular-nums">₹{formatINR(totals.totalActual)}</p>
        <p className="text-sm opacity-90">
          {totals.diff == null
            ? `Budget ₹${formatINR(totals.totalBudget)} — nothing entered yet`
            : totals.diff > 0
              ? `₹${formatINR(totals.diff)} over budget`
              : `₹${formatINR(-totals.diff)} under budget`}
        </p>
      </div>

      <div className="space-y-2">
        {state.categories.map((c) => {
          const entry = getEntry(state, month, c.id);
          const hasBudget = c.budget != null && c.budget > 0;
          const over = hasBudget && entry.actual != null && entry.actual > (c.budget as number);
          const under = hasBudget && entry.actual != null && entry.actual <= (c.budget as number);
          return (
            <div
              key={c.id}
              className={`rounded-xl border bg-white p-3 ${
                over ? 'border-red-300' : under ? 'border-emerald-200' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{c.name}</span>
                {over && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                    +₹{formatINR(entry.actual! - (c.budget as number))}
                  </span>
                )}
                {under && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                    −₹{formatINR((c.budget as number) - entry.actual!)}
                  </span>
                )}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1 block text-[11px] uppercase tracking-wide text-slate-400">Budget</span>
                  <NumInput
                    ariaLabel={`${c.name} budget`}
                    value={c.budget}
                    onChange={(v) => update((s) => setBudget(s, c.id, v))}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] uppercase tracking-wide text-slate-400">Actual</span>
                  <NumInput
                    ariaLabel={`${c.name} actual`}
                    value={entry.actual}
                    onChange={(v) => update((s) => setActual(s, month, c.id, v))}
                  />
                </label>
              </div>
              {over && (
                <TagPrompt
                  currentTag={entry.tag}
                  currentNote={entry.note}
                  onSave={(tag, note) => update((s) => setTag(s, month, c.id, tag, note))}
                  onClear={() => update((s) => setTag(s, month, c.id, '', ''))}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
