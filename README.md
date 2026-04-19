# FinTrack Pro 🚀

A production-grade personal finance management platform built with Next.js 14, Supabase, TypeScript, and Tailwind CSS.

---

## ✨ Features

| Feature | Details |
|---|---|
| 🔐 **Auth** | Email + Google OAuth via Supabase |
| 🏦 **Multi-Account** | Bank, Cash, Credit Card, Wallet, Investment, FD |
| 💰 **Transactions** | Full CRUD, splits, receipts, CSV import/export |
| 🗂️ **Categories** | 30 defaults, custom, nested parent/child |
| 🔍 **Advanced Filters** | Date presets, type, category, account, amount, tags, full-text search |
| 📊 **Analytics** | Charts (bar, area, line, pie), heatmap, trends |
| 🪙 **Chit Funds** | Auto payment schedule, mark payments, ROI tracking |
| 🎯 **Goals** | Target/deadline/progress, contribution tracking |
| 💼 **Budgets** | Category budgets, rollover, multi-threshold alerts |
| 🏛️ **Loans & EMI** | Schedule, EMI calculator, amortization, auto-pay |
| 📈 **Net Worth** | Assets, liabilities, liquid assets, snapshots |
| 🧠 **Smart Insights** | AI-driven spending analysis and recommendations |
| 🔁 **Recurring** | Auto-recurring transaction rules |
| 📂 **Reports** | PDF & CSV export, monthly/category breakdowns |
| ⌨️ **Command Palette** | ⌘K quick navigation |
| 🌙 **Dark/Light Mode** | System-aware theming |
| 📱 **PWA Ready** | Installable mobile experience |
| 🛡️ **Security** | Row-Level Security, Zod validation, audit logs |

---

## 🗂️ Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── dashboard/          # Main dashboard
│   ├── transactions/       # Transaction management
│   ├── accounts/           # Account management
│   ├── analytics/          # Analytics & charts
│   ├── budgets/            # Budget tracking
│   ├── goals/              # Savings goals
│   ├── chit-funds/         # Chit fund management
│   ├── loans/              # Loan & EMI tracker
│   ├── net-worth/          # Net worth tracker
│   ├── reports/            # Report generation
│   ├── settings/           # User settings
│   ├── login/              # Authentication
│   └── register/
├── components/
│   ├── dashboard/          # Dashboard widgets
│   ├── transactions/       # Transaction list, form, filters
│   ├── shared/             # Layout, sidebar, topbar, command palette
│   └── ...
├── lib/
│   ├── supabase/           # Client, server, middleware
│   ├── hooks/              # React Query hooks for all entities
│   ├── stores/             # Zustand state management
│   ├── utils/              # Format helpers, financial calculations
│   ├── validations/        # Zod schemas
│   └── types/              # TypeScript interfaces
└── styles/                 # Global CSS
supabase/
├── migrations/             # SQL schema (001_schema.sql)
└── seed/                   # Default categories + achievements
```

---

## 🚀 Setup Guide

### 1. Clone & Install

```bash
git clone https://github.com/your-repo/fintrack-pro
cd fintrack-pro
npm install
```

### 2. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Copy your **Project URL** and **Anon Key** from Settings → API
3. Enable **Google OAuth** in Authentication → Providers (optional)

### 3. Configure Environment

```bash
cp .env.local.example .env.local
# Fill in your Supabase URL and keys
```

### 4. Run Database Migration

In Supabase Dashboard → SQL Editor, paste and run the contents of:
```
supabase/migrations/001_schema.sql
```

### 5. Seed Default Data

```bash
# Add SUPABASE_SERVICE_ROLE_KEY to .env.local first
npm run db:seed
```

This seeds:
- 30 default categories (20 expense + 10 income)
- 10 gamification achievements

### 6. Run Development Server

```bash
npm run dev
# Open http://localhost:3000
```

---

## 🏗️ Deploy to Vercel

```bash
npm install -g vercel
vercel
# Set environment variables in Vercel dashboard
```

Required env vars in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 📊 Database Schema Overview

```
profiles          → User profile + health score + streaks
accounts          → Bank/cash/credit/wallet/investment
categories        → System + custom, nested hierarchy
transactions      → All financial movements + smart tags
budgets           → Category budgets with alert thresholds
goals             → Savings targets with progress tracking
chit_funds        → Chit fund groups
chit_fund_payments→ Per-month payment schedule
loans             → Loan details + amortization
recurring_rules   → Automated recurring transactions
assets            → Manual assets (gold, property, etc.)
net_worth_snapshots → Monthly NW history
smart_rules       → Auto-categorization rules
notifications     → In-app alerts
achievements      → Gamification definitions
user_achievements → Per-user earned achievements
audit_logs        → Security audit trail
```

All tables have **Row-Level Security** — users can only access their own data.

---

## 🔒 Security

- **RLS policies** on every table
- **Zod validation** on all inputs
- **Supabase Auth** with secure session management
- **Audit logging** for all mutations
- **No service-role key** exposed to client

---

## 🪙 Chit Fund Tracking

FinTrack Pro has first-class support for chit funds (common in India):

1. Create a chit fund with total amount, monthly contribution, duration
2. System auto-generates the full payment schedule
3. Mark payments as paid — auto-creates linked transactions
4. Track ROI, net P&L, months remaining
5. Payout month is highlighted in the schedule

---

## 📱 CSV Import Format

```csv
date,description,amount,type,category,notes,tags
2024-01-15,Swiggy Food Order,-450,expense,Food & Dining,Dinner order,food;delivery
2024-01-15,Monthly Salary,85000,income,Salary,,
```

- Negative `amount` → auto-detected as expense
- `category` matched case-insensitively to existing categories
- Duplicate imports prevented via `import_hash`

---

## 🛣️ Roadmap

- [ ] Bank statement auto-import (PDF parsing)
- [ ] WhatsApp/SMS transaction parsing
- [ ] Family/shared accounts
- [ ] Stock portfolio tracker
- [ ] Tax report (ITR-friendly)
- [ ] AI-powered category suggestions
- [ ] Push notifications (web push)
- [ ] Offline mode (service worker)

---

## 📄 License

MIT License — free to use, modify, and deploy.
# FinTrack
