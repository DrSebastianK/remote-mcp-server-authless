# Meta Ads MCP Comparison: wipsoft vs Pipeboard

## TL;DR: Use wipsoft/meta-mcp! 🎉

**Why:** Self-hosted, free, OAuth support, more control, better for SaaS

---

## Side-by-Side Comparison

| Feature | **wipsoft/meta-mcp** | **Pipeboard MCP** |
|---------|---------------------|-------------------|
| **Cost** | ✅ **FREE** (self-hosted) | ⚠️ Requires Pipeboard account |
| **OAuth Support** | ✅ **YES** - Built-in OAuth 2.0 | ⚠️ Via Pipeboard (indirect) |
| **User Permissions** | ✅ Users connect their own accounts | ❌ Need to manage tokens |
| **Self-Hosted** | ✅ Full control | ❌ Hosted by Pipeboard |
| **Deployment** | ✅ Vercel, Cloudflare, anywhere | ⚠️ Remote endpoint only |
| **Multi-tenant** | ✅ Easy to implement | ⚠️ More complex |
| **API Rate Limits** | ✅ You manage | ⚠️ Pipeboard manages |
| **Customization** | ✅ Full code access | ❌ Limited |
| **Tools Available** | ✅ 25 comprehensive tools | ✅ Similar coverage |
| **Latest Meta API** | ✅ v23.0 (latest) | ⚠️ May lag behind |
| **For SaaS Product** | ✅ **PERFECT** | ⚠️ OK but limited |

---

## Key Advantages of wipsoft/meta-mcp

### 1. **Built-in OAuth Support** ✅

This is HUGE for your SaaS! Users can:

```
User clicks "Connect Meta Ads"
    ↓
Redirected to Facebook
    ↓
Grants permissions
    ↓
Returns to your app
    ↓
Token stored securely
    ↓
Ready to create campaigns!
```

**With Pipeboard:** Users need to manually create tokens or use Pipeboard's auth (less control)

### 2. **Self-Hosted = You Own It**

- Deploy to Vercel/Cloudflare
- No dependency on third-party service
- Scale as you need
- No per-user fees

### 3. **Multi-Tenant Ready**

Perfect for SaaS:
```typescript
// Each user gets their own authenticated session
const user1Campaign = await createCampaign(user1Token, ...);
const user2Campaign = await createCampaign(user2Token, ...);
```

### 4. **Latest Features**

- Meta Graph API v23.0 (latest)
- ODAE objectives (modern campaign types)
- All new Meta features immediately

---

## How OAuth Works for Your Users

### The Flow:

```
┌─────────────────────────────────────────────────────────────┐
│  Step 1: User Clicks "Connect Meta Ads"                    │
├─────────────────────────────────────────────────────────────┤
│  Your App                                                    │
│  [Connect Meta Ads Button] ──> Redirects to:               │
│  https://www.facebook.com/v23.0/dialog/oauth?               │
│    client_id=YOUR_APP_ID                                    │
│    redirect_uri=https://yourapp.com/auth/callback          │
│    scope=ads_management,ads_read                            │
└─────────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 2: User Authorizes on Facebook                        │
├─────────────────────────────────────────────────────────────┤
│  Facebook Login Screen                                       │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ [Your App Name] wants to:                           │  │
│  │ ✓ Manage your ads                                   │  │
│  │ ✓ Read ad performance                               │  │
│  │                                                       │  │
│  │ [Allow] [Cancel]                                     │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                      ↓ (User clicks Allow)
┌─────────────────────────────────────────────────────────────┐
│  Step 3: Facebook Redirects Back with Code                 │
├─────────────────────────────────────────────────────────────┤
│  https://yourapp.com/auth/callback?code=ABC123XYZ          │
└─────────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 4: Your App Exchanges Code for Access Token         │
├─────────────────────────────────────────────────────────────┤
│  POST https://graph.facebook.com/v23.0/oauth/access_token  │
│  {                                                           │
│    client_id: YOUR_APP_ID,                                  │
│    client_secret: YOUR_APP_SECRET,                          │
│    code: ABC123XYZ,                                         │
│    redirect_uri: https://yourapp.com/auth/callback         │
│  }                                                           │
│                                                              │
│  Response:                                                   │
│  {                                                           │
│    access_token: "long_lived_token_here",                  │
│    token_type: "bearer",                                    │
│    expires_in: 5183944  // ~60 days                        │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 5: Store Token & Fetch User's Ad Accounts           │
├─────────────────────────────────────────────────────────────┤
│  Your Database:                                              │
│  users.meta_access_token = "long_lived_token_here"         │
│  users.meta_token_expires_at = Date + 60 days              │
│                                                              │
│  Then fetch their ad accounts:                              │
│  GET https://graph.facebook.com/v23.0/me/adaccounts        │
│                                                              │
│  User sees:                                                  │
│  ✅ Connected! Found 3 ad accounts                          │
│    - Dental Clinic Ads (act_123456)                        │
│    - Other Business (act_789012)                           │
│    - Test Account (act_345678)                             │
└─────────────────────────────────────────────────────────────┘
```

