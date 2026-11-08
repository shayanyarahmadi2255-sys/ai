
/**
 * Constructs an authorization URL for Google OAuth.
 */
export function getUpstreamAuthorizeUrl({
	upstreamUrl,
	clientId,
	scope,
	redirectUri,
	state,
	hostedDomain,
}: {
	upstreamUrl: string;
	clientId: string;
	scope: string;
	redirectUri: string;
	state?: string;
	hostedDomain?: string;
}) {
	const upstream = new URL(upstreamUrl);

	upstream.searchParams.set("client_id", clientId);
	upstream.searchParams.set("redirect_uri", redirectUri);
	upstream.searchParams.set("scope", scope);
	upstream.searchParams.set("response_type", "code");
	upstream.searchParams.set("access_type", "offline");
	upstream.searchParams.set("prompt", "consent");

	if (state) upstream.searchParams.set("state", state);
	if (hostedDomain) upstream.searchParams.set("hd", hostedDomain);

	return upstream.href;
}

export type GoogleTokens = {
	accessToken: string;
	refreshToken: string | null;
};

export async function fetchUpstreamAuthToken({
	clientId,
	clientSecret,
	code,
	redirectUri,
	upstreamUrl,
	grantType,
}: {
	code: string | undefined;
	upstreamUrl: string;
	clientSecret: string;
	redirectUri: string;
	clientId: string;
	grantType: string;
}): Promise<[GoogleTokens, null] | [null, Response]> {
	if (!code) {
		return [null, new Response("Missing code", { status: 400 })];
	}

	const resp = await fetch(upstreamUrl, {
		body: new URLSearchParams({
			client_id: clientId,
			client_secret: clientSecret,
			code,
			grant_type: grantType,
			redirect_uri: redirectUri,
		}).toString(),
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		method: "POST",
	});

	if (!resp.ok) {
		console.log("Google token exchange failed:", await resp.text());
		return [
			null,
			new Response("Failed to fetch access token", { status: 500 }),
		];
	}

	const body = (await resp.json()) as {
		access_token?: string;
		refresh_token?: string;
	};

	if (!body.access_token) {
		return [null, new Response("Missing access token", { status: 400 })];
	}

	return [
		{
			accessToken: body.access_token,
			refreshToken: body.refresh_token ?? null,
		},
		null,
	];
}

export type Props = {
	name: string;
	email: string;
	accessToken: string;
	refreshToken: string | null;
};
