import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { MetaAPIClient } from "./meta-api-client";
import {
	handleOAuthStart,
	handleOAuthCallback,
	getUserToken,
	isTokenExpired,
	disconnectAccount,
} from "./oauth-handler";

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface Env {
	// Meta OAuth
	META_APP_ID: string;
	META_APP_SECRET: string;
	META_API_VERSION?: string;
	
	// Optional: Direct token for testing (bypass OAuth)
	META_ACCESS_TOKEN?: string;
	
	// AI
	ANTHROPIC_API_KEY: string;
	
	// Storage
	DB: D1Database;
	OAUTH_STATE: KVNamespace;
	ADS_PLATFORM_MCP: DurableObjectNamespace;
}

// =============================================================================
// AI Ads Platform MCP - Self-Hosted Meta Ads Integration
// =============================================================================

export class AdsPlatformMCP extends McpAgent<Env> {
	server = new McpServer({
		name: "AI Ads Platform MCP (Self-Hosted)",
		version: "2.0.0",
	});

	// Helper to get Meta API client for a user
	private async getMetaClient(userId: string, env: Env): Promise<MetaAPIClient> {
		// For testing: use direct token if provided
		if (env.META_ACCESS_TOKEN) {
			return new MetaAPIClient({
				accessToken: env.META_ACCESS_TOKEN,
				apiVersion: env.META_API_VERSION || "v23.0",
			});
		}

		// Production: get user's stored token
		const userToken = await getUserToken(userId, env.DB);
		
		if (!userToken) {
			throw new Error("User not authenticated. Please connect your Meta Ads account first.");
		}

		if (isTokenExpired(userToken.expiresAt)) {
			throw new Error("Access token expired. Please reconnect your Meta Ads account.");
		}

		return new MetaAPIClient({
			accessToken: userToken.accessToken,
			apiVersion: env.META_API_VERSION || "v23.0",
		});
	}