### What User Experiences:

1. **Clicks button:** "Connect Meta Ads"
2. **Redirected to Facebook:** Familiar login screen
3. **Grants permission:** One-click approval
4. **Redirected back:** "✅ Connected successfully!"
5. **Start using:** Can now create campaigns

**Total time: ~15 seconds**

---

## Implementation in Your Cloudflare Worker

### Step 1: Create Meta App

1. Go to https://developers.facebook.com/apps/
2. Create new app
3. Add "Marketing API" product
4. Set OAuth redirect URL: `https://your-worker.workers.dev/auth/callback`
5. Get App ID & App Secret

### Step 2: Add OAuth Endpoints to Your Worker

```typescript
// src/index.ts

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    // OAuth: Start auth flow
    if (url.pathname === "/auth/meta") {
      const authUrl = `https://www.facebook.com/v23.0/dialog/oauth?` +
        `client_id=${env.META_APP_ID}` +
        `&redirect_uri=${encodeURIComponent('https://your-worker.workers.dev/auth/callback')}` +
        `&scope=ads_management,ads_read` +
        `&state=${generateRandomState()}`; // CSRF protection
      
      return Response.redirect(authUrl);
    }

    // OAuth: Handle callback
    if (url.pathname === "/auth/callback") {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      
      // Verify state (CSRF protection)
      // ... state verification logic ...

      // Exchange code for access token
      const tokenResponse = await fetch(
        `https://graph.facebook.com/v23.0/oauth/access_token?` +
        `client_id=${env.META_APP_ID}` +
        `&client_secret=${env.META_APP_SECRET}` +
        `&redirect_uri=${encodeURIComponent('https://your-worker.workers.dev/auth/callback')}` +
        `&code=${code}`
      );

      const { access_token, expires_in } = await tokenResponse.json();

      // Get user's ad accounts
      const accountsResponse = await fetch(
        `https://graph.facebook.com/v23.0/me/adaccounts?access_token=${access_token}`
      );
      const accounts = await accountsResponse.json();

      // Store in your database (use Cloudflare D1 or external DB)
      await env.DB.prepare(
        'INSERT INTO user_tokens (user_id, access_token, expires_at, ad_accounts) VALUES (?, ?, ?, ?)'
      ).bind(
        userId, 
        access_token, 
        Date.now() + (expires_in * 1000),
        JSON.stringify(accounts.data)
      ).run();

      // Redirect back to your app
      return Response.redirect('https://yourapp.com/dashboard?connected=true');
    }

    // Your existing MCP endpoints...
    // ...
  }
};
```

### Step 3: Use User's Token in MCP Tools

```typescript
// When user creates campaign, use their stored token

