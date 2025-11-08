/**
 * OAuth Handler for Meta Ads Authentication
 * Implements the OAuth 2.0 flow for user authentication
 */

import { exchangeCodeForToken, getLongLivedToken, MetaAPIClient } from "./meta-api-client";

export interface OAuthEnv {
	META_APP_ID: string;
	META_APP_SECRET: string;
	OAUTH_STATE: KVNamespace;
	DB: D1Database;
	META_API_VERSION?: string;
}

/**
 * Generate a secure random state for CSRF protection
 */
function generateState(): string {
	return crypto.randomUUID();
}

/**
 * Start OAuth flow - redirect user to Facebook authorization
 */
export async function handleOAuthStart(
	request: Request,
	env: OAuthEnv,
	userId: string
): Promise<Response> {
	const url = new URL(request.url);
	const state = generateState();

	// Store state in KV with 10-minute TTL
	await env.OAUTH_STATE.put(state, userId, { expirationTtl: 600 });

	// Build Facebook OAuth URL
	const apiVersion = env.META_API_VERSION || "v23.0";
	const authUrl = new URL(`https://www.facebook.com/${apiVersion}/dialog/oauth`);
	authUrl.searchParams.set("client_id", env.META_APP_ID);
	authUrl.searchParams.set("redirect_uri", `${url.origin}/auth/callback`);
	// Request business_management for Marketing API access
	// This includes ads_management, pages_read_engagement, and pages_show_list
	authUrl.searchParams.set("scope", "business_management");
	authUrl.searchParams.set("state", state);
	authUrl.searchParams.set("response_type", "code");

	return Response.redirect(authUrl.toString(), 302);
}

/**
 * Handle OAuth callback - exchange code for token and store
 */
