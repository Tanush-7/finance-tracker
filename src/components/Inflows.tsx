import { useState } from 'react';
import { currentMonthKey, monthLabel } from '../engine/seed';
import {
  addInflow,
  addInflowSource,
  formatINR,
  monthInflow,
  removeInflow,
  removeInflowSource,
  savingsSummary,
  sourceName,
} from '../engine/finance';
import type { FinanceState } from '../engine/types';
import NumInput from './NumInput';

interface Props {
  state: FinanceState;
  month: string;
  setMonth: (m: string) => void;
  update: (fn: (s: FinanceState) => FinanceState) => void;
}

export default function Inflows({ state, month, setMonth, update }: Props) {
  const [sourceId, setSourceId] = useState('salary');
  const [amount, setAmount] = useState<number | null>(null);
  const [newSource, setNewSource] = useState('');

  const entries = state.inflows[month] ?? [];
  const total = monthInflow(state, month);
  const summary = savingsSummary(state, month);

  const add = () => {
    if (!sourceId || amount == null || amount <= 0) return;
    update((s) => addInflow(s, month, sourceId, amount));
    setAmount(null);
  };

  const addSource = () => {
    if (!newSource.trim()) return;
    update((s) => addInflowSource(s, newSource));
    setNewSource('');
  };

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

      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Inflow</p>
          <p className="text-xl font-bold tabular-nums text-emerald-600">₹{formatINR(total)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Outflow</p>
          <p className="text-xl font-bold tabular-nums text-slate-900">₹{formatINR(summary.outflow)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Net saved</p>
          <p className={`text-xl font-bold tabular-nums ${summary.net < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            ₹{formatINR(summary.net)}
          </p>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3">
        <p className="mb-2 text-sm font-semibold">Log income — {monthLabel(month)}</p>
        <div className="flex gap-2">
          <select
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            aria-label="Income source"
          >
            {state.inflowSources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <div className="w-36">
            <NumInput ariaLabel="Income amount" value={amount} onChange={setAmount} placeholder="Amount" />
          </div>
          <button
            onClick={add}
            disabled={amount == null || amount <= 0}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            Add
          </button>
        </div>

        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={newSource}
            onChange={(e) => setNewSource(e.target.value)}
            placeholder="New source, e.g. Bonus"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
          />
          <button
            onClick={addSource}
            disabled={!newSource.trim()}
            className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-40"
          >
            Add source
          </button>
        </div>
      </div>

      {entries.length > 0 && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3">
          <p className="mb-2 text-sm font-semibold">Entries</p>
          <ul className="space-y-1.5">
            {entries.map((e, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="font-medium">{sourceName(state, e.sourceId)}</span>
                <span className="flex items-center gap-2">
                  <span className="font-semibold tabular-nums text-emerald-700">+₹{formatINR(e.amount)}</span>
                  <button
                    onClick={() => update((s) => removeInflow(s, month, i))}
                    className="text-xs text-slate-400 hover:text-red-600"
                    aria-label="Remove entry"
                  >
                    ✕
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <p className="mb-2 text-sm font-semibold">Sources</p>
        <div className="flex flex-wrap gap-1.5">
          {state.inflowSources.map((s) => (
            <span
              key={s.id}
              className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
            >
              {s.name}
              <button
                onClick={() => update((st) => removeInflowSource(st, s.id))}
                className="text-slate-400 hover:text-red-600"
                aria-label={`Remove source ${s.name}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
