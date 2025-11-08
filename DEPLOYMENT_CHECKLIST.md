# Deployment Checklist ✅

Use this checklist to ensure your Meta Ads MCP server is properly deployed.

## Pre-Deployment

### Development Environment
- [ ] Node.js v18+ installed
- [ ] Wrangler CLI installed globally (`npm install -g wrangler`)
- [ ] Authenticated with Cloudflare (`wrangler login`)
- [ ] Dependencies installed (`npm install`)

### Meta App Setup
- [ ] Meta Developer account created
- [ ] Meta App created (Business type)
- [ ] Marketing API product added
- [ ] App ID copied
- [ ] App Secret copied
- [ ] Basic information filled (name, email, privacy policy)

### Cloudflare Resources
- [ ] D1 database created (`wrangler d1 create meta_ads_mcp`)
- [ ] Database ID copied and added to `wrangler.jsonc`
- [ ] KV namespace created (`wrangler kv:namespace create OAUTH_STATE`)
- [ ] KV namespace ID copied and added to `wrangler.jsonc`
- [ ] Database schema initialized (`wrangler d1 execute meta_ads_mcp --file=schema.sql`)

### Secrets Configuration
- [ ] `META_APP_ID` set (`wrangler secret put META_APP_ID`)
- [ ] `META_APP_SECRET` set (`wrangler secret put META_APP_SECRET`)
- [ ] Optional: `ANTHROPIC_API_KEY` set for AI features

## Deployment

### Initial Deploy
- [ ] Code deployed (`npm run deploy`)
- [ ] Deployment successful (no errors)
- [ ] Worker URL copied (e.g., `https://remote-mcp-server-authless.your-account.workers.dev`)

### Meta App OAuth Configuration
- [ ] OAuth redirect URL added to Meta App:
  - Format: `https://your-worker-url.workers.dev/auth/callback`
  - No trailing slash
  - Exact match with deployed URL
- [ ] App Domain added (e.g., `your-account.workers.dev`)
- [ ] Changes saved in Meta App settings

## Post-Deployment Testing

### Health Check
- [ ] `/health` endpoint returns 200 OK
- [ ] `meta_app_configured: true` in response
- [ ] All endpoints listed in response

### OAuth Flow
- [ ] Can access `/auth/meta?user_id=test-user`
- [ ] Redirects to Facebook login
- [ ] Can authorize app
- [ ] Redirects back to success page
- [ ] Success page shows ad accounts
- [ ] Token stored in database (verify with `wrangler d1 execute meta_ads_mcp --command "SELECT user_id FROM user_tokens"`)

### MCP Tools
- [ ] `check_auth_status` tool works
- [ ] Returns authenticated status
- [ ] Shows correct ad accounts count
- [ ] `get_ad_accounts` tool works
- [ ] Returns actual ad accounts from Meta

### Database
- [ ] Can query user_tokens table
- [ ] Tokens are being stored correctly
- [ ] Timestamps are correct (not in future)

## Integration Testing

### Claude Desktop (Optional)
- [ ] Added MCP server to Claude config
- [ ] Claude Desktop restarted
- [ ] Tools visible in Claude interface
- [ ] Can execute tools from Claude
- [ ] Responses are correct

### Frontend Integration (Your App)
- [ ] OAuth button triggers `/auth/meta` correctly
- [ ] User ID passed correctly in URL
- [ ] Popup window opens (if using popup method)
- [ ] Success callback handled
- [ ] User status updated in your app
- [ ] MCP tools callable from your backend

## Production Readiness

### Security
- [ ] Secrets not in code/git
- [ ] `.dev.vars` in `.gitignore`
- [ ] User authentication implemented (not just user_id param)
- [ ] CORS configured correctly for your domain
- [ ] Rate limiting considered/implemented

### Monitoring
- [ ] Cloudflare Workers analytics enabled
- [ ] Error tracking set up
- [ ] Health check monitoring configured
- [ ] Token expiry alerts considered

### Documentation
- [ ] Team knows how to access worker logs (`wrangler tail`)
- [ ] Team knows how to update secrets
- [ ] Team knows OAuth flow
- [ ] Emergency contacts documented

### Meta App Review (For Production)
- [ ] App submitted for review (if needed)
- [ ] Advanced Access requested for:
  - [ ] `ads_management`
  - [ ] `ads_read`
  - [ ] `read_insights`
- [ ] App demo video prepared
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Business verification completed

## Scaling Considerations

### If Expecting High Traffic
- [ ] Upgraded to Cloudflare Workers Paid plan ($5/mo)
- [ ] Considered D1 database limits (5GB free)
- [ ] Considered KV limits (100k operations/day free)
- [ ] Implemented request rate limiting
- [ ] Implemented cache for frequently accessed data

### If Supporting Multiple Tenants
- [ ] User authentication system integrated
- [ ] Per-user rate limiting implemented
- [ ] Database indexes optimized
- [ ] Token refresh logic implemented
- [ ] User management dashboard created

## Maintenance

### Weekly
- [ ] Check Cloudflare Workers dashboard for errors
- [ ] Review request volume and costs
- [ ] Check for failed OAuth attempts

### Monthly
- [ ] Review token expiration rate
- [ ] Check for unused tokens (cleanup)
- [ ] Review Meta API usage limits
- [ ] Update dependencies (`npm update`)

### As Needed
- [ ] Update Meta API version (currently v23.0)
- [ ] Rotate Meta App Secret
- [ ] Backup D1 database (`wrangler d1 export`)
- [ ] Update wrangler to latest version

## Emergency Procedures

### If OAuth Stops Working
1. Check Meta App status (not disabled)
2. Verify OAuth redirect URL still correct
3. Check secrets are still set: `wrangler secret list`
4. Check Meta API status page

### If Database Unreachable
1. Check wrangler.jsonc has correct database_id
2. Verify database exists: `wrangler d1 list`
3. Check database not deleted
4. Restore from backup if needed

### If Rate Limited by Meta
1. Check rate limit tier in Meta App settings
2. Implement request queuing
3. Add caching for frequently accessed data
4. Request rate limit increase from Meta

### If Worker Not Responding
1. Check Cloudflare status page
2. Check worker logs: `wrangler tail`
3. Redeploy: `npm run deploy`
4. Contact Cloudflare support if persistent

## Rollback Plan

If deployment fails or has critical issues:

```bash
# View previous deployments
wrangler deployments list

# Rollback to previous version
wrangler rollback [DEPLOYMENT_ID]

# Or redeploy from last known good commit
git checkout [LAST_GOOD_COMMIT]
npm run deploy
```

## Contact Information

- **Cloudflare Support**: https://dash.cloudflare.com/support
- **Meta Developer Support**: https://developers.facebook.com/support/
- **Your Team Lead**: [Add contact]
- **On-Call Engineer**: [Add contact]

---

## Deployment Sign-Off

Deployed by: _________________  
Date: _________________  
Version: _________________  
Worker URL: _________________  

All checklist items completed: ☐ Yes ☐ No

Issues noted: _________________  
_________________  
_________________  

Next review date: _________________