export async function handleOAuthCallback(
	request: Request,
	env: OAuthEnv
): Promise<Response> {
	const url = new URL(request.url);
	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");
	const error = url.searchParams.get("error");
	const errorDescription = url.searchParams.get("error_description");

	// Handle OAuth errors
	if (error) {
		return new Response(
			JSON.stringify({
				error: "oauth_error",
				message: errorDescription || error,
			}),
			{
				status: 400,
				headers: { "Content-Type": "application/json" },
			}
		);
	}

	// Validate required parameters
	if (!code || !state) {
		return new Response(
			JSON.stringify({
				error: "missing_parameters",
				message: "Missing code or state parameter",
			}),
			{
				status: 400,
				headers: { "Content-Type": "application/json" },
			}
		);
	}

	// Verify state (CSRF protection)
	const userId = await env.OAUTH_STATE.get(state);
	if (!userId) {
		return new Response(
			JSON.stringify({
				error: "invalid_state",
				message: "Invalid or expired state parameter",
			}),
			{
				status: 400,
				headers: { "Content-Type": "application/json" },
			}
		);
	}

	try {
		// Exchange code for access token
		const apiVersion = env.META_API_VERSION || "v23.0";
		const redirectUri = `${url.origin}/auth/callback`;
		
		const tokenData = await exchangeCodeForToken(
			code,
			redirectUri,
			env.META_APP_ID,
			env.META_APP_SECRET,
			apiVersion
		);

		// Exchange for long-lived token (60 days)
		const longLivedToken = await getLongLivedToken(
			tokenData.access_token,
			env.META_APP_ID,
			env.META_APP_SECRET,
			apiVersion
		);

		// Get user's ad accounts
		const metaClient = new MetaAPIClient({
			accessToken: longLivedToken.access_token,
			apiVersion,
		});

		const accountsResponse = await metaClient.getAdAccounts("me", 200);

		// Store token and ad accounts in database
		const expiresAt = Math.floor(Date.now() / 1000) + longLivedToken.expires_in;
		const now = Math.floor(Date.now() / 1000);

		await env.DB.prepare(
			`INSERT INTO user_tokens 
			(user_id, meta_access_token, token_expires_at, ad_accounts, created_at, updated_at)
			VALUES (?1, ?2, ?3, ?4, ?5, ?6)
			ON CONFLICT(user_id) DO UPDATE SET
				meta_access_token = ?2,
				token_expires_at = ?3,
				ad_accounts = ?4,
				updated_at = ?6`
		).bind(
			userId,
			longLivedToken.access_token,
			expiresAt,
			JSON.stringify(accountsResponse.data || []),
			now,
			now
		).run();

		// Clean up OAuth state
		await env.OAUTH_STATE.delete(state);

		// Return success page or redirect
		const successHtml = `
<!DOCTYPE html>
<html>
<head>
	<title>Meta Ads Connected</title>
	<style>
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
			display: flex;
			justify-content: center;
			align-items: center;
			height: 100vh;
			margin: 0;
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		}
		.container {
			background: white;
			padding: 3rem;
			border-radius: 12px;
			box-shadow: 0 20px 60px rgba(0,0,0,0.3);
			text-align: center;
			max-width: 500px;
		}
		.success-icon {
			font-size: 4rem;
			margin-bottom: 1rem;
		}
		h1 {
			color: #333;
			margin-bottom: 1rem;
		}
		p {
			color: #666;
			margin-bottom: 2rem;
		}
		.accounts {
			background: #f7fafc;
			padding: 1rem;
			border-radius: 8px;
			margin: 1rem 0;
			text-align: left;
		}
		.account {
			padding: 0.5rem;
			border-bottom: 1px solid #e2e8f0;
		}
		.account:last-child {
			border-bottom: none;
		}
		button {
			background: #667eea;
			color: white;
			border: none;
			padding: 1rem 2rem;
			border-radius: 8px;
			font-size: 1rem;
			cursor: pointer;
			transition: background 0.2s;
		}
		button:hover {
			background: #5568d3;
		}
	</style>
</head>
<body>
	<div class="container">
		<div class="success-icon">✅</div>
		<h1>Successfully Connected!</h1>
		<p>Your Meta Ads account has been connected.</p>
		<div class="accounts">
			<strong>Found ${(accountsResponse.data || []).length} Ad Account(s):</strong>
			${(accountsResponse.data || []).slice(0, 5).map((acc: any) => `
				<div class="account">
					📊 ${acc.name || acc.account_id}
				</div>
			`).join("")}
		</div>
		<p style="font-size: 0.9rem; color: #999;">
			Token expires in ${Math.floor(longLivedToken.expires_in / 86400)} days
		</p>
		<button onclick="window.close()">Close Window</button>
	</div>
</body>
</html>
		`;

		return new Response(successHtml, {
			headers: {
				"Content-Type": "text/html",
			},
		});
	} catch (error) {
		console.error("OAuth callback error:", error);
		
		return new Response(
			JSON.stringify({
				error: "token_exchange_failed",
				message: error instanceof Error ? error.message : "Failed to exchange token",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			}
		);
	}
}

/**
 * Get user's stored token
 */
export async function getUserToken(
	userId: string,
	db: D1Database
): Promise<{
	accessToken: string;
	expiresAt: number;
	adAccounts: any[];
} | null> {
	const result = await db.prepare(
		`SELECT meta_access_token, token_expires_at, ad_accounts 
		FROM user_tokens 
		WHERE user_id = ?`
	).bind(userId).first();

	if (!result) {
		return null;
	}

	return {
		accessToken: result.meta_access_token as string,
		expiresAt: result.token_expires_at as number,
		adAccounts: JSON.parse(result.ad_accounts as string || "[]"),
	};
}

/**
 * Check if user's token is expired
 */
export function isTokenExpired(expiresAt: number): boolean {
	const now = Math.floor(Date.now() / 1000);
	// Consider token expired if it expires in less than 1 day
	const buffer = 86400; // 1 day in seconds
	return expiresAt - now < buffer;
}

/**
 * Disconnect user's Meta Ads account
 */
export async function disconnectAccount(
	userId: string,
	db: D1Database
): Promise<boolean> {
	const result = await db.prepare(
		`DELETE FROM user_tokens WHERE user_id = ?`
	).bind(userId).run();

	return result.success;
}

