export type AccountType = 'bank' | 'cash' | 'credit_card' | 'wallet' | 'investment' | 'loan' | 'fixed_deposit'
export type TransactionType = 'income' | 'expense' | 'transfer'
export type TransactionStatus = 'completed' | 'pending' | 'reconciled' | 'void'
export type BudgetPeriod = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'
export type GoalStatus = 'active' | 'completed' | 'paused' | 'cancelled'
export type ChitFundStatus = 'active' | 'completed' | 'cancelled'
export type LoanType = 'personal' | 'home' | 'auto' | 'education' | 'business' | 'credit_card' | 'other'
export type LoanStatus = 'active' | 'closed' | 'defaulted'
export type AssetType = 'real_estate' | 'vehicle' | 'gold' | 'stocks' | 'mutual_funds' | 'fd' | 'ppf' | 'epf' | 'crypto' | 'business' | 'other'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  currency: string
  locale: string
  financial_year_start: number
  theme: string
  onboarding_completed: boolean
  health_score: number
  streak_days: number
  created_at: string
  updated_at: string
}

export interface Account {
  id: string
  user_id: string
  name: string
  type: AccountType
  balance: number
  currency: string
  color: string
  icon: string
  is_default: boolean
  is_excluded_from_net_worth: boolean
  credit_limit?: number | null
  billing_cycle_day?: number | null
  due_date_day?: number | null
  interest_rate?: number | null
  bank_name?: string | null
  account_number_last4?: string | null
  notes?: string | null
  status: 'active' | 'inactive' | 'closed'
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  user_id: string | null
  name: string
  icon: string
  color: string
  parent_id: string | null
  type: 'income' | 'expense' | 'both'
  is_system: boolean
  sort_order: number
  created_at: string
  children?: Category[]
}

export interface Transaction {
  id: string
  user_id: string
  account_id: string
  transfer_account_id?: string | null
  category_id?: string | null
  type: TransactionType
  amount: number
  currency: string
  date: string
  description?: string | null
  notes?: string | null
  tags: string[]
  status: TransactionStatus
  receipt_url?: string | null
  merchant?: string | null
  reference_number?: string | null
  is_recurring: boolean
  parent_id?: string | null
  is_split: boolean
  chit_fund_id?: string | null
  loan_id?: string | null
  goal_id?: string | null
  created_at: string
  updated_at: string
  account?: Account
  transfer_account?: Account
  category?: Category
}

export interface Budget {
  id: string
  user_id: string
  category_id?: string | null
  name: string
  amount: number
  period: BudgetPeriod
  start_date: string
  end_date?: string | null
  rollover: boolean
  alert_at_50: boolean
  alert_at_80: boolean
  alert_at_100: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  spent?: number
  remaining?: number
  percentage?: number
  category?: Category
}

export interface Goal {
  id: string
  user_id: string
  account_id?: string | null
  name: string
  description?: string | null
  icon: string
  color: string
  target_amount: number
  current_amount: number
  target_date?: string | null
  status: GoalStatus
  priority: number
  monthly_contribution?: number | null
  created_at: string
  updated_at: string
  percentage?: number
  months_remaining?: number
}

export interface ChitFund {
  id: string
  user_id: string
  account_id?: string | null
  name: string
  total_amount: number
  monthly_contribution: number
  duration_months: number
  start_date: string
  payout_month?: number | null
  payout_amount?: number | null
  status: ChitFundStatus
  organizer_name?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
  total_contributed?: number
  total_received?: number
  net_profit_loss?: number
  months_remaining?: number
  roi?: number
  payments?: ChitFundPayment[]
}

export interface ChitFundPayment {
  id: string
  chit_fund_id: string
  user_id: string
  transaction_id?: string | null
  month_number: number
  due_date: string
  paid_date?: string | null
  amount: number
  is_payout: boolean
  status: 'pending' | 'paid' | 'overdue'
  created_at: string
}

export interface Loan {
  id: string
  user_id: string
  account_id?: string | null
  name: string
  type: LoanType
  lender_name?: string | null
  principal_amount: number
  interest_rate: number
  tenure_months: number
  start_date: string
  emi_amount: number
  emi_due_day: number
  outstanding_balance: number
  total_paid: number
  total_interest_paid: number
  status: LoanStatus
  notes?: string | null
  created_at: string
  updated_at: string
  months_remaining?: number
  completion_percentage?: number
}

export interface Asset {
  id: string
  user_id: string
  name: string
  type: AssetType
  current_value: number
  purchase_value?: number | null
  purchase_date?: string | null
  notes?: string | null
  is_liquid: boolean
  created_at: string
  updated_at: string
}

export interface NetWorthSnapshot {
  id: string
  user_id: string
  snapshot_date: string
  total_assets: number
  total_liabilities: number
  net_worth: number
  liquid_assets: number
  created_at: string
}

export interface TransactionFilters {
  dateFrom?: string
  dateTo?: string
  datePreset?: 'today' | 'this_week' | 'this_month' | 'last_7_days' | 'last_30_days' | 'this_year' | 'custom'
  types?: TransactionType[]
  categoryIds?: string[]
  accountIds?: string[]
  tags?: string[]
  amountMin?: number
  amountMax?: number
  search?: string
  status?: TransactionStatus[]
}

export interface MonthlySummary {
  month: string
  total_income: number
  total_expense: number
  net_savings: number
  expense_count: number
  income_count: number
  savings_rate?: number
}

export interface CategorySpending {
  category_id: string | null
  category_name: string
  icon: string
  color: string
  total_amount: number
  transaction_count: number
  percentage?: number
}

export interface DashboardStats {
  totalIncome: number
  totalExpenses: number
  netSavings: number
  savingsRate: number
  netWorth: number
  totalAssets: number
  totalLiabilities: number
  burnRate: number
  runway: number
  healthScore: number
}

export interface SmartInsight {
  id: string
  type: 'warning' | 'info' | 'success' | 'tip'
  title: string
  message: string
  value?: number
  percentage?: number
  category?: string
  actionLabel?: string
  actionUrl?: string
}
