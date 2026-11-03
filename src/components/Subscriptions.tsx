import { useState } from 'react';
import { toISODate } from '../engine/seed';
import {
  addSubscription,
  aiOverload,
  dayDiff,
  formatINR,
  monthlyBurn,
  removeSubscription,
  renewingSoon,
  subCategoryTotals,
  updateSubscription,
  yearlyCost,
} from '../engine/finance';
import type { FinanceState, SubCategory, SubCycle, Subscription, SubStatus } from '../engine/types';
import NumInput from './NumInput';

interface Props {
  state: FinanceState;
  update: (fn: (s: FinanceState) => FinanceState) => void;
}

const CATEGORIES: SubCategory[] = ['AI', 'OTT', 'Apps', 'Music', 'Cloud', 'Other'];

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `sub-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

export default function Subscriptions({ state, update }: Props) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<SubCategory>('AI');
  const [amount, setAmount] = useState<number | null>(null);
  const [cycle, setCycle] = useState<SubCycle>('monthly');
  const [renewal, setRenewal] = useState(() => toISODate(new Date()));
  const [status, setStatus] = useState<SubStatus>('active');

  const subs = state.subscriptions;
  const burn = monthlyBurn(subs);
  const yearly = yearlyCost(subs);
  const renewals = renewingSoon(subs);
  const catTotals = subCategoryTotals(subs);
  const overload = aiOverload(subs);

  const add = () => {
    if (!name.trim() || amount == null || amount <= 0 || !renewal) return;
    const sub: Subscription = {
      id: newId(),
      name: name.trim(),
      category,
      amount,
      cycle,
      renewalDate: renewal,
      status,
    };
    update((s) => addSubscription(s, sub));
    setName('');
    setAmount(null);
  };

  return (
    <div>
      {overload && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm font-semibold text-amber-900">
            {subs.filter((s) => s.category === 'AI' && s.status !== 'cancelled').length} AI subscriptions
            active — your rule is one. Pick a winner.
          </p>
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Monthly burn</p>
          <p className="text-xl font-bold tabular-nums text-slate-900">₹{formatINR(burn)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Projected yearly</p>
          <p className="text-xl font-bold tabular-nums text-slate-900">₹{formatINR(yearly)}</p>
        </div>
      </div>

      {renewals.length > 0 && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3">
          <p className="mb-2 text-sm font-semibold">Renewing in the next 30 days</p>
          <ul className="space-y-1.5">
            {renewals.map((r) => (
              <li key={r.id} className="flex items-center justify-between text-sm">
                <span>
                  <span className="font-medium">{r.name}</span>
                  {r.status === 'trial' && (
                    <span className="ml-2 rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                      trial ending
                    </span>
                  )}
                </span>
                <span className="text-xs text-slate-500 tabular-nums">
                  {r.renewalDate} · {r.daysLeft === 0 ? 'today' : `in ${r.daysLeft}d`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {catTotals.length > 0 && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3">
          <p className="mb-2 text-sm font-semibold">Monthly cost by category</p>
          <ul className="space-y-1">
            {catTotals.map((c) => (
              <li key={c.category} className="flex justify-between text-sm">
                <span className="font-medium">{c.category}</span>
                <span className="font-semibold tabular-nums">₹{formatINR(c.total)}/mo</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3">
        <p className="mb-2 text-sm font-semibold">Add subscription</p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name, e.g. Claude Pro"
          className="mb-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as SubCategory)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm"
            aria-label="Subscription category"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={cycle}
            onChange={(e) => setCycle(e.target.value as SubCycle)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm"
            aria-label="Billing cycle"
          >
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <div>
            <NumInput ariaLabel="Subscription amount" value={amount} onChange={setAmount} placeholder="Amount ₹" />
          </div>
          <input
            type="date"
            value={renewal}
            onChange={(e) => setRenewal(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            aria-label="Renewal date"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as SubStatus)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm"
            aria-label="Status"
          >
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button
            onClick={add}
            disabled={!name.trim() || amount == null || amount <= 0}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <p className="mb-2 text-sm font-semibold">All subscriptions ({subs.length})</p>
        {subs.length === 0 ? (
          <p className="text-sm text-slate-400">None yet.</p>
        ) : (
          <ul className="space-y-2">
            {subs.map((s) => {
              const days = dayDiff(toISODate(new Date()), s.renewalDate);
              return (
                <li key={s.id} className="rounded-lg border border-slate-100 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{s.name}</p>
                      <p className="text-xs text-slate-500 tabular-nums">
                        {s.category} · ₹{formatINR(s.amount)}/{s.cycle === 'monthly' ? 'mo' : 'yr'}
                        {' · '}
                        {days < 0 ? `renewed ${-days}d ago` : days === 0 ? 'renews today' : `renews in ${days}d`}
                      </p>
                    </div>
                    <button
                      onClick={() => update((st) => removeSubscription(st, s.id))}
                      className="shrink-0 text-xs text-slate-400 hover:text-red-600"
                      aria-label={`Delete ${s.name}`}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="mt-1.5 flex gap-2">
                    <select
                      value={s.status}
                      onChange={(e) => update((st) => updateSubscription(st, s.id, { status: e.target.value as SubStatus }))}
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
                      aria-label={`Status of ${s.name}`}
                    >
                      <option value="active">Active</option>
                      <option value="trial">Trial</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <input
                      type="date"
                      value={s.renewalDate}
                      onChange={(e) => e.target.value && update((st) => updateSubscription(st, s.id, { renewalDate: e.target.value }))}
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
                      aria-label={`Renewal date of ${s.name}`}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
