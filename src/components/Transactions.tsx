import { useState } from 'react';
import { toISODate } from '../engine/seed';
import {
  addTransaction,
  addTransactions,
  analyzeTransactions,
  autoCategorize,
  correctTxCategory,
  detectMapping,
  formatINR,
  markTxSafe,
  newTxId,
  normalizeMerchant,
  parseCSV,
  removeTransaction,
  rowsToTransactions,
  uncategorizedTransactions,
} from '../engine/finance';
import type { FinanceState, Transaction } from '../engine/types';
import type { CsvMapping } from '../engine/finance';
import NumInput from './NumInput';

interface Props {
  state: FinanceState;
  update: (fn: (s: FinanceState) => FinanceState) => void;
}

const FLAG_TONE: Record<string, string> = {
  outlier: 'bg-orange-100 text-orange-800',
  duplicate: 'bg-red-100 text-red-800',
  'first-large': 'bg-amber-100 text-amber-800',
};

function CategorySelect({
  state,
  value,
  onChange,
  ariaLabel,
}: {
  state: FinanceState;
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm"
      aria-label={ariaLabel}
    >
      <option value="">Needs category</option>
      {state.categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}

export default function Transactions({ state, update }: Props) {
  const [date, setDate] = useState(() => toISODate(new Date()));
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState('misc');

  // CSV import state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvRows, setCsvRows] = useState<string[][] | null>(null);
  const [mapping, setMapping] = useState<CsvMapping | null>(null);
  const [importMsg, setImportMsg] = useState('');

  const flagged = analyzeTransactions(state);
  const needsCat = uncategorizedTransactions(state);

  const addManual = () => {
    if (!merchant.trim() || amount == null || amount <= 0 || !date) return;
    const tx: Transaction = {
      id: newTxId(),
      date,
      merchant: merchant.trim(),
      amount,
      categoryId,
      source: 'manual',
      autoCategorized: false,
    };
    update((s) => addTransaction(s, tx));
    setMerchant('');
    setAmount(null);
  };

  const onCsvFile = (file: File) => {
    setCsvFile(file);
    setImportMsg('');
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCSV(String(reader.result));
      if (rows.length < 2) {
        setCsvRows(null);
        setMapping(null);
        setImportMsg('No data rows found in this file.');
        return;
      }
      setCsvRows(rows);
      setMapping(detectMapping(rows[0]));
    };
    reader.readAsText(file);
  };

  const doImport = () => {
    if (!csvRows || !mapping || mapping.dateCol < 0 || mapping.descCol < 0) return;
    const { txs, skipped } = rowsToTransactions(csvRows.slice(1), mapping, state);
    update((s) => addTransactions(s, txs));
    const auto = txs.filter((t) => t.autoCategorized).length;
    setImportMsg(
      `Imported ${txs.length} transactions (${auto} auto-categorized, ${txs.length - auto} need a category). Skipped ${skipped} rows.`,
    );
    setCsvRows(null);
    setMapping(null);
    setCsvFile(null);
  };

  const preview =
    csvRows && mapping && mapping.dateCol >= 0 && mapping.descCol >= 0
      ? rowsToTransactions(csvRows.slice(1, 7), mapping, state).txs
      : [];

  const catName = (id: string) => state.categories.find((c) => c.id === id)?.name ?? 'Needs category';

  return (
    <div>
      {flagged.length > 0 && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-semibold text-red-800">
            Needs review — {flagged.length} suspicious transaction{flagged.length > 1 ? 's' : ''}
          </p>
          <ul className="mt-2 space-y-2">
            {flagged.map(({ tx, flags }) => (
              <li key={tx.id} className="rounded-lg bg-white p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{tx.merchant}</p>
                    <p className="text-xs text-slate-500 tabular-nums">
                      {tx.date} · ₹{formatINR(tx.amount)} · {catName(tx.categoryId)}
                    </p>
                  </div>
                  <button
                    onClick={() => update((s) => markTxSafe(s, tx.id))}
                    className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Mark safe
                  </button>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {flags.map((f, i) => (
                    <span
                      key={i}
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${FLAG_TONE[f.kind]}`}
                    >
                      {f.message}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {needsCat.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-semibold text-amber-900">
            Needs category — {needsCat.length} transaction{needsCat.length > 1 ? 's' : ''} unmatched
          </p>
          <p className="text-xs text-amber-700">Pick a category; the app learns the merchant for next time.</p>
          <ul className="mt-2 space-y-1.5">
            {needsCat.slice(0, 10).map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 rounded-lg bg-white p-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.merchant}</p>
                  <p className="text-xs text-slate-500 tabular-nums">
                    {t.date} · ₹{formatINR(t.amount)}
                  </p>
                </div>
                <CategorySelect
                  state={state}
                  value=""
                  onChange={(v) => v && update((s) => correctTxCategory(s, t.id, v))}
                  ariaLabel={`Category for ${t.merchant}`}
                />
              </li>
            ))}
          </ul>
          {needsCat.length > 10 && (
            <p className="mt-1 text-xs text-amber-700">+ {needsCat.length - 10} more in the full list below.</p>
          )}
        </div>
      )}

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3">
        <p className="mb-1 text-sm font-semibold">Import bank statement (CSV)</p>
        <p className="mb-2 text-xs text-slate-500">
          ICICI netbanking / iMobile statement download. The file never leaves this device.
        </p>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onCsvFile(f);
            e.target.value = '';
          }}
          className="text-sm"
          aria-label="Upload bank statement CSV"
        />
        {csvRows && mapping && (
          <div className="mt-3 rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-600">
              {csvFile?.name} — {csvRows.length - 1} data rows. Map the columns:
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <label className="block">
                <span className="mb-1 block font-medium text-slate-500">Date column *</span>
                <ColSelect headers={csvRows[0]} value={mapping.dateCol} onChange={(v) => setMapping({ ...mapping, dateCol: v })} />
              </label>
              <label className="block">
                <span className="mb-1 block font-medium text-slate-500">Description column *</span>
                <ColSelect headers={csvRows[0]} value={mapping.descCol} onChange={(v) => setMapping({ ...mapping, descCol: v })} />
              </label>
              <label className="block">
                <span className="mb-1 block font-medium text-slate-500">Amount style</span>
                <select
                  value={mapping.mode}
                  onChange={(e) => setMapping({ ...mapping, mode: e.target.value as 'split' | 'single' })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5"
                >
                  <option value="split">Separate debit / credit columns</option>
                  <option value="single">Single signed amount column</option>
                </select>
              </label>
              {mapping.mode === 'split' ? (
                <>
                  <label className="block">
                    <span className="mb-1 block font-medium text-slate-500">Debit column</span>
                    <ColSelect headers={csvRows[0]} value={mapping.debitCol} onChange={(v) => setMapping({ ...mapping, debitCol: v })} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block font-medium text-slate-500">Credit column</span>
                    <ColSelect headers={csvRows[0]} value={mapping.creditCol} onChange={(v) => setMapping({ ...mapping, creditCol: v })} />
                  </label>
                </>
              ) : (
                <label className="block">
                  <span className="mb-1 block font-medium text-slate-500">Amount column</span>
                  <ColSelect headers={csvRows[0]} value={mapping.amountCol} onChange={(v) => setMapping({ ...mapping, amountCol: v })} />
                </label>
              )}
            </div>
            {preview.length > 0 && (
              <div className="mt-2 overflow-x-auto">
                <p className="text-xs font-semibold text-slate-600">Preview (first {preview.length}):</p>
                <table className="mt-1 w-full text-xs">
                  <tbody>
                    {preview.map((t) => (
                      <tr key={t.id} className="border-t border-slate-200">
                        <td className="py-1 pr-2 tabular-nums">{t.date}</td>
                        <td className="max-w-[140px] truncate py-1 pr-2">{t.merchant}</td>
                        <td className="py-1 pr-2 text-right tabular-nums">₹{formatINR(t.amount)}</td>
                        <td className="py-1 text-slate-500">{t.categoryId ? catName(t.categoryId) : 'needs category'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <button
              onClick={doImport}
              disabled={mapping.dateCol < 0 || mapping.descCol < 0}
              className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              Import transactions
            </button>
          </div>
        )}
        {importMsg && <p className="mt-2 text-xs font-medium text-emerald-700">{importMsg}</p>}
      </div>

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3">
        <p className="mb-2 text-sm font-semibold">Log a transaction</p>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            aria-label="Transaction date"
          />
          <div>
            <NumInput ariaLabel="Transaction amount" value={amount} onChange={setAmount} placeholder="Amount ₹" />
          </div>
        </div>
        <input
          type="text"
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          placeholder="Merchant / description"
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        />
        <div className="mt-2 flex gap-2">
          <div className="min-w-0 flex-1">
            <CategorySelect state={state} value={categoryId} onChange={setCategoryId} ariaLabel="Transaction category" />
          </div>
          <button
            onClick={addManual}
            disabled={!merchant.trim() || amount == null || amount <= 0}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            Add
          </button>
        </div>
        {merchant.trim() && (
          <p className="mt-1.5 text-xs text-slate-500">
            {(() => {
              const c = autoCategorize(state, merchant);
              if (!c.categoryId) return 'No keyword match — pick a category.';
              return `Auto-match: ${catName(c.categoryId)}${c.via === 'learned' ? ' (learned)' : ''}`;
            })()}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <p className="mb-2 text-sm font-semibold">
          All transactions ({state.transactions.length})
        </p>
        {state.transactions.length === 0 ? (
          <p className="text-sm text-slate-400">Nothing logged yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {[...state.transactions]
              .sort((a, b) => (a.date < b.date ? 1 : -1))
              .slice(0, 50)
              .map((t) => {
                const flags = flagged.find((f) => f.tx.id === t.id)?.flags ?? [];
                const learned = state.learnedCategories[normalizeMerchant(t.merchant)] === t.categoryId && t.autoCategorized;
                return (
                  <li key={t.id} className="rounded-lg border border-slate-100 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{t.merchant}</p>
                        <p className="text-xs text-slate-500 tabular-nums">
                          {t.date} · ₹{formatINR(t.amount)}
                          {t.source === 'csv' ? ' · from statement' : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => update((s) => removeTransaction(s, t.id))}
                        className="shrink-0 text-xs text-slate-400 hover:text-red-600"
                        aria-label="Delete transaction"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <CategorySelect
                        state={state}
                        value={t.categoryId}
                        onChange={(v) => update((s) => correctTxCategory(s, t.id, v))}
                        ariaLabel={`Category for ${t.merchant}`}
                      />
                      {t.autoCategorized && (
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                          auto{learned ? ' · learned' : ''}
                        </span>
                      )}
                      {flags.map((f, i) => (
                        <span
                          key={i}
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${FLAG_TONE[f.kind]}`}
                        >
                          {f.kind === 'outlier' ? 'unusual' : f.kind === 'duplicate' ? 'duplicate?' : 'verify'}
                        </span>
                      ))}
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

function ColSelect({
  headers,
  value,
  onChange,
}: {
  headers: string[];
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5"
    >
      <option value={-1}>—</option>
      {headers.map((h, i) => (
        <option key={i} value={i}>
          {h || `(col ${i + 1})`}
        </option>
      ))}
    </select>
  );
}
