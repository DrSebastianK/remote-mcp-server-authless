# Quick Start Guide ⚡

Get your self-hosted Meta Ads MCP server running in **5 minutes**!

## Prerequisites Check ✓

- [ ] Node.js v18+ installed (`node --version`)
- [ ] Cloudflare account (sign up at https://dash.cloudflare.com/sign-up)
- [ ] Meta Developer account (sign up at https://developers.facebook.com/)

## Step 1: Install & Setup (1 minute)

```bash
# Install dependencies
npm install

# Install Wrangler globally
npm install -g wrangler

# Login to Cloudflare
wrangler login
# This will open your browser to authenticate
```

## Step 2: Create Meta App (2 minutes)

1. Go to https://developers.facebook.com/apps/
2. Click **"Create App"**
3. Choose **"Business"** type
4. Fill in:
   - App Name: "Your Company Ads"
   - Contact Email: your-email@company.com
5. Click **"Create App"**
6. Add **"Marketing API"** product (click "Set Up")
7. Go to **Settings** → **Basic**
8. Copy these (save for later):
   - **App ID**: `1234567890`
   - **App Secret**: Click "Show" → `abc123def456...`

**Note:** You'll update the OAuth redirect URL after deployment.

## Step 3: Create Cloudflare Resources (1 minute)

```bash
# Create D1 database for storing tokens
wrangler d1 create meta_ads_mcp

# OUTPUT: Copy the database_id from output
# database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# Create KV namespace for OAuth state
wrangler kv:namespace create OAUTH_STATE

# OUTPUT: Copy the id from output
# id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

## Step 4: Configure (30 seconds)

Edit `wrangler.jsonc` and replace:

```jsonc
{
  // ...
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "meta_ads_mcp",
      "database_id": "PASTE-YOUR-DATABASE-ID-HERE"  // ← From Step 3
    }
  ],
  "kv_namespaces": [
    {
      "binding": "OAUTH_STATE",
      "id": "PASTE-YOUR-KV-ID-HERE"  // ← From Step 3
    }
  ]
}
```

## Step 5: Initialize Database (10 seconds)

```bash
# Create tables
wrangler d1 execute meta_ads_mcp --file=schema.sql

# You should see:
# ✅ Executed 5 commands in 0.123 seconds
```

## Step 6: Set Secrets (30 seconds)

```bash
# Set Meta App ID
wrangler secret put META_APP_ID
# Paste your App ID from Step 2 and press Enter

# Set Meta App Secret
wrangler secret put META_APP_SECRET
# Paste your App Secret from Step 2 and press Enter
```

## Step 7: Deploy! 🚀 (30 seconds)

```bash
npm run deploy

# You'll get a URL like:
# https://remote-mcp-server-authless.your-account.workers.dev
```

**Copy your URL!** You'll need it next.

## Step 8: Update Meta App (30 seconds)

1. Go back to your Meta App: https://developers.facebook.com/apps/
2. Go to **Settings** → **Basic**
3. Scroll to **App Domains**, add:
   ```
   your-account.workers.dev
   ```
4. Scroll to **Privacy Policy URL**, add any URL (or use placeholder):
   ```
   https://yourcompany.com/privacy
   ```
5. Click **"Save Changes"**
6. Go to **Products** → **Facebook Login** → **Settings**
7. Add **OAuth Redirect URL**:
   ```
   https://remote-mcp-server-authless.your-account.workers.dev/auth/callback
   ```
8. Click **"Save Changes"**

## Step 9: Test! 🎉

### Test 1: Health Check

```bash
curl https://remote-mcp-server-authless.your-account.workers.dev/health
```

Expected:
```json
{
  "status": "healthy",
  "meta_app_configured": true,
  ...
}
```

### Test 2: OAuth Flow

1. Open in browser:
   ```
   https://remote-mcp-server-authless.your-account.workers.dev/auth/meta?user_id=test-user
   ```

2. You'll be redirected to Facebook
3. Login and authorize
4. You'll see success page with your ad accounts! 🎊

### Test 3: MCP Tool

Connect via Claude Desktop or use MCP client:

```json
{
  "tool": "check_auth_status",
  "arguments": {
    "user_id": "test-user"
  }
}
```

Expected:
```json
{
  "authenticated": true,
  "ad_accounts_count": 2,
  "ad_accounts": [...]
}
```

## 🎊 Success!

You now have a fully functional self-hosted Meta Ads MCP server!

## Next Steps

### Connect to Claude Desktop

Edit `~/.claude/config.json`:

```json
{
  "mcpServers": {
    "meta-ads": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://remote-mcp-server-authless.your-account.workers.dev/sse"
      ]
    }
  }
}
```

Restart Claude Desktop → You'll see Meta Ads tools!

### Try Creating a Campaign

In Claude Desktop:
```
"Create a Meta Ads campaign for my dental clinic targeting Budapest, 
budget 30000 HUF, optimized for lead generation"
```

Claude will use your MCP tools to:
1. Check your ad accounts
2. Generate campaign plan
3. Create the campaign
4. Set up targeting

### Integrate with Your App

See [SETUP.md](./SETUP.md) for frontend integration examples.

## Troubleshooting

### "Invalid OAuth redirect URI"
→ Make sure you added the exact URL to Meta App settings (no trailing slash)

### "Database not found"
→ Run: `wrangler d1 execute meta_ads_mcp --file=schema.sql`

### "meta_app_configured: false"
→ Run: `wrangler secret put META_APP_ID` and `wrangler secret put META_APP_SECRET`

### Still stuck?
See [SETUP.md](./SETUP.md) for detailed troubleshooting.

## Resources

- **Full Documentation**: [SETUP.md](./SETUP.md)
- **Environment Vars**: [ENV.md](./ENV.md)
- **Architecture**: [project.md](./project.md)
- **Meta API Docs**: https://developers.facebook.com/docs/marketing-apis

---

**🎉 Congratulations!** You're now running a production-ready, self-hosted Meta Ads MCP server!

Total time: ~5 minutes ⏱️  
Total cost: $0/month (free tier) 💰

