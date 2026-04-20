-- 002_custom_auth.sql
-- Add a custom users table and re-wire profiles and RLS to use JWT claims from our auth system.
-- IMPORTANT: Back up your database before running this migration.

BEGIN;

-- 1) Create a custom users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) Re-wire profiles foreign key to point to users(id) instead of auth.users(id)
-- Drop existing FK constraint on profiles -> auth.users if present (name may vary)
ALTER TABLE IF EXISTS profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
-- Ensure any previous custom FK is removed, then add new FK constraint to users.id
ALTER TABLE IF EXISTS profiles DROP CONSTRAINT IF EXISTS profiles_user_fk;
-- Insert existing profile users into the new users table so FK can be applied safely
INSERT INTO users(id, email, full_name, created_at)
SELECT id, email, full_name, created_at FROM profiles WHERE id IS NOT NULL
ON CONFLICT (id) DO NOTHING;
ALTER TABLE IF EXISTS profiles
  ADD CONSTRAINT profiles_user_fk FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE;

-- 3) Create a trigger to auto-create profile and preferences when a row is inserted into users
CREATE OR REPLACE FUNCTION handle_custom_user()
RETURNS TRIGGER AS $$
BEGIN
  -- If profile doesn't exist for this user id, insert basic profile and preferences
  INSERT INTO profiles(id, email, full_name, created_at)
    VALUES (NEW.id, NEW.email, NEW.full_name, NOW())
    ON CONFLICT (id) DO NOTHING;

  INSERT INTO user_preferences(user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_users_created ON users;
CREATE TRIGGER on_users_created AFTER INSERT ON users FOR EACH ROW EXECUTE FUNCTION handle_custom_user();

-- 4) Update RLS policies to reference JWT claims (current_setting('jwt.claims.sub'))
-- NOTE: This assumes you'll configure Postgres/jwt secret so Postgres recognizes the JWT signed by your server.

-- Drop old policies (if present) and create new ones that compare jwt.claims.sub to user_id / id

-- Profiles
DROP POLICY IF EXISTS "own profile" ON profiles;
CREATE POLICY "own profile" ON profiles FOR ALL USING ((current_setting('jwt.claims.sub', true))::uuid = id);

-- Accounts
DROP POLICY IF EXISTS "own accounts" ON accounts;
CREATE POLICY "own accounts" ON accounts FOR ALL USING ((current_setting('jwt.claims.sub', true))::uuid = user_id);

-- Categories
DROP POLICY IF EXISTS "own or system categories" ON categories;
CREATE POLICY "own or system categories" ON categories FOR ALL USING ((current_setting('jwt.claims.sub', true))::uuid = user_id OR user_id IS NULL);

-- Transactions
DROP POLICY IF EXISTS "own transactions" ON transactions;
CREATE POLICY "own transactions" ON transactions FOR ALL USING ((current_setting('jwt.claims.sub', true))::uuid = user_id);

-- Budgets
DROP POLICY IF EXISTS "own budgets" ON budgets;
CREATE POLICY "own budgets" ON budgets FOR ALL USING ((current_setting('jwt.claims.sub', true))::uuid = user_id);

-- Goals
DROP POLICY IF EXISTS "own goals" ON goals;
CREATE POLICY "own goals" ON goals FOR ALL USING ((current_setting('jwt.claims.sub', true))::uuid = user_id);

-- Chit funds
DROP POLICY IF EXISTS "own chit funds" ON chit_funds;
CREATE POLICY "own chit funds" ON chit_funds FOR ALL USING ((current_setting('jwt.claims.sub', true))::uuid = user_id);

-- Chit fund payments
DROP POLICY IF EXISTS "own chit payments" ON chit_fund_payments;
CREATE POLICY "own chit payments" ON chit_fund_payments FOR ALL USING ((current_setting('jwt.claims.sub', true))::uuid = user_id);

-- Loans
DROP POLICY IF EXISTS "own loans" ON loans;
CREATE POLICY "own loans" ON loans FOR ALL USING ((current_setting('jwt.claims.sub', true))::uuid = user_id);

-- Recurring rules
DROP POLICY IF EXISTS "own recurring" ON recurring_rules;
CREATE POLICY "own recurring" ON recurring_rules FOR ALL USING ((current_setting('jwt.claims.sub', true))::uuid = user_id);

-- Assets
DROP POLICY IF EXISTS "own assets" ON assets;
CREATE POLICY "own assets" ON assets FOR ALL USING ((current_setting('jwt.claims.sub', true))::uuid = user_id);

-- Net worth snapshots
DROP POLICY IF EXISTS "own nw snapshots" ON net_worth_snapshots;
CREATE POLICY "own nw snapshots" ON net_worth_snapshots FOR ALL USING ((current_setting('jwt.claims.sub', true))::uuid = user_id);

-- Smart rules
DROP POLICY IF EXISTS "own smart rules" ON smart_rules;
CREATE POLICY "own smart rules" ON smart_rules FOR ALL USING ((current_setting('jwt.claims.sub', true))::uuid = user_id);

-- Notifications
DROP POLICY IF EXISTS "own notifications" ON notifications;
CREATE POLICY "own notifications" ON notifications FOR ALL USING ((current_setting('jwt.claims.sub', true))::uuid = user_id);

-- Filter presets
DROP POLICY IF EXISTS "own filter presets" ON filter_presets;
CREATE POLICY "own filter presets" ON filter_presets FOR ALL USING ((current_setting('jwt.claims.sub', true))::uuid = user_id);

-- User achievements
DROP POLICY IF EXISTS "own achievements" ON user_achievements;
CREATE POLICY "own achievements" ON user_achievements FOR ALL USING ((current_setting('jwt.claims.sub', true))::uuid = user_id);

-- User preferences
DROP POLICY IF EXISTS "own preferences" ON user_preferences;
CREATE POLICY "own preferences" ON user_preferences FOR ALL USING ((current_setting('jwt.claims.sub', true))::uuid = user_id);

-- Audit logs (SELECT only)
DROP POLICY IF EXISTS "own audit logs" ON audit_logs;
CREATE POLICY "own audit logs" ON audit_logs FOR SELECT USING ((current_setting('jwt.claims.sub', true))::uuid = user_id);

COMMIT;
