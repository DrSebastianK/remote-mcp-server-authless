# Setup Guide: Self-Hosted Meta Ads MCP Server

This guide will help you deploy your own Meta Ads MCP server on Cloudflare Workers with OAuth support.

## 🎯 What You'll Get

- ✅ Self-hosted Meta Ads MCP server (free tier)
- ✅ OAuth 2.0 authentication for users
- ✅ Multi-tenant ready (perfect for SaaS)
- ✅ 25+ Meta Ads API tools
- ✅ AI-powered campaign creation
- ✅ No third-party dependencies (except Meta API)

## 📋 Prerequisites

1. **Cloudflare Account** (free tier works!)
2. **Meta Developer Account** (free)
3. **Node.js** (v18 or later)
4. **Wrangler CLI** (Cloudflare Workers CLI)

## 🚀 Step-by-Step Setup

### Step 1: Clone & Install

```bash
# Install dependencies
npm install

# Install Wrangler CLI globally (if you haven't)
npm install -g wrangler

# Login to Cloudflare
wrangler login
```

### Step 2: Create Meta App

1. Go to [Meta for Developers](https://developers.facebook.com/apps/)
2. Click **"Create App"**
3. Select **"Business"** as app type
4. Fill in app details:
   - **App Name**: "Your Company Meta Ads"
   - **Contact Email**: your-email@company.com

5. Add **"Marketing API"** product:
   - Click "Add Product"
   - Find "Marketing API" and click "Set Up"

6. Configure OAuth Settings:
   - Go to **Settings** → **Basic**
   - Copy your **App ID** and **App Secret** (save for later)
   - Go to **Settings** → **Advanced** → **Security**
   - Add OAuth redirect URL:
     ```
     https://your-worker-name.workers.dev/auth/callback
     ```
     *(You'll update this after deploying)*

7. Request Advanced Access (for production):
   - Go to **App Review** → **Permissions and Features**
   - Request **ads_management** and **ads_read** permissions
   - *(For development, you can use Standard Access)*

### Step 3: Create Cloudflare Resources

#### Create D1 Database

```bash
# Create database
wrangler d1 create meta_ads_mcp

# Copy the database ID from output
# It will look like: database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

#### Create KV Namespace (for OAuth state)

```bash
# Create KV namespace
wrangler kv:namespace create OAUTH_STATE

# Copy the namespace ID from output
# It will look like: id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

### Step 4: Update Configuration

Update `wrangler.jsonc` with your IDs:

```jsonc
{
	// ... other config ...
	"d1_databases": [
		{
			"binding": "DB",
			"database_name": "meta_ads_mcp",
			"database_id": "YOUR-DATABASE-ID-HERE"  // ← Paste your D1 database ID
		}
	],
	"kv_namespaces": [
		{
			"binding": "OAUTH_STATE",
			"id": "YOUR-KV-NAMESPACE-ID-HERE"  // ← Paste your KV namespace ID
		}
	]
}
```

### Step 5: Initialize Database

```bash
# Run the schema to create tables
wrangler d1 execute meta_ads_mcp --file=schema.sql
```

You should see output like:
```
🌀 Executing on meta_ads_mcp (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx):
🚣 Executed 5 commands in 0.123 seconds
```

### Step 6: Set Environment Variables

Create a `.dev.vars` file for local development:

```bash
# Copy example file
cp .env.example .dev.vars
```

Edit `.dev.vars` and add your Meta App credentials:

```ini
META_APP_ID=your_meta_app_id_here
META_APP_SECRET=your_meta_app_secret_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

**For production deployment**, set secrets via Wrangler:

```bash
# Set Meta App credentials
wrangler secret put META_APP_ID
# Paste your App ID when prompted

wrangler secret put META_APP_SECRET
# Paste your App Secret when prompted

wrangler secret put ANTHROPIC_API_KEY
# Paste your Anthropic API key when prompted
```

### Step 7: Deploy

```bash
# Deploy to Cloudflare Workers
npm run deploy
```

You'll get a URL like:
```
https://remote-mcp-server-authless.your-subdomain.workers.dev
```

### Step 8: Update Meta App Redirect URL

1. Go back to your Meta App settings
2. Update OAuth redirect URL to:
   ```
   https://remote-mcp-server-authless.your-subdomain.workers.dev/auth/callback
   ```

### Step 9: Test OAuth Flow

1. Visit your OAuth URL:
   ```
   https://remote-mcp-server-authless.your-subdomain.workers.dev/auth/meta?user_id=test-user
   ```

2. You should be redirected to Facebook login

3. Authorize the app

4. You'll be redirected back with success message!

## 🔧 Testing Your Setup

### Check Health

```bash
curl https://your-worker.workers.dev/health
```

Expected response:
```json
{
  "status": "healthy",
  "server": "AI Ads Platform MCP (Self-Hosted)",
  "version": "2.0.0",
  "meta_app_configured": true,
  "endpoints": {
    "sse": "/sse",
    "mcp": "/mcp",
    "oauth_start": "/auth/meta?user_id=YOUR_USER_ID",
    "oauth_callback": "/auth/callback"
  }
}
```

### Test Authentication

Use the MCP tool to check auth status:

```typescript
// Call via MCP client
{
  "tool": "check_auth_status",
  "arguments": {
    "user_id": "test-user"
  }
}
```

### Test Meta API Call

```typescript
// Get ad accounts
{
  "tool": "get_ad_accounts",
  "arguments": {
    "user_id": "test-user"
  }
}
```

## 📱 Frontend Integration

### Example: React/Lovable App

```tsx
// Connect Meta Ads button
function ConnectMetaButton() {
  const userId = useAuth().user.id; // Your user ID
  const workerUrl = "https://your-worker.workers.dev";

  const handleConnect = () => {
    // Open OAuth in popup
    const width = 600;
    const height = 700;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;
    
    const popup = window.open(
      `${workerUrl}/auth/meta?user_id=${userId}`,
      'Meta Ads OAuth',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    // Optional: Listen for popup close
    const checkPopup = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkPopup);
        // Refresh user's auth status
        checkAuthStatus();
      }
    }, 500);
  };

  return (
    <button onClick={handleConnect}>
      Connect Meta Ads
    </button>
  );
}
```

## 🔒 Security Best Practices

### 1. Use Secrets for Sensitive Data

Never commit secrets to git. Always use:
- `.dev.vars` for local development (gitignored)
- `wrangler secret put` for production

### 2. Implement User Authentication

The current implementation uses a simple `user_id` parameter. In production:

```typescript
// Add your own auth middleware
async function getUserFromSession(request: Request): Promise<string> {
  // Verify JWT token
  // Check session cookie
  // Return authenticated user ID
}
```

### 3. Rate Limiting

Add rate limiting to prevent abuse:

```typescript
// Example using Cloudflare Workers KV
const rateLimitKey = `rate_limit:${userId}:${Date.now() / 60000 | 0}`;
const count = await env.RATE_LIMIT.get(rateLimitKey);
if (count && parseInt(count) > 100) {
  throw new Error("Rate limit exceeded");
}
```

### 4. Token Refresh

The implementation stores 60-day tokens. Add refresh logic:

```typescript
// Check token expiry before each API call
if (isTokenExpired(userToken.expiresAt)) {
  // Redirect to re-auth
  throw new Error("Token expired. Please reconnect.");
}
```

## 📊 Database Management

### View Stored Tokens

```bash
wrangler d1 execute meta_ads_mcp --command "SELECT user_id, token_expires_at, json_extract(ad_accounts, '$[0].name') as first_account FROM user_tokens"
```

### Clear Test Data

```bash
wrangler d1 execute meta_ads_mcp --command "DELETE FROM user_tokens WHERE user_id LIKE 'test-%'"
```

### Backup Database

```bash
# Export database
wrangler d1 export meta_ads_mcp --output backup.sql
```

## 🐛 Troubleshooting

### "Invalid OAuth redirect URI"

1. Check that your redirect URL in Meta App settings matches exactly:
   ```
   https://your-actual-worker-url.workers.dev/auth/callback
   ```
2. No trailing slash
3. Must use HTTPS (Cloudflare Workers automatically use HTTPS)

### "User not authenticated" Error

1. Complete OAuth flow first: `/auth/meta?user_id=YOUR_USER_ID`
2. Check database for stored token:
   ```bash
   wrangler d1 execute meta_ads_mcp --command "SELECT * FROM user_tokens WHERE user_id='YOUR_USER_ID'"
   ```

### "Access token expired"

Tokens last 60 days. Reconnect the account:
```
/auth/meta?user_id=YOUR_USER_ID
```

### "Database not found"

1. Ensure you created the database:
   ```bash
   wrangler d1 create meta_ads_mcp
   ```
2. Updated `wrangler.jsonc` with correct database_id
3. Ran schema initialization:
   ```bash
   wrangler d1 execute meta_ads_mcp --file=schema.sql
   ```

## 🚀 Going to Production

### 1. App Review (Meta)

For production use, you need **Advanced Access**:

1. Go to App Review in Meta App dashboard
2. Request these permissions:
   - `ads_management`
   - `ads_read`
   - `read_insights`
3. Provide:
   - App demo video
   - Privacy policy URL
   - Terms of service URL
   - Business verification

### 2. Custom Domain

```bash
# Add custom domain to your worker
wrangler publish --routes "ads-api.yourdomain.com/*"
```

Update Meta App redirect URL to your custom domain.

### 3. Monitoring

Enable Cloudflare Workers Analytics:
- Go to Cloudflare Dashboard → Workers → Analytics
- Monitor request volume, errors, latency

### 4. Scaling

Cloudflare Workers auto-scale. No configuration needed!
- Free tier: 100,000 requests/day
- Paid tier: Unlimited requests

## 💰 Cost Estimate

### Free Tier (Perfect for Testing)
- Cloudflare Workers: 100,000 requests/day FREE
- D1 Database: 5 GB storage FREE
- KV: 100,000 reads/day FREE
- **Total: $0/month**

### Production (1M requests/month)
- Cloudflare Workers: $5/month (Paid plan)
- D1 Database: FREE (under 5GB)
- KV: FREE (under 1M operations)
- **Total: ~$5/month**

Compare to Pipeboard: Unknown pricing + potential per-user fees

## 🎉 Next Steps

1. **Integrate with your frontend** (Lovable/React app)
2. **Implement AI-powered campaign creation** using Claude
3. **Add webhook support** for real-time campaign updates
4. **Build analytics dashboard** using stored insights
5. **Add team collaboration** features

## 📚 Additional Resources

- [Meta Marketing API Docs](https://developers.facebook.com/docs/marketing-apis)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [MCP Protocol Spec](https://github.com/modelcontextprotocol/specification)
- [wipsoft/meta-mcp Reference](https://github.com/wipsoft/meta-mcp)

## 🆘 Need Help?

- **Meta API Issues**: Check [Meta Developer Community](https://developers.facebook.com/community/)
- **Cloudflare Workers**: Check [Cloudflare Discord](https://discord.cloudflare.com)
- **MCP Protocol**: Check [MCP GitHub](https://github.com/modelcontextprotocol)

---

**Congratulations! 🎉** You now have a fully self-hosted Meta Ads MCP server with OAuth support, ready to power your SaaS platform!

