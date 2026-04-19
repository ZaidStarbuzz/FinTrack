-- =============================================
-- FINTRACK PRO - Complete Database Schema
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- PROFILES
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  currency TEXT DEFAULT 'INR',
  locale TEXT DEFAULT 'en-IN',
  financial_year_start INTEGER DEFAULT 4,
  theme TEXT DEFAULT 'dark',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  health_score INTEGER DEFAULT 50 CHECK (health_score BETWEEN 0 AND 100),
  streak_days INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ACCOUNT TYPES
CREATE TYPE account_type AS ENUM ('bank', 'cash', 'credit_card', 'wallet', 'investment', 'loan', 'fixed_deposit');
CREATE TYPE account_status AS ENUM ('active', 'inactive', 'closed');

CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type account_type NOT NULL,
  balance DECIMAL(15,2) DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT 'bank',
  is_default BOOLEAN DEFAULT FALSE,
  is_excluded_from_net_worth BOOLEAN DEFAULT FALSE,
  credit_limit DECIMAL(15,2),
  billing_cycle_day INTEGER,
  due_date_day INTEGER,
  interest_rate DECIMAL(5,2),
  bank_name TEXT,
  account_number_last4 TEXT,
  notes TEXT,
  status account_status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CATEGORIES
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'package',
  color TEXT DEFAULT '#6366f1',
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  type TEXT DEFAULT 'expense' CHECK (type IN ('income','expense','both')),
  is_system BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TRANSACTIONS
CREATE TYPE transaction_type AS ENUM ('income', 'expense', 'transfer');
CREATE TYPE transaction_status AS ENUM ('completed', 'pending', 'reconciled', 'void');

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  transfer_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  type transaction_type NOT NULL,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'INR',
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  description TEXT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  status transaction_status DEFAULT 'completed',
  receipt_url TEXT,
  merchant TEXT,
  reference_number TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_id UUID,
  parent_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  is_split BOOLEAN DEFAULT FALSE,
  chit_fund_id UUID,
  loan_id UUID,
  goal_id UUID,
  import_hash TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX transactions_user_account ON transactions(user_id, account_id);
CREATE INDEX transactions_user_category ON transactions(user_id, category_id);
CREATE INDEX transactions_fts ON transactions USING gin(to_tsvector('english', coalesce(description,'') || ' ' || coalesce(merchant,'')));

-- BUDGETS
CREATE TYPE budget_period AS ENUM ('weekly','monthly','quarterly','yearly','custom');

CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  period budget_period DEFAULT 'monthly',
  start_date DATE NOT NULL,
  end_date DATE,
  rollover BOOLEAN DEFAULT FALSE,
  alert_at_50 BOOLEAN DEFAULT TRUE,
  alert_at_80 BOOLEAN DEFAULT TRUE,
  alert_at_100 BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- GOALS
CREATE TYPE goal_status AS ENUM ('active','completed','paused','cancelled');

CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'target',
  color TEXT DEFAULT '#22c55e',
  target_amount DECIMAL(15,2) NOT NULL,
  current_amount DECIMAL(15,2) DEFAULT 0,
  target_date DATE,
  status goal_status DEFAULT 'active',
  priority INTEGER DEFAULT 1,
  monthly_contribution DECIMAL(15,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CHIT FUNDS
CREATE TYPE chit_fund_status AS ENUM ('active','completed','cancelled');

CREATE TABLE chit_funds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  monthly_contribution DECIMAL(15,2) NOT NULL,
  duration_months INTEGER NOT NULL,
  start_date DATE NOT NULL,
  payout_month INTEGER,
  payout_amount DECIMAL(15,2),
  status chit_fund_status DEFAULT 'active',
  organizer_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chit_fund_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chit_fund_id UUID NOT NULL REFERENCES chit_funds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  month_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  amount DECIMAL(15,2) NOT NULL,
  is_payout BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','overdue')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LOANS
CREATE TYPE loan_type AS ENUM ('personal','home','auto','education','business','credit_card','other');
CREATE TYPE loan_status AS ENUM ('active','closed','defaulted');

CREATE TABLE loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type loan_type DEFAULT 'personal',
  lender_name TEXT,
  principal_amount DECIMAL(15,2) NOT NULL,
  interest_rate DECIMAL(5,2) NOT NULL,
  tenure_months INTEGER NOT NULL,
  start_date DATE NOT NULL,
  emi_amount DECIMAL(15,2) NOT NULL,
  emi_due_day INTEGER DEFAULT 1,
  outstanding_balance DECIMAL(15,2),
  total_paid DECIMAL(15,2) DEFAULT 0,
  total_interest_paid DECIMAL(15,2) DEFAULT 0,
  status loan_status DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RECURRING RULES
CREATE TYPE recurrence_frequency AS ENUM ('daily','weekly','biweekly','monthly','quarterly','yearly');

CREATE TABLE recurring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  type transaction_type NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  description TEXT NOT NULL,
  frequency recurrence_frequency NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  next_due_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  auto_create BOOLEAN DEFAULT FALSE,
  reminder_days INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ASSETS
CREATE TYPE asset_type AS ENUM ('real_estate','vehicle','gold','stocks','mutual_funds','fd','ppf','epf','crypto','business','other');

CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type asset_type NOT NULL,
  current_value DECIMAL(15,2) NOT NULL,
  purchase_value DECIMAL(15,2),
  purchase_date DATE,
  notes TEXT,
  is_liquid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE net_worth_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  total_assets DECIMAL(15,2) NOT NULL,
  total_liabilities DECIMAL(15,2) NOT NULL,
  net_worth DECIMAL(15,2) NOT NULL,
  liquid_assets DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, snapshot_date)
);

