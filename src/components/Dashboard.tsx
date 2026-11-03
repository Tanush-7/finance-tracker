import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { monthLabel, monthRange } from '../engine/seed';
import { formatINR, getEntry, getOverspends, monthInflow, monthTotals, savingsSummary } from '../engine/finance';
import type { FinanceState } from '../engine/types';

interface Props {
  state: FinanceState;
  month: string;
  setMonth: (m: string) => void;
}

function axisFmt(v: number): string {
  if (v >= 100000) return `${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `${Math.round(v / 1000)}k`;
  return String(v);
}

export default function Dashboard({ state, month, setMonth }: Props) {
  const totals = monthTotals(state, month);
  const overs = getOverspends(state, month);
  const sav = savingsSummary(state, month);

  const barData = state.categories
    .filter((c) => {
      const e = getEntry(state, month, c.id);
      return (c.budget != null && c.budget > 0) || e.actual != null;
    })
    .map((c) => {
      const e = getEntry(state, month, c.id);
      const budget = c.budget ?? 0;
      const actual = e.actual ?? 0;
      return { name: c.name, Budget: budget, Actual: actual, over: budget > 0 && actual > budget };
    });

  const trendData = monthRange(month, 6).map((m) => {
    const t = monthTotals(state, m);
    return { month: monthLabel(m), Inflow: monthInflow(state, m), Outflow: t.totalActual };
  });

  const cards = [
    { label: 'Spent', value: totals.totalActual, tone: 'text-slate-900' },
    { label: 'Budget', value: totals.totalBudget, tone: 'text-slate-900' },
    {
      label: totals.diff != null && totals.diff > 0 ? 'Over' : 'Under',
      value: totals.diff == null ? 0 : Math.abs(totals.diff),
      tone: totals.diff == null ? 'text-slate-400' : totals.diff > 0 ? 'text-red-600' : 'text-emerald-600',
    },
    { label: 'Overspends', value: null as number | null, count: overs.length, tone: overs.length ? 'text-red-600' : 'text-emerald-600' },
  ];

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

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">{c.label}</p>
            <p className={`text-xl font-bold tabular-nums ${c.tone}`}>
              {c.value == null ? c.count : `₹${formatINR(c.value)}`}
            </p>
          </div>
        ))}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Inflow</p>
          <p className="text-xl font-bold tabular-nums text-emerald-600">₹{formatINR(sav.inflow)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Outflow</p>
          <p className="text-xl font-bold tabular-nums text-slate-900">₹{formatINR(sav.outflow)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Net saved</p>
          <p className={`text-xl font-bold tabular-nums ${sav.net < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            ₹{formatINR(sav.net)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Savings rate</p>
          <p className="text-xl font-bold tabular-nums text-slate-900">
            {sav.rate != null ? `${sav.rate.toFixed(1)}%` : '—'}
          </p>
        </div>
      </div>

      {overs.length > 0 && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-semibold text-red-800">Over budget this month</p>
          <ul className="mt-1 space-y-1">
            {overs.map((o) => (
              <li key={o.categoryId} className="flex justify-between text-sm text-red-700">
                <span>
                  {o.categoryName}
                  {o.tag ? <span className="ml-2 rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-medium text-amber-900">{o.tag}</span> : null}
                </span>
                <span className="font-semibold tabular-nums">+₹{formatINR(o.over)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3">
        <p className="mb-2 text-sm font-semibold">Budget vs actual — {monthLabel(month)}</p>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={barData} layout="vertical" margin={{ left: 8, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tickFormatter={axisFmt} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={86} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number | undefined) => `₹${formatINR(v ?? 0)}`} />
            <Legend />
            <Bar dataKey="Budget" fill="#94a3b8" />
            <Bar dataKey="Actual">
              {barData.map((d, i) => (
                <Cell key={i} fill={d.over ? '#dc2626' : '#059669'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <p className="mb-2 text-sm font-semibold">6-month inflow vs outflow</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={trendData} margin={{ left: 0, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={axisFmt} tick={{ fontSize: 11 }} width={44} />
            <Tooltip formatter={(v: number | undefined) => `₹${formatINR(v ?? 0)}`} />
            <Legend />
            <Bar dataKey="Inflow" fill="#059669" />
            <Bar dataKey="Outflow" fill="#dc2626" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
