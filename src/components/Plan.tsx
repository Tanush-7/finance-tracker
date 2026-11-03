import { currentMonthKey, monthLabel } from '../engine/seed';
import {
  emergencyPlan,
  emiCheck,
  formatINR,
  monthlyOutflow,
  planBucketInfo,
  planEnvelopes,
  savingsSummary,
  setPlan,
  setPlanBucket,
  sipActual,
} from '../engine/finance';
import type { FinanceState, PlanBucket } from '../engine/types';
import NumInput from './NumInput';

interface Props {
  state: FinanceState;
  month: string;
  setMonth: (m: string) => void;
  update: (fn: (s: FinanceState) => FinanceState) => void;
}

const BUCKETS: Array<{ id: PlanBucket; label: string }> = [
  { id: 'needs', label: 'Needs' },
  { id: 'wants', label: 'Wants' },
  { id: 'save', label: 'Save & Invest' },
];

export default function Plan({ state, month, setMonth, update }: Props) {
  const cfg = state.plan;
  const env = planEnvelopes(cfg);
  const bucketInfo = planBucketInfo(state, cfg);
  const pctSum = cfg.needsPct + cfg.wantsPct + cfg.savePct;

  const emerg = emergencyPlan(state, cfg, month);
  const emi = emiCheck(state, cfg, month);
  const sip = sipActual(state, month);
  const sav = savingsSummary(state, month);
  const outflow = monthlyOutflow(state, month);

  const pctInput = (
    label: string,
    value: number,
    onChange: (v: number | null) => void,
  ) => (
    <label className="block">
      <span className="mb-1 block text-[11px] uppercase tracking-wide text-slate-400">{label}</span>
      <div className="flex items-center gap-1">
        <div className="w-20">
          <NumInput ariaLabel={`${label} percent`} value={value} onChange={onChange} />
        </div>
        <span className="text-sm text-slate-500">%</span>
      </div>
    </label>
  );

  return (
    <div>
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3">
        <label className="block">
          <span className="mb-1 block text-[11px] uppercase tracking-wide text-slate-400">
            Monthly take-home pay
          </span>
          <div className="w-48">
            <NumInput
              ariaLabel="Monthly take-home pay"
              value={cfg.takeHome}
              onChange={(v) => update((s) => setPlan(s, { takeHome: v ?? 0 }))}
            />
          </div>
        </label>
        <p className="mt-1 text-xs text-slate-500">
          Prefilled from ₹17.5L fixed ÷ 12 (pre-tax). Edit to your actual take-home.
        </p>
      </div>

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3">
        <p className="mb-2 text-sm font-semibold">Allocation</p>
        <div className="grid grid-cols-3 gap-2">
          {pctInput('Needs', cfg.needsPct, (v) => update((s) => setPlan(s, { needsPct: v ?? 0 })))}
          {pctInput('Wants', cfg.wantsPct, (v) => update((s) => setPlan(s, { wantsPct: v ?? 0 })))}
          {pctInput('Save & invest', cfg.savePct, (v) => update((s) => setPlan(s, { savePct: v ?? 0 })))}
        </div>
        {pctSum !== 100 && (
          <p className="mt-1 text-xs font-medium text-amber-700">
            Percentages add to {pctSum}% — envelopes still compute per bucket.
          </p>
        )}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-slate-50 p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Needs</p>
            <p className="text-lg font-bold tabular-nums">₹{formatINR(env.needs)}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Wants</p>
            <p className="text-lg font-bold tabular-nums">₹{formatINR(env.wants)}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Save</p>
            <p className="text-lg font-bold tabular-nums text-emerald-700">₹{formatINR(env.save)}</p>
          </div>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3">
        <p className="mb-2 text-sm font-semibold">Bucket check — budgets vs envelopes</p>
        <div className="space-y-2">
          {bucketInfo.map((b) => (
            <div
              key={b.bucket}
              className={`rounded-lg border p-2.5 ${b.over ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
            >
              <div className="flex justify-between text-sm">
                <span className="font-semibold">
                  {b.label} <span className="font-normal text-slate-500">({b.pct}%)</span>
                </span>
                <span className={`font-semibold tabular-nums ${b.over ? 'text-red-700' : 'text-slate-700'}`}>
                  ₹{formatINR(b.budgeted)} / ₹{formatINR(b.envelope)}
                </span>
              </div>
              {b.over && (
                <p className="mt-0.5 text-xs font-medium text-red-700">
                  ₹{formatINR(b.budgeted - b.envelope)} over envelope — trim a budget or move a category.
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3">
        <p className="mb-2 text-sm font-semibold">Category buckets (tap to reclassify)</p>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {state.categories.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5">
              <span className="text-sm font-medium">{c.name}</span>
              <select
                value={cfg.buckets[c.id] ?? 'wants'}
                onChange={(e) => update((s) => setPlanBucket(s, c.id, e.target.value as PlanBucket))}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
                aria-label={`Bucket for ${c.name}`}
              >
                {BUCKETS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <div className="mb-2 flex items-center gap-2">
          <p className="text-sm font-semibold">The CA playbook — {monthLabel(month)}</p>
          <input
            type="month"
            value={month}
            onChange={(e) => e.target.value && setMonth(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium"
            aria-label="Select month"
          />
          <button
            onClick={() => setMonth(currentMonthKey())}
            className="rounded-lg bg-slate-200 px-2 py-1 text-xs font-medium text-slate-700"
          >
            This month
          </button>
        </div>

        <div className="space-y-2">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-sm font-semibold">Emergency fund</p>
            <p className="text-xs text-slate-500">Target = 6 × monthly outflow (₹{formatINR(outflow)}/mo)</p>
            <p className="mt-1 text-lg font-bold tabular-nums">₹{formatINR(emerg.target)}</p>
            <label className="mt-2 block">
              <span className="mb-1 block text-[11px] uppercase tracking-wide text-slate-400">
                Current emergency savings
              </span>
              <div className="w-48">
                <NumInput
                  ariaLabel="Current emergency savings"
                  value={cfg.emergencySaved || null}
                  onChange={(v) => update((s) => setPlan(s, { emergencySaved: v ?? 0 }))}
                />
              </div>
            </label>
            {emerg.pct != null && (
              <div className="mt-2">
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${Math.min(100, emerg.pct)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs font-medium text-slate-600">
                  {emerg.pct >= 100 ? 'Funded.' : `${emerg.pct.toFixed(0)}% of target reached.`}
                </p>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-sm font-semibold">Monthly investment target</p>
            <p className="text-xs text-slate-500">Save envelope vs actual SIP this month</p>
            <p className="mt-1 text-lg font-bold tabular-nums">
              ₹{formatINR(sip ?? 0)} <span className="text-sm font-normal text-slate-500">/ ₹{formatINR(env.save)} target</span>
            </p>
            {sip == null ? (
              <p className="text-xs text-slate-400">SIP actual not entered for this month.</p>
            ) : sip >= env.save ? (
              <p className="text-xs font-medium text-emerald-700">On target.</p>
            ) : (
              <p className="text-xs font-medium text-amber-700">
                ₹{formatINR(env.save - sip)} short of the save envelope.
              </p>
            )}
          </div>

          <div className={`rounded-xl border p-3 ${emi.over ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'}`}>
            <p className="text-sm font-semibold">Debt load</p>
            <p className="text-xs text-slate-500">Rule: total EMIs at or under 40% of take-home</p>
            <p className={`mt-1 text-lg font-bold tabular-nums ${emi.over ? 'text-red-700' : ''}`}>
              ₹{formatINR(emi.total)}
              <span className="text-sm font-normal text-slate-500">
                {' '}({emi.ratioPct != null ? `${emi.ratioPct.toFixed(1)}%` : '—'} of take-home)
              </span>
            </p>
            {emi.over ? (
              <p className="text-xs font-medium text-red-700">Over the 40% line — EMIs are eating too much income.</p>
            ) : (
              <p className="text-xs font-medium text-emerald-700">Within the 40% line.</p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-sm font-semibold">Savings rate</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs text-slate-500">Target</span>
              <div className="w-20">
                <NumInput
                  ariaLabel="Savings rate target percent"
                  value={cfg.savingsTargetPct}
                  onChange={(v) => update((s) => setPlan(s, { savingsTargetPct: v ?? 0 }))}
                />
              </div>
              <span className="text-xs text-slate-500">% of income</span>
            </div>
            <p className="mt-1 text-lg font-bold tabular-nums">
              {sav.rate != null ? `${sav.rate.toFixed(1)}%` : '—'}
              <span className="text-sm font-normal text-slate-500"> actual (from Inflows)</span>
            </p>
            {sav.rate != null &&
              (sav.rate >= cfg.savingsTargetPct ? (
                <p className="text-xs font-medium text-emerald-700">At or above target.</p>
              ) : (
                <p className="text-xs font-medium text-amber-700">
                  {(cfg.savingsTargetPct - sav.rate).toFixed(1)} pts below target.
                </p>
              ))}
          </div>
        </div>
      </div>

      <p className="rounded-xl bg-slate-100 p-3 text-xs text-slate-500">
        Standard 50/30/20-style frameworks for education — not personalized financial advice.
        Percentages, buckets, and targets are adjustable defaults.
      </p>
    </div>
  );
}
