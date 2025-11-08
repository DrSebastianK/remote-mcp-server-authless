/**
 * Alternative OAuth Handler using Business Login
 * For Marketing API access
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
 * Start OAuth flow using business_management permission
 * This is the correct parent permission for ads_management
 */
export async function handleOAuthStartBusiness(
	request: Request,
	env: OAuthEnv,
	userId: string
): Promise<Response> {
	const url = new URL(request.url);
	const state = crypto.randomUUID();

	// Store state in KV with 10-minute TTL
	await env.OAUTH_STATE.put(state, userId, { expirationTtl: 600 });

	// Build Facebook OAuth URL for Business Login
	const apiVersion = env.META_API_VERSION || "v23.0";
	const authUrl = new URL(`https://www.facebook.com/${apiVersion}/dialog/oauth`);
	authUrl.searchParams.set("client_id", env.META_APP_ID);
	authUrl.searchParams.set("redirect_uri", `${url.origin}/auth/callback`);
	
	// business_management is the parent permission for Marketing API
	// It includes ads_management capabilities
	authUrl.searchParams.set("scope", "business_management");
	authUrl.searchParams.set("state", state);
	authUrl.searchParams.set("response_type", "code");

	return Response.redirect(authUrl.toString(), 302);
}



