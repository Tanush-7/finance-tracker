# Finance Tracker

A personal monthly finance tracker that replaces a Google Sheet workflow with an
interactive web app. Enter actuals per category each month and get **instant**
budget-vs-actual feedback: overspends flag red inline and immediately ask
"Why?", so you tag the reason while it's fresh. Funds track SIP, value, and a
target with a growth graph and target line.

Live: https://tanush-7.github.io/finance-tracker/

## Features (v2)

- **Monthly entry** — pick a month, enter actuals per category; budgets are
  editable inline. Overspends turn red instantly, under-budget goes green.
- **Why/tag flow** — every overspend opens an inline prompt with quick-tag chips
  (Wedding, Travel, Medical, One-off, Festival, Emergency, Impulse) plus
  free-text tags and notes. No modals, no reports to file later.
- **Dashboard** — total spent vs budget cards, per-category budget-vs-actual bars
  for the month, 6-month inflow-vs-outflow bars, inflow / outflow / net saved /
  savings-rate cards.
- **Inflows** — log income per month by source (Salary, Freelance, Refund,
  Cashback, Gift, Other, plus your own). Net savings = inflow − outflow.
- **Investments** — fund list (PPFAS, Index Fund, Small Cap, Gold) with editable
  SIP, current value, and target; growth graph with target line; hitting a target
  triggers the same Why/tag prompt.
- **Transactions + suspicious-transaction radar** — optional transaction-level
  log. A client-side engine flags entries inline: unusually high vs the
  category's own history (3× median, needs 3+ prior entries), possible duplicate
  charges (same merchant + amount within 7 days), and first-time large payments
  (new merchant, ₹10,000+). A "Needs review" queue lets you mark items safe;
  safe merchants are remembered. This is an *additional* layer — the manual
  monthly-actuals entry is untouched.
- **Bank statement CSV import** — upload an ICICI netbanking / iMobile statement
  CSV, map the columns once (date, description, debit/credit or signed amount),
  preview, and import. DD-MM-YYYY dates and ₹/comma formatting handled. The file
  never leaves the device.
- **Auto-categorization** — imported narrations are matched against learned
  merchant mappings first, then a seeded keyword engine (Swiggy/Zomato →
  Groceries, Uber/Ola/IRCTC → Travel, Netflix/Hotstar → Entertainment,
  Amazon/Flipkart → Shopping, Cultpass → Fitness, Apollo/1mg → Misc, SIP →
  SIP, car/bike loan → EMIs). Matched rows carry an "auto" badge; unmatched
  rows land in a "Needs category" queue. Correcting a merchant teaches the app
  for next time.
- **Subscriptions** — name, category (AI, OTT, Apps, Music, Cloud, Other),
  amount, monthly/yearly cycle, renewal date, status (active/trial/cancelled).
  Monthly burn and projected yearly cost cards, "renewing in 30 days" list with
  trial-ending flags, per-category subtotals, and a warning when more than one
  AI subscription is active (the one-AI-sub rule).
- **Plan** — CA-style framework, all computed live from your numbers: editable
  50/30/20 allocation with rupee envelopes, per-bucket budget checks, emergency
  fund target (6× monthly outflow) with progress, monthly investment target vs
  actual SIP, EMI ≤ 40% of take-home debt-load rule, savings-rate target vs
  actual from Inflows.
- **Tags view** — chronological list of every tagged overspend and target
  crossing, with amounts and reasons.
- **Persistence** — everything in `localStorage`. Export/import JSON backup from
  the header.

## Honest notes

- The radar only checks what you enter or import. Real bank fraud still needs
  your bank's own transaction alerts — this is a second pair of eyes, not a
  replacement.
- The Plan tab uses standard educational frameworks (50/30/20, 6-month
  emergency fund, 40% debt-load rule) with adjustable defaults — not
  personalized financial advice.

## Stack (₹0)

React 19 + TypeScript + Vite + Tailwind v4 + Recharts, hosted on GitHub Pages.
No backend, no API keys, no network calls at runtime — fully offline-capable
after the page loads.

## Privacy

All data stays in this browser's `localStorage`. Nothing is sent anywhere.

## Example defaults

A fresh install ships with round-number example budgets and an example
take-home so the tabs are not empty - replace them with your own.
Monthly actuals are entered by hand in the app. There is no automatic sync.

## Roadmap

- Recurring-expense detection (rent, EMIs, SIPs flagged automatically)
- Per-category monthly trend sparklines
- Monthly actuals auto-summed from imported transactions (optional toggle)

## Develop

```sh
npm install
npm test
npm run dev
```
