import { useCallback, useRef, useState } from 'react';
import Dashboard from './components/Dashboard';
import Enter from './components/Enter';
import Investments from './components/Investments';
import Tags from './components/Tags';
import { currentMonthKey } from './engine/seed';
import { exportJSON, importJSON, loadState, saveState } from './engine/store';
import type { FinanceState } from './engine/types';

const TABS = ['Enter', 'Dashboard', 'Investments', 'Tags'] as const;
type Tab = (typeof TABS)[number];

export default function App() {
  const [state, setState] = useState<FinanceState>(loadState);
  const [tab, setTab] = useState<Tab>('Enter');
  const [month, setMonth] = useState<string>(() => currentMonthKey());
  const fileRef = useRef<HTMLInputElement>(null);

  const update = useCallback((fn: (s: FinanceState) => FinanceState) => {
    setState((prev) => {
      const next = fn(prev);
      saveState(next);
      return next;
    });
  }, []);

  const doExport = () => {
    const blob = new Blob([exportJSON(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'finance-tracker-backup.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const doImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = importJSON(String(reader.result));
        saveState(next);
        setState(next);
      } catch {
        alert('That file is not a finance-tracker backup.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen text-slate-900">
      <header className="bg-slate-900 text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold tracking-tight">Finance Tracker</h1>
          <div className="flex gap-2">
            <button
              onClick={doExport}
              className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600"
            >
              Export
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-600"
            >
              Import
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) doImport(f);
                e.target.value = '';
              }}
            />
          </div>
        </div>
        <nav className="mx-auto flex max-w-3xl gap-1 px-4 pb-3">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg px-2 py-2 text-sm font-medium ${
                tab === t ? 'bg-white text-slate-900' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {t}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-4">
        {tab === 'Enter' && <Enter state={state} month={month} setMonth={setMonth} update={update} />}
        {tab === 'Dashboard' && <Dashboard state={state} month={month} setMonth={setMonth} />}
        {tab === 'Investments' && (
          <Investments state={state} month={month} setMonth={setMonth} update={update} />
        )}
        {tab === 'Tags' && <Tags state={state} />}
      </main>

      <footer className="mx-auto max-w-3xl px-4 pb-8 text-center text-xs text-slate-400">
        All data stays in this browser (localStorage). Nothing leaves your device.
      </footer>
    </div>
  );
}