async function createCampaignForUser(userId: string, prompt: string) {
  // Get user's token from database
  const user = await env.DB.prepare(
    'SELECT access_token FROM user_tokens WHERE user_id = ?'
  ).bind(userId).first();

  // Call Meta Ads MCP with user's token
  const result = await fetch('https://graph.facebook.com/v23.0/act_123456/campaigns', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${user.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Campaign from: ' + prompt,
      objective: 'OUTCOME_LEADS',
      status: 'PAUSED',
      // ... other params
    })
  });

  return await result.json();
}
```

---

## Recommended Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Your Frontend (Lovable)                   │
│                                                               │
│  [Connect Meta Ads] ──> /auth/meta                          │
│  [Create Campaign] ──> /api/campaigns/create                │
│  [View Performance] ──> /api/campaigns/insights             │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Your Cloudflare Worker (Backend)                │
│                                                               │
│  OAuth Endpoints:                                            │
│  • /auth/meta ────────────> Redirects to Facebook          │
│  • /auth/callback ────────> Stores token in D1              │
│                                                               │
│  API Endpoints:                                              │
│  • /api/campaigns/create ─> Uses wipsoft/meta-mcp           │
│  • /api/campaigns/insights > Calls Meta API directly        │
│                                                               │
│  Storage:                                                    │
│  • Cloudflare D1 ─────────> User tokens, campaign data     │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     Meta Marketing API                       │
│                                                               │
│  Using user's OAuth token:                                   │
│  • Create campaigns                                          │
│  • Get insights                                              │
│  • Manage ads                                                │
└─────────────────────────────────────────────────────────────┘
```

---

## Storage Schema (Cloudflare D1)

```sql
-- Store user tokens
CREATE TABLE user_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL UNIQUE,
  meta_access_token TEXT NOT NULL,
  meta_refresh_token TEXT,
  token_expires_at INTEGER NOT NULL,
  ad_accounts TEXT, -- JSON array of ad accounts
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Store campaigns for quick access
CREATE TABLE campaigns (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  meta_campaign_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  budget REAL,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES user_tokens(user_id)
);

-- Store insights cache (to reduce API calls)
CREATE TABLE campaign_insights (
  campaign_id TEXT NOT NULL,
  date TEXT NOT NULL,
  impressions INTEGER,
  clicks INTEGER,
  spend REAL,
  leads INTEGER,
  cost_per_lead REAL,
  PRIMARY KEY (campaign_id, date),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
);
```

---

## Security Best Practices

### 1. **Token Storage**
✅ Store in database, never in localStorage
✅ Encrypt tokens at rest
✅ Auto-refresh before expiration

### 2. **State Parameter (CSRF)**
```typescript
// Generate random state for OAuth
function generateState() {
  return crypto.randomUUID();
}

// Store in session
await SESSION.put(`oauth_state:${state}`, userId, { expirationTtl: 600 });

// Verify on callback
const storedUserId = await SESSION.get(`oauth_state:${state}`);
if (!storedUserId) throw new Error('Invalid state');
```

### 3. **Token Refresh**
```typescript
// Check if token expired
if (Date.now() > user.token_expires_at) {
  // Refresh token
  const refreshed = await refreshMetaToken(user.meta_refresh_token);
  // Update database
  await updateUserToken(userId, refreshed.access_token);
}
```

---

## Cost Comparison

### wipsoft/meta-mcp (Self-Hosted)
- **Cloudflare Workers:** FREE (100k requests/day)
- **Cloudflare D1:** FREE (5GB storage)
- **Meta API:** FREE (just ad spend)
- **Total:** $0/month

### Pipeboard MCP
- **Pipeboard Service:** Check their pricing
- **Per-user fees:** Possible
- **Total:** $? /month

---

## Implementation Timeline

### Week 1: OAuth Setup (2-3 hours)
- [ ] Create Meta App
- [ ] Add OAuth endpoints to Worker
- [ ] Test auth flow
- [ ] Store tokens in D1

