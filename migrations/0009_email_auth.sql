-- WHAT IT DO? Adds one-time email login codes for launch-safe public auth flows.

CREATE TABLE IF NOT EXISTS auth_login_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  delivery_state TEXT NOT NULL DEFAULT 'issued' CHECK(delivery_state IN ('issued', 'sent', 'failed', 'consumed', 'expired')),
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_auth_login_codes_email_created
ON auth_login_codes(email, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_auth_login_codes_user_created
ON auth_login_codes(user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_auth_login_codes_expires_state
ON auth_login_codes(expires_at, delivery_state, id DESC);