	async init() {
		// Access environment variables through the McpAgent context
		const getEnv = () => {
			// @ts-ignore - env is available through this.env in McpAgent
			return this.env || {};
		};

		// =======================================================================
		// DEBUG/TEST TOOLS
		// =======================================================================

		this.server.tool(
			"test_connection",
			"Test if the MCP server is working and check authentication status",
			{
				user_id: z.string().default("test-user"),
			},
			async ({ user_id }) => {
				const env = getEnv();
				const userToken = await getUserToken(user_id, env.DB);
				
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									status: "connected",
									server_version: "2.0.0",
									server_type: "self-hosted",
									has_meta_app_id: !!env.META_APP_ID,
									has_meta_app_secret: !!env.META_APP_SECRET,
									has_anthropic_key: !!env.ANTHROPIC_API_KEY,
									user_authenticated: !!userToken,
									token_expired: userToken ? isTokenExpired(userToken.expiresAt) : null,
									ad_accounts_count: userToken?.adAccounts.length || 0,
								},
								null,
								2
							),
						},
					],
				};
			}
		);

		// =======================================================================
		// AUTHENTICATION STATUS
		// =======================================================================

		this.server.tool(
			"check_auth_status",
			"Check if user has connected their Meta Ads account",
			{
				user_id: z.string().describe("User ID to check"),
			},
			async ({ user_id }) => {
				const env = getEnv();
				
				// Check for direct access token (dev mode)
				if (env.META_ACCESS_TOKEN) {
					try {
						// Test the token by fetching ad accounts
						const client = new MetaAPIClient({
							accessToken: env.META_ACCESS_TOKEN,
							apiVersion: env.META_API_VERSION || "v23.0",
						});
						const accounts = await client.getAdAccounts("me", 10);
						
						return {
							content: [
								{
									type: "text",
									text: JSON.stringify({
										authenticated: true,
										mode: "development",
										using_direct_token: true,
										ad_accounts_count: accounts.data?.length || 0,
										ad_accounts: (accounts.data || []).map((acc: any) => ({
											id: acc.id,
											name: acc.name,
											account_id: acc.account_id,
											currency: acc.currency,
										})),
										message: "Using META_ACCESS_TOKEN (development mode)",
									}, null, 2),
								},
							],
						};
					} catch (error) {
						return {
							content: [
								{
									type: "text",
									text: JSON.stringify({
										authenticated: false,
										mode: "development",
										using_direct_token: true,
										error: error instanceof Error ? error.message : "Token invalid",
										message: "META_ACCESS_TOKEN is set but invalid or expired",
									}, null, 2),
								},
							],
						};
					}
				}
				
				// Production mode: check database for user's OAuth token
				const userToken = await getUserToken(user_id, env.DB);

				if (!userToken) {
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify({
									authenticated: false,
									mode: "production",
									message: "User needs to connect Meta Ads account",
									oauth_url: "/auth/meta",
								}),
							},
						],
					};
				}

				const expired = isTokenExpired(userToken.expiresAt);
				
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								authenticated: true,
								mode: "production",
								token_expired: expired,
								expires_at: new Date(userToken.expiresAt * 1000).toISOString(),
								ad_accounts_count: userToken.adAccounts.length,
								ad_accounts: userToken.adAccounts.map((acc: any) => ({
									id: acc.id,
									name: acc.name,
									account_id: acc.account_id,
									currency: acc.currency,
								})),
							}, null, 2),
						},
					],
				};
			}
		);

		// =======================================================================
		// META ADS API TOOLS (Self-Hosted)
		// =======================================================================

		// Get ad accounts
		this.server.tool(
			"get_ad_accounts",
			"Get all Meta ad accounts accessible by the user",
			{
				user_id: z.string().describe("User ID"),
				limit: z.number().default(200).optional(),
			},
			async ({ user_id, limit }) => {
				const env = getEnv();
				const client = await this.getMetaClient(user_id, env);
				const result = await client.getAdAccounts("me", limit || 200);
				
				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				};
			}
		);

		// Get campaigns
		this.server.tool(
			"get_campaigns",
			"Get campaigns for an ad account",
			{
				user_id: z.string().describe("User ID"),
				account_id: z.string().describe("Format: act_XXXXXXXXX"),
				limit: z.number().default(10).optional(),
				status_filter: z.string().optional(),
			},
			async ({ user_id, account_id, limit, status_filter }) => {
				const env = getEnv();
				const client = await this.getMetaClient(user_id, env);
				const result = await client.getCampaigns(account_id, {
					limit: limit || 10,
					status_filter,
				});
				
				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				};
			}
		);

		// Create campaign
		this.server.tool(
			"create_campaign",
			"Create a new Meta Ads campaign",
			{
				user_id: z.string().describe("User ID"),
				account_id: z.string().describe("Ad account ID (act_XXXXXXXXX)"),
				name: z.string().describe("Campaign name"),
				objective: z.enum([
					"OUTCOME_AWARENESS",
					"OUTCOME_ENGAGEMENT",
					"OUTCOME_LEADS",
					"OUTCOME_SALES",
					"OUTCOME_TRAFFIC",
					"OUTCOME_APP_PROMOTION",
				]),
				status: z.enum(["ACTIVE", "PAUSED"]).default("PAUSED").optional(),
				daily_budget: z.number().optional(),
				lifetime_budget: z.number().optional(),
				special_ad_categories: z.array(z.string()).optional(),
			},
			async (params) => {
				const env = getEnv();
				const client = await this.getMetaClient(params.user_id, env);
				const result = await client.createCampaign(params.account_id, {
					name: params.name,
					objective: params.objective,
					status: params.status || "PAUSED",
					daily_budget: params.daily_budget,
					lifetime_budget: params.lifetime_budget,
					special_ad_categories: params.special_ad_categories,
				});
				
				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				};
			}
		);

		// Update campaign
		this.server.tool(
			"update_campaign",
			"Update an existing campaign",
			{
				user_id: z.string().describe("User ID"),
				campaign_id: z.string().describe("Campaign ID"),
				status: z.enum(["ACTIVE", "PAUSED"]).optional(),
				name: z.string().optional(),
				daily_budget: z.number().optional(),
			},
			async ({ user_id, campaign_id, ...params }) => {
				const env = getEnv();
				const client = await this.getMetaClient(user_id, env);
				const result = await client.updateCampaign(campaign_id, params);
				
				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				};
			}
		);

		// Get campaign insights
		this.server.tool(
			"get_campaign_insights",
			"Get performance insights for a campaign",
			{
				user_id: z.string().describe("User ID"),
				campaign_id: z.string().describe("Campaign ID"),
				time_range: z.string().default("last_7d").optional(),
				breakdown: z.string().optional(),
			},
			async ({ user_id, campaign_id, time_range, breakdown }) => {
				const env = getEnv();
				const client = await this.getMetaClient(user_id, env);
				const result = await client.getInsights(campaign_id, {
					time_range: time_range || "last_7d",
					breakdown,
					level: "campaign",
				});
				
				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				};
			}
		);

		// Create ad set
		this.server.tool(
			"create_adset",
			"Create a new ad set in a campaign",
			{
				user_id: z.string().describe("User ID"),
				account_id: z.string().describe("Ad account ID"),
				campaign_id: z.string().describe("Campaign ID"),
				name: z.string().describe("Ad set name"),
				status: z.enum(["ACTIVE", "PAUSED"]).default("PAUSED").optional(),
				daily_budget: z.string().optional(),
				targeting: z.record(z.any()).describe("Targeting spec"),
				optimization_goal: z.string().default("LINK_CLICKS").optional(),
				billing_event: z.string().default("IMPRESSIONS").optional(),
			},
			async (params) => {
				const env = getEnv();
				const client = await this.getMetaClient(params.user_id, env);
				const result = await client.createAdSet(params.account_id, {
					campaign_id: params.campaign_id,
					name: params.name,
					status: params.status || "PAUSED",
					daily_budget: params.daily_budget,
					targeting: params.targeting,
					optimization_goal: params.optimization_goal || "LINK_CLICKS",
					billing_event: params.billing_event || "IMPRESSIONS",
				});
				
				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				};
			}
		);

		// Create ad creative
		this.server.tool(
			"create_ad_creative",
			"Create a new ad creative",
			{
				user_id: z.string().describe("User ID"),
				account_id: z.string().describe("Ad account ID"),
				name: z.string().describe("Creative name"),
				object_story_spec: z.record(z.any()).describe("Creative spec"),
			},
			async (params) => {
				const env = getEnv();
				const client = await this.getMetaClient(params.user_id, env);
				const result = await client.createAdCreative(params.account_id, {
					name: params.name,
					object_story_spec: params.object_story_spec,
				});
				
				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				};
			}
		);

		// Create ad
		this.server.tool(
			"create_ad",
			"Create a new ad in an ad set",
			{
				user_id: z.string().describe("User ID"),
				account_id: z.string().describe("Ad account ID"),
				name: z.string().describe("Ad name"),
				adset_id: z.string().describe("Ad set ID"),
				creative_id: z.string().describe("Creative ID"),
				status: z.enum(["ACTIVE", "PAUSED"]).default("PAUSED").optional(),
			},
			async (params) => {
				const env = getEnv();
				const client = await this.getMetaClient(params.user_id, env);
				const result = await client.createAd(params.account_id, {
					name: params.name,
					adset_id: params.adset_id,
					creative: { creative_id: params.creative_id },
					status: params.status || "PAUSED",
				});
				
				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				};
			}
		);

		// Search interests
		this.server.tool(
			"search_interests",
			"Search for targeting interests",
			{
				user_id: z.string().describe("User ID"),
				query: z.string().describe("Search query"),
				limit: z.number().default(25).optional(),
			},
			async ({ user_id, query, limit }) => {
				const env = getEnv();
				const client = await this.getMetaClient(user_id, env);
				const result = await client.searchInterests(query, limit || 25);
				
				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				};
			}
		);

		// Upload image
		this.server.tool(
			"upload_ad_image",
			"Upload an image for use in ads",
			{
				user_id: z.string().describe("User ID"),
				account_id: z.string().describe("Ad account ID"),
				image_url: z.string().describe("URL of image to upload"),
				name: z.string().optional(),
			},
			async (params) => {
				const env = getEnv();
				const client = await this.getMetaClient(params.user_id, env);
				const result = await client.uploadImage(
					params.account_id,
					params.image_url,
					params.name
				);
				
				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				};
			}
		);

		// Get custom audiences
		this.server.tool(
			"get_custom_audiences",
			"Get custom audiences for an ad account",
			{
				user_id: z.string().describe("User ID"),
				account_id: z.string().describe("Ad account ID"),
				limit: z.number().default(100).optional(),
			},
			async ({ user_id, account_id, limit }) => {
				const env = getEnv();
				const client = await this.getMetaClient(user_id, env);
				const result = await client.getCustomAudiences(account_id, limit || 100);
				
				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				};
			}
		);

		// Get ad creatives
		this.server.tool(
			"get_ad_creatives",
			"Get ad creatives for an account",
			{
				user_id: z.string().describe("User ID"),
				account_id: z.string().describe("Ad account ID"),
				limit: z.number().default(50).optional(),
			},
			async ({ user_id, account_id, limit }) => {
				const env = getEnv();
				const client = await this.getMetaClient(user_id, env);
				const result = await client.getAdCreatives(account_id, limit || 50);
				
				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				};
			}
		);

		// =======================================================================
		// NATURAL LANGUAGE CAMPAIGN CREATION (Your Unique Value)
		// =======================================================================

		this.server.tool(
			"create_campaign_from_prompt",
			"Create a complete campaign from natural language description",
			{
				user_id: z.string().describe("User ID"),
				prompt: z.string().describe("Natural language: what you want to achieve"),
				account_id: z.string().describe("Ad account ID to create campaign in"),
				budget: z.number().optional().describe("Budget in account currency"),
			},
			async ({ user_id, prompt, account_id, budget }) => {
				const env = getEnv();
				const client = await this.getMetaClient(user_id, env);

				// Step 1: Use AI to parse the prompt and create campaign structure
				const campaignPlan = await this.generateCampaignPlan(prompt, budget, env);

				// Step 2: Get available ad accounts (for reference)
				const accounts = await client.getAdAccounts("me", 10);

				// Step 3: Generate ad copy variations
				const adCopy = await this.generateAdCopy(prompt, "en", 5, env);

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									campaign_plan: campaignPlan,
									available_accounts: accounts.data || [],
									ad_variations: adCopy,
									next_steps: [
										"Review the campaign details",
										"Adjust budget or targeting if needed",
										"Use 'create_campaign' tool to create it",
										"Use 'create_adset' to add ad sets",
										"Use 'create_ad' to launch ads",
									],
								},
								null,
								2
							),
						},
					],
				};
			}
		);

		// =======================================================================
		// AI-POWERED ANALYSIS TOOLS
		// =======================================================================

		this.server.tool(
			"analyze_campaign_performance",
			"Get AI-powered analysis of campaign performance",
			{
				user_id: z.string().describe("User ID"),
				campaign_id: z.string().describe("Campaign ID"),
				time_range: z.string().default("last_7d").optional(),
			},
			async ({ user_id, campaign_id, time_range }) => {
				const env = getEnv();
				const client = await this.getMetaClient(user_id, env);

				// Get insights from Meta Ads
				const insights = await client.getInsights(campaign_id, {
					time_range: time_range || "last_7d",
					level: "campaign",
				});

				// Use AI to analyze and provide recommendations
				const analysis = await this.analyzeWithAI(insights, env);

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									raw_insights: insights,
									ai_analysis: analysis,
								},
								null,
								2
							),
						},
					],
				};
			}
		);
	}

	// =======================================================================
	// AI HELPER METHODS (Would use Claude API in production)
	// =======================================================================

	private async generateCampaignPlan(
		prompt: string,
		budget: number | undefined,
		env: Env
	): Promise<any> {
		// TODO: Call Claude API to generate campaign structure
		return {
			name: `Campaign: ${prompt.substring(0, 50)}`,
			objective: "OUTCOME_LEADS",
			budget: budget || 30000,
			targeting: {
				geo_locations: { countries: ["HU"] },
				age_min: 25,
				age_max: 55,
			},
			timeline: "7 days",
		};
	}

	private async generateAdCopy(
		goal: string,
		language: string,
		count: number,
		env: Env
	): Promise<any[]> {
		// TODO: Call Claude API to generate ad copy
		const variations = [];
		for (let i = 0; i < count; i++) {
			variations.push({
				headline: `Headline ${i + 1} for: ${goal}`,
				description: `Compelling description ${i + 1}`,
				call_to_action: i % 2 === 0 ? "BOOK_NOW" : "LEARN_MORE",
			});
		}
		return variations;
	}

	private async analyzeWithAI(insights: any, env: Env): Promise<any> {
		// TODO: Use Claude to analyze the campaign data
		return {
			summary: "Campaign performing well",
			insights: [
				"Cost per lead is below target",
				"Evening ads perform 2x better",
			],
			recommendations: [
				{
					action: "Increase budget",
					reason: "Strong ROI",
					confidence: "high",
				},
			],
		};
	}
}

