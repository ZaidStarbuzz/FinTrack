-- Add sms_token to users table for iPhone Shortcuts webhook auth
ALTER TABLE users ADD COLUMN IF NOT EXISTS sms_token TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS users_sms_token_idx ON users(sms_token);
