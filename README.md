# Finance Tracker

A personal monthly finance tracker that replaces a Google Sheet workflow with an
interactive web app. Enter actuals per category each month and get **instant**
budget-vs-actual feedback: overspends flag red inline and immediately ask
"Why?", so you tag the reason while it's fresh. Funds track SIP, value, and a
target with a growth graph and target line.

Live: https://tanush-7.github.io/finance-tracker/

## Features (v1)

- **Monthly entry** — pick a month, enter actuals per category; budgets are
  editable inline. Overspends turn red instantly, under-budget goes green.
- **Why/tag flow** — every overspend opens an inline prompt with quick-tag chips
  (Wedding, Travel, Medical, One-off, Festival, Emergency, Impulse) plus
  free-text tags and notes. No modals, no reports to file later.
- **Dashboard** — total spent vs budget cards, per-category budget-vs-actual bars
  for the month, 6-month spend trend line.
- **Investments** — fund list (PPFAS, Index Fund, Small Cap, Gold) with editable
  SIP, current value, and target; growth graph with target line; hitting a target
  triggers the same Why/tag prompt.
- **Tags view** — chronological list of every tagged overspend and target
  crossing, with amounts and reasons.
- **Persistence** — everything in `localStorage`. Export/import JSON backup from
  the header.

## Stack (₹0)

React 19 + TypeScript + Vite + Tailwind v4 + Recharts, hosted on GitHub Pages.
No backend, no API keys, no network calls at runtime — fully offline-capable
after the page loads.

## Privacy

All data stays in this browser's `localStorage`. Nothing is sent anywhere.

## Seed from sheet (manual, v1)

Budgets are seeded from the "Finances 2" Google Sheet (Monthly budget tab).
Monthly actuals are entered by hand in the app. There is no automatic sync.

## Roadmap

- CSV import from the Fold app transaction export (export sits behind Fold Plus)
- Recurring-expense detection (rent, EMIs, SIPs flagged automatically)
- Per-category monthly trend sparklines

## Develop

```sh
npm install
npm test
npm run dev
```
