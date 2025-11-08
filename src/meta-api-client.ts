/**
 * Meta Marketing API Client for Cloudflare Workers
 * Self-hosted implementation based on wipsoft/meta-mcp
 */

export interface MetaAPIConfig {
	accessToken: string;
	apiVersion?: string;
}

export class MetaAPIClient {
	private accessToken: string;
	private apiVersion: string;
	private baseUrl: string;

	constructor(config: MetaAPIConfig) {
		this.accessToken = config.accessToken;
		this.apiVersion = config.apiVersion || "v23.0";
		this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
	}

	/**
	 * Make a GET request to Meta API
	 */
	private async get(endpoint: string, params: Record<string, any> = {}): Promise<any> {
		const url = new URL(`${this.baseUrl}${endpoint}`);
		url.searchParams.set("access_token", this.accessToken);

		// Add all other params
		for (const [key, value] of Object.entries(params)) {
			if (value !== undefined && value !== null) {
				url.searchParams.set(key, String(value));
			}
		}

		const response = await fetch(url.toString());
		
		if (!response.ok) {
			const error = await response.json();
			throw new Error(`Meta API Error: ${JSON.stringify(error)}`);
		}

		return response.json();
	}

	/**
	 * Make a POST request to Meta API
	 */
	private async post(endpoint: string, data: Record<string, any> = {}): Promise<any> {
		const url = new URL(`${this.baseUrl}${endpoint}`);
		url.searchParams.set("access_token", this.accessToken);

		// Convert data to form-urlencoded
		const formData = new URLSearchParams();
		for (const [key, value] of Object.entries(data)) {
			if (value !== undefined && value !== null) {
				formData.append(key, typeof value === "object" ? JSON.stringify(value) : String(value));
			}
		}

		const response = await fetch(url.toString(), {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: formData,
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(`Meta API Error: ${JSON.stringify(error)}`);
		}

		return response.json();
	}

	/**
	 * Get ad accounts accessible by the user
	 */
	async getAdAccounts(userId: string = "me", limit: number = 200): Promise<any> {
		return this.get(`/${userId}/adaccounts`, {
			fields: "id,name,account_id,currency,timezone_name,account_status,business",
			limit,
		});
	}

	/**
	 * Get campaigns for an ad account
	 */
	async getCampaigns(accountId: string, options: {
		limit?: number;
		status_filter?: string;
		fields?: string;
	} = {}): Promise<any> {
		const fields = options.fields || "id,name,objective,status,daily_budget,lifetime_budget,budget_remaining,created_time,updated_time";
		
		return this.get(`/${accountId}/campaigns`, {
			fields,
			limit: options.limit || 10,
			...(options.status_filter && { status: options.status_filter }),
		});
	}

	/**
	 * Create a new campaign
	 */
	async createCampaign(accountId: string, params: {
		name: string;
		objective: string;
		status?: string;
		daily_budget?: number;
		lifetime_budget?: number;
		special_ad_categories?: string[];
		bid_strategy?: string;
	}): Promise<any> {
		const data: Record<string, any> = {
			name: params.name,
			objective: params.objective,
			status: params.status || "PAUSED",
			special_ad_categories: params.special_ad_categories || [],
		};

		if (params.daily_budget) {
			data.daily_budget = params.daily_budget;
		}

		if (params.lifetime_budget) {
			data.lifetime_budget = params.lifetime_budget;
		}

		if (params.bid_strategy) {
			data.bid_strategy = params.bid_strategy;
		}

		return this.post(`/${accountId}/campaigns`, data);
	}

	/**
	 * Update a campaign
	 */
	async updateCampaign(campaignId: string, params: Record<string, any>): Promise<any> {
		return this.post(`/${campaignId}`, params);
	}

	/**
	 * Get insights for a campaign/adset/ad
	 */
	async getInsights(objectId: string, params: {
		time_range?: string;
		date_preset?: string;
		level?: string;
		fields?: string;
		breakdown?: string;
	} = {}): Promise<any> {
		const fields = params.fields || "impressions,clicks,spend,reach,frequency,ctr,cpc,cpm,actions,action_values,cost_per_action_type";
		
		const queryParams: Record<string, any> = {
			fields,
			level: params.level || "campaign",
		};

		if (params.date_preset) {
			queryParams.date_preset = params.date_preset;
		} else if (params.time_range) {
			// Parse time_range shortcuts
			const timeRange = this.parseTimeRange(params.time_range);
			if (timeRange) {
				queryParams.time_range = JSON.stringify(timeRange);
			}
		}

		if (params.breakdown) {
			queryParams.breakdowns = params.breakdown;
		}

		return this.get(`/${objectId}/insights`, queryParams);
	}

	/**
	 * Create an ad set
	 */
	async createAdSet(accountId: string, params: {
		campaign_id: string;
		name: string;
		status?: string;
		daily_budget?: string;
		lifetime_budget?: string;
		billing_event?: string;
		optimization_goal?: string;
		targeting: Record<string, any>;
		start_time?: string;
		end_time?: string;
	}): Promise<any> {
		const data: Record<string, any> = {
			campaign_id: params.campaign_id,
			name: params.name,
			status: params.status || "PAUSED",
			billing_event: params.billing_event || "IMPRESSIONS",
			optimization_goal: params.optimization_goal || "LINK_CLICKS",
			targeting: params.targeting,
		};

		if (params.daily_budget) {
			data.daily_budget = params.daily_budget;
		}

		if (params.lifetime_budget) {
			data.lifetime_budget = params.lifetime_budget;
		}

		if (params.start_time) {
			data.start_time = params.start_time;
		}

		if (params.end_time) {
			data.end_time = params.end_time;
		}

		return this.post(`/${accountId}/adsets`, data);
	}

	/**
	 * Create an ad creative
	 */
	async createAdCreative(accountId: string, params: {
		name: string;
		object_story_spec?: any;
		degrees_of_freedom_spec?: any;
	}): Promise<any> {
		return this.post(`/${accountId}/adcreatives`, params);
	}

	/**
	 * Create an ad
	 */
	async createAd(accountId: string, params: {
		name: string;
		adset_id: string;
		creative: { creative_id: string };
		status?: string;
	}): Promise<any> {
		return this.post(`/${accountId}/ads`, {
			name: params.name,
			adset_id: params.adset_id,
			creative: params.creative,
			status: params.status || "PAUSED",
		});
	}

	/**
	 * Search for targeting interests
	 */
	async searchInterests(query: string, limit: number = 25): Promise<any> {
		return this.get("/search", {
			type: "adinterest",
			q: query,
			limit,
		});
	}

	/**
	 * Get custom audiences
	 */
	async getCustomAudiences(accountId: string, limit: number = 100): Promise<any> {
		return this.get(`/${accountId}/customaudiences`, {
			fields: "id,name,description,approximate_count,delivery_status,operation_status,subtype",
			limit,
		});
	}

	/**
	 * Create a custom audience
	 */
	async createCustomAudience(accountId: string, params: {
		name: string;
		description?: string;
		subtype: string;
		customer_file_source?: string;
	}): Promise<any> {
		return this.post(`/${accountId}/customaudiences`, params);
	}

	/**
	 * Create a lookalike audience
	 */
	async createLookalikeAudience(accountId: string, params: {
		name: string;
		origin_audience_id: string;
		lookalike_spec: {
			type: string;
			ratio: number;
			country: string;
		};
	}): Promise<any> {
		return this.post(`/${accountId}/customaudiences`, {
			name: params.name,
			subtype: "LOOKALIKE",
			lookalike_spec: params.lookalike_spec,
			origin_audience_id: params.origin_audience_id,
		});
	}

	/**
	 * Upload an image
	 */
	async uploadImage(accountId: string, imageUrl: string, name?: string): Promise<any> {
		return this.post(`/${accountId}/adimages`, {
			url: imageUrl,
			...(name && { name }),
		});
	}

	/**
	 * Get ad creatives
	 */
	async getAdCreatives(accountId: string, limit: number = 50): Promise<any> {
		return this.get(`/${accountId}/adcreatives`, {
			fields: "id,name,object_story_spec,thumbnail_url,effective_object_story_id",
			limit,
		});
	}

	/**
	 * Helper: Parse time range shortcuts
	 */
	private parseTimeRange(range: string): { since: string; until: string } | null {
		const today = new Date();
		const formatDate = (date: Date) => date.toISOString().split("T")[0];

		switch (range) {
			case "today":
				return { since: formatDate(today), until: formatDate(today) };
			case "yesterday": {
				const yesterday = new Date(today);
				yesterday.setDate(yesterday.getDate() - 1);
				return { since: formatDate(yesterday), until: formatDate(yesterday) };
			}
			case "last_7d": {
				const sevenDaysAgo = new Date(today);
				sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
				return { since: formatDate(sevenDaysAgo), until: formatDate(today) };
			}
			case "last_14d": {
				const fourteenDaysAgo = new Date(today);
				fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
				return { since: formatDate(fourteenDaysAgo), until: formatDate(today) };
			}
			case "last_30d": {
				const thirtyDaysAgo = new Date(today);
				thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
				return { since: formatDate(thirtyDaysAgo), until: formatDate(today) };
			}
			case "this_month": {
				const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
				return { since: formatDate(firstDay), until: formatDate(today) };
			}
			case "last_month": {
				const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
				const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
				return { since: formatDate(firstDay), until: formatDate(lastDay) };
			}
			case "maximum":
				// Meta API will use account creation date as start
				return null;
			default:
				return null;
		}
	}
}

/**
 * OAuth Token Exchange
 */
export async function exchangeCodeForToken(
	code: string,
	redirectUri: string,
	clientId: string,
	clientSecret: string,
	apiVersion: string = "v23.0"
): Promise<{
	access_token: string;
	token_type: string;
	expires_in: number;
}> {
	const url = new URL(`https://graph.facebook.com/${apiVersion}/oauth/access_token`);
	url.searchParams.set("client_id", clientId);
	url.searchParams.set("client_secret", clientSecret);
	url.searchParams.set("redirect_uri", redirectUri);
	url.searchParams.set("code", code);

	const response = await fetch(url.toString());

	if (!response.ok) {
		const error = await response.json();
		throw new Error(`OAuth token exchange failed: ${JSON.stringify(error)}`);
	}

	return response.json();
}

/**
 * Get long-lived token (60 days)
 */
export async function getLongLivedToken(
	shortLivedToken: string,
	clientId: string,
	clientSecret: string,
	apiVersion: string = "v23.0"
): Promise<{
	access_token: string;
	token_type: string;
	expires_in: number;
}> {
	const url = new URL(`https://graph.facebook.com/${apiVersion}/oauth/access_token`);
	url.searchParams.set("grant_type", "fb_exchange_token");
	url.searchParams.set("client_id", clientId);
	url.searchParams.set("client_secret", clientSecret);
	url.searchParams.set("fb_exchange_token", shortLivedToken);

	const response = await fetch(url.toString());

	if (!response.ok) {
		const error = await response.json();
		throw new Error(`Long-lived token exchange failed: ${JSON.stringify(error)}`);
	}

	return response.json();
}

