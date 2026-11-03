import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { monthLabel } from '../engine/seed';
import {
  formatINR,
  fundCrossings,
  setFundSip,
  setFundTag,
  setFundTarget,
  setFundValue,
} from '../engine/finance';
import type { FinanceState } from '../engine/types';
import NumInput from './NumInput';
import TagPrompt from './TagPrompt';

interface Props {
  state: FinanceState;
  month: string;
  setMonth: (m: string) => void;
  update: (fn: (s: FinanceState) => FinanceState) => void;
}

function axisFmt(v: number): string {
  if (v >= 100000) return `${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `${Math.round(v / 1000)}k`;
  return String(v);
}

export default function Investments({ state, month, setMonth, update }: Props) {
  return (
    <div>
      <div className="mb-4">
        <input
          type="month"
          value={month}
          onChange={(e) => e.target.value && setMonth(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium"
          aria-label="Select month"
        />
      </div>

      <div className="space-y-3">
        {state.funds.map((f) => {
          const months = Object.keys(f.values).sort();
          const chartData = months.map((m) => ({ month: monthLabel(m), Value: f.values[m] }));
          const crossings = fundCrossings(f, state.fundTags[f.id] ?? {});
          const crossedThisMonth = crossings.some((c) => c.month === month);
          const value = f.values[month];

          return (
            <div
              key={f.id}
              className={`rounded-xl border bg-white p-3 ${crossedThisMonth ? 'border-emerald-300' : 'border-slate-200'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{f.name}</span>
                {crossedThisMonth && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                    Target hit
                  </span>
                )}
              </div>

              <div className="mt-2 grid grid-cols-3 gap-2">
                <label className="block">
                  <span className="mb-1 block text-[11px] uppercase tracking-wide text-slate-400">SIP</span>
                  <NumInput ariaLabel={`${f.name} SIP`} value={f.sip} onChange={(v) => update((s) => setFundSip(s, f.id, v ?? 0))} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] uppercase tracking-wide text-slate-400">Target</span>
                  <NumInput ariaLabel={`${f.name} target`} value={f.target} onChange={(v) => update((s) => setFundTarget(s, f.id, v))} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] uppercase tracking-wide text-slate-400">Value ({monthLabel(month)})</span>
                  <NumInput ariaLabel={`${f.name} value`} value={value ?? null} onChange={(v) => update((s) => setFundValue(s, f.id, month, v))} />
                </label>
              </div>

              {chartData.length > 0 && (
                <div className="mt-3">
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={chartData} margin={{ left: 0, right: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={axisFmt} tick={{ fontSize: 11 }} width={44} />
                      <Tooltip formatter={(v: number | undefined) => `₹${formatINR(v ?? 0)}`} />
                      <Legend />
                      <Line type="monotone" dataKey="Value" stroke="#4f46e5" strokeWidth={2} />
                      {f.target != null && f.target > 0 && (
                        <ReferenceLine y={f.target} stroke="#059669" strokeDasharray="5 5" label={{ value: 'Target', fontSize: 11, fill: '#059669' }} />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {crossedThisMonth &&
                (() => {
                  const c = crossings.find((x) => x.month === month)!;
                  return (
                    <TagPrompt
                      currentTag={c.tag}
                      currentNote={c.note}
                      onSave={(tag, note) => update((s) => setFundTag(s, f.id, month, tag, note))}
                      onClear={() => update((s) => setFundTag(s, f.id, month, '', ''))}
                    />
                  );
                })()}

              {crossings.length > 0 && (
                <p className="mt-2 text-xs text-slate-500">
                  Target crossed: {crossings.map((c) => monthLabel(c.month)).join(', ')}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
