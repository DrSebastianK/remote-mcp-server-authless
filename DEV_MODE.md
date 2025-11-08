# Development Mode Setup (No OAuth Required)

Use this setup for development/testing without needing Meta App Review.

## 🚀 Quick Setup

### Step 1: Get Your Access Token

1. Go to **Meta Graph API Explorer**: https://developers.facebook.com/tools/explorer/
2. Select your Meta App from dropdown (top right)
3. Click **"Get Token"** → **"Get User Access Token"**
4. Select permissions:
   - ✅ `ads_management`
   - ✅ `business_management`
5. Click **"Generate Access Token"**
6. **Approve** the permissions

### Step 2: Get Long-Lived Token (60 days)

1. Click the **ℹ️ icon** next to your access token
2. Click **"Open in Access Token Tool"**
3. Click **"Extend Access Token"**
4. Copy the **new long-lived token** (starts with `EAAX...`)

### Step 3: Store as Secret

```bash
npx wrangler secret put META_ACCESS_TOKEN
# Paste your token when prompted
```

### Step 4: Deploy

```bash
npm run deploy
```

## ✅ That's It!

Your MCP server will now use your personal access token for all operations. No OAuth needed!

---

## 🧪 Testing

### Test Health

```bash
curl https://your-worker.workers.dev/health
```

### Test MCP Tools

Use any MCP client (like Claude Desktop):

```json
{
  "tool": "get_ad_accounts",
  "arguments": {
    "user_id": "dev-user"
  }
}
```

The `user_id` doesn't matter - it will always use your `META_ACCESS_TOKEN`.

---

## 🔄 Token Refresh

Your token expires in **60 days**. When it expires:

1. Go back to Graph API Explorer
2. Generate new token
3. Extend it to long-lived
4. Update secret:
   ```bash
   npx wrangler secret put META_ACCESS_TOKEN
   ```

---

## 🎯 When to Switch to OAuth

Switch to OAuth when you're ready to:
- Let other users connect their own ad accounts
- Go to production
- Submit for Meta App Review

Until then, this dev mode is perfect! ✨

---

## 📋 Current Setup

**Mode**: Development (Direct Token)  
**OAuth**: Disabled (bypassed)  
**Token Expiry**: 60 days  
**Permissions**: ads_management, business_management  
**Your Ad Accounts**: Accessible via any user_id  

---

## 🔐 Security Note

**⚠️ Important**: This token has full access to YOUR ad accounts. 

- ✅ Perfect for development
- ✅ Safe on Cloudflare Workers (secrets are encrypted)
- ❌ DON'T commit the token to git
- ❌ DON'T share the token
- ❌ DON'T use in production with real users

For production with real users → Use OAuth flow with App Review.