### Week 2: Campaign Creation (3-4 hours)
- [ ] Integrate wipsoft/meta-mcp
- [ ] Build campaign creation endpoint
- [ ] Test with user tokens
- [ ] Add error handling

### Week 3: Polish (2-3 hours)
- [ ] Token refresh logic
- [ ] User-friendly error messages
- [ ] Connection status UI
- [ ] Multi-account selection

**Total: ~8-10 hours of dev work**

---

## Sample Code: Complete OAuth Flow

```typescript
// src/oauth.ts

export async function handleMetaOAuth(request: Request, env: Env) {
  const url = new URL(request.url);

  // Step 1: Start OAuth flow
  if (url.pathname === '/auth/meta') {
    const state = crypto.randomUUID();
    const userId = await getUserIdFromSession(request);
    
    // Store state in KV
    await env.OAUTH_STATE.put(state, userId, { expirationTtl: 600 });

    const authUrl = new URL('https://www.facebook.com/v23.0/dialog/oauth');
    authUrl.searchParams.set('client_id', env.META_APP_ID);
    authUrl.searchParams.set('redirect_uri', `${url.origin}/auth/callback`);
    authUrl.searchParams.set('scope', 'ads_management,ads_read');
    authUrl.searchParams.set('state', state);

    return Response.redirect(authUrl.toString());
  }

  // Step 2: Handle callback
  if (url.pathname === '/auth/callback') {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    // Handle errors
    if (error) {
      return new Response(`OAuth error: ${error}`, { status: 400 });
    }

    // Verify state
    const userId = await env.OAUTH_STATE.get(state);
    if (!userId) {
      return new Response('Invalid state', { status: 400 });
    }

    // Exchange code for token
    const tokenUrl = new URL('https://graph.facebook.com/v23.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', env.META_APP_ID);
    tokenUrl.searchParams.set('client_secret', env.META_APP_SECRET);
    tokenUrl.searchParams.set('redirect_uri', `${url.origin}/auth/callback`);
    tokenUrl.searchParams.set('code', code);

    const tokenResponse = await fetch(tokenUrl.toString());
    const { access_token, expires_in } = await tokenResponse.json();

    // Get user's ad accounts
    const accountsUrl = new URL('https://graph.facebook.com/v23.0/me/adaccounts');
    accountsUrl.searchParams.set('access_token', access_token);
    accountsUrl.searchParams.set('fields', 'id,name,currency,timezone_name');

    const accountsResponse = await fetch(accountsUrl.toString());
    const accounts = await accountsResponse.json();

    // Store in D1
    await env.DB.prepare(`
      INSERT OR REPLACE INTO user_tokens 
      (user_id, meta_access_token, token_expires_at, ad_accounts, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      userId,
      access_token,
      Date.now() + (expires_in * 1000),
      JSON.stringify(accounts.data),
      Date.now()
    ).run();

    // Clean up state
    await env.OAUTH_STATE.delete(state);

    // Redirect to success page
    return Response.redirect(`${url.origin}/dashboard?connected=true`);
  }
}
```

---

## Conclusion: Use wipsoft/meta-mcp

### ✅ Advantages:
1. **FREE** - No service fees
2. **OAuth built-in** - Users connect seamlessly
3. **Self-hosted** - You control everything
4. **Multi-tenant ready** - Perfect for SaaS
5. **Latest features** - Meta API v23.0
6. **Open source** - Can customize

### ⚠️ Pipeboard is fine for:
- Quick prototyping
- Single-user use
- Testing concepts

### 🎯 For your SaaS platform:
**Use wipsoft/meta-mcp** - It's built for exactly what you need!

---

## Next Steps

1. **Fork wipsoft/meta-mcp** repository
2. **Create Meta App** for OAuth
3. **Add OAuth endpoints** to your Cloudflare Worker
4. **Test auth flow** with your dental clinic account
5. **Build campaign creation** using user tokens
6. **Launch!** 🚀