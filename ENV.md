# Environment Variables Configuration

## Required Environment Variables

### Meta OAuth Configuration

```bash
# Your Meta App ID from https://developers.facebook.com/apps/
META_APP_ID=your_meta_app_id_here

# Your Meta App Secret
META_APP_SECRET=your_meta_app_secret_here
```

### Optional Configuration

```bash
# Meta API version (defaults to v23.0 if not set)
META_API_VERSION=v23.0

# For testing without OAuth, provide a direct access token
# Get one from: https://developers.facebook.com/tools/explorer/
META_ACCESS_TOKEN=your_long_lived_token_here

# Anthropic API key for AI-powered features (optional)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

## Cloudflare Bindings (Configured in wrangler.jsonc)

These are NOT environment variables but Cloudflare resource bindings:

- **DB**: D1 Database binding for storing user tokens and campaigns
- **OAUTH_STATE**: KV Namespace for OAuth CSRF state management
- **ADS_PLATFORM_MCP**: Durable Object for MCP agent

## Setting Variables

### Local Development

Create a `.dev.vars` file in project root:

```ini
META_APP_ID=1234567890
META_APP_SECRET=abcdef1234567890
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

### Production Deployment

Use Wrangler CLI to set secrets:

```bash
# Set Meta App ID
wrangler secret put META_APP_ID
# Paste your App ID when prompted

# Set Meta App Secret
wrangler secret put META_APP_SECRET
# Paste your App Secret when prompted

# Set Anthropic API Key (optional)
wrangler secret put ANTHROPIC_API_KEY
# Paste your API key when prompted
```

## Getting Meta App Credentials

1. Go to [Meta for Developers](https://developers.facebook.com/apps/)
2. Create or select your app
3. Go to **Settings** → **Basic**
4. Copy:
   - **App ID** → `META_APP_ID`
   - **App Secret** → Click "Show" → `META_APP_SECRET`

## Getting Anthropic API Key (Optional)

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Navigate to **API Keys**
3. Create new key
4. Copy the key → `ANTHROPIC_API_KEY`

## Security Best Practices

1. **Never commit secrets to git**
   - `.dev.vars` is gitignored
   - Use `wrangler secret` for production

2. **Rotate secrets regularly**
   ```bash
   wrangler secret put META_APP_SECRET
   ```

3. **Use different apps for dev/prod**
   - Development: Test app with limited users
   - Production: Production app with App Review

4. **Monitor secret usage**
   - Check Cloudflare Workers logs
   - Set up alerts for failed auth attempts

## Testing Configuration

Check if your environment is properly configured:

```bash
# Deploy and test
npm run deploy

# Check health endpoint
curl https://your-worker.workers.dev/health
```

Expected response:
```json
{
  "status": "healthy",
  "meta_app_configured": true,
  ...
}
```

If `meta_app_configured` is `false`, your secrets are not set correctly.

