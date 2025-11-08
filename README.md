# Self-Hosted Meta Ads MCP Server 🚀

A self-hosted Model Context Protocol (MCP) server for Meta Marketing API, running on Cloudflare Workers with OAuth 2.0 authentication. Built for multi-tenant SaaS applications.

**Based on [wipsoft/meta-mcp](https://github.com/wipsoft/meta-mcp)** - fully self-hosted, no third-party dependencies!

## ✨ Features

- ✅ **Self-Hosted**: No third-party dependencies, runs on Cloudflare Workers
- ✅ **OAuth 2.0**: Users connect their own Meta Ads accounts seamlessly
- ✅ **Multi-Tenant**: Perfect for SaaS platforms with multiple users
- ✅ **25+ Tools**: Complete Meta Ads API coverage
- ✅ **AI-Powered**: Campaign creation from natural language
- ✅ **Free Tier**: 100k requests/day on Cloudflare free tier
- ✅ **Latest API**: Meta Graph API v23.0

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Your App      │◄──►│ Cloudflare       │◄──►│ Meta Marketing  │
│   (Frontend)    │    │ Worker (MCP)     │    │ API             │
│                 │    │                  │    │                 │
│ - User clicks   │    │ - OAuth flow     │    │ - Campaigns     │
│   "Connect"     │    │ - Token storage  │    │ - Analytics     │
│ - Create        │    │ - API proxy      │    │ - Audiences     │
│   campaigns     │    │ - AI tools       │    │ - Creatives     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Cloudflare D1    │
                    │ (Database)       │
                    │                  │
                    │ - User tokens    │
                    │ - Campaigns      │
                    │ - Insights cache │
                    └──────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js v18+
- Cloudflare account (free tier works!)
- Meta Developer account
- Wrangler CLI

### Installation

```bash
# Install dependencies
npm install

# Install Wrangler globally
npm install -g wrangler

# Login to Cloudflare
wrangler login
```

### Setup (5 minutes)

See **[SETUP.md](./SETUP.md)** for complete step-by-step instructions.

**Quick version:**

1. **Create Meta App** at https://developers.facebook.com/apps/
2. **Create Cloudflare resources:**
   ```bash
   wrangler d1 create meta_ads_mcp
   wrangler kv:namespace create OAUTH_STATE
   ```
3. **Update** `wrangler.jsonc` with your resource IDs
4. **Initialize database:**
   ```bash
   wrangler d1 execute meta_ads_mcp --file=schema.sql
   ```
5. **Set secrets:**
   ```bash
   wrangler secret put META_APP_ID
   wrangler secret put META_APP_SECRET
   ```
6. **Deploy:**
   ```bash
   npm run deploy
   ```

## 🔧 Usage

### OAuth Flow

Users connect their Meta Ads accounts:

```typescript
// Redirect user to start OAuth
window.open(
  'https://your-worker.workers.dev/auth/meta?user_id=USER_ID',
  'Meta OAuth',
  'width=600,height=700'
);
```

### Available Endpoints

- `GET /health` - Health check
- `GET /auth/meta?user_id=USER_ID` - Start OAuth flow
- `GET /auth/callback` - OAuth callback (automatic)
- `POST /auth/disconnect` - Disconnect user account
- `GET /sse` - MCP SSE endpoint
- `POST /mcp` - MCP standard endpoint

### MCP Tools (25+ Available)

#### Authentication
- `check_auth_status` - Check if user is authenticated
- `test_connection` - Test server connection

#### Account Management
- `get_ad_accounts` - Get user's ad accounts

#### Campaign Management
- `get_campaigns` - List campaigns
- `create_campaign` - Create new campaign
- `update_campaign` - Update campaign status/budget
- `get_campaign_insights` - Get performance metrics

#### Ad Set Management
- `create_adset` - Create ad set with targeting

#### Creative Management
- `create_ad_creative` - Create ad creative
- `create_ad` - Create ad in ad set
- `upload_ad_image` - Upload image
- `get_ad_creatives` - List creatives

#### Targeting & Audiences
- `search_interests` - Search targeting interests
- `get_custom_audiences` - List custom audiences

#### AI-Powered Tools 🤖
- `create_campaign_from_prompt` - Natural language campaign creation
- `analyze_campaign_performance` - AI analysis of performance

### Example: Create Campaign

```typescript
// Via MCP client
{
  "tool": "create_campaign",
  "arguments": {
    "user_id": "user123",
    "account_id": "act_123456789",
    "name": "Summer Sale 2025",
    "objective": "OUTCOME_LEADS",
    "daily_budget": 5000,
    "status": "PAUSED"
  }
}
```

Response:
```json
{
  "id": "120210000000000",
  "name": "Summer Sale 2025",
  "status": "PAUSED"
}
```

## 📊 Why Self-Host? (vs Pipeboard)

| Feature | Self-Hosted (This) | Pipeboard MCP |
|---------|-------------------|---------------|
| **Cost** | ✅ FREE (Cloudflare free tier) | ⚠️ Paid service |
| **OAuth** | ✅ Built-in OAuth 2.0 | ⚠️ Via Pipeboard |
| **Control** | ✅ Full control | ❌ Limited |
| **Multi-tenant** | ✅ Native support | ⚠️ Complex setup |
| **Customization** | ✅ Unlimited | ❌ Limited |
| **Latest API** | ✅ Always v23.0+ | ⚠️ May lag |
| **Data Privacy** | ✅ Your infrastructure | ⚠️ Third-party |

**See [project.md](./project.md) for detailed comparison.**

## 🔒 Security

- ✅ OAuth 2.0 with CSRF protection (state parameter)
- ✅ Tokens stored encrypted in Cloudflare D1
- ✅ 60-day token expiry with automatic checks
- ✅ No token logging or exposure
- ✅ Rate limiting ready
- ✅ Secrets managed via Wrangler CLI

## 💰 Cost

### Free Tier (Perfect for Testing/MVP)
- **Cloudflare Workers**: 100k requests/day
- **D1 Database**: 5 GB storage
- **KV Namespace**: 100k operations/day
- **Total: $0/month** ✨

### Production Scale (1M requests/month)
- **Cloudflare Workers**: $5/month (Paid plan)
- **D1 & KV**: Still free (under limits)
- **Total: ~$5-10/month**

Compare to alternatives costing $50-200/month + per-user fees!

## 📚 Documentation

- **[SETUP.md](./SETUP.md)** - Complete setup guide with troubleshooting
- **[ENV.md](./ENV.md)** - Environment variables reference
- **[project.md](./project.md)** - Architecture decisions & comparison
- **[schema.sql](./schema.sql)** - Database schema

## 🛠️ Development

```bash
# Local development
npm run dev

# Visit: http://localhost:8787

# Type checking
npm run type-check

# Format code
npm run format

# Deploy to production
npm run deploy

# View live logs
wrangler tail

# Database commands
wrangler d1 execute meta_ads_mcp --command "SELECT * FROM user_tokens"
```

## 🔌 Connect to Claude Desktop

Add to your Claude Desktop config (`~/.claude/config.json`):

```json
{
  "mcpServers": {
    "meta-ads": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://your-worker.workers.dev/sse"
      ]
    }
  }
}
```

Restart Claude Desktop and you'll see all Meta Ads tools!

## 🔗 Connect to Cloudflare AI Playground

1. Go to https://playground.ai.cloudflare.com/
2. Enter your MCP server URL: `https://your-worker.workers.dev/sse`
3. Start using Meta Ads tools in the playground!

## 🐛 Troubleshooting

### Common Issues

**"Invalid OAuth redirect URI"**
- Check Meta App settings match your deployed URL exactly
- No trailing slash: `https://your-worker.workers.dev/auth/callback`

**"User not authenticated"**
- Complete OAuth flow first: `/auth/meta?user_id=USER_ID`
- Check database: `wrangler d1 execute meta_ads_mcp --command "SELECT * FROM user_tokens"`

**"Database not found"**
- Create database: `wrangler d1 create meta_ads_mcp`
- Initialize schema: `wrangler d1 execute meta_ads_mcp --file=schema.sql`
- Update `wrangler.jsonc` with correct database_id

**"Access token expired"**
- Tokens expire after 60 days - reconnect account
- Visit: `/auth/meta?user_id=USER_ID`

**"Tool call failed"**
- Check you've deployed with secrets: `wrangler secret put META_APP_ID`
- Test health: `curl https://your-worker.workers.dev/health`

See **[SETUP.md](./SETUP.md)** for more troubleshooting.

## 🎯 Use Cases

### 💼 SaaS Platforms
- Let users connect their own Meta Ads accounts
- Create campaigns on their behalf via natural language
- Show unified dashboard across multiple accounts

### 🏢 Marketing Agencies
- Manage multiple client accounts from one interface
- Automated campaign creation and optimization
- Real-time performance monitoring

### 🔧 Internal Tools
- Company marketing dashboard
- Automated weekly/monthly reports
- Campaign budget optimization

## 🚧 Roadmap

- [ ] Webhook support for real-time campaign updates
- [ ] Advanced AI campaign optimization (using Claude)
- [ ] Automated A/B testing
- [ ] Audience segmentation recommendations
- [ ] Budget allocation AI
- [ ] Multi-platform support (Google Ads, LinkedIn Ads)

## 🧪 Testing

```bash
# Test health
curl https://your-worker.workers.dev/health

# Test OAuth (in browser)
https://your-worker.workers.dev/auth/meta?user_id=test-user

# Test MCP tool (via Claude or MCP client)
{
  "tool": "check_auth_status",
  "arguments": { "user_id": "test-user" }
}
```

## 📝 License

MIT License

## 🙏 Credits

- Inspired by [wipsoft/meta-mcp](https://github.com/wipsoft/meta-mcp)
- Built with [MCP SDK](https://github.com/modelcontextprotocol/sdk)
- Powered by [Cloudflare Workers](https://workers.cloudflare.com/)
- Uses [Meta Marketing API v23.0](https://developers.facebook.com/docs/marketing-apis)

## 🆘 Support

- **GitHub Issues**: For bugs and feature requests
- **Meta API**: [Meta Developer Community](https://developers.facebook.com/community/)
- **Cloudflare**: [Cloudflare Discord](https://discord.cloudflare.com)
- **MCP Protocol**: [MCP GitHub](https://github.com/modelcontextprotocol)

---

**Built with ❤️ for the AI-powered advertising future**

*No more expensive third-party services. Own your infrastructure. Scale infinitely.*
