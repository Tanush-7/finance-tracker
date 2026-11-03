import { monthLabel } from '../engine/seed';
import { allTags, formatINR } from '../engine/finance';
import type { FinanceState } from '../engine/types';

export default function Tags({ state }: { state: FinanceState }) {
  const tags = allTags(state);

  if (tags.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm font-semibold text-slate-700">No tagged events yet</p>
        <p className="mt-1 text-xs text-slate-500">
          When a category crosses its budget or a fund hits its target, tag the reason and it lands here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tags.map((t, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                t.kind === 'overspend' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {t.kind === 'overspend' ? 'Overspend' : 'Target hit'}
            </span>
            <span className="text-xs text-slate-400">{monthLabel(t.month)}</span>
          </div>
          <p className="mt-1 text-sm font-semibold">{t.label}</p>
          <p className="text-sm tabular-nums text-slate-600">
            ₹{formatINR(t.amount)}{' '}
            <span className="text-slate-400">
              vs ₹{formatINR(t.reference)} (+₹{formatINR(t.delta)})
            </span>
          </p>
          <p className="mt-1">
            <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-900">{t.tag}</span>
            {t.note && <span className="ml-2 text-xs text-slate-500">{t.note}</span>}
          </p>
        </div>
      ))}
    </div>
  );
}
