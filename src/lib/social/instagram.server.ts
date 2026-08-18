import type {
  AccountInfo,
  OAuthTokens,
  PublishResult,
  PublishVideoInput,
  SocialPlatformAdapter,
} from "./adapter";
import { IntegrationNotConfiguredError, PlatformError } from "./adapter";

const GRAPH = "https://graph.facebook.com/v21.0";

/**
 * Instagram publishing via Meta's official Graph API (Content Publishing).
 * Requires an Instagram professional (Business/Creator) account linked to a
 * Facebook Page, and an approved Meta app.
 */
export class InstagramAdapter implements SocialPlatformAdapter {
  readonly platform = "instagram" as const;
  readonly requiredConfig = [
    "INSTAGRAM_CLIENT_ID",
    "INSTAGRAM_CLIENT_SECRET",
    "INSTAGRAM_REDIRECT_URI",
  ] as const;
  readonly requiredScopes = [
    "instagram_basic",
    "instagram_content_publish",
    "pages_show_list",
    "business_management",
  ] as const;

  missingConfig(): string[] {
    return this.requiredConfig.filter((k) => !process.env[k]);
  }

  isConfigured() {
    return this.missingConfig().length === 0;
  }

  private assertConfigured() {
    const missing = this.missingConfig();
    if (missing.length) throw new IntegrationNotConfiguredError("instagram", missing);
  }

  async getAuthorizationUrl(state: string) {
    this.assertConfigured();
    const url = new URL("https://www.facebook.com/v21.0/dialog/oauth");
    url.searchParams.set("client_id", process.env["INSTAGRAM_CLIENT_ID"]!);
    url.searchParams.set("redirect_uri", process.env["INSTAGRAM_REDIRECT_URI"]!);
    url.searchParams.set("scope", this.requiredScopes.join(","));
    url.searchParams.set("response_type", "code");
    url.searchParams.set("state", state);
    return url.toString();
  }

  async handleOAuthCallback(code: string, redirectUri: string): Promise<OAuthTokens> {
    this.assertConfigured();
    const url = new URL(`${GRAPH}/oauth/access_token`);
    url.searchParams.set("client_id", process.env["INSTAGRAM_CLIENT_ID"]!);
    url.searchParams.set("client_secret", process.env["INSTAGRAM_CLIENT_SECRET"]!);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("code", code);
    const res = await fetch(url);
    const json = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!res.ok || !json.access_token) {
      throw new PlatformError(
        "instagram_oauth_failed",
        "Instagram could not complete the connection. Please try connecting again.",
        false,
        JSON.stringify(json),
      );
    }
    return {
      accessToken: json.access_token,
      refreshToken: null,
      expiresAt: json.expires_in
        ? new Date(Date.now() + json.expires_in * 1000).toISOString()
        : null,
      scopes: [...this.requiredScopes],
    };
  }

  /** Meta long-lived tokens are exchanged rather than refreshed. */
  async refreshTokenIfNeeded(tokens: OAuthTokens): Promise<OAuthTokens> {
    this.assertConfigured();
    if (tokens.expiresAt && new Date(tokens.expiresAt).getTime() - Date.now() > 86_400_000) {
      return tokens;
    }
    const url = new URL(`${GRAPH}/oauth/access_token`);
    url.searchParams.set("grant_type", "fb_exchange_token");
    url.searchParams.set("client_id", process.env["INSTAGRAM_CLIENT_ID"]!);
    url.searchParams.set("client_secret", process.env["INSTAGRAM_CLIENT_SECRET"]!);
    url.searchParams.set("fb_exchange_token", tokens.accessToken);
    const res = await fetch(url);
    const json = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!res.ok || !json.access_token) {
      throw new PlatformError(
        "instagram_token_expired",
        "Your Instagram connection has expired. Please reconnect your Instagram account.",
        true,
        JSON.stringify(json),
      );
    }
    return {
      ...tokens,
      accessToken: json.access_token,
      expiresAt: json.expires_in
        ? new Date(Date.now() + json.expires_in * 1000).toISOString()
        : null,
    };
  }

  async getAccountInfo(tokens: OAuthTokens): Promise<AccountInfo> {
    this.assertConfigured();
    const res = await fetch(
      `${GRAPH}/me/accounts?fields=instagram_business_account{id,username,name,profile_picture_url}&access_token=${tokens.accessToken}`,
    );
    const json = (await res.json()) as {
      data?: Array<{
        instagram_business_account?: {
          id: string;
          username: string;
          name?: string;
          profile_picture_url?: string;
        };
      }>;
    };
    const ig = json.data?.find((p) => p.instagram_business_account)?.instagram_business_account;
    if (!res.ok || !ig) {
      throw new PlatformError(
        "instagram_no_professional_account",
        "No Instagram professional account was found. Instagram publishing requires a Business or Creator account linked to a Facebook Page.",
        true,
        JSON.stringify(json),
      );
    }
    return {
      externalAccountId: ig.id,
      username: ig.username,
      displayName: ig.name ?? null,
      avatarUrl: ig.profile_picture_url ?? null,
      accountType: "professional",
    };
  }

  /** Reels publishing: create a media container, poll it, then publish it. */
  async publishVideo(tokens: OAuthTokens, input: PublishVideoInput): Promise<PublishResult> {
    this.assertConfigured();
    const igUserId = (await this.getAccountInfo(tokens)).externalAccountId;
    const caption = [input.caption, input.hashtags?.join(" ")].filter(Boolean).join("\n\n");

    const createRes = await fetch(`${GRAPH}/${igUserId}/media`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        media_type: "REELS",
        video_url: input.videoUrl,
        caption,
        access_token: tokens.accessToken,
      }),
    });
    const created = (await createRes.json()) as { id?: string; error?: unknown };
    if (!createRes.ok || !created.id) {
      throw new PlatformError(
        "instagram_container_failed",
        "Instagram rejected this video. Check that the video meets Instagram Reels requirements and try again.",
        false,
        JSON.stringify(created),
      );
    }

    const publishRes = await fetch(`${GRAPH}/${igUserId}/media_publish`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ creation_id: created.id, access_token: tokens.accessToken }),
    });
    const published = (await publishRes.json()) as { id?: string };
    if (!publishRes.ok || !published.id) {
      return { externalPostId: created.id, externalUrl: null, pending: true };
    }
    return {
      externalPostId: published.id,
      externalUrl: `https://www.instagram.com/reel/${published.id}/`,
      pending: false,
    };
  }
}
