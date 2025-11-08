-- Database schema for Meta Ads MCP
-- Run this using: wrangler d1 execute meta_ads_mcp --file=schema.sql

-- Store user OAuth tokens
CREATE TABLE IF NOT EXISTS user_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL UNIQUE,
  meta_access_token TEXT NOT NULL,
  meta_refresh_token TEXT,
  token_expires_at INTEGER NOT NULL,
  ad_accounts TEXT, -- JSON array of ad accounts
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Index for quick user lookup
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id);

-- Store campaigns for quick access
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  meta_campaign_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  objective TEXT,
  budget REAL,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES user_tokens(user_id)
);

-- Indexes for campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_account_id ON campaigns(account_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_meta_id ON campaigns(meta_campaign_id);

-- Store insights cache (to reduce API calls)
CREATE TABLE IF NOT EXISTS campaign_insights (
  campaign_id TEXT NOT NULL,
  date TEXT NOT NULL,
  impressions INTEGER,
  clicks INTEGER,
  spend REAL,
  leads INTEGER,
  cost_per_lead REAL,
  reach INTEGER,
  frequency REAL,
  ctr REAL,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  PRIMARY KEY (campaign_id, date),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
);

-- Index for insights date queries
CREATE INDEX IF NOT EXISTS idx_insights_date ON campaign_insights(date);

-- Store OAuth states for CSRF protection
-- Note: In production, use KV store instead for better TTL support
CREATE TABLE IF NOT EXISTS oauth_states (
  state TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  expires_at INTEGER NOT NULL
);

-- Clean up old OAuth states periodically
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON oauth_states(expires_at);