// =============================================================================
// WORKER EXPORT
// =============================================================================

// Create MCP handlers
const sseHandler = AdsPlatformMCP.serveSSE("/sse", {
	binding: "ADS_PLATFORM_MCP",
});

const mcpHandler = AdsPlatformMCP.serve("/mcp", {
	binding: "ADS_PLATFORM_MCP",
});

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		// =======================================================================
		// OAUTH ENDPOINTS
		// =======================================================================

		// OAuth: Start auth flow
		if (url.pathname === "/auth/meta") {
			// Get user ID from query params or session
			const userId = url.searchParams.get("user_id") || "default-user";
			return handleOAuthStart(request, env, userId);
		}

		// OAuth: Handle callback
		if (url.pathname === "/auth/callback") {
			return handleOAuthCallback(request, env);
		}

		// Disconnect account
		if (url.pathname === "/auth/disconnect" && request.method === "POST") {
			try {
				const { user_id } = await request.json() as { user_id: string };
				const success = await disconnectAccount(user_id, env.DB);
				
				return new Response(
					JSON.stringify({ success, message: success ? "Account disconnected" : "Failed to disconnect" }),
					{
						headers: {
							"Content-Type": "application/json",
							"Access-Control-Allow-Origin": "*",
						},
					}
				);
			} catch (error) {
				return new Response(
					JSON.stringify({ error: "Failed to disconnect account" }),
					{
						status: 500,
						headers: {
							"Content-Type": "application/json",
							"Access-Control-Allow-Origin": "*",
						},
					}
				);
			}
		}

		// =======================================================================
		// HEALTH & STATUS
		// =======================================================================

		// Health check
		if (url.pathname === "/health") {
			return new Response(
				JSON.stringify({
					status: "healthy",
					server: "AI Ads Platform MCP (Self-Hosted)",
					version: "2.0.0",
					implementation: "wipsoft/meta-mcp-inspired",
					meta_app_configured: !!env.META_APP_ID && !!env.META_APP_SECRET,
					endpoints: {
						sse: "/sse",
						mcp: "/mcp",
						oauth_start: "/auth/meta?user_id=YOUR_USER_ID",
						oauth_callback: "/auth/callback",
						disconnect: "/auth/disconnect",
					},
				}),
				{
					headers: {
						"Content-Type": "application/json",
						"Access-Control-Allow-Origin": "*",
					},
				}
			);
		}

		// CORS preflight
		if (request.method === "OPTIONS") {
			return new Response(null, {
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
					"Access-Control-Allow-Headers": "Content-Type, Authorization",
				},
			});
		}

		// =======================================================================
		// MCP ENDPOINTS
		// =======================================================================

		// MCP SSE endpoint
		if (url.pathname === "/sse" || url.pathname === "/sse/message") {
			return sseHandler.fetch(request, env, ctx);
		}

		// MCP standard endpoint
		if (url.pathname === "/mcp") {
			return mcpHandler.fetch(request, env, ctx);
		}

		// =======================================================================
		// DEFAULT
		// =======================================================================

		return new Response(
			JSON.stringify({
				name: "AI Ads Platform MCP (Self-Hosted)",
				version: "2.0.0",
				description: "Self-hosted Meta Ads MCP server with OAuth support",
				endpoints: [
					{ path: "/health", method: "GET", description: "Health check" },
					{ path: "/sse", method: "GET", description: "MCP SSE endpoint" },
					{ path: "/mcp", method: "POST", description: "MCP standard endpoint" },
					{ path: "/auth/meta?user_id=YOUR_ID", method: "GET", description: "Start OAuth flow" },
					{ path: "/auth/callback", method: "GET", description: "OAuth callback" },
					{ path: "/auth/disconnect", method: "POST", description: "Disconnect account" },
				],
				docs: "See README.md for setup instructions",
			}),
			{
				headers: {
					"Content-Type": "application/json",
					"Access-Control-Allow-Origin": "*",
				},
			}
		);
	},
};
