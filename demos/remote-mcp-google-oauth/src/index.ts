import { env } from "cloudflare:workers";
import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { McpServer } from "@modelcontextprotocol/server";
import {
	createMcpHandler,
	getMcpAuthContext,
} from "agents/mcp/server";
import { z } from "zod";
import { GoogleHandler } from "./google-handler";
import type { Props } from "./utils";

async function getGoogleAccessToken(props: Props): Promise<string> {
	if (!props.refreshToken) {
		if (props.accessToken) return props.accessToken;
		throw new Error("Google authorization expired. Please reconnect.");
	}

	const response = await fetch("https://oauth2.googleapis.com/token", {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: new URLSearchParams({
			client_id: env.GOOGLE_CLIENT_ID,
			client_secret: env.GOOGLE_CLIENT_SECRET,
			refresh_token: props.refreshToken,
			grant_type: "refresh_token",
		}),
	});

	const data = (await response.json()) as {
		access_token?: string;
		error?: string;
	};

	if (!response.ok || !data.access_token) {
		throw new Error("Could not refresh Google access token.");
	}

	return data.access_token;
}

async function youtubeRequest(path: string, props: Props) {
	const token = await getGoogleAccessToken(props);

	const response = await fetch(
		`https://www.googleapis.com/${path}`,
		{
			headers: {
				Authorization: `Bearer ${token}`,
			},
		},
	);

	if (!response.ok) {
		throw new Error(
			`YouTube API error: ${response.status} ${await response.text()}`,
		);
	}

	return response.json();
}



	server.registerTool(
		"youtube_analytics_report",
		{
			description: "Get daily YouTube channel analytics including views, watch time and subscribers gained.",
			inputSchema: z.object({
				startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
				endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
			}),
		},
		async ({ startDate, endDate }) => {
			try {
				if (!props) throw new Error("Google account not connected.");

				if (startDate > endDate) {
					throw new Error("Start date must be before end date.");
				}

				const params = new URLSearchParams({
					ids: "channel==MINE",
					startDate,
					endDate,
					metrics: "views,estimatedMinutesWatched,averageViewDuration,subscribersGained",
					dimensions: "day",
					sort: "day",
			function createServer() {
	const server = new McpServer({
		name: "Cinecut YouTube Assistant",
		version: "1.0.0",
	});

	

	server.registerTool(
		"youtube_get_channel",
		{
			description: "Get the authenticated YouTube channel information and statistics.",
		},
		async () => {
			try {
				if (!props) throw new Error("Google account not connected.");

				const data = await youtubeRequest(
					"youtube/v3/channels?part=snippet,statistics,contentDetails&mine=true",
					props,
				);

				return {
					content: [{
						type: "text",
						text: JSON.stringify(data, null, 2),
					}],
				};
			} catch (error) {
				return {
					isError: true,
					content: [{
						type: "text",
						text: String(error),
					}],
				};
			}
		},
	);

	server.registerTool(
		"youtube_get_recent_videos",
		{
			description: "Get recent uploaded videos from the authenticated YouTube channel.",
			inputSchema: z.object({
				maxResults: z.number().int().min(1).max(50).default(10),
			}),
		},
		async ({ maxResults }) => {
	try {
	const props = getMcpAuthContext()?.props as Props | undefined;
		if (!props) throw new Error("Google account not connected.");
			if (!props) throw new Error("Google account not connected.");

				const channel = await youtubeRequest(
					"youtube/v3/channels?part=contentDetails&mine=true",
					props,
				) as any;

				const uploadsPlaylist =
					channel.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

				if (!uploadsPlaylist) {
					throw new Error("Could not find the uploads playlist.");
				}

				const videos = await youtubeRequest(
					`youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylist}&maxResults=${maxResults}`,
					props,
				);

				return {
					content: [{
						type: "text",
						text: JSON.stringify(videos, null, 2),
					}],
				};
			} catch (error) {
				return {
					isError: true,
					content: [{
						type: "text",
						text: String(error),
					}],
				};
			}
		},
	);	});

				const report = await youtubeRequest(
					`youtubeAnalytics/v2/reports?${params.toString()}`,
					props,
				);

				return {
					content: [{
						type: "text",
						text: JSON.stringify(report, null, 2),
					}],
				};
			} catch (error) {
				return {
					isError: true,
					content: [{
						type: "text",
						text: String(error),
					}],
				};
			}
		},
	);

	return server;
}

const mcpHandler = createMcpHandler(createServer);

export default new OAuthProvider<Env>({
	apiHandler: {
		fetch(request: Request, env: Env, ctx: ExecutionContext) {
			return mcpHandler(request, env, ctx);
		},
	},
	apiRoute: "/mcp",
	authorizeEndpoint: "/authorize",
	clientRegistrationEndpoint: "/register",
	defaultHandler: GoogleHandler as any,
	tokenEndpoint: "/token",
	resourceMetadata: {
		resource: env.MCP_RESOURCE,
	},
});