-- SMART RULES
CREATE TABLE smart_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  match_field TEXT NOT NULL,
  match_operator TEXT NOT NULL,
  match_value TEXT NOT NULL,
  action_type TEXT NOT NULL,
  action_value TEXT NOT NULL,
  priority INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  times_applied INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTIFICATIONS
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  priority TEXT DEFAULT 'normal',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FILTER PRESETS
CREATE TABLE filter_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ACHIEVEMENTS
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  points INTEGER DEFAULT 10,
  category TEXT NOT NULL
);

CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- USER PREFERENCES
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  notification_budget_alerts BOOLEAN DEFAULT TRUE,
  notification_unusual_spending BOOLEAN DEFAULT TRUE,
  notification_recurring_reminders BOOLEAN DEFAULT TRUE,
  default_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  dashboard_widgets JSONB DEFAULT '["overview","recent_transactions","budget_progress","category_chart"]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AUDIT LOGS
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ======= RLS =======
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE chit_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE chit_fund_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE net_worth_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE filter_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own profile" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "own accounts" ON accounts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own or system categories" ON categories FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "own transactions" ON transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own budgets" ON budgets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own goals" ON goals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own chit funds" ON chit_funds FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own chit payments" ON chit_fund_payments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own loans" ON loans FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own recurring" ON recurring_rules FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own assets" ON assets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own nw snapshots" ON net_worth_snapshots FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own smart rules" ON smart_rules FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own notifications" ON notifications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own filter presets" ON filter_presets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own achievements" ON user_achievements FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own preferences" ON user_preferences FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own audit logs" ON audit_logs FOR SELECT USING (auth.uid() = user_id);

-- ======= TRIGGERS =======
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER upd_profiles BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER upd_accounts BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER upd_transactions BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER upd_budgets BEFORE UPDATE ON budgets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER upd_goals BEFORE UPDATE ON goals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER upd_loans BEFORE UPDATE ON loans FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER upd_chit_funds BEFORE UPDATE ON chit_funds FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER upd_assets BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles(id,email,full_name,avatar_url)
  VALUES(NEW.id,NEW.email,NEW.raw_user_meta_data->>'full_name',NEW.raw_user_meta_data->>'avatar_url');
  INSERT INTO user_preferences(user_id) VALUES(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Balance trigger
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.type = 'income' THEN UPDATE accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
    ELSIF NEW.type = 'expense' THEN UPDATE accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
    ELSIF NEW.type = 'transfer' THEN
      UPDATE accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
      UPDATE accounts SET balance = balance + NEW.amount WHERE id = NEW.transfer_account_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.type = 'income' THEN UPDATE accounts SET balance = balance - OLD.amount WHERE id = OLD.account_id;
    ELSIF OLD.type = 'expense' THEN UPDATE accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
    ELSIF OLD.type = 'transfer' THEN
      UPDATE accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
      UPDATE accounts SET balance = balance - OLD.amount WHERE id = OLD.transfer_account_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.type = 'income' THEN UPDATE accounts SET balance = balance - OLD.amount WHERE id = OLD.account_id;
    ELSIF OLD.type = 'expense' THEN UPDATE accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
    ELSIF OLD.type = 'transfer' THEN
      UPDATE accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
      UPDATE accounts SET balance = balance - OLD.amount WHERE id = OLD.transfer_account_id;
    END IF;
    IF NEW.type = 'income' THEN UPDATE accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
    ELSIF NEW.type = 'expense' THEN UPDATE accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
    ELSIF NEW.type = 'transfer' THEN
      UPDATE accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
      UPDATE accounts SET balance = balance + NEW.amount WHERE id = NEW.transfer_account_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transaction_balance AFTER INSERT OR UPDATE OR DELETE ON transactions FOR EACH ROW EXECUTE FUNCTION update_account_balance();

-- Analytics views
CREATE OR REPLACE VIEW v_monthly_summary AS
SELECT user_id, DATE_TRUNC('month', date) as month,
  SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as total_income,
  SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as total_expense,
  SUM(CASE WHEN type='income' THEN amount ELSE -amount END) FILTER (WHERE type != 'transfer') as net_savings,
  COUNT(*) FILTER (WHERE type='expense') as expense_count,
  COUNT(*) FILTER (WHERE type='income') as income_count
FROM transactions WHERE status != 'void' AND type != 'transfer'
GROUP BY user_id, DATE_TRUNC('month', date);

CREATE OR REPLACE VIEW v_category_spending AS
SELECT t.user_id, t.category_id, c.name as category_name, c.icon, c.color,
  DATE_TRUNC('month', t.date) as month,
  SUM(t.amount) as total_amount, COUNT(*) as transaction_count
FROM transactions t LEFT JOIN categories c ON t.category_id = c.id
WHERE t.type = 'expense' AND t.status != 'void'
GROUP BY t.user_id, t.category_id, c.name, c.icon, c.color, DATE_TRUNC('month', t.date);
